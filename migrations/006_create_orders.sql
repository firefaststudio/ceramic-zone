-- Migrazione 006: crea la tabella orders (modello guest-friendly)
create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  email text not null,
  status text check (status in ('pending','paid','failed','shipped','delivered')) default 'pending',
  total_cents int not null,
  created_at timestamptz default now()
);

-- Indici utili per tracking e statistiche
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
