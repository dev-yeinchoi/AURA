-- The research administrator may remove synthetic verification records.
-- Browser roles remain unable to read or modify consent records.
grant delete on public.consent_records to service_role;
