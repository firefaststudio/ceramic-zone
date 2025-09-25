-- Migrazione 004: rimuove la colonna testuale `category` da products
-- Eseguire solo quando frontend e integrazioni non dipendono più dalla colonna

ALTER TABLE public.products
DROP COLUMN IF EXISTS category;
