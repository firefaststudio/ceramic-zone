-- Add direct reference from review queue to pdf_points
alter table pdf_review_queue
  add column point_id uuid references pdf_points(id);
