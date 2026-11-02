-- Approved information and consent PDFs live in a private Storage bucket.
-- Their hashes and the participant's explicit choice are kept with the record.
insert into storage.buckets (id, name, public)
values ('study-documents', 'study-documents', false)
on conflict (id) do nothing;

create table public.study_documents (
  version text primary key,
  information_path text not null,
  consent_path text not null,
  information_sha256 text not null check (information_sha256 ~ '^[0-9a-f]{64}$'),
  consent_sha256 text not null check (consent_sha256 ~ '^[0-9a-f]{64}$'),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_active_study_document on public.study_documents ((active)) where active;

create table public.consent_records (
  participant_id uuid primary key references public.participants(id),
  decision text not null check (decision in ('accepted', 'declined')),
  document_version text not null references public.study_documents(version),
  information_sha256 text not null,
  consent_sha256 text not null,
  information_ms bigint not null check (information_ms between 0 and 14400000),
  consent_ms bigint not null check (consent_ms between 0 and 14400000),
  decided_at timestamptz not null default now()
);

alter table public.participants
  add column online_consent_confirmed_at timestamptz;

alter table public.study_documents enable row level security;
alter table public.consent_records enable row level security;
revoke all on public.study_documents, public.consent_records from public, anon, authenticated;
grant select, insert, update on public.study_documents to service_role;
grant select, insert on public.consent_records to service_role;

create function public.activate_study_documents(
  p_version text,
  p_information_path text,
  p_consent_path text,
  p_information_sha256 text,
  p_consent_sha256 text
) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if p_version !~ '^sha256-[0-9a-f]{16}$' or
     p_information_sha256 !~ '^[0-9a-f]{64}$' or
     p_consent_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid document version or hash';
  end if;
  if exists (
    select 1 from public.study_documents d where d.version = p_version and
      (d.information_path, d.consent_path, d.information_sha256, d.consent_sha256)
      is distinct from
      (p_information_path, p_consent_path, p_information_sha256, p_consent_sha256)
  ) then
    raise exception 'A document version cannot be changed';
  end if;
  update public.study_documents set active = false where active;
  insert into public.study_documents (
    version, information_path, consent_path, information_sha256, consent_sha256, active
  ) values (
    p_version, p_information_path, p_consent_path,
    p_information_sha256, p_consent_sha256, true
  ) on conflict (version) do update set active = true;
end;
$$;

create function public.record_online_consent(
  p_participant_id uuid,
  p_decision text,
  p_document_version text,
  p_information_ms bigint,
  p_consent_ms bigint
) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_participant public.participants%rowtype;
  v_document public.study_documents%rowtype;
  v_now timestamptz := now();
begin
  if p_decision not in ('accepted', 'declined') or
     p_information_ms not between 0 and 14400000 or
     p_consent_ms not between 0 and 14400000 then
    raise exception 'Invalid consent request';
  end if;
  select * into v_participant from public.participants
    where id = p_participant_id for update;
  if not found or v_participant.phase <> 'pilot' or
     v_participant.status <> 'issued' or v_participant.started_at is not null or
     v_participant.online_consent_confirmed_at is not null then
    raise exception 'Consent is unavailable for this participant';
  end if;
  select * into v_document from public.study_documents
    where version = p_document_version and active;
  if not found then raise exception 'The study documents changed; please read them again'; end if;

  insert into public.consent_records (
    participant_id, decision, document_version, information_sha256,
    consent_sha256, information_ms, consent_ms, decided_at
  ) values (
    p_participant_id, p_decision, p_document_version,
    v_document.information_sha256, v_document.consent_sha256,
    p_information_ms, p_consent_ms, v_now
  );
  insert into public.page_visits (
    participant_id, page_key, entered_at, left_at, last_seen_at, wall_ms, active_ms, exit_reason
  ) values
    (p_participant_id, 'information',
     v_now - (p_information_ms + p_consent_ms) * interval '1 millisecond',
     v_now - p_consent_ms * interval '1 millisecond',
     v_now - p_consent_ms * interval '1 millisecond',
     p_information_ms, 0, 'next'),
    (p_participant_id, 'consent',
     v_now - p_consent_ms * interval '1 millisecond',
     v_now, v_now, p_consent_ms, 0,
     case when p_decision = 'accepted' then 'next' else 'declined' end);
  if p_decision = 'accepted' then
    update public.participants set
      online_consent_confirmed_at = v_now,
      consent_document_version = p_document_version
    where id = p_participant_id;
  else
    update public.participants set status = 'declined',
      consent_document_version = p_document_version
    where id = p_participant_id;
  end if;
end;
$$;

revoke all on function public.activate_study_documents(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.record_online_consent(uuid, text, text, bigint, bigint)
  from public, anon, authenticated;
grant execute on function public.activate_study_documents(text, text, text, text, text)
  to service_role;
grant execute on function public.record_online_consent(uuid, text, text, bigint, bigint)
  to service_role;
