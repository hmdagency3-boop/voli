-- voli update 025: real phone details from the Android app, phone fingerprint, IP history,
-- and bans that follow the phone (its Android ID, Widevine ID or fingerprint) instead of a browser ID.
-- Run once in the SQL Editor AFTER 015_device_bans.sql (and 016_unified_bans.sql when used). Safe to run again.
--
-- The app calls voli_report_device_v2(...) on every sign-in / app open. It keeps using the existing
-- voli_report_device (so ban codes, linked accounts and 016 rules stay exactly as they are), then saves
-- the extra details and one IP-history row per IP. The IP comes from the request headers the database
-- sees (the phone's real public address); the app-reported IP is used only when no header IP exists.
-- Mobile IPs change with every network; the history keeps all of them, the device ID and fingerprint stay.
begin;

alter table public.member_devices add column if not exists fingerprint text;
alter table public.member_devices add column if not exists android_id text;
alter table public.member_devices add column if not exists widevine_id text;
alter table public.member_devices add column if not exists source text;
alter table public.member_devices add column if not exists hardware jsonb;
alter table public.member_devices add column if not exists first_ip inet;
create index if not exists member_devices_fingerprint on public.member_devices(fingerprint);
create index if not exists member_devices_android on public.member_devices(android_id);
create index if not exists member_devices_widevine on public.member_devices(widevine_id);

create table if not exists public.member_device_ips (
  auth_id uuid not null,
  device_id text not null,
  ip inet not null,
  from_header boolean not null default true,  -- false = only the app's own report was available
  network text,
  carrier text,
  country text,
  vpn boolean not null default false,
  seen_count integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (auth_id, device_id, ip)
);
create index if not exists member_device_ips_ip on public.member_device_ips(ip);
revoke all on public.member_device_ips from public, anon, authenticated;
grant all on public.member_device_ips to service_role;
alter table public.member_device_ips enable row level security;  -- no policies: only the functions below touch it

-- Country the request came from, when the proxy reports it.
create or replace function public.voli_request_country() returns text
language plpgsql stable security definer set search_path = '' as $$
declare h json;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then return null; end;
  return nullif(upper(left(btrim(coalesce(h->>'cf-ipcountry', '')), 2)), '');
end; $$;
revoke all on function public.voli_request_country() from public, anon, authenticated;

-- The signed-in member's phone report with its full details. Returns the matching ban (or null).
create or replace function public.voli_report_device_v2(p_device_id text, p_brand text, p_model text,
  p_os text, p_network text, p_carrier text, p_client_ip text, p_details jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  d text := left(btrim(coalesce(p_device_id, '')), 200);
  hip inet := public.voli_request_ip();
  rip inet := hip;
  det jsonb := case when jsonb_typeof(p_details) = 'object' and length(p_details::text) <= 6000 then p_details else '{}'::jsonb end;
  fp text := nullif(left(btrim(coalesce(det->>'fingerprint', '')), 128), '');
  aid text := nullif(left(btrim(coalesce(det->>'android_id', '')), 128), '');
  wid text := nullif(left(btrim(coalesce(det->>'widevine_id', '')), 128), '');
  is_vpn boolean := coalesce((det->>'vpn')::boolean, false);
  ban jsonb;
begin
  if me is null then raise exception 'Not signed in' using errcode = 'P0001', hint = 'not_signed_in'; end if;
  if d = '' then raise exception 'Missing device' using errcode = 'P0001', hint = 'bad_device'; end if;
  if rip is null then
    begin rip := nullif(btrim(p_client_ip), '')::inet;
    exception when others then rip := null; end;
  end if;

  -- Existing report: device row, linked-account bans and ban codes keep working unchanged.
  ban := public.voli_report_device(d, p_brand, p_model, p_os, p_network, p_carrier, p_client_ip);

  update public.member_devices set
    fingerprint = coalesce(fp, fingerprint),
    android_id = coalesce(aid, android_id),
    widevine_id = coalesce(wid, widevine_id),
    source = coalesce(nullif(left(det->>'source', 10), ''), source),
    hardware = case when det = '{}'::jsonb then hardware else det - 'fingerprint' - 'android_id' - 'widevine_id' end,
    first_ip = coalesce(first_ip, rip)
  where auth_id = me and device_id = d;

  if rip is not null then
    insert into public.member_device_ips(auth_id, device_id, ip, from_header, network, carrier, country, vpn)
    values (me, d, rip, hip is not null, left(p_network, 40), left(p_carrier, 80), public.voli_request_country(), is_vpn)
    on conflict (auth_id, device_id, ip) do update set last_seen = now(), seen_count = member_device_ips.seen_count + 1,
      network = coalesce(excluded.network, member_device_ips.network), carrier = coalesce(excluded.carrier, member_device_ips.carrier),
      country = coalesce(excluded.country, member_device_ips.country), vpn = excluded.vpn,
      from_header = member_device_ips.from_header or excluded.from_header;
  end if;

  -- A device ban written for this phone's fingerprint, Android ID or Widevine ID also blocks it,
  -- so reinstalling the app or using another account on the same phone does not escape it.
  return coalesce(ban,
    case when fp is not null then public.voli_find_device_ban(null, fp, null) end,
    case when wid is not null then public.voli_find_device_ban(null, wid, null) end,
    case when aid is not null then public.voli_find_device_ban(null, 'android:' || aid, null) end);
end; $$;
revoke all on function public.voli_report_device_v2(text, text, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.voli_report_device_v2(text, text, text, text, text, text, text, jsonb) to authenticated;

-- ---------- Panel ----------
-- One device of one member: its saved hardware details, every IP it used, and the other accounts
-- seen on the same phone (same fingerprint, Android ID or Widevine ID).
create or replace function public.admin_device_details(p_auth uuid, p_device text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.admin_guard(); r public.member_devices;
begin
  select * into r from public.member_devices where auth_id = p_auth and device_id = p_device;
  if r.id is null then return null; end if;
  return jsonb_build_object(
    'device_id', r.device_id, 'fingerprint', r.fingerprint, 'android_id', r.android_id, 'widevine_id', r.widevine_id,
    'source', r.source, 'hardware', coalesce(r.hardware, '{}'::jsonb), 'first_ip', host(r.first_ip),
    'ips', coalesce((select jsonb_agg(jsonb_build_object('ip', host(i.ip), 'from_header', i.from_header, 'network', i.network,
        'carrier', i.carrier, 'country', i.country, 'vpn', i.vpn, 'seen_count', i.seen_count,
        'first_seen', i.first_seen, 'last_seen', i.last_seen) order by i.last_seen desc)
      from public.member_device_ips i where i.auth_id = p_auth and i.device_id = p_device), '[]'::jsonb),
    'same_phone', coalesce((select jsonb_agg(distinct jsonb_build_object('auth_id', o.auth_id, 'display_name', p.display_name,
        'public_id', p.public_id, 'device_id', o.device_id))
      from public.member_devices o left join public.profiles p on p.auth_id = o.auth_id
      where o.auth_id <> p_auth and (
        (r.fingerprint is not null and o.fingerprint = r.fingerprint)
        or (r.android_id is not null and o.android_id = r.android_id)
        or (r.widevine_id is not null and o.widevine_id = r.widevine_id)
        or o.device_id = r.device_id)), '[]'::jsonb));
end; $$;
revoke all on function public.admin_device_details(uuid, text) from public, anon;
grant execute on function public.admin_device_details(uuid, text) to authenticated;

commit;
notify pgrst, 'reload schema';
