-- Researcher-issued one-time PINs and resumable participant sessions.
-- PINs and session tokens are never stored in plaintext.

create table public.participant_credentials (
  participant_id uuid primary key references public.participants(id),
  pin_digest text not null check (pin_digest ~ '^[0-9a-f]{64}$'),
  pin_expires_at timestamptz not null,
  pin_used_at timestamptz,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  issued_at timestamptz not null default now()
);

create table public.participant_sessions (
  token_digest text primary key check (token_digest ~ '^[0-9a-f]{64}$'),
  participant_id uuid not null references public.participants(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint session_time_order check (expires_at > created_at)
);

create index participant_sessions_active_by_participant
  on public.participant_sessions(participant_id, expires_at)
  where revoked_at is null;

alter table public.participant_credentials enable row level security;
alter table public.participant_sessions enable row level security;
revoke all on table public.participant_credentials, public.participant_sessions
  from public, anon, authenticated;
grant select, insert, update, delete on table
  public.participant_credentials, public.participant_sessions to service_role;

-- The service role alone may issue and reissue a PIN. A new PIN replaces the old one.
create function public.issue_participant(
  p_code text,
  p_phase text,
  p_pin_digest text,
  p_expires_at timestamptz
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_id uuid;
begin
  insert into public.participants(participant_code, phase)
  values (p_code, p_phase)
  returning id into v_id;

  insert into public.participant_credentials(
    participant_id, pin_digest, pin_expires_at
  ) values (v_id, p_pin_digest, p_expires_at);

  return v_id;
end;
$$;

create function public.reissue_participant_pin(
  p_code text,
  p_pin_digest text,
  p_expires_at timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_count integer;
begin
  update public.participant_credentials as c
  set pin_digest = p_pin_digest,
      pin_expires_at = p_expires_at,
      pin_used_at = null,
      failed_attempts = 0,
      locked_until = null,
      issued_at = now()
  from public.participants as p
  where p.id = c.participant_id
    and p.participant_code = p_code
    and p.status in ('issued', 'in_progress', 'stopped');
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

-- Row lock makes one-time redemption and the attempt limit atomic.
create function public.redeem_participant_pin(
  p_code text,
  p_pin_digest text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_digest text;
  v_expires timestamptz;
  v_used timestamptz;
  v_attempts smallint;
  v_locked timestamptz;
begin
  select p.id, c.pin_digest, c.pin_expires_at, c.pin_used_at,
         c.failed_attempts, c.locked_until
  into v_id, v_digest, v_expires, v_used, v_attempts, v_locked
  from public.participants as p
  join public.participant_credentials as c on c.participant_id = p.id
  where p.participant_code = p_code
    and p.status in ('issued', 'in_progress', 'stopped')
  for update of c;

  if not found or v_used is not null or v_expires <= now()
     or (v_locked is not null and v_locked > now()) then
    return null;
  end if;

  if v_digest <> p_pin_digest then
    update public.participant_credentials
    set failed_attempts = least(5, v_attempts + 1),
        locked_until = case when v_attempts >= 4
          then now() + interval '15 minutes' else null end
    where participant_id = v_id;
    return null;
  end if;

  update public.participant_credentials
  set pin_used_at = now(), failed_attempts = 0, locked_until = null
  where participant_id = v_id;
  return v_id;
end;
$$;

revoke all on function public.issue_participant(text, text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.reissue_participant_pin(text, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.redeem_participant_pin(text, text)
  from public, anon, authenticated;
grant execute on function public.issue_participant(text, text, text, timestamptz)
  to service_role;
grant execute on function public.reissue_participant_pin(text, text, timestamptz)
  to service_role;
grant execute on function public.redeem_participant_pin(text, text)
  to service_role;
