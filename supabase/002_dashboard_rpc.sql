-- Combinvest dashboard RPCs
-- Run after schema.sql in the Supabase SQL Editor.

begin;

create or replace function public.create_customer_with_analysis(
  p_first_name text,
  p_last_name text,
  p_birthdate date default null,
  p_email text default null,
  p_phone text default null,
  p_postcode text default null,
  p_city text default null
)
returns table(customer_id uuid, analysis_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_advisor_id uuid := private.current_advisor_id();
  v_org_id uuid := private.current_organization_id();
  v_customer_id uuid;
  v_analysis_id uuid;
begin
  if v_advisor_id is null or v_org_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.customers(
    organization_id,customer_type,first_name,last_name,birthdate,email,phone,
    postcode,city,created_by,source
  ) values (
    v_org_id,'private',nullif(trim(p_first_name),''),nullif(trim(p_last_name),''),
    p_birthdate,nullif(trim(p_email),''),nullif(trim(p_phone),''),
    nullif(trim(p_postcode),''),nullif(trim(p_city),''),
    v_advisor_id,'combinvest'
  ) returning id into v_customer_id;

  insert into public.customer_advisors(customer_id,advisor_id,assignment_role,assigned_by)
  values(v_customer_id,v_advisor_id,'primary',v_advisor_id);

  insert into public.analyses(
    organization_id,customer_id,advisor_id,title,status,current_step,current_question,progress_percent
  ) values (
    v_org_id,v_customer_id,v_advisor_id,'Finanzstatus Check','draft',1,0,0
  ) returning id into v_analysis_id;

  return query select v_customer_id,v_analysis_id;
end;
$$;

revoke all on function public.create_customer_with_analysis(text,text,date,text,text,text,text) from public,anon;
grant execute on function public.create_customer_with_analysis(text,text,date,text,text,text,text) to authenticated;

create or replace function public.start_customer_analysis(p_customer_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_analysis_id uuid;
begin
  if not private.can_access_customer(p_customer_id) then
    raise exception 'customer_forbidden';
  end if;
  insert into public.analyses(organization_id,customer_id,advisor_id,title,status)
  values(
    private.current_organization_id(),p_customer_id,private.current_advisor_id(),
    'Finanzstatus Check','draft'
  ) returning id into v_analysis_id;
  return v_analysis_id;
end;
$$;

revoke all on function public.start_customer_analysis(uuid) from public,anon;
grant execute on function public.start_customer_analysis(uuid) to authenticated;

commit;
