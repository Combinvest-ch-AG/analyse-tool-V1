-- ===========================================================================
-- 005_conflict_no_raise.sql
--
-- WHY THIS EXISTS
-- ---------------------------------------------------------------------------
-- save_analysis_snapshot previously did `raise exception ... errcode 40001`
-- whenever the optimistic lock_version did not match (or the row was not
-- visible under RLS). Every such call ABORTED its transaction. A client that
-- retried without backoff therefore produced a continuous stream of ROLLBACKs
-- (observed at ~2,250 aborted txns/sec), which was the real source of the high
-- database CPU load and the flood of "errors" in the Supabase logs.
--
-- FIX
-- ---------------------------------------------------------------------------
-- The function no longer raises. On a version mismatch / forbidden row it
-- simply RETURNS NO ROWS. The transaction COMMITS cleanly (no rollback, no
-- logged error). The application detects "no row returned" and treats it as a
-- lock conflict, reconciling the version instead of hammering the API.
--
-- The signature is unchanged, so existing callers keep working; only the
-- conflict behaviour changes from "raise" to "return empty".
-- ===========================================================================

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
returns setof public.analyses
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

  -- Conflict (stale lock_version) or RLS-forbidden row: return nothing instead
  -- of raising. No exception => no transaction rollback => no logged error.
  if saved.id is null then
    return;
  end if;

  -- Only persist an immutable revision for milestone saves.
  if p_write_revision then
    insert into public.analysis_revisions(
      organization_id,analysis_id,revision_number,snapshot,created_by
    ) values (
      saved.organization_id,saved.id,saved.lock_version,p_snapshot,(select private.current_advisor_id())
    );
  end if;

  return next saved;
  return;
end;
$$;

revoke all on function public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean,boolean) from public, anon;
grant execute on function public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean,boolean) to authenticated;
