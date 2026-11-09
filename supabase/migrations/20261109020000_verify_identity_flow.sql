-- Transactional smoke check for the new identity path. No synthetic record remains.
do $$
declare
  v_application uuid;
  v_participant uuid;
  v_code text := 'PT-9' || lpad(floor(random() * 1000000)::text, 6, '0');
  v_result jsonb;
begin
  insert into private.recruitment_applications(name, phone, status)
  values ('검증용', '010-0000-1234', 'confirmed') returning id into v_application;
  v_participant := public.issue_participant_identity(v_code, 'pilot', v_application);
  v_result := public.verify_participant_identity(v_code, '1234');
  if v_result->>'participantId' is distinct from v_participant::text
    or v_result->>'maskedName' is distinct from '검**'
    or v_result->>'maskedPhone' is distinct from '010-****-1234' then
    raise exception 'Identity success path failed';
  end if;
  if public.verify_participant_identity(v_code, '9999') is not null then
    raise exception 'Identity failure path accepted wrong suffix';
  end if;
  delete from public.participant_identity_attempts where participant_id = v_participant;
  delete from private.recruitment_applications where id = v_application;
  delete from public.participants where id = v_participant;
end;
$$;
