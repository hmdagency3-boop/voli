-- voli update 024: SVGA animations for store items (frames made in the panel's frame studio, or ready-made .svga files).
-- Run once in the SQL Editor after update 023. Safe to run again.
--
-- 1) store_items.svga_url: the item's animation, a .svga file on Voli's Cloudinary cloud (raw upload).
--    art_url stays the still picture (store grid, backpack); the app plays svga_url around the avatar when present.
-- 2) Panel functions (admin role checked first): admin_store_svga_ready, admin_create_store_svga_item,
--    admin_set_store_item_svga (null removes), and admin_store_items now also returns svga_url.
-- 3) The last line refreshes the API's function list right away.

begin;

alter table public.store_items add column if not exists svga_url text;

create or replace function public.store_svga_ok(p_url text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_url ~ '^https://res\.cloudinary\.com/zsxxjkqg/raw/upload/[^[:cntrl:]"''<>\\]+\.svga$', false)
$$;
revoke all on function public.store_svga_ok(text) from public, anon, authenticated;

-- Lets the panel check this update is installed before it uploads anything.
create or replace function public.admin_store_svga_ready() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard();
  return true;
end;
$$;
revoke all on function public.admin_store_svga_ready() from public, anon;
grant execute on function public.admin_store_svga_ready() to authenticated;

-- Same list as update 023 plus svga_url (last column).
drop function if exists public.admin_store_items();
create function public.admin_store_items()
returns table(id uuid, kind text, style text, name text, price bigint, days integer, art_url text, video_url text,
  sort integer, active boolean, created_at timestamptz, sold_count bigint, sold_value bigint, owners_now bigint, svga_url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.admin_guard();
  return query
    select i.id, i.kind, i.style, i.name, i.price, i.days, i.art_url, i.video_url, i.sort, i.active, i.created_at,
      (select count(*) from public.store_purchases p where p.item_id = i.id and p.source = 'buy'),
      (select coalesce(sum(p.price), 0)::bigint from public.store_purchases p where p.item_id = i.id and p.source = 'buy'),
      (select count(*) from public.member_items m where m.item_id = i.id and m.expires_at > now()),
      i.svga_url
    from public.store_items i order by i.kind, i.sort, i.created_at;
end;
$$;
revoke all on function public.admin_store_items() from public, anon;
grant execute on function public.admin_store_items() to authenticated;

-- New item with its SVGA animation (for sale right away). Errors (hint): the 023 item checks, bad_item_art, bad_svga.
create or replace function public.admin_create_store_svga_item(p_kind text, p_style text, p_name text, p_price bigint, p_days integer,
  p_sort integer, p_art_url text, p_svga_url text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.admin_guard(); new_id uuid; s integer;
begin
  perform public.store_check_item(p_kind, p_style, p_name, p_price, p_days);
  if not public.store_art_ok(p_art_url) then raise exception 'Bad picture' using errcode = 'P0001', hint = 'bad_item_art'; end if;
  if not public.store_svga_ok(p_svga_url) then raise exception 'Bad SVGA' using errcode = 'P0001', hint = 'bad_svga'; end if;
  s := coalesce(p_sort, (select coalesce(max(sort), 0) + 1 from public.store_items where kind = p_kind));
  insert into public.store_items(kind, style, name, price, days, sort, art_url, svga_url)
    values (p_kind, p_style, btrim(p_name), p_price, p_days, s, p_art_url, p_svga_url) returning id into new_id;
  perform public.admin_log(me, 'store_create', null,
    jsonb_build_object('id', new_id, 'kind', p_kind, 'name', btrim(p_name), 'price', p_price, 'days', p_days, 'svga', true));
  return new_id;
end;
$$;
revoke all on function public.admin_create_store_svga_item(text, text, text, bigint, integer, integer, text, text) from public, anon;
grant execute on function public.admin_create_store_svga_item(text, text, text, bigint, integer, integer, text, text) to authenticated;

-- Add, change or remove (null) an item's SVGA animation.
create or replace function public.admin_set_store_item_svga(p_id uuid, p_svga_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.admin_guard(); n text;
begin
  if p_svga_url is not null and not public.store_svga_ok(p_svga_url) then raise exception 'Bad SVGA' using errcode = 'P0001', hint = 'bad_svga'; end if;
  update public.store_items set svga_url = p_svga_url where id = p_id returning name into n;
  if not found then raise exception 'No such item' using errcode = 'P0001', hint = 'not_found'; end if;
  perform public.admin_log(me, 'store_svga', null, jsonb_build_object('id', p_id, 'name', n, 'removed', p_svga_url is null));
end;
$$;
revoke all on function public.admin_set_store_item_svga(uuid, text) from public, anon;
grant execute on function public.admin_set_store_item_svga(uuid, text) to authenticated;

commit;

-- ---------- Refresh the API's function list right away ----------
notify pgrst, 'reload schema';
