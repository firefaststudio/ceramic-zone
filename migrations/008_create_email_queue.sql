-- Migration 008: create email_queue table for email fallback
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to text NOT NULL,
  order_id uuid,
  payload jsonb,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, failed, sent
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_created_at ON public.email_queue (status, created_at);

-- trigger to update updated_at
CREATE OR REPLACE FUNCTION public.refresh_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_updated_at ON public.email_queue;
CREATE TRIGGER trg_refresh_updated_at BEFORE UPDATE ON public.email_queue FOR EACH ROW EXECUTE FUNCTION public.refresh_updated_at();
