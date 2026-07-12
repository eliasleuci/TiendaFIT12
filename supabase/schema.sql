-- FIT12 store schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)

create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  description text default '',
  price numeric(12,2) not null default 0,
  category_id uuid references categories(id) on delete set null,
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on products(category_id);
create index if not exists products_name_idx on products using gin (to_tsvector('spanish', name));

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

-- Row Level Security -----------------------------------------------------
alter table categories enable row level security;
alter table products enable row level security;

-- Anyone (including anonymous storefront visitors) can read categories
drop policy if exists "categories are publicly readable" on categories;
create policy "categories are publicly readable"
  on categories for select
  using (true);

-- Anyone can read active products (storefront)
drop policy if exists "active products are publicly readable" on products;
create policy "active products are publicly readable"
  on products for select
  using (active = true);

-- Only logged-in admins (any authenticated user) can manage data.
-- Since this is a single-owner store, every authenticated user = the admin.
drop policy if exists "authenticated users manage categories" on categories;
create policy "authenticated users manage categories"
  on categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "authenticated users manage products" on products;
create policy "authenticated users manage products"
  on products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Admins also need to see inactive products in the dashboard
drop policy if exists "authenticated users read all products" on products;
create policy "authenticated users read all products"
  on products for select
  using (auth.role() = 'authenticated');
