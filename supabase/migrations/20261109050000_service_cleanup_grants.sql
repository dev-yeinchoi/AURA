-- The trusted server already has deletion rights on the other research tables.
-- Match those rights for synthetic integration-test cleanup; browser roles remain denied.
grant delete on table public.attention_check_responses,
  public.scenario_segment_visits, public.case_expansion_summary to service_role;
