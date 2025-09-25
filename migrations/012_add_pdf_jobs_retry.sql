-- Add retry/backoff support to pdf_jobs
alter table pdf_jobs
  add column retry_count int default 0,
  add column last_error text;
