-- Migrazione 005: crea la tabella reviews
-- Migrazione 005: crea la tabella reviews (verificate)
create extension if not exists "pgcrypto";

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating int check (rating between 1 and 5),
  title text,
  body text,
  verified boolean default true,
  created_at timestamptz default now()
);

-- Indice rapido per media/conta recensioni per prodotto
create index if not exists idx_reviews_product_id on public.reviews(product_id);

