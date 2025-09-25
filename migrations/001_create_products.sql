-- Migrazione 001: crea products, categories, product_images
-- Esegui in Supabase SQL Editor o psql

-- Abilita gen_random_uuid
create extension if not exists "pgcrypto";

-- Tabella prodotti
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 3 and 200),
  slug             text generated always as (
                     lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
                   ) stored,
  description      text,
  price_cents      integer not null check (price_cents >= 0),
  currency         text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  stock            integer not null default 0 check (stock >= 0),
  status           text not null default 'draft' check (status in ('draft','published','archived')),
  images           text[] not null default '{}',
  category         text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Funzione per aggiornare updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Trigger
drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Indici
create index if not exists idx_products_slug on public.products (slug);
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_created_at on public.products (created_at desc);

-- Prodotto di esempio (no-op se già esiste)
insert into public.products (title, description, price_cents, currency, stock, status, images, category)
values (
  'Vaso artigianale smaltato',
  'Vaso in ceramica fatto a mano, finitura lucida.',
  4500,
  'EUR',
  10,
  'published',
  array['https://example.com/img/vaso-1.jpg'],
  'vasi'
)
on conflict do nothing;

-- Tabelle opzionali per categorizzazione e immagini
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text generated always as (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) stored
);
create index if not exists idx_categories_slug on public.categories (slug);

alter table public.products
  add column if not exists category_id uuid references public.categories(id);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt         text,
  position    integer not null default 0
);
create index if not exists idx_product_images_product on public.product_images (product_id, position);
