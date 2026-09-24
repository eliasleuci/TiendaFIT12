-- Live storefront updates (the store refreshes itself when the admin edits the catalog)
-- Run in the Supabase SQL editor

alter publication supabase_realtime add table products;
alter publication supabase_realtime add table categories;
