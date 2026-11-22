-- 026_lucky_gifts.sql — Unified Lucky & Crazy Gifts System (Voli App & Voli Admin)
-- Version 4: Full backward compatibility for existing tables, columns, and spins history.

-- 1. Catalog schema adjustments for kind
alter table public.room_gift_catalog add column if not exists kind text not null default 'normal';
alter table public.room_gift_catalog drop constraint if exists room_gift_catalog_kind_check;
alter table public.room_gift_catalog add constraint room_gift_catalog_kind_check check (kind in ('normal', 'lucky', 'crazy'));

-- 2. Lucky Settings table
create table if not exists public.lucky_settings (
  kind text primary key check (kind in ('lucky', 'crazy', 'global')),
  mic_pct numeric(5,2) not null default 9.2,
  pool_pct numeric(5,2) not null default 75,
  platform_pct numeric(5,2) not null default 15.8,
  safety_floor bigint not null default 10000,
  big_from integer not null default 100,
  banner_from integer not null default 500,
  enabled boolean not null default true,
  multipliers integer[] not null default '{}',
  weights integer[] not null default '{}',
  announce_from integer not null default 50,
  updated_at timestamptz not null default now()
);

-- Ensure all columns exist on lucky_settings regardless of which script ran first
alter table public.lucky_settings add column if not exists id boolean default true;
alter table public.lucky_settings add column if not exists kind text default 'global';
alter table public.lucky_settings add column if not exists mic_pct numeric(5,2) not null default 9.2;
alter table public.lucky_settings add column if not exists receiver_pct numeric(5,2) not null default 9.2;
alter table public.lucky_settings add column if not exists pool_pct numeric(5,2) not null default 75;
alter table public.lucky_settings add column if not exists platform_pct numeric(5,2) not null default 15.8;
alter table public.lucky_settings add column if not exists safety_floor bigint not null default 10000;
alter table public.lucky_settings add column if not exists big_from integer not null default 100;
alter table public.lucky_settings add column if not exists banner_from integer not null default 500;
alter table public.lucky_settings add column if not exists enabled boolean not null default true;
alter table public.lucky_settings add column if not exists multipliers integer[] not null default '{}';
alter table public.lucky_settings add column if not exists weights integer[] not null default '{}';
alter table public.lucky_settings add column if not exists announce_from integer not null default 50;
alter table public.lucky_settings add column if not exists updated_at timestamptz not null default now();

-- Seed default settings for lucky and crazy kinds if not existing
insert into public.lucky_settings (kind, mic_pct, pool_pct, platform_pct, safety_floor, big_from, banner_from, enabled, multipliers, weights, announce_from)
values
  ('lucky', 9.2, 75, 15.8, 10000, 100, 50, true, '{2,5,10,20,50}', '{1000,400,100,20,5}', 20),
  ('crazy', 9.2, 75, 15.8, 10000, 100, 500, true, '{2,10,100,500,1000}', '{1000,200,30,5,1}', 100)
on conflict (kind) do update set
  mic_pct = excluded.mic_pct,
  pool_pct = excluded.pool_pct,
  platform_pct = excluded.platform_pct;

-- 3. Prize Pools per kind
create table if not exists public.lucky_pools (
  kind text primary key check (kind in ('lucky', 'crazy')),
  balance bigint not null default 0 check (balance >= 0),
  platform_total bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.lucky_pools add column if not exists balance bigint not null default 0;
alter table public.lucky_pools add column if not exists platform_total bigint not null default 0;
alter table public.lucky_pools add column if not exists updated_at timestamptz not null default now();

insert into public.lucky_pools (kind, balance, platform_total)
values ('lucky', 0, 0), ('crazy', 0, 0)
on conflict (kind) do nothing;

-- 4. Per-gift configuration and stats
create table if not exists public.lucky_gifts (
  gift_key text primary key references public.room_gift_catalog(key) on delete cascade,
  kind text not null check (kind in ('normal', 'lucky', 'crazy')),
  multipliers integer[] not null default '{2,5,10,20,50,100,500,1000}',
  pool bigint not null default 0,
  spent bigint not null default 0,
  won bigint not null default 0,
  spins bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.lucky_gifts add column if not exists kind text not null default 'normal';
alter table public.lucky_gifts add column if not exists multipliers integer[] not null default '{2,5,10,20,50,100,500,1000}';
alter table public.lucky_gifts add column if not exists pool bigint not null default 0;
alter table public.lucky_gifts add column if not exists spent bigint not null default 0;
alter table public.lucky_gifts add column if not exists won bigint not null default 0;
alter table public.lucky_gifts add column if not exists spins bigint not null default 0;
alter table public.lucky_gifts add column if not exists updated_at timestamptz not null default now();

-- Seed standard gifts in catalog
insert into public.room_gift_catalog (key, name, price, sort, kind)
values
  ('lucky_clover', 'برسيم الحظ', 10, 50, 'lucky'),
  ('lucky_star', 'نجمة الحظ', 50, 51, 'lucky'),
  ('lucky_rose', 'وردة الحظ', 100, 52, 'lucky'),
  ('crazy_ring', 'خاتم المجنون', 500, 60, 'crazy'),
  ('crazy_lion', 'أسد المجنون', 1000, 61, 'crazy'),
  ('crazy_dragon', 'تنين المجنون', 5000, 62, 'crazy')
on conflict (key) do update set
  kind = excluded.kind,
  name = excluded.name;

insert into public.lucky_gifts (gift_key, kind, multipliers)
values
  ('lucky_clover', 'lucky', '{2,5,10,20,50}'),
  ('lucky_star', 'lucky', '{2,5,10,20,50}'),
  ('lucky_rose', 'lucky', '{2,5,10,20,50}'),
  ('crazy_ring', 'crazy', '{2,10,100,500,1000}'),
  ('crazy_lion', 'crazy', '{2,10,100,500,1000}'),
  ('crazy_dragon', 'crazy', '{2,10,100,500,1000}')
on conflict (gift_key) do update set
  kind = excluded.kind;

-- 5. Spins History Table (Unified & backward compatible)
create table if not exists public.lucky_spins (
  id bigint generated always as identity primary key,
  room_id uuid references public.rooms(id) on delete set null,
  sender_id uuid references public.profiles(auth_id) on delete set null,
  receiver_id uuid references public.profiles(auth_id) on delete set null,
  sender uuid references public.profiles(auth_id) on delete set null,
  receiver uuid references public.profiles(auth_id) on delete set null,
  gift_key text not null references public.room_gift_catalog(key) on delete cascade,
  kind text not null default 'lucky',
  quantity integer not null default 1,
  cost bigint not null default 0,
  spent bigint not null default 0,
  to_receivers bigint not null default 0,
  mic_share bigint not null default 0,
  to_platform bigint not null default 0,
  platform_share bigint not null default 0,
  to_pool bigint not null default 0,
  pool_share bigint not null default 0,
  drawn integer not null default 0,
  multiplier integer not null default 0,
  prize bigint not null default 0,
  won bigint not null default 0,
  recipients_count integer not null default 1,
  created_at timestamptz not null default now()
);

-- Add all possible columns to ensure existing records and queries never fail
alter table public.lucky_spins add column if not exists room_id uuid references public.rooms(id) on delete set null;
alter table public.lucky_spins add column if not exists sender_id uuid references public.profiles(auth_id) on delete set null;
alter table public.lucky_spins add column if not exists receiver_id uuid references public.profiles(auth_id) on delete set null;
alter table public.lucky_spins add column if not exists sender uuid references public.profiles(auth_id) on delete set null;
alter table public.lucky_spins add column if not exists receiver uuid references public.profiles(auth_id) on delete set null;
alter table public.lucky_spins add column if not exists gift_key text;
alter table public.lucky_spins add column if not exists kind text default 'lucky';
alter table public.lucky_spins add column if not exists quantity integer not null default 1;
alter table public.lucky_spins add column if not exists cost bigint not null default 0;
alter table public.lucky_spins add column if not exists spent bigint not null default 0;
alter table public.lucky_spins add column if not exists to_receivers bigint not null default 0;
alter table public.lucky_spins add column if not exists mic_share bigint not null default 0;
alter table public.lucky_spins add column if not exists to_platform bigint not null default 0;
alter table public.lucky_spins add column if not exists platform_share bigint not null default 0;
alter table public.lucky_spins add column if not exists to_pool bigint not null default 0;
alter table public.lucky_spins add column if not exists pool_share bigint not null default 0;
alter table public.lucky_spins add column if not exists drawn integer not null default 0;
alter table public.lucky_spins add column if not exists multiplier integer not null default 0;
alter table public.lucky_spins add column if not exists prize bigint not null default 0;
alter table public.lucky_spins add column if not exists won bigint not null default 0;
alter table public.lucky_spins add column if not exists recipients_count integer not null default 1;
alter table public.lucky_spins add column if not exists created_at timestamptz not null default now();

-- Sync synonyms on all existing spins so no data is lost or unreadable
update public.lucky_spins set
  sender_id = coalesce(sender_id, sender),
  sender = coalesce(sender, sender_id),
  receiver_id = coalesce(receiver_id, receiver),
  receiver = coalesce(receiver, receiver_id),
  cost = case when coalesce(cost, 0) = 0 and coalesce(spent, 0) > 0 then spent else coalesce(cost, 0) end,
  spent = case when coalesce(spent, 0) = 0 and coalesce(cost, 0) > 0 then cost else coalesce(spent, 0) end,
  prize = case when coalesce(prize, 0) = 0 and coalesce(won, 0) > 0 then won else coalesce(prize, 0) end,
  won = case when coalesce(won, 0) = 0 and coalesce(prize, 0) > 0 then prize else coalesce(won, 0) end,
  to_receivers = case when coalesce(to_receivers, 0) = 0 and coalesce(mic_share, 0) > 0 then mic_share else coalesce(to_receivers, 0) end,
  mic_share = case when coalesce(mic_share, 0) = 0 and coalesce(to_receivers, 0) > 0 then to_receivers else coalesce(mic_share, 0) end,
  to_platform = case when coalesce(to_platform, 0) = 0 and coalesce(platform_share, 0) > 0 then platform_share else coalesce(to_platform, 0) end,
  platform_share = case when coalesce(platform_share, 0) = 0 and coalesce(to_platform, 0) > 0 then to_platform else coalesce(platform_share, 0) end,
  to_pool = case when coalesce(to_pool, 0) = 0 and coalesce(pool_share, 0) > 0 then pool_share else coalesce(to_pool, 0) end,
  pool_share = case when coalesce(pool_share, 0) = 0 and coalesce(to_pool, 0) > 0 then to_pool else coalesce(pool_share, 0) end;

create index if not exists idx_lucky_spins_created on public.lucky_spins(created_at desc);
create index if not exists idx_lucky_spins_multiplier on public.lucky_spins(multiplier);
create index if not exists idx_lucky_spins_prize on public.lucky_spins(prize desc);

-- Permissions & RLS
alter table public.lucky_settings enable row level security;
alter table public.lucky_pools enable row level security;
alter table public.lucky_gifts enable row level security;
alter table public.lucky_spins enable row level security;

drop policy if exists lucky_settings_read on public.lucky_settings;
create policy lucky_settings_read on public.lucky_settings for select to authenticated using (true);

drop policy if exists lucky_pools_read on public.lucky_pools;
create policy lucky_pools_read on public.lucky_pools for select to authenticated using (true);

drop policy if exists lucky_gifts_read on public.lucky_gifts;
create policy lucky_gifts_read on public.lucky_gifts for select to authenticated using (true);

drop policy if exists lucky_spins_read on public.lucky_spins;
create policy lucky_spins_read on public.lucky_spins for select to authenticated using (true);

grant select on public.lucky_settings to authenticated;
grant select on public.lucky_pools to authenticated;
grant select on public.lucky_gifts to authenticated;
grant select on public.lucky_spins to authenticated;

grant all on public.lucky_settings to service_role;
grant all on public.lucky_pools to service_role;
grant all on public.lucky_gifts to service_role;
grant all on public.lucky_spins to service_role;

-- 6. DROP OLD SIGNATURES TO PREVENT 42P13 ERRORS
drop function if exists public.send_room_lucky_gift(uuid, text, integer, uuid[]);
drop function if exists public.lucky_latest_spin();
drop function if exists public.lucky_big_wins_since(bigint);
drop function if exists public.admin_lucky_overview();
drop function if exists public.admin_lucky_settings_set(numeric, numeric, bigint, integer, integer, boolean);
drop function if exists public.admin_lucky_gifts();
drop function if exists public.admin_lucky_gift_set(text, text, integer[]);
drop function if exists public.admin_lucky_spins(integer, boolean);

-- 7. APP RPC: send_room_lucky_gift
create or replace function public.send_room_lucky_gift(
  p_room uuid,
  p_gift text,
  p_quantity integer default 1,
  p_to uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender uuid := auth.uid();
  v_sender_coins bigint;
  v_gift record;
  v_settings record;
  v_pool record;
  v_total_cost bigint;
  v_mic_total bigint;
  v_platform_total bigint;
  v_pool_total bigint;
  v_recipients integer;
  v_each_ch bigint;
  v_target uuid;
  v_roll integer;
  v_cum integer := 0;
  v_mult integer := 0;
  v_prize bigint := 0;
  v_potential_prize bigint := 0;
  v_spin_id bigint;
  v_announce boolean := false;
  v_i integer;
begin
  if v_sender is null then
    raise exception 'not_signed_in';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  select * into v_gift
    from public.room_gift_catalog
   where key = p_gift;

  if not found or v_gift.kind not in ('lucky', 'crazy') then
    raise exception 'not_a_lucky_gift';
  end if;

  v_total_cost := v_gift.price::bigint * p_quantity::bigint;

  select coins into v_sender_coins
    from public.profiles
   where auth_id = v_sender
     for update;

  if v_sender_coins < v_total_cost then
    raise exception 'not_enough_coins';
  end if;

  select * into v_settings
    from public.lucky_settings
   where kind = v_gift.kind;

  if not found or not coalesce(v_settings.enabled, true) then
    raise exception 'lucky_gifts_disabled';
  end if;

  -- Deduct coins from sender
  update public.profiles
     set coins = coins - v_total_cost,
         wealth_points = wealth_points + v_total_cost
   where auth_id = v_sender;

  -- Calculate financial splits
  v_mic_total := floor(v_total_cost::numeric * (coalesce(v_settings.mic_pct, 9.2) / 100.0))::bigint;
  v_platform_total := floor(v_total_cost::numeric * (coalesce(v_settings.platform_pct, 15.8) / 100.0))::bigint;
  v_pool_total := v_total_cost - v_mic_total - v_platform_total;

  -- Distribute mic owner charisma
  v_recipients := coalesce(array_length(p_to, 1), 0);
  if v_recipients = 0 then
    v_recipients := 1;
    p_to := array[v_sender];
  end if;

  v_each_ch := floor(v_mic_total::numeric / v_recipients::numeric)::bigint;
  foreach v_target in array p_to loop
    update public.profiles
       set charisma_points = charisma_points + v_each_ch
     where auth_id = v_target;
  end loop;

  -- Lock and update prize pool
  select * into v_pool
    from public.lucky_pools
   where kind = v_gift.kind
     for update;

  update public.lucky_pools
     set balance = balance + v_pool_total,
         platform_total = platform_total + v_platform_total,
         updated_at = now()
   where kind = v_gift.kind;

  -- Draw multiplier
  v_roll := floor(random() * 10000)::int;
  for v_i in 1..coalesce(array_length(v_settings.weights, 1), 0) loop
    v_cum := v_cum + v_settings.weights[v_i];
    if v_roll < v_cum then
      v_mult := v_settings.multipliers[v_i];
      exit;
    end if;
  end loop;

  -- Safety check against pool
  if v_mult > 0 then
    v_potential_prize := (v_gift.price::bigint * p_quantity::bigint) * v_mult::bigint;
    if (v_pool.balance + v_pool_total) >= v_potential_prize then
      v_prize := v_potential_prize;
    else
      v_mult := 0;
      v_prize := 0;
      for v_i in reverse coalesce(array_length(v_settings.multipliers, 1), 0)..1 loop
        if (v_gift.price::bigint * p_quantity::bigint * v_settings.multipliers[v_i]::bigint) <= (v_pool.balance + v_pool_total) then
          v_mult := v_settings.multipliers[v_i];
          v_prize := v_gift.price::bigint * p_quantity::bigint * v_mult::bigint;
          exit;
        end if;
      end loop;
    end if;
  end if;

  -- Pay prize from pool if won
  if v_prize > 0 then
    update public.lucky_pools
       set balance = balance - v_prize,
           updated_at = now()
     where kind = v_gift.kind;

    update public.profiles
       set coins = coins + v_prize
     where auth_id = v_sender;
  end if;

  -- Record spin with all synonym columns populated
  insert into public.lucky_spins (
    room_id, sender_id, sender, receiver_id, receiver, gift_key, kind, quantity,
    cost, spent, to_receivers, mic_share, to_platform, platform_share,
    to_pool, pool_share, drawn, multiplier, prize, won, recipients_count
  ) values (
    p_room, v_sender, v_sender, p_to[1], p_to[1], p_gift, v_gift.kind, p_quantity,
    v_total_cost, v_total_cost, v_mic_total, v_mic_total, v_platform_total, v_platform_total,
    v_pool_total, v_pool_total, v_mult, v_mult, v_prize, v_prize, v_recipients
  ) returning id into v_spin_id;

  -- Update gift stats
  update public.lucky_gifts
     set spent = spent + v_total_cost,
         won = won + v_prize,
         spins = spins + 1,
         updated_at = now()
   where gift_key = p_gift;

  v_announce := (v_mult >= coalesce(v_settings.banner_from, 500));

  select coins into v_sender_coins from public.profiles where auth_id = v_sender;

  return jsonb_build_object(
    'spin', v_spin_id,
    'multiplier', v_mult,
    'prize', v_prize,
    'coins', v_sender_coins,
    'total', v_total_cost,
    'announce', v_announce
  );
end;
$$;

revoke all on function public.send_room_lucky_gift(uuid, text, integer, uuid[]) from public, anon;
grant execute on function public.send_room_lucky_gift(uuid, text, integer, uuid[]) to authenticated;

-- 8. APP RPC: lucky_latest_spin
create or replace function public.lucky_latest_spin()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(max(id), 0) from public.lucky_spins;
$$;

revoke all on function public.lucky_latest_spin() from public, anon;
grant execute on function public.lucky_latest_spin() to authenticated;

-- 9. APP RPC: lucky_big_wins_since
create or replace function public.lucky_big_wins_since(p_after bigint)
returns table(
  id bigint,
  sender_name text,
  gift_name text,
  multiplier int,
  prize bigint,
  room_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id,
    coalesce(p.display_name, 'مستخدم') as sender_name,
    coalesce(g.name, s.gift_key) as gift_name,
    s.multiplier,
    coalesce(nullif(s.prize, 0), s.won, 0) as prize,
    coalesce(r.name, 'غرفة فولي') as room_name
  from public.lucky_spins s
  left join public.room_gift_catalog g on g.key = s.gift_key
  left join public.profiles p on p.auth_id = coalesce(s.sender_id, s.sender)
  left join public.rooms r on r.id = s.room_id
  where s.id > coalesce(p_after, 0)
    and s.multiplier >= 50
    and coalesce(s.prize, s.won, 0) > 0
  order by s.id asc
  limit 10;
$$;

revoke all on function public.lucky_big_wins_since(bigint) from public, anon;
grant execute on function public.lucky_big_wins_since(bigint) to authenticated;

-- 10. ADMIN RPC: admin_lucky_overview
create or replace function public.admin_lucky_overview()
returns table(
  total_spent numeric,
  total_won numeric,
  total_mic numeric,
  net_profit numeric,
  pools numeric,
  spins bigint,
  wins bigint,
  mic_pct numeric,
  pool_pct numeric,
  platform_pct numeric,
  safety_floor bigint,
  big_from integer,
  banner_from integer,
  enabled boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_spent numeric := 0;
  v_won numeric := 0;
  v_mic numeric := 0;
  v_plat numeric := 0;
  v_pools numeric := 0;
  v_spins bigint := 0;
  v_wins bigint := 0;
  v_mic_pct numeric := 9.2;
  v_pool_pct numeric := 75.0;
  v_platform_pct numeric := 15.8;
  v_safety_floor bigint := 10000;
  v_big_from integer := 100;
  v_banner_from integer := 500;
  v_enabled boolean := true;
begin
  perform public.admin_guard();

  select
    coalesce(sum(coalesce(nullif(cost, 0), spent, 0)), 0),
    coalesce(sum(coalesce(nullif(prize, 0), won, 0)), 0),
    coalesce(sum(coalesce(nullif(to_receivers, 0), mic_share, 0)), 0),
    count(*),
    coalesce(count(*) filter (where coalesce(prize, won, 0) > 0), 0)
  into v_spent, v_won, v_mic, v_spins, v_wins
  from public.lucky_spins;

  select
    coalesce(sum(balance), 0),
    coalesce(sum(platform_total), 0)
  into v_pools, v_plat
  from public.lucky_pools;

  select
    coalesce(mic_pct, receiver_pct, 9.2),
    coalesce(pool_pct, 75.0),
    coalesce(platform_pct, 15.8),
    coalesce(safety_floor, 10000),
    coalesce(big_from, 100),
    coalesce(banner_from, 500),
    coalesce(enabled, true)
  into
    v_mic_pct, v_pool_pct, v_platform_pct, v_safety_floor, v_big_from, v_banner_from, v_enabled
  from public.lucky_settings
  order by (case when kind = 'global' then 0 else 1 end)
  limit 1;

  total_spent := v_spent;
  total_won := v_won;
  total_mic := v_mic;
  net_profit := v_plat;
  pools := v_pools;
  spins := v_spins;
  wins := v_wins;
  mic_pct := coalesce(v_mic_pct, 9.2);
  pool_pct := coalesce(v_pool_pct, 75.0);
  platform_pct := coalesce(v_platform_pct, 15.8);
  safety_floor := coalesce(v_safety_floor, 10000);
  big_from := coalesce(v_big_from, 100);
  banner_from := coalesce(v_banner_from, 500);
  enabled := coalesce(v_enabled, true);

  return next;
end;
$$;

revoke all on function public.admin_lucky_overview() from public, anon;
grant execute on function public.admin_lucky_overview() to authenticated;

-- 11. ADMIN RPC: admin_lucky_settings_set
create or replace function public.admin_lucky_settings_set(
  p_mic numeric,
  p_pool numeric,
  p_safety_floor bigint,
  p_big_from integer,
  p_banner_from integer,
  p_enabled boolean
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plat numeric;
begin
  perform public.admin_guard();

  v_plat := round((100.0 - p_mic - p_pool)::numeric, 2);
  if p_mic < 0 or p_pool < 0 or v_plat < 0 then
    raise exception 'bad_split';
  end if;

  update public.lucky_settings
     set mic_pct = p_mic,
         receiver_pct = p_mic,
         pool_pct = p_pool,
         platform_pct = v_plat,
         safety_floor = p_safety_floor,
         big_from = p_big_from,
         banner_from = p_banner_from,
         enabled = p_enabled,
         updated_at = now();
end;
$$;

revoke all on function public.admin_lucky_settings_set(numeric, numeric, bigint, integer, integer, boolean) from public, anon;
grant execute on function public.admin_lucky_settings_set(numeric, numeric, bigint, integer, integer, boolean) to authenticated;

-- 12. ADMIN RPC: admin_lucky_gifts
create or replace function public.admin_lucky_gifts()
returns table(
  key text,
  name text,
  price numeric,
  art_url text,
  active boolean,
  kind text,
  multipliers integer[],
  pool numeric,
  spent numeric,
  won numeric,
  spins bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();

  return query
  select
    g.key,
    g.name,
    g.price::numeric,
    g.art_url,
    g.active,
    g.kind,
    coalesce(lg.multipliers, '{2,5,10,20,50,100,500,1000}'::integer[]),
    coalesce(lp.balance, lg.pool, 0)::numeric as pool,
    coalesce((select sum(coalesce(nullif(s.cost,0), s.spent, 0)) from public.lucky_spins s where s.gift_key = g.key), lg.spent, 0)::numeric as spent,
    coalesce((select sum(coalesce(nullif(s.prize,0), s.won, 0)) from public.lucky_spins s where s.gift_key = g.key), lg.won, 0)::numeric as won,
    coalesce((select count(*) from public.lucky_spins s where s.gift_key = g.key), lg.spins, 0)::bigint as spins
  from public.room_gift_catalog g
  left join public.lucky_gifts lg on lg.gift_key = g.key
  left join public.lucky_pools lp on lp.kind = g.kind
  where g.kind in ('lucky', 'crazy')
  order by g.sort asc, g.price asc;
end;
$$;

revoke all on function public.admin_lucky_gifts() from public, anon;
grant execute on function public.admin_lucky_gifts() to authenticated;

-- 13. ADMIN RPC: admin_lucky_gift_set
create or replace function public.admin_lucky_gift_set(
  p_key text,
  p_kind text,
  p_multipliers integer[]
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();

  if p_kind not in ('normal', 'lucky', 'crazy') then
    raise exception 'invalid_kind';
  end if;

  update public.room_gift_catalog
     set kind = p_kind
   where key = p_key;

  insert into public.lucky_gifts (gift_key, kind, multipliers)
  values (p_key, p_kind, p_multipliers)
  on conflict (gift_key) do update set
    kind = excluded.kind,
    multipliers = excluded.multipliers,
    updated_at = now();
end;
$$;

revoke all on function public.admin_lucky_gift_set(text, text, integer[]) from public, anon;
grant execute on function public.admin_lucky_gift_set(text, text, integer[]) to authenticated;

-- 14. ADMIN RPC: admin_lucky_spins
create or replace function public.admin_lucky_spins(
  p_limit integer default 100,
  p_wins_only boolean default true
)
returns table(
  id bigint,
  sender text,
  sender_name text,
  receiver text,
  receiver_name text,
  gift_key text,
  gift_name text,
  kind text,
  spent numeric,
  multiplier integer,
  won numeric,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.admin_guard();

  return query
  select
    s.id,
    coalesce(coalesce(s.sender_id, s.sender)::text, '') as sender,
    coalesce(sp.display_name, 'مستخدم') as sender_name,
    coalesce(coalesce(s.receiver_id, s.receiver)::text, '') as receiver,
    coalesce(rp.display_name, 'مستلم المايك') as receiver_name,
    s.gift_key,
    coalesce(g.name, s.gift_key) as gift_name,
    s.kind,
    coalesce(nullif(s.cost, 0), s.spent, 0)::numeric as spent,
    s.multiplier,
    coalesce(nullif(s.prize, 0), s.won, 0)::numeric as won,
    s.created_at
  from public.lucky_spins s
  left join public.room_gift_catalog g on g.key = s.gift_key
  left join public.profiles sp on sp.auth_id = coalesce(s.sender_id, s.sender)
  left join public.profiles rp on rp.auth_id = coalesce(s.receiver_id, s.receiver)
  where (not p_wins_only or coalesce(s.prize, s.won, 0) > 0)
  order by s.created_at desc
  limit coalesce(p_limit, 100);
end;
$$;

revoke all on function public.admin_lucky_spins(integer, boolean) from public, anon;
grant execute on function public.admin_lucky_spins(integer, boolean) to authenticated;

notify pgrst, 'reload schema';
