-- Combinvest Advisory Platform
-- Supabase/PostgreSQL schema v1
-- Copy-paste ready for the Supabase SQL Editor.
--
-- Design goals:
--   * Supabase Auth users are linked to pre-registered Combinvest advisors.
--   * Every business row belongs to one organization.
--   * Advisors see only customers assigned to them; admins/managers see their organization.
--   * Analyses are versioned and autosave-friendly.
--   * Legacy Riskine/Metabase payloads are preserved losslessly as JSONB.
--   * Documents, signatures and Catalyst identifiers remain traceable.

begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin','manager','advisor','backoffice','trainee');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.analysis_status as enum ('draft','in_progress','completed','archived','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.appointment_status as enum ('planned','confirmed','completed','cancelled','no_show');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.document_status as enum ('draft','generated','customer_signed','advisor_pending','ready_to_send','sent','void');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.signature_party as enum ('customer','advisor','trainee');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.import_status as enum ('pending','processing','completed','completed_with_errors','failed');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  legal_name text,
  finma_registry_number text,
  default_street text,
  default_postcode text,
  default_city text,
  default_country_code char(2) not null default 'CH',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advisor_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  external_id text,
  email text not null,
  first_name text not null,
  last_name text not null,
  display_name text generated always as (trim(first_name || ' ' || last_name)) stored,
  role public.app_role not null default 'advisor',
  job_title text,
  location text,
  education text,
  finma_registry_number text,
  phone text,
  street text,
  postcode text,
  city text,
  country_code char(2) not null default 'CH',
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email),
  unique (organization_id, external_id)
);
create unique index if not exists advisor_profiles_email_lower_idx
  on public.advisor_profiles (organization_id, lower(email));
create index if not exists advisor_profiles_auth_user_idx on public.advisor_profiles(auth_user_id);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  catalyst_client_id text,
  customer_number text,
  customer_type text not null default 'private' check (customer_type in ('private','company')),
  salutation text,
  first_name text,
  last_name text,
  company_name text,
  birthdate date,
  gender text,
  email text,
  phone text,
  street text,
  house_number text,
  postcode text,
  city text,
  country_code char(2) not null default 'CH',
  monthly_income numeric(14,2) check (monthly_income is null or monthly_income >= 0),
  preferred_language text not null default 'de-CH',
  status text not null default 'active' check (status in ('lead','active','inactive','archived')),
  source text not null default 'manual',
  source_payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.advisor_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, catalyst_client_id),
  unique (organization_id, customer_number),
  check (
    (customer_type = 'private' and (first_name is not null or last_name is not null))
    or (customer_type = 'company' and company_name is not null)
  )
);
create index if not exists customers_org_name_idx on public.customers(organization_id,last_name,first_name);
create index if not exists customers_catalyst_idx on public.customers(catalyst_client_id);

create table if not exists public.customer_advisors (
  customer_id uuid not null references public.customers(id) on delete cascade,
  advisor_id uuid not null references public.advisor_profiles(id) on delete cascade,
  assignment_role text not null default 'primary' check (assignment_role in ('primary','secondary','backoffice','manager')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.advisor_profiles(id) on delete set null,
  primary key (customer_id, advisor_id, assignment_role)
);
create unique index if not exists one_primary_advisor_per_customer_idx
  on public.customer_advisors(customer_id) where assignment_role = 'primary';
create index if not exists customer_advisors_advisor_idx on public.customer_advisors(advisor_id);

create table if not exists public.customer_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  related_customer_id uuid references public.customers(id) on delete set null,
  relationship_type text not null,
  first_name text,
  last_name text,
  birthdate date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists customer_relationships_customer_idx on public.customer_relationships(customer_id);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  advisor_id uuid not null references public.advisor_profiles(id) on delete restrict,
  title text not null,
  appointment_type text not null default 'consultation',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Europe/Zurich',
  location text,
  status public.appointment_status not null default 'planned',
  notes text,
  external_calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists appointments_advisor_time_idx on public.appointments(advisor_id,starts_at);
create index if not exists appointments_customer_idx on public.appointments(customer_id);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  advisor_id uuid not null references public.advisor_profiles(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  title text not null default 'Finanzstatus Check',
  status public.analysis_status not null default 'draft',
  current_step smallint not null default 1 check (current_step between 1 and 20),
  current_question smallint not null default 0 check (current_question >= 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  schema_version integer not null default 1 check (schema_version > 0),
  source text not null default 'combinvest',
  legacy_riskine_record_id text,
  legacy_external_id text,
  legacy_party_id text,
  legacy_advice_id text,
  catalyst_data_collection_id text,
  latest_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version bigint not null default 1,
  unique (organization_id, legacy_riskine_record_id),
  unique (organization_id, catalyst_data_collection_id)
);
create index if not exists analyses_customer_updated_idx on public.analyses(customer_id,updated_at desc);
create index if not exists analyses_advisor_status_idx on public.analyses(advisor_id,status,updated_at desc);
create index if not exists analyses_snapshot_gin_idx on public.analyses using gin(latest_snapshot);

create table if not exists public.analysis_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  revision_number bigint not null,
  snapshot jsonb not null,
  change_summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.advisor_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (analysis_id, revision_number)
);
create index if not exists analysis_revisions_analysis_idx on public.analysis_revisions(analysis_id,revision_number desc);
create index if not exists analysis_revisions_snapshot_gin_idx on public.analysis_revisions using gin(snapshot);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete set null,
  catalyst_contract_id text,
  legacy_riskine_contract_id text,
  policy_number text,
  contract_type text not null,
  provider_id text,
  provider_name text,
  gross_premium numeric(14,2) check (gross_premium is null or gross_premium >= 0),
  premium_interval text,
  status text,
  start_date date,
  expiry_date date,
  notes text,
  source text not null default 'manual',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, catalyst_contract_id),
  unique (organization_id, legacy_riskine_contract_id)
);
create index if not exists contracts_customer_idx on public.contracts(customer_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete set null,
  document_type text not null,
  title text not null,
  status public.document_status not null default 'draft',
  template_version text,
  storage_bucket text,
  storage_path text,
  sha256 text,
  form_data jsonb not null default '{}'::jsonb,
  catalyst_file_id text,
  generated_by uuid references public.advisor_profiles(id) on delete set null,
  generated_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);
create index if not exists documents_customer_idx on public.documents(customer_id,created_at desc);
create index if not exists documents_analysis_idx on public.documents(analysis_id);

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  document_id uuid not null references public.documents(id) on delete cascade,
  party public.signature_party not null,
  signer_name text not null,
  signer_email text,
  advisor_id uuid references public.advisor_profiles(id) on delete set null,
  signature_method text not null default 'drawn_simple_electronic',
  signature_storage_path text,
  signature_hash text,
  signed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  consent_text text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists signatures_document_idx on public.signatures(document_id);

create table if not exists public.customer_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete set null,
  catalyst_file_id text,
  name text not null,
  content_type text,
  storage_bucket text,
  storage_path text,
  source_url text,
  source_url_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, catalyst_file_id)
);
create index if not exists customer_files_customer_idx on public.customer_files(customer_id);

create table if not exists public.legacy_import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_system text not null default 'riskine_metabase',
  source_filename text not null,
  source_sha256 text not null,
  selected_year integer,
  status public.import_status not null default 'pending',
  total_records integer not null default 0,
  imported_records integer not null default 0,
  skipped_records integer not null default 0,
  error_records integer not null default 0,
  report jsonb not null default '{}'::jsonb,
  started_by uuid references public.advisor_profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, source_sha256, selected_year)
);

create table if not exists public.legacy_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  import_run_id uuid not null references public.legacy_import_runs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  analysis_id uuid references public.analyses(id) on delete set null,
  source_record_id text not null,
  source_client_id text,
  source_external_id text,
  source_public_id text,
  source_party_id text,
  source_advice_id text,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  payload_sha256 text not null,
  mapping_version integer,
  import_error text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, source_record_id)
);
create index if not exists legacy_records_client_idx on public.legacy_records(organization_id,source_client_id);
create index if not exists legacy_records_raw_gin_idx on public.legacy_records using gin(raw_payload);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_advisor_id uuid references public.advisor_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  customer_id uuid references public.customers(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists audit_log_org_time_idx on public.audit_log(organization_id,occurred_at desc);
create index if not exists audit_log_customer_idx on public.audit_log(customer_id,occurred_at desc);

-- Keep updated_at consistent.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare table_name text;
begin
  foreach table_name in array array[
    'organizations','advisor_profiles','customers','appointments','analyses','contracts','documents'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I',table_name);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end $$;

-- Link a newly authenticated user to a pre-registered advisor by email.
create or replace function public.link_auth_user_to_advisor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.advisor_profiles
     set auth_user_id = new.id,
         updated_at = now()
   where auth_user_id is null
     and lower(email) = lower(new.email);
  return new;
end;
$$;
revoke all on function public.link_auth_user_to_advisor() from public, anon, authenticated;
drop trigger if exists on_auth_user_link_advisor on auth.users;
create trigger on_auth_user_link_advisor
  after insert or update of email on auth.users
  for each row execute function public.link_auth_user_to_advisor();

-- RLS helper functions live in a non-exposed schema.
create schema if not exists private;
revoke all on schema private from public;

create or replace function private.current_advisor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ap.id from public.advisor_profiles ap
  where ap.auth_user_id = auth.uid() and ap.active
  limit 1
$$;
create or replace function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select ap.organization_id from public.advisor_profiles ap
  where ap.auth_user_id = auth.uid() and ap.active
  limit 1
$$;
create or replace function private.is_management()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_or(ap.role in ('admin','manager')),false)
  from public.advisor_profiles ap
  where ap.auth_user_id = auth.uid() and ap.active
$$;
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
    where c.id = target_customer_id
      and c.organization_id = private.current_organization_id()
      and (
        private.is_management()
        or exists (
          select 1 from public.customer_advisors ca
          where ca.customer_id = c.id
            and ca.advisor_id = private.current_advisor_id()
        )
      )
  )
$$;
revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- Enable Row Level Security on every business table.
do $$ declare table_name text;
begin
  foreach table_name in array array[
    'organizations','advisor_profiles','customers','customer_advisors','customer_relationships',
    'appointments','analyses','analysis_revisions','contracts','documents','signatures',
    'customer_files','legacy_import_runs','legacy_records','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security',table_name);
  end loop;
end $$;

-- Organization and directory access.
drop policy if exists organization_read on public.organizations;
create policy organization_read on public.organizations for select to authenticated
using (id = private.current_organization_id());
drop policy if exists advisor_directory_read on public.advisor_profiles;
create policy advisor_directory_read on public.advisor_profiles for select to authenticated
using (organization_id = private.current_organization_id());
drop policy if exists advisor_self_update on public.advisor_profiles;

-- Customers and assignments.
drop policy if exists customer_read on public.customers;
create policy customer_read on public.customers for select to authenticated
using (private.can_access_customer(id));
drop policy if exists customer_insert on public.customers;
create policy customer_insert on public.customers for insert to authenticated
with check (organization_id = private.current_organization_id() and created_by = private.current_advisor_id());
drop policy if exists customer_update on public.customers;
create policy customer_update on public.customers for update to authenticated
using (private.can_access_customer(id))
with check (organization_id = private.current_organization_id());
drop policy if exists assignment_read on public.customer_advisors;
create policy assignment_read on public.customer_advisors for select to authenticated
using (private.can_access_customer(customer_id));
drop policy if exists assignment_manage on public.customer_advisors;
create policy assignment_manage on public.customer_advisors for all to authenticated
using (private.is_management() or advisor_id = private.current_advisor_id())
with check (
  exists (select 1 from public.customers c where c.id=customer_id and c.organization_id=private.current_organization_id())
  and (private.is_management() or advisor_id = private.current_advisor_id())
);

-- Generic customer-owned table policies.
do $$ declare table_name text;
begin
  foreach table_name in array array[
    'customer_relationships','appointments','analyses','contracts','documents','customer_files'
  ] loop
    execute format('drop policy if exists %I on public.%I',table_name || '_read',table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.can_access_customer(customer_id))',
      table_name || '_read',table_name
    );
    execute format('drop policy if exists %I on public.%I',table_name || '_write',table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.can_access_customer(customer_id)) with check (organization_id=private.current_organization_id() and private.can_access_customer(customer_id))',
      table_name || '_write',table_name
    );
  end loop;
end $$;

-- Revisions inherit access through their analysis/customer.
drop policy if exists revision_read on public.analysis_revisions;
create policy revision_read on public.analysis_revisions for select to authenticated
using (exists (
  select 1 from public.analyses a
  where a.id=analysis_id and private.can_access_customer(a.customer_id)
));
drop policy if exists revision_insert on public.analysis_revisions;
create policy revision_insert on public.analysis_revisions for insert to authenticated
with check (
  organization_id=private.current_organization_id()
  and exists (select 1 from public.analyses a where a.id=analysis_id and private.can_access_customer(a.customer_id))
);

-- Signatures inherit document/customer access.
drop policy if exists signature_read on public.signatures;
create policy signature_read on public.signatures for select to authenticated
using (exists (
  select 1 from public.documents d
  where d.id=document_id and private.can_access_customer(d.customer_id)
));
drop policy if exists signature_insert on public.signatures;
create policy signature_insert on public.signatures for insert to authenticated
with check (
  organization_id=private.current_organization_id()
  and exists (select 1 from public.documents d where d.id=document_id and private.can_access_customer(d.customer_id))
);

-- Legacy imports are restricted to management.
drop policy if exists import_runs_management on public.legacy_import_runs;
create policy import_runs_management on public.legacy_import_runs for all to authenticated
using (organization_id=private.current_organization_id() and private.is_management())
with check (organization_id=private.current_organization_id() and private.is_management());
drop policy if exists legacy_records_management on public.legacy_records;
create policy legacy_records_management on public.legacy_records for all to authenticated
using (organization_id=private.current_organization_id() and private.is_management())
with check (organization_id=private.current_organization_id() and private.is_management());

-- Audit logs can be inserted by organization users, read by management only.
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log for insert to authenticated
with check (
  organization_id=private.current_organization_id()
  and actor_user_id=auth.uid()
);
drop policy if exists audit_management_read on public.audit_log;
create policy audit_management_read on public.audit_log for select to authenticated
using (organization_id=private.current_organization_id() and private.is_management());

-- Autosave RPC: optimistic locking + immutable revision.
create or replace function public.save_analysis_snapshot(
  p_analysis_id uuid,
  p_expected_lock_version bigint,
  p_step smallint,
  p_question smallint,
  p_progress numeric,
  p_snapshot jsonb,
  p_complete boolean default false
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

  insert into public.analysis_revisions(
    organization_id,analysis_id,revision_number,snapshot,created_by
  ) values (
    saved.organization_id,saved.id,saved.lock_version,p_snapshot,private.current_advisor_id()
  );
  return saved;
end;
$$;
revoke all on function public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean) from public, anon;
grant execute on function public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean) to authenticated;

-- Seed Combinvest organization and advisor directory.
insert into public.organizations(
  slug,name,legal_name,default_street,default_postcode,default_city
) values (
  'combinvest','Combinvest','Combinvest','Hausimollstrasse 3','4622','Egerkingen'
) on conflict (slug) do update set name=excluded.name;

with org as (select id from public.organizations where slug='combinvest'),
data(first_name,last_name,email,finma,phone,location,job_title,education,role) as (
  values
  ('Alina','Moser','alina.moser@combinvest.swiss','F01535031','0794200097','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Alper Yusuf','Ermis','alper.ermis@combinvest.swiss','F01521272','0786987494','Ostermundigen','Aussendienst','Dipl. Finanzberater/in IAF','admin'),
  ('Amine','Biedermann','amine.biedermann@combinvest.swiss','F01461227','0799648253','Egerkingen','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Andy','Straubhaar','andy.straubhaar@combinvest.swiss','F01506590','0791353242','Ostermundigen','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Ilijaz','Alijagic','ilijaz.alijagic@combinvest.swiss','F01493999','0763897571','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Dario','Ammann','dario.ammann@combinvest.swiss','F01571396','0797402613','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Boris','Vujtovic','boris.vujtovic@combinvest.swiss','F01447841','0788845411','Egerkingen','Geschäftsleitung','Dipl. Finanzplanungsexperte NDS HF','manager'),
  ('Cédric','Zimolong','cedric.zimolong@combinvest.swiss','F01532802','0793986589','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Daniel','Hamze','daniel.hamze@combinvest.swiss','F01091259','0788408577','Zürich / Schlieren','Geschäftsleitung','Dipl. Finanzberater/in IAF','manager'),
  ('David','Frenkel','david.frenkel@combinvest.swiss','F01458235','0765015102','Zürich / Schlieren','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Dominic','Kipfer','dominic.kipfer@combinvest.swiss','F01465005','0789238441','Ostermundigen','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Enikö','Tornai','eniko.tornai@combinvest.swiss','F01506407','0766712440','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Filmon','Kidane','filmon.kidane@combinvest.swiss','F01463361','0764748891','Ostermundigen','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Gian Melwin','Joss','gian.joss@combinvest.swiss','F01463862','0794497178','Egerkingen','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Joel Timo','Blum','joel.blum@combinvest.swiss','F01538303','0798253348','Ostermundigen','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Julia','Kwiatkowski','julia.kwiatkowski@combinvest.swiss','F01493084','0799259601','Zürich / Schlieren','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Katarina','Babic','katarina.babic@combinvest.swiss','F01487013','0763877486','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Levin','Reznjak','levin.reznjak@combinvest.swiss','F01461190','0795052239','Zürich / Schlieren','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Michael','Fähndrich','michael.faehndrich@combinvest.swiss','F01456474','0798113132','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Oliver','Steck','oliver.steck@combinvest.swiss','F01461198','0786545584','Ostermundigen','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Reto','Galli','reto.galli@combinvest.swiss','F01446052','0795230403','Ostermundigen','Innendienst / Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Samuel','Mengisteab','samuel.mengisteab@combinvest.swiss','F01534025','0762835411','Zürich / Schlieren','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Senad','Pasalic','senad.pasalic@combinvest.swiss','F01457860','0797613837','Zürich / Schlieren','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Stefan','Haldemann','stefan.haldemann@combinvest.swiss','F01267354','0797915013','Ostermundigen','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Stefan','Rader','stefan.rader@combinvest.swiss','F01506584','0762952413','Zürich / Schlieren','Aussendienst','Dipl. Finanzberater/in IAF','advisor'),
  ('Yohannes','Hailay','yohannes.hailay@combinvest.swiss','F01473655','0782045499','Ostermundigen','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Yonas','Goitom','yonas.goitom@combinvest.swiss','F01473657','0783185666','Ostermundigen','Aussendienst','Versicherungsvermittler/-in VBV','advisor'),
  ('Debora','Wicki','debora.wicki@combinvest.swiss',null,'0767136113','Egerkingen','Innendienst',null,'backoffice'),
  ('Halima','Rasheed','halima.rasheed@combinvest.swiss','F01539209','0765958585','Egerkingen','Innendienst','Versicherungsvermittler/-in VBV','backoffice'),
  ('Janina','Senn','janina.senn@combinvest.swiss',null,'0791716010','Egerkingen','Innendienst',null,'backoffice'),
  ('Mohammed','Yassine','mohammed.yassine@combinvest.swiss',null,'0764530874','Egerkingen','Innendienst / Mytrex','Eidg. dipl. Experte Rechnungslegung und Controlling','backoffice'),
  ('Oliver','Huter','oliver.huter@combinvest.swiss',null,'0799697449','Egerkingen','Innendienst','Dipl. Finanzberater/in IAF','backoffice'),
  ('Yannic','Kuhl','yannic.kuhl@combinvest.swiss','F01462124','0786196118','Egerkingen','Betriebsleiter','Dipl. Finanzberater/in IAF','manager')
)
insert into public.advisor_profiles(
  organization_id,first_name,last_name,email,finma_registry_number,phone,location,job_title,education,role,
  street,postcode,city
)
select org.id,d.first_name,d.last_name,lower(d.email),d.finma,d.phone,d.location,d.job_title,d.education,d.role::public.app_role,
       'Hausimollstrasse 3','4622','Egerkingen'
from org cross join data d
on conflict (organization_id,email) do update set
  first_name=excluded.first_name,last_name=excluded.last_name,
  finma_registry_number=excluded.finma_registry_number,phone=excluded.phone,
  location=excluded.location,job_title=excluded.job_title,education=excluded.education,
  role=excluded.role,active=true,updated_at=now();

-- Link already existing Supabase Auth users after seeding.
update public.advisor_profiles ap
set auth_user_id=u.id,updated_at=now()
from auth.users u
where ap.auth_user_id is null and lower(ap.email)=lower(u.email);

-- API grants. RLS remains the effective authorization layer.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;
revoke execute on all functions in schema public from public,anon;
grant execute on function public.save_analysis_snapshot(uuid,bigint,smallint,smallint,numeric,jsonb,boolean) to authenticated;

commit;
