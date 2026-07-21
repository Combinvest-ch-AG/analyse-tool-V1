-- Combinvest Advisory Platform
-- Performance optimization: covering indexes for foreign keys
-- Run after schema.sql and 002_dashboard_rpc.sql in the Supabase SQL Editor.
--
-- Rationale:
--   PostgreSQL does NOT automatically create an index for a foreign key
--   constraint. Unindexed foreign keys slow down joins and force sequential
--   scans of the child table on every parent DELETE/UPDATE (cascade checks).
--   This file adds the missing FK-covering indexes only. It is additive and
--   idempotent (create index if not exists) and never touches schema.sql.
--
--   Foreign keys already covered by an existing index (as index prefix or a
--   dedicated index in schema.sql) are intentionally omitted, e.g.:
--     * customer_advisors.customer_id (PK prefix), .advisor_id (dedicated)
--     * analyses.customer_id / .advisor_id (dedicated composite indexes)
--     * contracts.customer_id, documents.customer_id/.analysis_id,
--       customer_files.customer_id, signatures.document_id (dedicated)
--     * advisor_profiles.organization_id (unique(org,email) prefix)

begin;

-- customers.created_by -> advisor_profiles(id)
create index if not exists customers_created_by_idx
  on public.customers(created_by);

-- customer_relationships.related_customer_id -> customers(id)
create index if not exists customer_relationships_related_customer_idx
  on public.customer_relationships(related_customer_id);

-- analyses.appointment_id -> appointments(id)
create index if not exists analyses_appointment_idx
  on public.analyses(appointment_id);

-- analysis_revisions.created_by -> advisor_profiles(id)
create index if not exists analysis_revisions_created_by_idx
  on public.analysis_revisions(created_by);

-- contracts.analysis_id -> analyses(id)
create index if not exists contracts_analysis_idx
  on public.contracts(analysis_id);

-- documents.generated_by -> advisor_profiles(id)
create index if not exists documents_generated_by_idx
  on public.documents(generated_by);

-- signatures.advisor_id -> advisor_profiles(id)
create index if not exists signatures_advisor_idx
  on public.signatures(advisor_id);

-- customer_files.analysis_id -> analyses(id)
create index if not exists customer_files_analysis_idx
  on public.customer_files(analysis_id);

-- legacy_import_runs.started_by -> advisor_profiles(id)
create index if not exists legacy_import_runs_started_by_idx
  on public.legacy_import_runs(started_by);

-- legacy_records foreign keys (import_run_id, customer_id, analysis_id)
create index if not exists legacy_records_import_run_idx
  on public.legacy_records(import_run_id);
create index if not exists legacy_records_customer_idx
  on public.legacy_records(customer_id);
create index if not exists legacy_records_analysis_idx
  on public.legacy_records(analysis_id);

-- audit_log actor foreign keys (organization/customer already indexed by time)
create index if not exists audit_log_actor_advisor_idx
  on public.audit_log(actor_advisor_id);
create index if not exists audit_log_actor_user_idx
  on public.audit_log(actor_user_id);

commit;
