-- Dossier report per un singolo trace_id
-- Sostituisci <TRACE_ID_INTERESSATO> con il trace_id effettivo

with job_info as (
  select
    trace_id,
    id as job_id,
    status,
    retry_count,
    last_error,
    created_at,
    updated_at
  from pdf_jobs
  where trace_id = '<TRACE_ID_INTERESSATO>'
),
extraction as (
  select
    trace_id,
    id as extraction_id,
    length(testo) as lunghezza_testo,
    raw_json,
    created_at as extraction_time
  from pdf_extractions
  where trace_id = '<TRACE_ID_INTERESSATO>'
),
points as (
  select
    trace_id,
    id as point_id,
    ordine,
    punto_text
  from pdf_points
  where trace_id = '<TRACE_ID_INTERESSATO>'
),
review as (
  select
    trace_id,
    point_id,
    status as review_status,
    reviewer_id,
    reviewed_at
  from pdf_review_queue
  where trace_id = '<TRACE_ID_INTERESSATO>'
)
select
  j.*,
  e.extraction_id,
  e.lunghezza_testo,
  e.extraction_time,
  p.point_id,
  p.ordine,
  p.punto_text,
  r.review_status,
  r.reviewer_id,
  r.reviewed_at
from job_info j
left join extraction e on j.trace_id = e.trace_id
left join points p on j.trace_id = p.trace_id
left join review r on p.point_id = r.point_id
order by p.ordine;
