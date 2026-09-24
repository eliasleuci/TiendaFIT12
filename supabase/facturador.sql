-- Price sync from the facturador (the invoicing app, separate Supabase project)
-- Run in the Supabase SQL editor of the STORE project

-- Facturador "Product".id this product is linked to. Not unique: one facturador
-- product can feed several store products (e.g. "x kg" and "x 1/2 kg")
alter table products add column if not exists facturador_id text;
create index if not exists products_facturador_id_idx on products(facturador_id);
-- Multiplier applied to the facturador price, for products sold in a different
-- unit than the facturador's (e.g. 0.5 for a "x 1/2 kg" product priced per kg)
alter table products add column if not exists facturador_factor numeric(10,4) not null default 1;
alter table products add column if not exists price_synced_at timestamptz;
