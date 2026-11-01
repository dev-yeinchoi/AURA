-- AURA pilot/main research schema. No real participant data is seeded here.
-- Browser roles have no direct access; server APIs receive explicit privileges.

create schema if not exists private;

create table public.stimulus_sets (
  version text primary key,
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  participant_code text not null unique,
  phase text not null check (phase in ('pilot', 'main')),
  status text not null default 'issued'
    check (status in ('issued', 'in_progress', 'completed', 'stopped', 'declined')),
  consent_document_version text,
  paper_consent_confirmed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint participant_code_matches_phase check (
    (phase = 'pilot' and participant_code ~ '^PT-[0-9]{3,}$') or
    (phase = 'main' and participant_code ~ '^MT-[0-9]{3,}$')
  ),
  constraint participant_time_order check (
    completed_at is null or (started_at is not null and completed_at >= started_at)
  )
);

create table public.assignments (
  participant_id uuid primary key references public.participants(id),
  authority_cue text not null check (authority_cue in ('low', 'high')),
  explanation_type text not null check (explanation_type in ('none', 'fi', 'case')),
  sequence_code text not null check (
    sequence_code in ('A-L_B-H', 'B-L_A-H', 'A-H_B-L', 'B-H_A-L')
  ),
  stimulus_version text not null references public.stimulus_sets(version),
  assigned_at timestamptz not null default now()
);

create table public.rounds (
  participant_id uuid not null references public.participants(id),
  round_no smallint not null check (round_no in (1, 2)),
  risk_level text not null check (risk_level in ('low', 'high')),
  form_code text not null check (form_code in ('A', 'B')),
  started_at timestamptz,
  completed_at timestamptz,
  primary key (participant_id, round_no),
  unique (participant_id, risk_level),
  unique (participant_id, form_code),
  constraint round_time_order check (
    completed_at is null or (started_at is not null and completed_at >= started_at)
  )
);

create table public.page_visits (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  round_no smallint check (round_no in (1, 2)),
  page_key text not null,
  entered_at timestamptz not null default now(),
  left_at timestamptz,
  last_seen_at timestamptz not null default now(),
  wall_ms bigint check (wall_ms >= 0),
  active_ms bigint not null default 0 check (active_ms >= 0),
  exit_reason text,
  foreign key (participant_id, round_no)
    references public.rounds(participant_id, round_no),
  constraint visit_time_order check (left_at is null or left_at >= entered_at),
  constraint visit_active_within_wall check (wall_ms is null or active_ms <= wall_ms)
);

create table public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id),
  round_no smallint check (round_no in (1, 2)),
  instrument text not null check (
    instrument in (
      'demographics', 'ppd', 'risk_check', 'trust',
      'manipulation_check', 'accuracy', 'umux', 'free_text'
    )
  ),
  question_key text not null,
  figma_node_id text,
  answer_number integer,
  answer_text text,
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  foreign key (participant_id, round_no)
    references public.rounds(participant_id, round_no),
  constraint answer_has_one_value check (
    (answer_number is not null) <> (answer_text is not null)
  ),
  constraint answer_round_matches_instrument check (
    (instrument in ('risk_check', 'trust') and round_no is not null) or
    (instrument not in ('risk_check', 'trust') and round_no is null)
  )
);

-- PostgreSQL's ordinary UNIQUE permits repeated NULLs. Separate indexes keep
-- pre/post answers unique while allowing round 1 and round 2 answers separately.
create unique index survey_answers_once_without_round
  on public.survey_answers(participant_id, instrument, question_key)
  where round_no is null;
create unique index survey_answers_once_per_round
  on public.survey_answers(participant_id, round_no, instrument, question_key)
  where round_no is not null;

create table public.decisions (
  participant_id uuid not null,
  round_no smallint not null check (round_no in (1, 2)),
  employee_id text not null check (employee_id ~ '^[AB](0[1-9]|1[0-2])$'),
  stage text not null check (stage in ('initial', 'final')),
  choice smallint not null check (choice in (0, 1)),
  selected_at timestamptz not null,
  submitted_at timestamptz,
  primary key (participant_id, round_no, employee_id, stage),
  foreign key (participant_id, round_no)
    references public.rounds(participant_id, round_no)
);

create table private.recruitment_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  birth_date date,
  reserved_at timestamptz,
  status text not null default 'applied'
    check (status in ('applied', 'confirmed', 'cancelled', 'attended', 'no_show')),
  participant_id uuid unique references public.participants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_contact_present check (phone is not null or email is not null)
);

create index page_visits_participant_time
  on public.page_visits(participant_id, entered_at);
create index survey_answers_participant
  on public.survey_answers(participant_id);
create index decisions_participant_round
  on public.decisions(participant_id, round_no);
create index recruitment_reservation
  on private.recruitment_applications(reserved_at);

-- Auto RLS in project settings covers only public tables. Enable it explicitly
-- for every table and leave browser roles without policies or grants.
alter table public.stimulus_sets enable row level security;
alter table public.participants enable row level security;
alter table public.assignments enable row level security;
alter table public.rounds enable row level security;
alter table public.page_visits enable row level security;
alter table public.survey_answers enable row level security;
alter table public.decisions enable row level security;
alter table private.recruitment_applications enable row level security;

revoke all on table
  public.stimulus_sets, public.participants, public.assignments,
  public.rounds, public.page_visits, public.survey_answers,
  public.decisions
from public, anon, authenticated;

-- Only the trusted Next.js server may use the Data API for experiment tables.
grant select, insert, update, delete on table
  public.stimulus_sets, public.participants, public.assignments,
  public.rounds, public.page_visits, public.survey_answers,
  public.decisions
to service_role;

-- Recruitment PII is unavailable through the exposed Data API. Access it only
-- through a direct server-side Postgres connection or a researcher admin tool.
revoke all on schema private from public, anon, authenticated;
revoke all on table private.recruitment_applications
  from public, anon, authenticated, service_role;
