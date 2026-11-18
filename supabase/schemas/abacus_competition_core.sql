-- VATTAMS Abacus Beads Championship — private online competition core
-- Apply only to the dedicated Abacus Supabase project.
-- All access is server-mediated through authenticated Edge Functions.
-- Do not expose this schema through the Data API.

begin;

create schema if not exists abacus;
revoke all on schema abacus from public, anon, authenticated;
grant usage on schema abacus to service_role;

create table if not exists abacus.competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft','registration_open','registration_closed','scheduled','live','under_review','results_pending','published','cancelled','archived')),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_seconds integer not null check (duration_seconds between 60 and 14400),
  rules_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (registration_closes_at is null or registration_opens_at is null or registration_closes_at > registration_opens_at)
);

create table if not exists abacus.age_groups (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references abacus.competitions(id) on delete cascade,
  code text not null,
  label text not null,
  min_age_months integer not null check (min_age_months >= 0),
  max_age_months integer not null check (max_age_months >= min_age_months),
  question_count integer not null check (question_count between 1 and 500),
  duration_seconds integer not null check (duration_seconds between 60 and 14400),
  created_at timestamptz not null default now(),
  unique (competition_id, code),
  unique (competition_id, id)
);

create table if not exists abacus.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','competition_admin','reviewer','support')),
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (revoked_at is null or revoked_at >= granted_at)
);

create table if not exists abacus.registrations (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references abacus.competitions(id),
  age_group_id uuid not null,
  student_user_id uuid not null references auth.users(id),
  guardian_user_id uuid references auth.users(id),
  student_display_name text not null,
  date_of_birth date not null,
  guardian_consent_at timestamptz,
  consent_version text,
  eligibility_status text not null default 'pending'
    check (eligibility_status in ('pending','approved','rejected','needs_information')),
  registration_status text not null default 'submitted'
    check (registration_status in ('submitted','confirmed','withdrawn','disqualified')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (competition_id, age_group_id)
    references abacus.age_groups(competition_id, id),
  unique (competition_id, student_user_id),
  check ((guardian_user_id is null) or guardian_user_id <> student_user_id),
  check ((eligibility_status <> 'approved') or reviewed_at is not null)
);

create table if not exists abacus.question_bank (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references abacus.competitions(id) on delete cascade,
  age_group_id uuid not null references abacus.age_groups(id) on delete cascade,
  question_code text not null,
  sequence_no integer not null check (sequence_no > 0),
  question_payload jsonb not null,
  marks numeric(7,2) not null default 1 check (marks >= 0),
  content_version text not null,
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review','approved','rejected','retired')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (competition_id, age_group_id, question_code),
  unique (competition_id, age_group_id, sequence_no),
  check ((review_status <> 'approved') or (approved_by is not null and approved_at is not null))
);

-- Answer material is physically separated from student-delivery question payloads.
create table if not exists abacus.answer_keys (
  question_id uuid primary key references abacus.question_bank(id) on delete cascade,
  correct_answer jsonb not null,
  scoring_rule jsonb not null default '{}'::jsonb,
  rationale text,
  version text not null,
  updated_at timestamptz not null default now()
);

create table if not exists abacus.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references abacus.registrations(id),
  competition_id uuid not null references abacus.competitions(id),
  age_group_id uuid not null references abacus.age_groups(id),
  attempt_no smallint not null default 1 check (attempt_no between 1 and 5),
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','submitted','expired','voided','under_review','scored','approved')),
  scheduled_start_at timestamptz not null,
  started_at timestamptz,
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  last_heartbeat_at timestamptz,
  question_set_version text not null,
  idempotency_key uuid not null,
  raw_score numeric(9,2),
  final_score numeric(9,2),
  scoring_version text,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (registration_id, attempt_no),
  unique (idempotency_key),
  check (deadline_at > scheduled_start_at),
  check (submitted_at is null or started_at is not null),
  check (status not in ('scored','approved') or scored_at is not null)
);

create unique index if not exists one_live_attempt_per_registration
  on abacus.exam_attempts(registration_id)
  where status = 'in_progress';

create table if not exists abacus.attempt_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references abacus.exam_attempts(id) on delete cascade,
  question_id uuid not null references abacus.question_bank(id),
  response_payload jsonb,
  response_version integer not null default 1 check (response_version > 0),
  client_saved_at timestamptz,
  server_saved_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table if not exists abacus.result_publications (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references abacus.competitions(id),
  registration_id uuid not null references abacus.registrations(id),
  attempt_id uuid not null references abacus.exam_attempts(id),
  published_score numeric(9,2) not null,
  rank_position integer check (rank_position is null or rank_position > 0),
  result_status text not null default 'approved'
    check (result_status in ('approved','withheld','corrected','revoked')),
  approved_by uuid not null references auth.users(id),
  approved_at timestamptz not null default now(),
  published_at timestamptz,
  unique (competition_id, registration_id),
  unique (attempt_id)
);

create table if not exists abacus.certificates (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null unique references abacus.result_publications(id),
  certificate_number text not null unique,
  object_path text not null unique,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text
);

create table if not exists abacus.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  actor_kind text not null check (actor_kind in ('student','guardian','staff','system')),
  action text not null,
  entity_type text not null,
  entity_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists registrations_student_idx on abacus.registrations(student_user_id);
create index if not exists registrations_competition_status_idx on abacus.registrations(competition_id, eligibility_status, registration_status);
create index if not exists question_bank_release_idx on abacus.question_bank(competition_id, age_group_id, review_status, sequence_no);
create index if not exists attempts_status_deadline_idx on abacus.exam_attempts(status, deadline_at);
create index if not exists attempts_registration_idx on abacus.exam_attempts(registration_id, created_at desc);
create index if not exists responses_attempt_idx on abacus.attempt_responses(attempt_id);
create index if not exists audit_events_entity_idx on abacus.audit_events(entity_type, entity_id, created_at desc);

-- Defense in depth: RLS is enabled, and no client policies are created.
-- Edge Functions use server-side credentials only; browser clients cannot read/write these tables.
do $$
declare
  t text;
begin
  foreach t in array array[
    'competitions','age_groups','staff_roles','registrations','question_bank',
    'answer_keys','exam_attempts','attempt_responses','result_publications',
    'certificates','audit_events'
  ] loop
    execute format('alter table abacus.%I enable row level security', t);
    execute format('revoke all on table abacus.%I from public, anon, authenticated', t);
    execute format('grant all on table abacus.%I to service_role', t);
  end loop;
end $$;

revoke all on all sequences in schema abacus from public, anon, authenticated;
grant usage, select on all sequences in schema abacus to service_role;
alter default privileges in schema abacus revoke all on tables from public, anon, authenticated;
alter default privileges in schema abacus grant all on tables to service_role;
alter default privileges in schema abacus revoke all on sequences from public, anon, authenticated;
alter default privileges in schema abacus grant usage, select on sequences to service_role;

commit;
