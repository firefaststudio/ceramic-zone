migrate-products script
=======================

This script imports products from `data/products.json` into the `products` table.

Environment variables supported:
- `SUPABASE_URL` and `SUPABASE_KEY` — will use `@supabase/supabase-js` to upsert rows.
- `DATABASE_URL` — will use `pg` client to connect directly to Postgres and upsert rows.

Usage examples:

```powershell
# using supabase client
$env:SUPABASE_URL='https://xyz.supabase.co'; $env:SUPABASE_KEY='your_key'; node ./scripts/migrate-products.js

# using DATABASE_URL
$env:DATABASE_URL='postgresql://user:pass@host:5432/dbname'; node ./scripts/migrate-products.js
```

Notes:
- The script performs upserts (insert or update) and stores `images` as JSONB.
- Ensure the `products` table exists (run `db/migrations/001_create_tables.sql` first).
