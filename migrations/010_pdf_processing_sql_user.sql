-- Migration provided by user in message
create table if not exists pdf_jobs (
  id bigserial primary key,
  trace_id uuid not null,
  user_id uuid not null,
  object_url text not null,
  status text not null default 'pending',
  attempts int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pdf_extractions (
  id bigserial primary key,
  job_id bigint references pdf_jobs(id),
  document_id text,
  fields jsonb,
  tables jsonb,
  raw_text text,
  confidence numeric,
  created_at timestamptz default now()
);

create table if not exists pdf_processing_log (
  id bigserial primary key,
  job_id bigint references pdf_jobs(id),
  stage text,
  message text,
  meta jsonb,
  timestamp timestamptz default now()
);

create table if not exists pdf_review_queue (
  id bigserial primary key,
  job_id bigint references pdf_jobs(id),
  reason text,
  snapshot jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_pdf_jobs_status_created_at on pdf_jobs(status, created_at);
