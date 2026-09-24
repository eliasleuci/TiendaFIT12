-- Featured products for the storefront hero slider
-- Run AFTER schema.sql in the Supabase SQL editor

alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists featured_title text;
alter table products add column if not exists featured_subtitle text;
