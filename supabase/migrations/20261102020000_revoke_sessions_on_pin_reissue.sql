-- Reissuing a PIN invalidates all earlier sessions for that participant.
create or replace function public.reissue_participant_pin(
  p_code text,
  p_pin_digest text,
  p_expires_at timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare v_id uuid;
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
    and p.status in ('issued', 'in_progress', 'stopped')
  returning c.participant_id into v_id;

  if v_id is null then
    return false;
  end if;

  update public.participant_sessions
  set revoked_at = now()
  where participant_id = v_id and revoked_at is null;
  return true;
end;
$$;
