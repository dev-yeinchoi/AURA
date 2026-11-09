-- Additive research logs. Existing decisions, stimuli, assignments and responses are untouched.
alter table public.rounds add column id uuid not null default gen_random_uuid();
create unique index rounds_id_key on public.rounds(id);

create table public.attention_check_responses (
  participant_id uuid not null,
  round_no smallint not null check (round_no in (1, 2)),
  round_id uuid not null references public.rounds(id),
  risk_level text not null check (risk_level in ('low', 'high')),
  selected_option smallint not null check (selected_option between 1 and 4),
  correct_option smallint not null check (correct_option between 1 and 4),
  is_correct boolean not null,
  response_ms bigint check (response_ms is null or response_ms >= 0),
  submitted_at timestamptz not null default now(),
  primary key (participant_id, round_no),
  foreign key (participant_id, round_no) references public.rounds(participant_id, round_no),
  constraint attention_correctness_matches check (is_correct = (selected_option = correct_option))
);

-- Recover previously submitted answers. Historical response time is available only
-- when the corresponding page visit was closed; otherwise it remains NULL.
insert into public.attention_check_responses
  (participant_id, round_no, round_id, risk_level, selected_option, correct_option,
   is_correct, response_ms, submitted_at)
select a.participant_id, a.round_no, r.id, r.risk_level, a.answer_number,
  case when r.risk_level = 'low' then 2 else 3 end,
  a.answer_number = case when r.risk_level = 'low' then 2 else 3 end,
  (select v.wall_ms from public.page_visits v
   where v.participant_id = a.participant_id and v.round_no = a.round_no
     and v.page_key = 'attention' and v.wall_ms is not null
   order by v.entered_at desc limit 1),
  coalesce(a.submitted_at, a.updated_at)
from public.survey_answers a
join public.rounds r on r.participant_id = a.participant_id and r.round_no = a.round_no
where a.instrument = 'attention_check' and a.question_key = 'task'
  and a.answer_number between 1 and 4
on conflict (participant_id, round_no) do nothing;

create table public.scenario_segment_visits (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  round_no smallint not null check (round_no in (1, 2)),
  round_id uuid not null references public.rounds(id),
  risk_level text not null check (risk_level in ('low', 'high')),
  segment_no smallint not null check (segment_no in (1, 2)),
  entered_at timestamptz not null default now(),
  left_at timestamptz,
  wall_ms bigint check (wall_ms is null or wall_ms >= 0),
  exit_reason text,
  foreign key (participant_id, round_no) references public.rounds(participant_id, round_no),
  constraint scenario_segment_time_order check (left_at is null or left_at >= entered_at)
);
create index scenario_segment_visits_lookup
  on public.scenario_segment_visits(participant_id, round_no, entered_at);
create unique index scenario_segment_one_open
  on public.scenario_segment_visits(participant_id, round_no) where left_at is null;

create function public.record_scenario_segment(
  p_participant_id uuid, p_round_no smallint, p_segment_no smallint,
  p_exit_reason text default 'next'
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_round public.rounds%rowtype; v_open public.scenario_segment_visits%rowtype; v_now timestamptz := clock_timestamp();
begin
  if p_round_no not in (1, 2) or (p_segment_no is not null and p_segment_no not in (1, 2)) then
    raise exception 'Invalid scenario segment';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_participant_id::text || ':scenario:' || p_round_no, 0));
  select * into v_round from public.rounds
  where participant_id = p_participant_id and round_no = p_round_no;
  if not found then raise exception 'Round unavailable'; end if;
  select * into v_open from public.scenario_segment_visits
  where participant_id = p_participant_id and round_no = p_round_no and left_at is null
  for update;
  if v_open.id is not null and v_open.segment_no = p_segment_no then return; end if;
  if v_open.id is not null then
    update public.scenario_segment_visits
    set left_at = v_now, wall_ms = greatest(0, floor(extract(epoch from (v_now - entered_at)) * 1000)::bigint),
      exit_reason = p_exit_reason
    where id = v_open.id;
  end if;
  if p_segment_no is not null then
    if not exists (select 1 from public.page_visits
      where participant_id = p_participant_id and round_no = p_round_no
        and page_key = 'scenario' and left_at is null) then
      raise exception 'Scenario page is not open';
    end if;
    insert into public.scenario_segment_visits
      (participant_id, round_no, round_id, risk_level, segment_no, entered_at)
    values (p_participant_id, p_round_no, v_round.id, v_round.risk_level, p_segment_no, v_now);
  end if;
end;
$$;

alter table public.case_expansion_events
  add column round_id uuid references public.rounds(id),
  add column risk_level text check (risk_level in ('low', 'high')),
  add column event_key uuid,
  add column origin text not null default 'user' check (origin in ('user', 'navigation', 'hidden', 'legacy')),
  add column open_duration_ms bigint check (open_duration_ms is null or open_duration_ms >= 0);
update public.case_expansion_events e
set round_id = r.id, risk_level = r.risk_level, origin = 'legacy'
from public.rounds r
where r.participant_id = e.participant_id and r.round_no = e.round_no;
alter table public.case_expansion_events
  alter column round_id set not null,
  alter column risk_level set not null;
create unique index case_expansion_event_key_unique
  on public.case_expansion_events(event_key) where event_key is not null;

create table public.case_expansion_summary (
  participant_id uuid not null,
  round_no smallint not null check (round_no in (1, 2)),
  round_id uuid not null references public.rounds(id),
  risk_level text not null check (risk_level in ('low', 'high')),
  employee_id text not null check (employee_id ~ '^[AB](0[1-9]|1[0-2])$'),
  first_viewed_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  final_expanded boolean not null default false,
  open_started_at timestamptz,
  accumulated_open_ms bigint not null default 0 check (accumulated_open_ms >= 0),
  updated_at timestamptz not null default now(),
  primary key (participant_id, round_no, employee_id),
  foreign key (participant_id, round_no) references public.rounds(participant_id, round_no),
  constraint case_open_matches_state check (final_expanded = (open_started_at is not null))
);

-- Legacy events keep their original rows. Unknown durations are not fabricated.
insert into public.case_expansion_summary
  (participant_id, round_no, round_id, risk_level, employee_id, first_viewed_at,
   view_count, final_expanded, accumulated_open_ms, updated_at)
select participant_id, round_no, min(round_id::text)::uuid, min(risk_level), employee_id,
  min(changed_at) filter (where expanded), count(*) filter (where expanded), false, 0, max(changed_at)
from public.case_expansion_events
group by participant_id, round_no, employee_id
on conflict do nothing;

create function public.record_case_expansion(
  p_participant_id uuid, p_round_no smallint, p_employee_id text,
  p_expanded boolean, p_event_key uuid default null
) returns public.case_expansion_summary
language plpgsql security invoker set search_path = '' as $$
declare v_round public.rounds%rowtype; v_summary public.case_expansion_summary%rowtype;
  v_now timestamptz := clock_timestamp(); v_duration bigint;
begin
  if p_round_no not in (1, 2) or p_employee_id !~ '^[AB](0[1-9]|1[0-2])$' then
    raise exception 'Invalid case expansion';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_participant_id::text || ':case:' || p_round_no || ':' || p_employee_id, 0));
  select * into v_round from public.rounds
  where participant_id = p_participant_id and round_no = p_round_no;
  if not found or left(p_employee_id, 1) <> v_round.form_code then raise exception 'Round or employee unavailable'; end if;
  if not exists (select 1 from public.assignments
    where participant_id = p_participant_id and explanation_type = 'case') then
    raise exception 'Case explanation unavailable';
  end if;
  if not exists (select 1 from public.page_visits
    where participant_id = p_participant_id and round_no = p_round_no
      and page_key = 'advice' and left_at is null) then
    raise exception 'Advice page is not open';
  end if;
  insert into public.case_expansion_summary
    (participant_id, round_no, round_id, risk_level, employee_id)
  values (p_participant_id, p_round_no, v_round.id, v_round.risk_level, p_employee_id)
  on conflict do nothing;
  select * into v_summary from public.case_expansion_summary
  where participant_id = p_participant_id and round_no = p_round_no and employee_id = p_employee_id
  for update;
  if p_event_key is not null and exists (select 1 from public.case_expansion_events where event_key = p_event_key) then
    return v_summary;
  end if;
  if v_summary.final_expanded = p_expanded then return v_summary; end if;
  v_duration := case when p_expanded then null else
    greatest(0, floor(extract(epoch from (v_now - v_summary.open_started_at)) * 1000)::bigint) end;
  update public.case_expansion_summary set
    first_viewed_at = case when p_expanded then coalesce(first_viewed_at, v_now) else first_viewed_at end,
    view_count = view_count + case when p_expanded then 1 else 0 end,
    final_expanded = p_expanded,
    open_started_at = case when p_expanded then v_now else null end,
    accumulated_open_ms = accumulated_open_ms + coalesce(v_duration, 0),
    updated_at = v_now
  where participant_id = p_participant_id and round_no = p_round_no and employee_id = p_employee_id
  returning * into v_summary;
  insert into public.case_expansion_events
    (participant_id, round_no, round_id, risk_level, employee_id, expanded,
     changed_at, event_key, origin, open_duration_ms)
  values (p_participant_id, p_round_no, v_round.id, v_round.risk_level,
    p_employee_id, p_expanded, v_now, p_event_key, 'user', v_duration);
  return v_summary;
end;
$$;

create function public.close_open_case_expansions(
  p_participant_id uuid, p_round_no smallint, p_origin text default 'navigation'
) returns integer language plpgsql security invoker set search_path = '' as $$
declare v_row public.case_expansion_summary%rowtype; v_now timestamptz := clock_timestamp(); v_duration bigint; v_count integer := 0;
begin
  if p_origin not in ('navigation', 'hidden') then raise exception 'Invalid close origin'; end if;
  for v_row in select * from public.case_expansion_summary
    where participant_id = p_participant_id and round_no = p_round_no and final_expanded
    order by employee_id for update
  loop
    v_duration := greatest(0, floor(extract(epoch from (v_now - v_row.open_started_at)) * 1000)::bigint);
    update public.case_expansion_summary set
      final_expanded = false, open_started_at = null,
      accumulated_open_ms = accumulated_open_ms + v_duration,
      updated_at = v_now
    where participant_id = p_participant_id and round_no = p_round_no and employee_id = v_row.employee_id;
    insert into public.case_expansion_events
      (participant_id, round_no, round_id, risk_level, employee_id, expanded,
       changed_at, origin, open_duration_ms)
    values (p_participant_id, p_round_no, v_row.round_id, v_row.risk_level,
      v_row.employee_id, false, v_now, p_origin, v_duration);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

alter table public.attention_check_responses enable row level security;
alter table public.scenario_segment_visits enable row level security;
alter table public.case_expansion_summary enable row level security;
revoke all on table public.attention_check_responses, public.scenario_segment_visits,
  public.case_expansion_summary from public, anon, authenticated;
grant select, insert, update on table public.attention_check_responses,
  public.scenario_segment_visits, public.case_expansion_summary to service_role;
grant select, insert, update on table public.case_expansion_events to service_role;
revoke all on function public.record_scenario_segment(uuid,smallint,smallint,text),
  public.record_case_expansion(uuid,smallint,text,boolean,uuid),
  public.close_open_case_expansions(uuid,smallint,text) from public, anon, authenticated;
grant execute on function public.record_scenario_segment(uuid,smallint,smallint,text),
  public.record_case_expansion(uuid,smallint,text,boolean,uuid),
  public.close_open_case_expansions(uuid,smallint,text) to service_role;
