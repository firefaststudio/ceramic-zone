-- Migrazione 003: crea e popola la tabella categories, e collega products.category_id (UUID)
-- Usa UUID per mantenere compatibilità con la colonna category_id già presente in products

-- Assicura l'extension per gen_random_uuid
create extension if not exists "pgcrypto";

-- 1) crea la tabella categories (UUID)
create table if not exists public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

-- 2) popola con i valori distinti dalla colonna text `category` in products
-- Insert only the name and let the DB populate the generated slug (if any).
insert into public.categories (name)
select distinct trim(category) as name
from public.products
where category is not null and trim(category) <> ''
on conflict (name) do nothing;

-- 3) assicura la colonna category_id su products (uuid) e crea FK se mancante
alter table public.products
  add column if not exists category_id uuid references public.categories(id);

-- 4) aggiorna products.category_id mappando per slug normalizzato
update public.products p
set category_id = c.id
from public.categories c
where lower(regexp_replace(trim(p.category), '\\s+', '-', 'g')) = c.slug
  and (p.category_id is null or p.category_id <> c.id);

-- Verifiche utili (esegui manualmente se vuoi vedere risultati):
-- select id, name, slug from public.categories order by name;
-- select p.id, p.title, p.category, p.category_id from public.products p where p.category_id is not null limit 10;
