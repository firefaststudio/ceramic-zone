-- Migration 011: create pdf_points table to store extracted bullet/number points
CREATE TABLE IF NOT EXISTS public.pdf_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id uuid REFERENCES public.pdf_jobs(trace_id) ON DELETE CASCADE,
  punto_text text NOT NULL,
  ordine integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdf_points_trace_id ON public.pdf_points (trace_id, ordine);
