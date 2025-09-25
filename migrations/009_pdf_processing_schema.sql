-- Migration 009: PDF processing schema

-- pdf_jobs: enqueue incoming PDFs
CREATE TABLE IF NOT EXISTS public.pdf_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text,
  user_id uuid,
  object_url text NOT NULL,
  filename text,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, done, failed
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdf_jobs_status_created_at ON public.pdf_jobs (status, created_at);

-- pdf_extractions: store extracted fields and tables
CREATE TABLE IF NOT EXISTS public.pdf_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.pdf_jobs(id) ON DELETE CASCADE,
  document_id text,
  fields jsonb,
  tables jsonb,
  raw_text text,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_job_id ON public.pdf_extractions (job_id);

-- pdf_processing_log: audit and errors
CREATE TABLE IF NOT EXISTS public.pdf_processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.pdf_jobs(id) ON DELETE CASCADE,
  stage text,
  message text,
  meta jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdf_processing_log_job_id ON public.pdf_processing_log (job_id);

-- pdf_review_queue: for manual review
CREATE TABLE IF NOT EXISTS public.pdf_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.pdf_jobs(id) ON DELETE CASCADE,
  reason text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- trigger to update updated_at
CREATE OR REPLACE FUNCTION public.refresh_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_updated_at ON public.pdf_jobs;
CREATE TRIGGER trg_refresh_updated_at BEFORE UPDATE ON public.pdf_jobs FOR EACH ROW EXECUTE FUNCTION public.refresh_updated_at();

*** End of file
