alter table public.survey_answers
  drop constraint survey_answers_instrument_check;

alter table public.survey_answers
  add constraint survey_answers_instrument_check check (
    instrument in (
      'demographics', 'ppd', 'ncs_6', 'attention_check',
      'risk_check', 'trust', 'manipulation_check',
      'accuracy', 'umux', 'free_text'
    )
  );

alter table public.survey_answers
  drop constraint answer_round_matches_instrument;

alter table public.survey_answers
  add constraint answer_round_matches_instrument check (
    (instrument in ('risk_check', 'trust', 'attention_check') and round_no is not null) or
    (instrument not in ('risk_check', 'trust', 'attention_check') and round_no is null)
  );
