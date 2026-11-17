ALTER TABLE public.assessment_results ADD COLUMN adult_review jsonb
  CHECK (adult_review IS NULL OR (
    jsonb_typeof(adult_review) = 'object'
    AND adult_review->>'review' IN ('achieved', 'practice', 'unavailable')
    AND adult_review ? 'reviewed_by' AND adult_review ? 'reviewed_at'
  ));
