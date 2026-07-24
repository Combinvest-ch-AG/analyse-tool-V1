-- ============================================================================
-- 004_performance.sql
-- Reduces Supabase CPU/memory load and the optimistic-lock error storm.
--
-- Root causes addressed:
--   1. Every autosave inserted a FULL snapshot copy into analysis_revisions
--      and maintained two GIN indexes on large JSONB -> heavy write/WAL/CPU.
--   2. RLS policies called argument-free helper functions per row instead of
--      once per statement, and can_access_customer did 3 advisor lookups.
--   3. Historic revision bloat (100+ rows for a single analysis).
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the write-amplifying GIN indexes. The app never queries *inside*
--    the snapshot JSONB (it always loads a row by id / customer_id), so these
--    indexes only cost write performance and memory.
-- ---------------------------------------------------------------------------
drop index if exists public.analyses_snapshot_gin_idx;
drop index if exists public.analysis_revisions_snapshot_gin_idx;

-- ---------------------------------------------------------------------------
-- 2. Make revision writes optional. Autosaves now skip the revision insert;
--    milestones (step change, completion, calculator/closing saves) keep one.
-- ---------------------------------------------------------------------------
drop function if exists public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean);

create or replace function public.save_analysis_snapshot(
  p_analysis_id uuid,
  p_expected_lock_version bigint,
  p_step smallint,
  p_question smallint,
  p_progress numeric,
  p_snapshot jsonb,
  p_complete boolean default false,
  p_write_revision boolean default true
)
returns public.analyses
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved public.analyses;
begin
  update public.analyses
     set current_step=p_step,
         current_question=p_question,
         progress_percent=p_progress,
         latest_snapshot=p_snapshot,
         status=case when p_complete then 'completed'::public.analysis_status else 'in_progress'::public.analysis_status end,
         completed_at=case when p_complete then now() else completed_at end,
         lock_version=lock_version+1,
         updated_at=now()
   where id=p_analysis_id
     and lock_version=p_expected_lock_version
  returning * into saved;

  if saved.id is null then
    raise exception 'analysis_conflict_or_forbidden' using errcode='40001';
  end if;

  -- Only persist an immutable revision for milestone saves.
  if p_write_revision then
    insert into public.analysis_revisions(
      organization_id,analysis_id,revision_number,snapshot,created_by
    ) values (
      saved.organization_id,saved.id,saved.lock_version,p_snapshot,(select private.current_advisor_id())
    );
  end if;

  return saved;
end;
$$;
revoke all on function public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean,boolean) from public, anon;
grant execute on function public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Consolidate can_access_customer into a single advisor_profiles join
--    (previously 2-3 separate lookups via current_organization_id /
--    is_management / current_advisor_id, each per evaluated row).
-- ---------------------------------------------------------------------------
create or replace function private.can_access_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.customers c
    join public.advisor_profiles ap
      on ap.organization_id = c.organization_id
     and ap.auth_user_id = auth.uid()
     and ap.active
    where c.id = target_customer_id
      and (
        ap.role in ('admin','manager')
        or exists (
          select 1 from public.customer_advisors ca
          where ca.customer_id = c.id
            and ca.advisor_id = ap.id
        )
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- 4. Rewrite policies so argument-free helpers are evaluated ONCE per
--    statement (InitPlan) via (select ...), not once per row. Semantics are
--    identical; only evaluation frequency changes.
-- ---------------------------------------------------------------------------
drop policy if exists organization_read on public.organizations;
create policy organization_read on public.organizations for select to authenticated
using (id = (select private.current_organization_id()));

drop policy if exists advisor_directory_read on public.advisor_profiles;
create policy advisor_directory_read on public.advisor_profiles for select to authenticated
using (organization_id = (select private.current_organization_id()));

drop policy if exists customer_read on public.customers;
create policy customer_read on public.customers for select to authenticated
using ((select private.can_access_customer(id)));

drop policy if exists customer_insert on public.customers;
create policy customer_insert on public.customers for insert to authenticated
with check (organization_id = (select private.current_organization_id()) and created_by = (select private.current_advisor_id()));

drop policy if exists customer_update on public.customers;
create policy customer_update on public.customers for update to authenticated
using ((select private.can_access_customer(id)))
with check (organization_id = (select private.current_organization_id()));

drop policy if exists assignment_read on public.customer_advisors;
create policy assignment_read on public.customer_advisors for select to authenticated
using ((select private.can_access_customer(customer_id)));

drop policy if exists assignment_manage on public.customer_advisors;
create policy assignment_manage on public.customer_advisors for all to authenticated
using ((select private.is_management()) or advisor_id = (select private.current_advisor_id()))
with check (
  exists (select 1 from public.customers c where c.id=customer_id and c.organization_id=(select private.current_organization_id()))
  and ((select private.is_management()) or advisor_id = (select private.current_advisor_id()))
);

-- Generic customer-owned tables.
do $$ declare table_name text;
begin
  foreach table_name in array array[
    'customer_relationships','appointments','analyses','contracts','documents','customer_files'
  ] loop
    execute format('drop policy if exists %I on public.%I',table_name || '_read',table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.can_access_customer(customer_id)))',
      table_name || '_read',table_name
    );
    execute format('drop policy if exists %I on public.%I',table_name || '_write',table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.can_access_customer(customer_id))) with check (organization_id=(select private.current_organization_id()) and (select private.can_access_customer(customer_id)))',
      table_name || '_write',table_name
    );
  end loop;
end $$;

drop policy if exists revision_read on public.analysis_revisions;
create policy revision_read on public.analysis_revisions for select to authenticated
using (exists (
  select 1 from public.analyses a
  where a.id=analysis_id and (select private.can_access_customer(a.customer_id))
));

drop policy if exists revision_insert on public.analysis_revisions;
create policy revision_insert on public.analysis_revisions for insert to authenticated
with check (
  organization_id=(select private.current_organization_id())
  and exists (select 1 from public.analyses a where a.id=analysis_id and (select private.can_access_customer(a.customer_id)))
);

drop policy if exists signature_read on public.signatures;
create policy signature_read on public.signatures for select to authenticated
using (exists (
  select 1 from public.documents d
  where d.id=document_id and (select private.can_access_customer(d.customer_id))
));

drop policy if exists signature_insert on public.signatures;
create policy signature_insert on public.signatures for insert to authenticated
with check (
  organization_id=(select private.current_organization_id())
  and exists (select 1 from public.documents d where d.id=document_id and (select private.can_access_customer(d.customer_id)))
);

drop policy if exists import_runs_management on public.legacy_import_runs;
create policy import_runs_management on public.legacy_import_runs for all to authenticated
using (organization_id=(select private.current_organization_id()) and (select private.is_management()))
with check (organization_id=(select private.current_organization_id()) and (select private.is_management()));

drop policy if exists legacy_records_management on public.legacy_records;
create policy legacy_records_management on public.legacy_records for all to authenticated
using (organization_id=(select private.current_organization_id()) and (select private.is_management()))
with check (organization_id=(select private.current_organization_id()) and (select private.is_management()));

drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log for insert to authenticated
with check (
  organization_id=(select private.current_organization_id())
  and actor_user_id=auth.uid()
);

drop policy if exists audit_management_read on public.audit_log;
create policy audit_management_read on public.audit_log for select to authenticated
using (organization_id=(select private.current_organization_id()) and (select private.is_management()));

-- ---------------------------------------------------------------------------
-- 5. Thin out historic revision bloat: keep only the 10 most recent revisions
--    per analysis. Reclaims space and shrinks the remaining index.
-- ---------------------------------------------------------------------------
delete from public.analysis_revisions ar
using (
  select id, row_number() over (partition by analysis_id order by revision_number desc) as rn
  from public.analysis_revisions
) ranked
where ar.id = ranked.id and ranked.rn > 10;
