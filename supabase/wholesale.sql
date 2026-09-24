-- Wholesale (mayorista) section
-- Run AFTER schema.sql in the Supabase SQL editor
--
-- Wholesale clients don't have Supabase accounts: they identify with their DNI,
-- and the storefront reads wholesale data only through the security-definer
-- functions below, which check the DNI on every call. The tables themselves are
-- only readable by the admin, so wholesale prices never leak through the public API.

create table if not exists wholesale_clients (
  id uuid primary key default gen_random_uuid(),
  dni text not null unique,
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists wholesale_prices (
  product_id uuid primary key references products(id) on delete cascade,
  price numeric(12,2) not null,
  updated_at timestamptz not null default now()
);

-- Categories shown in the wholesale section
create table if not exists wholesale_categories (
  category_id uuid primary key references categories(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists wholesale_settings (
  id integer primary key default 1 check (id = 1),
  min_order numeric(12,2) not null default 0
);
insert into wholesale_settings (id) values (1) on conflict do nothing;

alter table wholesale_clients enable row level security;
alter table wholesale_prices enable row level security;
alter table wholesale_settings enable row level security;
alter table wholesale_categories enable row level security;

drop policy if exists "authenticated users manage wholesale clients" on wholesale_clients;
create policy "authenticated users manage wholesale clients"
  on wholesale_clients for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users manage wholesale prices" on wholesale_prices;
create policy "authenticated users manage wholesale prices"
  on wholesale_prices for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users manage wholesale settings" on wholesale_settings;
create policy "authenticated users manage wholesale settings"
  on wholesale_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users manage wholesale categories" on wholesale_categories;
create policy "authenticated users manage wholesale categories"
  on wholesale_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Public entry points ------------------------------------------------------

-- Returns the client's name and the minimum order if the DNI is enabled, no rows otherwise
create or replace function wholesale_login(p_dni text)
returns table (name text, min_order numeric)
language sql
stable
security definer
set search_path = public
as $$
  select c.name, s.min_order
  from wholesale_clients c
  cross join wholesale_settings s
  where c.dni = regexp_replace(coalesce(p_dni, ''), '\D', '', 'g')
    and c.active
    and s.id = 1;
$$;

-- Active products in an enabled category that have a wholesale price, with "price" set to the wholesale
-- price and the regular one in "retail_price". Empty if the DNI is not enabled.
create or replace function wholesale_catalog(p_dni text)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(p) || jsonb_build_object('price', w.price, 'retail_price', p.price)
  from products p
  join wholesale_prices w on w.product_id = p.id
  where p.active
    and exists (select 1 from wholesale_categories wc where wc.category_id = p.category_id)
    and exists (
      select 1 from wholesale_clients c
      where c.dni = regexp_replace(coalesce(p_dni, ''), '\D', '', 'g')
        and c.active
    )
  order by p.name;
$$;

revoke all on function wholesale_login(text) from public;
revoke all on function wholesale_catalog(text) from public;
grant execute on function wholesale_login(text) to anon, authenticated;
grant execute on function wholesale_catalog(text) to anon, authenticated;
