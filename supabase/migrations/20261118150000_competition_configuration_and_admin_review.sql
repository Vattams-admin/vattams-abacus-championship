-- Module 57: versioned competition configuration and audited admin eligibility review.
-- Apply only to the dedicated VATTAMS Abacus Supabase project.
begin;

create table if not exists abacus.competition_config_versions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references abacus.competitions(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  rules_version text not null,
  snapshot jsonb not null,
  changed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (competition_id, version_no)
);

alter table abacus.competition_config_versions enable row level security;
revoke all on table abacus.competition_config_versions from public, anon, authenticated;
grant all on table abacus.competition_config_versions to service_role;

create index if not exists competition_config_versions_latest_idx
  on abacus.competition_config_versions(competition_id, version_no desc);

-- Save a complete, validated configuration as one transaction.
-- The caller must be the trusted admin Edge Function, which verifies abacus.staff_roles
-- from the signed-in user's UUID before invoking this service-role-only RPC.
create or replace function abacus.admin_save_competition_configuration(
  p_competition_id uuid,
  p_actor_user_id uuid,
  p_config jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, abacus
as $$
declare
  v_comp abacus.competitions%rowtype;
  v_group jsonb;
  v_group_count integer := 0;
  v_version integer;
  v_snapshot jsonb;
  v_cutoff date;
  v_opens timestamptz;
  v_closes timestamptz;
  v_status text;
  v_slug text;
  v_title text;
  v_rules text;
  v_duration integer;
  v_existing_count integer;
begin
  if p_actor_user_id is null or p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Invalid configuration request' using errcode = '22023';
  end if;

  v_slug := nullif(btrim(p_config->>'slug'), '');
  v_title := nullif(btrim(p_config->>'title'), '');
  v_rules := nullif(btrim(p_config->>'rules_version'), '');
  v_cutoff := nullif(p_config->>'age_cutoff_date','')::date;
  v_opens := nullif(p_config->>'registration_opens_at','')::timestamptz;
  v_closes := nullif(p_config->>'registration_closes_at','')::timestamptz;
  v_status := coalesce(nullif(p_config->>'status',''), 'draft');
  v_duration := coalesce(nullif(p_config->>'duration_seconds','')::integer, 1800);

  if v_slug is null or v_title is null or v_rules is null or v_cutoff is null then
    raise exception 'Slug, title, rules version and age cutoff date are required' using errcode = '22023';
  end if;
  if v_status not in ('draft','registration_open','registration_closed','scheduled','live','under_review','results_pending','published','cancelled','archived') then
    raise exception 'Unsupported competition status' using errcode = '22023';
  end if;
  if v_duration < 60 or v_duration > 14400 then
    raise exception 'Competition duration must be between 60 and 14400 seconds' using errcode = '22023';
  end if;
  if v_opens is not null and v_closes is not null and v_closes <= v_opens then
    raise exception 'Registration close must be later than registration open' using errcode = '22023';
  end if;
  if jsonb_typeof(p_config->'age_groups') <> 'array' or jsonb_array_length(p_config->'age_groups') = 0 then
    raise exception 'At least one age group is required' using errcode = '22023';
  end if;

  if p_competition_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_competition_id::text, 57));
    select * into v_comp from abacus.competitions where id = p_competition_id for update;
    if not found then raise exception 'Competition not found' using errcode = 'P0002'; end if;
    if exists (select 1 from abacus.exam_attempts where competition_id = p_competition_id)
       and (v_comp.rules_version <> v_rules or v_comp.age_cutoff_date is distinct from v_cutoff) then
      raise exception 'Rules version or age cutoff cannot change after exam attempts exist' using errcode = '55000';
    end if;
    if exists (select 1 from abacus.registrations where competition_id = p_competition_id)
       and v_comp.age_cutoff_date is distinct from v_cutoff then
      raise exception 'Age cutoff cannot change after registrations exist' using errcode = '55000';
    end if;
    update abacus.competitions set
      slug=v_slug, title=v_title, description=p_config->>'description',
      status=v_status, registration_opens_at=v_opens, registration_closes_at=v_closes,
      starts_at=nullif(p_config->>'starts_at','')::timestamptz,
      ends_at=nullif(p_config->>'ends_at','')::timestamptz,
      duration_seconds=v_duration, rules_version=v_rules, age_cutoff_date=v_cutoff,
      updated_at=now()
    where id=p_competition_id returning * into v_comp;
  else
    insert into abacus.competitions(
      slug,title,description,status,registration_opens_at,registration_closes_at,
      starts_at,ends_at,duration_seconds,rules_version,age_cutoff_date
    ) values (
      v_slug,v_title,p_config->>'description',v_status,v_opens,v_closes,
      nullif(p_config->>'starts_at','')::timestamptz,
      nullif(p_config->>'ends_at','')::timestamptz,
      v_duration,v_rules,v_cutoff
    ) returning * into v_comp;
  end if;

  -- Validate every band and reject overlaps before replacing the configuration.
  for v_group in select value from jsonb_array_elements(p_config->'age_groups') loop
    if nullif(btrim(v_group->>'code'),'') is null
       or nullif(btrim(v_group->>'label'),'') is null
       or coalesce((v_group->>'min_age_months')::integer,-1) < 0
       or coalesce((v_group->>'max_age_months')::integer,-1) < (v_group->>'min_age_months')::integer
       or coalesce((v_group->>'question_count')::integer,0) < 1
       or coalesce((v_group->>'question_count')::integer,0) > 500
       or coalesce((v_group->>'duration_seconds')::integer,0) < 60
       or coalesce((v_group->>'duration_seconds')::integer,0) > 14400 then
      raise exception 'Invalid age group configuration' using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_config->'age_groups') x
      where x <> v_group
        and int4range((x->>'min_age_months')::integer,(x->>'max_age_months')::integer,'[]')
            && int4range((v_group->>'min_age_months')::integer,(v_group->>'max_age_months')::integer,'[]')
    ) then
      raise exception 'Age bands overlap; each participant must match at most one band' using errcode = '22023';
    end if;
    v_group_count := v_group_count + 1;
  end loop;

  -- Once an attempt exists, freeze the complete age-band contract. Module 65
  -- relies on question_count and duration_seconds remaining stable on reconnect.
  if exists (select 1 from abacus.exam_attempts where competition_id=v_comp.id) then
    select count(*) into v_existing_count
    from abacus.age_groups where competition_id=v_comp.id;
    if v_existing_count <> jsonb_array_length(p_config->'age_groups')
       or exists (
         select 1 from abacus.age_groups g
         where g.competition_id=v_comp.id
           and not exists (
             select 1 from jsonb_array_elements(p_config->'age_groups') x
             where x->>'code'=g.code
               and x->>'label'=g.label
               and (x->>'min_age_months')::integer=g.min_age_months
               and (x->>'max_age_months')::integer=g.max_age_months
               and (x->>'question_count')::integer=g.question_count
               and (x->>'duration_seconds')::integer=g.duration_seconds
           )
       ) then
      raise exception 'Age-group bands, question counts and durations are frozen after an exam attempt exists' using errcode = '55000';
    end if;
  end if;

  select count(*) into v_existing_count from abacus.registrations where competition_id=v_comp.id;
  if v_existing_count > 0 and exists (
    select 1 from abacus.age_groups g
    where g.competition_id=v_comp.id
      and not exists (
        select 1 from jsonb_array_elements(p_config->'age_groups') x
        where x->>'code'=g.code
          and (x->>'min_age_months')::integer=g.min_age_months
          and (x->>'max_age_months')::integer=g.max_age_months
      )
  ) then
    raise exception 'Existing age bands cannot be removed or re-ranged after registrations exist' using errcode = '55000';
  end if;

  -- Remove obsolete bands only when there are no registrations to preserve.
  if v_existing_count = 0 then
    delete from abacus.age_groups g
    where g.competition_id=v_comp.id
      and not exists (
        select 1 from jsonb_array_elements(p_config->'age_groups') x
        where x->>'code'=g.code
      );
  end if;

  -- Keep existing age-group IDs stable where code is unchanged.
  for v_group in select value from jsonb_array_elements(p_config->'age_groups') loop
    insert into abacus.age_groups(competition_id,code,label,min_age_months,max_age_months,question_count,duration_seconds)
    values (v_comp.id,v_group->>'code',v_group->>'label',
      (v_group->>'min_age_months')::integer,(v_group->>'max_age_months')::integer,
      (v_group->>'question_count')::integer,(v_group->>'duration_seconds')::integer)
    on conflict (competition_id,code) do update set
      label=excluded.label,
      min_age_months=excluded.min_age_months,
      max_age_months=excluded.max_age_months,
      question_count=excluded.question_count,
      duration_seconds=excluded.duration_seconds;
  end loop;

  select coalesce(max(version_no),0)+1 into v_version
  from abacus.competition_config_versions where competition_id=v_comp.id;
  v_snapshot := jsonb_build_object(
    'slug',v_comp.slug,'title',v_comp.title,'description',v_comp.description,
    'status',v_comp.status,'registration_opens_at',v_comp.registration_opens_at,
    'registration_closes_at',v_comp.registration_closes_at,'starts_at',v_comp.starts_at,
    'ends_at',v_comp.ends_at,'duration_seconds',v_comp.duration_seconds,
    'rules_version',v_comp.rules_version,'age_cutoff_date',v_comp.age_cutoff_date,
    'age_groups',p_config->'age_groups'
  );
  insert into abacus.competition_config_versions(competition_id,version_no,rules_version,snapshot,changed_by)
  values(v_comp.id,v_version,v_comp.rules_version,v_snapshot,p_actor_user_id);

  insert into abacus.audit_events(actor_user_id,actor_kind,action,entity_type,entity_id,metadata)
  values(p_actor_user_id,'staff','competition_configuration_saved','competition',v_comp.id::text,
    jsonb_build_object('version_no',v_version,'age_group_count',v_group_count,'status',v_comp.status));

  return jsonb_build_object('competition_id',v_comp.id,'version_no',v_version,'age_group_count',v_group_count,'status',v_comp.status);
end;
$$;

revoke all on function abacus.admin_save_competition_configuration(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function abacus.admin_save_competition_configuration(uuid,uuid,jsonb) to service_role;

create or replace function abacus.admin_review_registration(
  p_registration_id uuid,
  p_actor_user_id uuid,
  p_decision text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, abacus
as $$
declare
  v_registration abacus.registrations%rowtype;
begin
  if p_actor_user_id is null or p_decision not in ('approved','rejected','needs_information') then
    raise exception 'Invalid review request' using errcode = '22023';
  end if;
  select * into v_registration from abacus.registrations
  where id=p_registration_id for update;
  if not found then raise exception 'Registration not found' using errcode = 'P0002'; end if;
  if v_registration.registration_status <> 'submitted' then
    raise exception 'Only submitted registrations can be reviewed' using errcode = '55000';
  end if;
  update abacus.registrations set eligibility_status=p_decision,
    registration_status=case when p_decision='approved' then 'confirmed' else registration_status end,
    reviewed_by=p_actor_user_id,reviewed_at=now(),review_note=left(p_note,1000),updated_at=now()
  where id=p_registration_id;
  insert into abacus.audit_events(actor_user_id,actor_kind,action,entity_type,entity_id,metadata)
  values(p_actor_user_id,'staff','registration_eligibility_'||p_decision,'registration',p_registration_id::text,
    jsonb_build_object('competition_id',v_registration.competition_id,'age_group_id',v_registration.age_group_id));
  return jsonb_build_object('registration_id',p_registration_id,'eligibility_status',p_decision);
end;
$$;

revoke all on function abacus.admin_review_registration(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function abacus.admin_review_registration(uuid,uuid,text,text) to service_role;

commit;
