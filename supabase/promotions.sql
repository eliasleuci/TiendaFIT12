-- Promotions table for FIT12
-- Run AFTER schema.sql in the Supabase SQL editor

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  discount_pct numeric(5,2) not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table promotions enable row level security;

drop policy if exists "promotions publicly readable" on promotions;
create policy "promotions publicly readable"
  on promotions for select
  using (true);

drop policy if exists "authenticated users manage promotions" on promotions;
create policy "authenticated users manage promotions"
  on promotions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Storage bucket: create via Supabase Dashboard > Storage > New bucket
-- Name: product-images
-- Public: ON
-- Or run: insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;

-- Storage policies for product-images bucket
drop policy if exists "Public product images read" on storage.objects;
create policy "Public product images read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Authenticated users upload product images" on storage.objects;
create policy "Authenticated users upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "Authenticated users delete product images" on storage.objects;
create policy "Authenticated users delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
