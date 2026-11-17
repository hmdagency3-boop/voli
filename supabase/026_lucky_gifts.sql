-- 026_lucky_gifts.sql — Unified Lucky & Crazy Gifts System for Voli App and Voli Admin

-- 1. Catalog schema adjustments for kind
alter table public.room_gift_catalog add column if not exists kind text not null default 'normal';
alter table public.room_gift_catalog drop constraint if exists room_gift_catalog_kind_check;
alter table public.room_gift_catalog add constraint room_gift_catalog_kind_check check (kind in ('normal', 'lucky', 'crazy'));

-- 2. Lucky Settings table (supports both app kinds and admin controls)
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

-- Ensure all columns exist in case table was created partially
alter table public.lucky_settings add column if not exists kind text;
alter table public.lucky_settings add column if not exists mic_pct numeric(5,2) not null default 9.2;
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

-- Seed lucky_settings
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

insert into public.lucky_pools (kind, balance, platform_total)
values ('lucky', 0, 0), ('crazy', 0, 0)
on conflict (kind) do nothing;

-- 4. Per-gift configuration and stats for Admin
create table if not exists public.lucky_gifts (
  gift_key text primary key references public.room_gift_catalog(key) on delete cascade,
  kind text not null check (kind in ('normal', 'lucky', 'crazy')),
  multipliers integer[] not null default '{}',
  pool bigint not null default 0,
  spent bigint not null default 0,
  won bigint not null default 0,
  spins bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Seed gifts in catalog and lucky_gifts
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

-- 5. Spins History Table
create table if not exists public.lucky_spins (
  id bigint generated always as identity primary key,
  room_id uuid references public.rooms(id) on delete set null,
  sender_id uuid references public.profiles(auth_id) on delete set null,
  receiver_id uuid references public.profiles(auth_id) on delete set null,
  gift_key text not null references public.room_gift_catalog(key) on delete cascade,
  kind text not null check (kind in ('lucky', 'crazy')),
  quantity integer not null check (quantity > 0),
  cost bigint not null,
  to_receivers bigint not null,
  to_platform bigint not null,
  to_pool bigint not null,
  drawn integer not null default 0,
  multiplier integer not null default 0,
  prize bigint not null default 0,
  recipients_count integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_lucky_spins_created on public.lucky_spins(created_at desc);
create index if not exists idx_lucky_spins_multiplier on public.lucky_spins(multiplier);

-- RLS: tables closed to public, accessible via security definer RPCs
alter table public.lucky_settings enable row level security;
alter table public.lucky_pools enable row level security;
alter table public.lucky_gifts enable row level security;
alter table public.lucky_spins enable row level security;

-- 6. APP RPC: send_room_lucky_gift
create or replace function public.send_room_lucky_gift(
  p_room uuid,
  p_gift text,
  p_quantity integer,
  p_to uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender uuid := auth.uid();
  v_cost bigint;
  v_recipients int;
  v_total_cost bigint;
  v_gift record;
  v_settings record;
  v_pool record;
  v_mic_total bigint;
  v_platform_total bigint;
  v_pool_total bigint;
  v_sender_coins bigint;
  v_roll int;
  v_cum int := 0;
  v_i int;
  v_mult int := 0;
  v_potential_prize bigint;
  v_prize bigint := 0;
  v_spin_id bigint;
  v_target uuid;
  v_each_ch bigint;
  v_announce boolean := false;
begin
  if v_sender is null then
    raise exception 'not_authenticated';
  end if;

  if p_quantity is null or p_quantity <= 0 or p_quantity > 9999 then
    raise exception 'invalid_quantity';
  end if;

  v_recipients := coalesce(array_length(p_to, 1), 0);
  if v_recipients = 0 then
    raise exception 'no_recipients';
  end if;

  select key, name, price, kind
    into v_gift
    from public.room_gift_catalog
   where key = p_gift and active = true;

  if not found or v_gift.kind not in ('lucky', 'crazy') then
    raise exception 'gift_not_found';
  end if;

  select * into v_settings from public.lucky_settings where kind = v_gift.kind;
  if not found or not v_settings.enabled then
    raise exception 'lucky_disabled';
  end if;

  v_total_cost := (v_gift.price::bigint * p_quantity::bigint) * v_recipients::bigint;

  -- Lock sender profile
  select coins into v_sender_coins
    from public.profiles
   where auth_id = v_sender
     for update;

  if v_sender_coins < v_total_cost then
    raise exception 'insufficient_coins';
  end if;

  -- Split amounts
  v_mic_total := floor(v_total_cost::numeric * (v_settings.mic_pct / 100.0))::bigint;
  v_platform_total := floor(v_total_cost::numeric * (v_settings.platform_pct / 100.0))::bigint;
  v_pool_total := v_total_cost - v_mic_total - v_platform_total;

  -- Deduct sender coins
  update public.profiles
     set coins = coins - v_total_cost,
         wealth_points = wealth_points + v_total_cost
   where auth_id = v_sender;

  -- Distribute mic charisma
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
      -- Find largest multiplier pool can cover
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

  -- Record spin
  insert into public.lucky_spins (
    room_id, sender_id, receiver_id, gift_key, kind, quantity, cost,
    to_receivers, to_platform, to_pool, drawn, multiplier, prize, recipients_count
  ) values (
    p_room, v_sender, p_to[1], p_gift, v_gift.kind, p_quantity, v_total_cost,
    v_mic_total, v_platform_total, v_pool_total, v_mult, v_mult, v_prize, v_recipients
  ) returning id into v_spin_id;

  -- Update gift stats
  update public.lucky_gifts
     set spent = spent + v_total_cost,
         won = won + v_prize,
         spins = spins + 1,
         updated_at = now()
   where gift_key = p_gift;

  v_announce := (v_mult >= v_settings.banner_from);

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

-- 7. APP RPC: lucky_latest_spin
create or replace function public.lucky_latest_spin()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(max(id), 0) from public.lucky_spins;
$$;

-- 8. APP RPC: lucky_big_wins_since
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
    g.name as gift_name,
    s.multiplier,
    s.prize,
    coalesce(r.title, 'غرفة فولي') as room_name
  from public.lucky_spins s
  join public.room_gift_catalog g on g.key = s.gift_key
  left join public.profiles p on p.auth_id = s.sender_id
  left join public.rooms r on r.id = s.room_id
  where s.id > coalesce(p_after, 0)
    and s.multiplier >= 50
    and s.prize > 0
  order by s.id asc
  limit 10;
$$;

-- 9. ADMIN RPC: admin_lucky_overview
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
  v_spent numeric;
  v_won numeric;
  v_mic numeric;
  v_plat numeric;
  v_pools numeric;
  v_spins bigint;
  v_wins bigint;
  v_cfg record;
begin
  perform public.admin_guard();

  select coalesce(sum(cost), 0), coalesce(sum(prize), 0), coalesce(sum(to_receivers), 0),
         count(*), coalesce(count(*) filter (where prize > 0), 0)
    into v_spent, v_won, v_mic, v_spins, v_wins
    from public.lucky_spins;

  select coalesce(sum(balance), 0), coalesce(sum(platform_total), 0)
    into v_pools, v_plat
    from public.lucky_pools;

  select * into v_cfg from public.lucky_settings order by (case when kind = 'global' then 0 else 1 end) limit 1;

  total_spent := v_spent;
  total_won := v_won;
  total_mic := v_mic;
  net_profit := v_plat;
  pools := v_pools;
  spins := v_spins;
  wins := v_wins;
  mic_pct := coalesce(v_cfg.mic_pct, 9.2);
  pool_pct := coalesce(v_cfg.pool_pct, 75.0);
  platform_pct := coalesce(v_cfg.platform_pct, 15.8);
  safety_floor := coalesce(v_cfg.safety_floor, 10000);
  big_from := coalesce(v_cfg.big_from, 100);
  banner_from := coalesce(v_cfg.banner_from, 500);
  enabled := coalesce(v_cfg.enabled, true);

  return next;
end;
$$;

-- 10. ADMIN RPC: admin_lucky_settings_set
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
    raise exception 'invalid_split';
  end if;

  update public.lucky_settings
     set mic_pct = p_mic,
         pool_pct = p_pool,
         platform_pct = v_plat,
         safety_floor = p_safety_floor,
         big_from = p_big_from,
         banner_from = p_banner_from,
         enabled = p_enabled,
         updated_at = now();
end;
$$;

-- 11. ADMIN RPC: admin_lucky_gifts
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
    coalesce(lg.multipliers, '{}'::integer[]),
    coalesce(lp.balance, 0)::numeric as pool,
    coalesce(lg.spent, 0)::numeric as spent,
    coalesce(lg.won, 0)::numeric as won,
    coalesce(lg.spins, 0)::bigint as spins
  from public.room_gift_catalog g
  left join public.lucky_gifts lg on lg.gift_key = g.key
  left join public.lucky_pools lp on lp.kind = g.kind
  where g.kind in ('lucky', 'crazy')
  order by g.sort asc, g.price asc;
end;
$$;

-- 12. ADMIN RPC: admin_lucky_gift_set
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

-- 13. ADMIN RPC: admin_lucky_spins
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
    coalesce(s.sender_id::text, '') as sender,
    coalesce(sp.display_name, 'مستخدم') as sender_name,
    coalesce(s.receiver_id::text, '') as receiver,
    coalesce(rp.display_name, 'مستخدم') as receiver_name,
    s.gift_key,
    g.name as gift_name,
    s.kind,
    s.cost::numeric as spent,
    s.multiplier,
    s.prize::numeric as won,
    s.created_at
  from public.lucky_spins s
  join public.room_gift_catalog g on g.key = s.gift_key
  left join public.profiles sp on sp.auth_id = s.sender_id
  left join public.profiles rp on rp.auth_id = s.receiver_id
  where (not p_wins_only or s.prize > 0)
  order by s.created_at desc
  limit coalesce(p_limit, 100);
end;
$$;

notify pgrst, 'reload schema';
