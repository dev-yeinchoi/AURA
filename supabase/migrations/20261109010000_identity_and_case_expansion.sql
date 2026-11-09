-- Phone suffix verification reads recruitment PII only inside a service-role RPC.
create table public.participant_identity_attempts (
  participant_id uuid primary key references public.participants(id),
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz
);
create table public.participant_identity_challenges (
  token_digest text primary key check (token_digest ~ '^[0-9a-f]{64}$'),
  participant_id uuid not null references public.participants(id),
  expires_at timestamptz not null,
  consumed_at timestamptz
);
create table public.case_expansion_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  round_no smallint not null check (round_no in (1, 2)),
  employee_id text not null check (employee_id ~ '^[AB](0[1-9]|1[0-2])$'),
  expanded boolean not null,
  changed_at timestamptz not null default now(),
  foreign key (participant_id, round_no) references public.rounds(participant_id, round_no)
);
create index case_expansion_events_lookup on public.case_expansion_events(participant_id, round_no, employee_id, changed_at);
alter table public.participant_identity_attempts enable row level security;
alter table public.participant_identity_challenges enable row level security;
alter table public.case_expansion_events enable row level security;
revoke all on table public.participant_identity_attempts, public.participant_identity_challenges, public.case_expansion_events from public, anon, authenticated;
grant select, insert, update, delete on table public.participant_identity_attempts, public.participant_identity_challenges, public.case_expansion_events to service_role;

create function public.verify_participant_identity(p_code text, p_phone_last4 text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid; v_name text; v_phone text; v_digits text;
  v_attempts smallint; v_locked timestamptz;
begin
  select p.id, r.name, r.phone into v_id, v_name, v_phone
  from public.participants p
  join private.recruitment_applications r on r.participant_id = p.id
  where p.participant_code = p_code
    and p.status in ('issued', 'in_progress', 'stopped')
    and r.status not in ('cancelled', 'no_show');
  if not found then return null; end if;
  insert into public.participant_identity_attempts(participant_id) values(v_id) on conflict do nothing;
  select failed_attempts, locked_until into v_attempts, v_locked
  from public.participant_identity_attempts where participant_id = v_id for update;
  if v_locked is not null and v_locked > now() then return null; end if;
  if v_locked is not null then
    update public.participant_identity_attempts set failed_attempts = 0, locked_until = null where participant_id = v_id;
    v_attempts := 0;
  end if;
  v_digits := regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  if length(v_digits) < 10 or right(v_digits, 4) <> p_phone_last4 then
    update public.participant_identity_attempts
    set failed_attempts = least(5, v_attempts + 1),
        locked_until = case when v_attempts >= 4 then now() + interval '15 minutes' else null end
    where participant_id = v_id;
    return null;
  end if;
  update public.participant_identity_attempts set failed_attempts = 0, locked_until = null where participant_id = v_id;
  return jsonb_build_object(
    'participantId', v_id,
    'participantCode', p_code,
    'maskedName', left(v_name, 1) || repeat('*', greatest(length(v_name)-1, 1)),
    'maskedPhone', left(v_digits, 3) || '-****-' || right(v_digits, 4)
  );
end;
$$;
revoke all on function public.verify_participant_identity(text,text) from public, anon, authenticated;
grant execute on function public.verify_participant_identity(text,text) to service_role;

create function public.issue_participant_identity(p_code text, p_phase text, p_application_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not exists(select 1 from private.recruitment_applications where id = p_application_id and participant_id is null and status not in ('cancelled','no_show') and phone is not null) then
    raise exception 'Recruitment application unavailable or missing phone';
  end if;
  insert into public.participants(participant_code, phase) values(p_code,p_phase) returning id into v_id;
  update private.recruitment_applications set participant_id = v_id, updated_at = now() where id = p_application_id and participant_id is null;
  if not found then raise exception 'Recruitment application already linked'; end if;
  return v_id;
end;
$$;
create function public.link_participant_identity(p_code text, p_application_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.participants where participant_code = p_code;
  if v_id is null then return false; end if;
  update private.recruitment_applications set participant_id = v_id, updated_at = now()
  where id = p_application_id and participant_id is null and status not in ('cancelled','no_show') and phone is not null;
  return found;
end;
$$;
revoke all on function public.issue_participant_identity(text,text,uuid), public.link_participant_identity(text,uuid) from public, anon, authenticated;
grant execute on function public.issue_participant_identity(text,text,uuid), public.link_participant_identity(text,uuid) to service_role;
