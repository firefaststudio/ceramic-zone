DB migration helper
===================

This folder contains a simple SQL migration to create the `products`, `orders` and `order_items` tables used by the project.

How to run
----------

1) Supabase SQL editor

- Open your Supabase project -> Database -> SQL Editor
- Paste the contents of `db/migrations/001_create_tables.sql` and run it.

2) psql (Postgres)

```powershell
# from local machine with psql available
powershell> psql "postgresql://USER:PASSWORD@HOST:PORT/DATABASE" -f db/migrations/001_create_tables.sql
```

3) supabase CLI (if configured)

```powershell
# run using supabase db remote commit or use psql as above
```

Notes
-----
- `images` is stored as `JSONB` to mirror the existing `data/products.json` `images` array.
- The migration uses `IF NOT EXISTS` guards so rerunning is safe.
