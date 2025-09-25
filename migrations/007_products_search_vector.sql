-- Migrazione 007: aggiunge search_vector, indice full-text e trigger per products

-- 1) aggiungi colonna
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2) popolamento iniziale
UPDATE public.products
SET search_vector = 
  setweight(to_tsvector('italian', coalesce(name,'')), 'A') ||
  setweight(to_tsvector('italian', coalesce(description,'')), 'B');

-- 3) indice GIN
CREATE INDEX IF NOT EXISTS products_search_idx
  ON public.products
  USING gin(search_vector);

-- 4) funzione di aggiornamento
CREATE OR REPLACE FUNCTION public.products_tsvector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('italian', coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('italian', coalesce(NEW.description,'')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 5) trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tsvectorupdate_products'
  ) THEN
    CREATE TRIGGER tsvectorupdate_products
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW EXECUTE PROCEDURE public.products_tsvector_update();
  END IF;
END
$$;

-- 6) RPC function per ricerca
CREATE OR REPLACE FUNCTION public.search_products(query text)
RETURNS SETOF public.products AS $$
  SELECT *
  FROM public.products
  WHERE search_vector @@ plainto_tsquery('italian', query)
  ORDER BY ts_rank_cd(search_vector, plainto_tsquery('italian', query)) DESC;
$$ LANGUAGE sql STABLE;
