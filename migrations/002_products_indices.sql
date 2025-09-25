-- Migrazione 002: indici per ricerca e filtri su products

-- Indice full-text su nome e descrizione (italian)
CREATE INDEX IF NOT EXISTS idx_products_name_desc
  ON public.products USING gin (
    to_tsvector('italian', coalesce(name,'') || ' ' || coalesce(description,''))
  );

-- Indice filtraggio per prezzo
CREATE INDEX IF NOT EXISTS idx_products_price
  ON public.products(price);

-- Indice su disponibilità
CREATE INDEX IF NOT EXISTS idx_products_in_stock
  ON public.products(in_stock);

-- NOTE: esegui in Supabase SQL Editor se la connessione remota non è disponibile.
-- Migrazione 002: indici consigliati per products
-- Esegui se vuoi migliorare le performance di filtro e ricerca

-- Index per category_id
create index if not exists idx_products_category_id on public.products(category_id);

-- GIN index per ricerca testuale su title+description (usa dizionario semplice)
create index if not exists idx_products_title_desc on public.products using gin (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
);
