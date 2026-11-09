-- voli update 015: member devices (IP, phone brand/model, network) + bans by IP, whole network, or device.
-- Re-runnable. Run in the SQL Editor after 009_admin.sql.
begin;

create table if not exists public.member_devices (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null,
  device_id text not null,
  ip inet,
  brand text, model text, os text,
  network text,   -- 'wifi' / 'cellular' / ...
  carrier text,   -- operator or ISP name
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (auth_id, device_id)
);
create index if not exists member_devices_ip on public.member_devices(ip);
create index if not exists member_devices_device on public.member_devices(device_id);
grant all on public.member_devices to service_role;
alter table public.member_devices enable row level security;

create table if not exists public.device_bans (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ip', 'network', 'device')),
  value text not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (kind, value)
);
grant all on public.device_bans to service_role;
alter table public.device_bans enable row level security;

-- Request IP (first x-forwarded-for hop), null when unknown.
create or replace function public.voli_request_ip() returns inet
language plpgsql stable security definer set search_path = '' as $$
declare h json; raw text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then return null; end;
  raw := btrim(split_part(coalesce(h->>'x-forwarded-for', h->>'x-real-ip', h->>'cf-connecting-ip', ''), ',', 1));
  begin return nullif(raw, '')::inet; exception when others then return null; end;
end; $$;
revoke all on function public.voli_request_ip() from public, anon, authenticated;

-- Matching ban for an IP / device / carrier, or null.
create or replace function public.voli_find_device_ban(p_ip inet, p_device text, p_carrier text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('kind', b.kind, 'value', b.value, 'reason', b.reason)
  from public.device_bans b
  where (b.kind = 'ip' and p_ip is not null and b.value = host(p_ip))
     or (b.kind = 'device' and b.value = p_device)
     or (b.kind = 'network' and (
           (b.value ~ '/' and p_ip is not null and p_ip <<= (b.value)::cidr)
        or (b.value !~ '/' and p_carrier is not null and lower(b.value) = lower(p_carrier))))
  limit 1;
$$;
revoke all on function public.voli_find_device_ban(inet, text, text) from public, anon, authenticated;

-- Called by the Voli app on login / open. Supports both server-extracted IP and client-passed IP.
create or replace function public.voli_report_device(p_device_id text, p_brand text default null, p_model text default null,
  p_os text default null, p_network text default null, p_carrier text default null, p_client_ip text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  parsed_client_ip inet;
  ip inet;
  d text := left(btrim(coalesce(p_device_id, '')), 200);
begin
  if me is null then raise exception 'Not signed in' using errcode = 'P0001', hint = 'not_signed_in'; end if;
  if d = '' then raise exception 'Missing device' using errcode = 'P0001', hint = 'bad_device'; end if;
  begin parsed_client_ip := nullif(btrim(coalesce(p_client_ip, '')), '')::inet; exception when others then parsed_client_ip := null; end;
  ip := coalesce(public.voli_request_ip(), parsed_client_ip);

  insert into public.member_devices(auth_id, device_id, ip, brand, model, os, network, carrier)
    values (me, d, ip, left(p_brand, 80), left(p_model, 80), left(p_os, 80), left(p_network, 40), left(p_carrier, 80))
  on conflict (auth_id, device_id) do update set
    ip = coalesce(excluded.ip, member_devices.ip),
    brand = coalesce(nullif(excluded.brand, ''), member_devices.brand),
    model = coalesce(nullif(excluded.model, ''), member_devices.model),
    os = coalesce(nullif(excluded.os, ''), member_devices.os),
    network = coalesce(nullif(excluded.network, ''), member_devices.network),
    carrier = coalesce(nullif(excluded.carrier, ''), member_devices.carrier),
    last_seen = now();

  return public.voli_find_device_ban(ip, d, p_carrier);
end; $$;
revoke all on function public.voli_report_device(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.voli_report_device(text, text, text, text, text, text, text) to authenticated;

commit;
