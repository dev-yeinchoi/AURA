-- Read-only analysis projections preserve every raw response and stimulus version.
-- No attention-check result is used as an exclusion rule.
create view public.analysis_employee_decisions with (security_invoker = true) as
select p.id as participant_id, p.participant_code, p.phase,
  (coalesce(p.consent_document_version = 'SYNTHETIC_TEST_NO_HUMAN_PARTICIPANT', false)
    or p.participant_code ~ '^PT-9[0-9]{6}$') as is_synthetic_test,
  r.id as round_id, r.round_no, r.risk_level, r.form_code,
  a.authority_cue, a.explanation_type, a.stimulus_version,
  d.employee_id, d.stage, d.choice, d.selected_at, d.submitted_at,
  (employee.value->'v'->>0)::integer as experience_months,
  (employee.value->'v'->>1)::integer as weekly_hours,
  (employee.value->'v'->>2)::integer as on_time_count,
  (employee.value->'v'->>3)::integer as requirements_count,
  ((employee.value->'v'->>1)::integer >= 2
    and (employee.value->'v'->>2)::integer >= 3
    and (employee.value->'v'->>3)::integer >= 5) as mandatory_pass,
  ((employee.value->'v'->>0)::integer >= 6
    or (employee.value->'v'->>3)::integer = 6) as additional_pass,
  ((employee.value->'v'->>1)::integer >= 2
    and (employee.value->'v'->>2)::integer >= 3
    and (employee.value->'v'->>3)::integer >= 5
    and ((employee.value->'v'->>0)::integer >= 6
      or (employee.value->'v'->>3)::integer = 6)) as eligible,
  (employee.value->>'ai')::boolean as ai_recommended,
  (employee.value->>'y')::boolean as ground_truth
from public.decisions d
join public.participants p on p.id = d.participant_id
join public.rounds r on r.participant_id = d.participant_id and r.round_no = d.round_no
join public.assignments a on a.participant_id = d.participant_id
join public.stimulus_sets s on s.version = a.stimulus_version
cross join lateral jsonb_array_elements(s.payload->'forms'->r.form_code) employee(value)
where employee.value->>'id' = d.employee_id;

create view public.analysis_round_criteria with (security_invoker = true) as
select participant_id, participant_code, phase, is_synthetic_test,
  round_id, round_no, risk_level, form_code, authority_cue, explanation_type,
  stimulus_version, stage,
  count(*)::integer as employee_count,
  count(*) filter (where choice = 1)::integer as assigned_count,
  count(*) filter (where choice = 1 and not mandatory_pass)::integer
    as mandatory_violation_assignments,
  (count(*) filter (where choice = 1 and not mandatory_pass))::numeric
    / nullif(count(*) filter (where choice = 1), 0) as mandatory_violation_rate,
  count(*) filter (where mandatory_pass)::integer as mandatory_pass_count,
  count(*) filter (where mandatory_pass and choice = 0)::integer
    as mandatory_pass_omissions,
  (count(*) filter (where mandatory_pass and choice = 0))::numeric
    / nullif(count(*) filter (where mandatory_pass), 0) as mandatory_pass_omission_rate,
  count(*) filter (where mandatory_pass and additional_pass)::integer
    as fully_eligible_count,
  count(*) filter (where mandatory_pass and additional_pass and choice = 1)::integer
    as fully_eligible_assigned,
  count(*) filter (where mandatory_pass and additional_pass and choice = 0)::integer
    as fully_eligible_held,
  (count(*) filter (where mandatory_pass and additional_pass and choice = 1))::numeric
    / nullif(count(*) filter (where mandatory_pass and additional_pass), 0)
    as fully_eligible_assignment_rate,
  count(*) filter (where mandatory_pass and not additional_pass and choice = 1)::integer
    as additional_violation_assignments,
  (count(*) filter (where mandatory_pass and not additional_pass and choice = 1))::numeric
    / nullif(count(*) filter (where mandatory_pass and choice = 1), 0)
    as additional_violation_rate_among_mandatory_pass_assignments
from public.analysis_employee_decisions
group by participant_id, participant_code, phase, is_synthetic_test,
  round_id, round_no, risk_level, form_code, authority_cue, explanation_type,
  stimulus_version, stage;

create view public.analysis_round_reliance with (security_invoker = true) as
with paired as (
  select participant_id, participant_code, phase, is_synthetic_test,
    round_id, round_no, risk_level, form_code, authority_cue, explanation_type,
    stimulus_version, employee_id,
    max(choice) filter (where stage = 'initial') as h,
    max(choice) filter (where stage = 'final') as f,
    max(ai_recommended::integer) as a,
    max(ground_truth::integer) as y
  from public.analysis_employee_decisions
  group by participant_id, participant_code, phase, is_synthetic_test,
    round_id, round_no, risk_level, form_code, authority_cue, explanation_type,
    stimulus_version, employee_id
), complete_rounds as (
  select participant_id, round_no from paired group by participant_id, round_no
  having count(*) = 12 and count(h) = 12 and count(f) = 12
), complete as (
  select paired.* from paired
  join complete_rounds using (participant_id, round_no)
  where h is not null and f is not null
)
select participant_id, participant_code, phase, is_synthetic_test,
  round_id, round_no, risk_level, form_code, authority_cue, explanation_type,
  stimulus_version,
  count(*) filter (where h <> y and a = y)::integer as rair_denominator,
  count(*) filter (where h <> y and a = y and f = y)::integer as rair_numerator,
  (count(*) filter (where h <> y and a = y and f = y))::numeric
    / nullif(count(*) filter (where h <> y and a = y), 0) as rair,
  count(*) filter (where h = y and a <> y)::integer as rsr_denominator,
  count(*) filter (where h = y and a <> y and f = y)::integer as rsr_numerator,
  (count(*) filter (where h = y and a <> y and f = y))::numeric
    / nullif(count(*) filter (where h = y and a <> y), 0) as rsr
from complete
group by participant_id, participant_code, phase, is_synthetic_test,
  round_id, round_no, risk_level, form_code, authority_cue, explanation_type,
  stimulus_version;

create view public.analysis_ncs_scores with (security_invoker = true) as
with raw as (
  select participant_id,
    max(answer_number) filter (where question_key = 'ncs_01') as raw_1,
    max(answer_number) filter (where question_key = 'ncs_02') as raw_2,
    max(answer_number) filter (where question_key = 'ncs_03') as raw_3,
    max(answer_number) filter (where question_key = 'ncs_04') as raw_4,
    max(answer_number) filter (where question_key = 'ncs_05') as raw_5,
    max(answer_number) filter (where question_key = 'ncs_06') as raw_6
  from public.survey_answers where instrument = 'ncs_6'
  group by participant_id
)
select p.id as participant_id, p.participant_code, p.phase,
  (coalesce(p.consent_document_version = 'SYNTHETIC_TEST_NO_HUMAN_PARTICIPANT', false)
    or p.participant_code ~ '^PT-9[0-9]{6}$') as is_synthetic_test,
  raw_1, raw_2, raw_3, raw_4, raw_5, raw_6,
  6 - raw_3 as scored_3, 6 - raw_4 as scored_4,
  raw_1 + raw_2 + (6 - raw_3) + (6 - raw_4) + raw_5 + raw_6 as scale_total,
  (raw_1 + raw_2 + (6 - raw_3) + (6 - raw_4) + raw_5 + raw_6)::numeric / 6 as scale_mean
from raw join public.participants p on p.id = raw.participant_id
where raw_1 between 1 and 5 and raw_2 between 1 and 5
  and raw_3 between 1 and 5 and raw_4 between 1 and 5
  and raw_5 between 1 and 5 and raw_6 between 1 and 5;

revoke all on table public.analysis_employee_decisions, public.analysis_round_criteria,
  public.analysis_round_reliance, public.analysis_ncs_scores from public, anon, authenticated;
grant select on table public.analysis_employee_decisions, public.analysis_round_criteria,
  public.analysis_round_reliance, public.analysis_ncs_scores to service_role;
