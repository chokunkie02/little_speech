BEGIN;

-- Store only the account and coarse time. No page URLs or child data.
CREATE TABLE public.usage_visits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, visit_id)
);
CREATE INDEX usage_visits_opened_at ON public.usage_visits (opened_at);

CREATE TABLE public.usage_active_intervals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interval_start timestamptz NOT NULL,
  PRIMARY KEY (user_id, interval_start)
);
CREATE INDEX usage_active_intervals_start ON public.usage_active_intervals (interval_start);

ALTER TABLE public.usage_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_active_intervals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usage_visits, public.usage_active_intervals FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_web_usage(p_visit_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  account_id uuid := auth.uid();
BEGIN
  IF account_id IS NULL OR public.is_platform_admin() THEN
    RETURN;
  END IF;

  INSERT INTO public.usage_visits (user_id, visit_id)
  VALUES (account_id, p_visit_id) ON CONFLICT DO NOTHING;

  IF p_active THEN
    INSERT INTO public.usage_active_intervals (user_id, interval_start)
    VALUES (account_id, date_bin(interval '15 seconds', now(), '2000-01-01 UTC'::timestamptz))
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE FUNCTION public.get_platform_web_usage(p_days integer)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  first_day date;
  start_at timestamptz;
  result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;
  IF p_days IS NULL OR p_days NOT IN (7, 30) THEN
    RAISE EXCEPTION 'Invalid reporting period' USING ERRCODE = '22023';
  END IF;
  first_day := today - (p_days - 1);
  start_at := first_day::timestamp AT TIME ZONE 'Asia/Bangkok';

  WITH visits AS (
    SELECT user_id, opened_at AT TIME ZONE 'Asia/Bangkok' AS local_time
    FROM public.usage_visits WHERE opened_at >= start_at
  ), intervals AS (
    SELECT user_id FROM public.usage_active_intervals WHERE interval_start >= start_at
  ), by_day AS (
    SELECT local_time::date AS day, count(*) AS opens FROM visits GROUP BY 1
  ), by_hour AS (
    SELECT extract(hour FROM local_time)::integer AS hour, count(*) AS opens FROM visits GROUP BY 1
  )
  SELECT jsonb_build_object(
    'activeAccounts', (SELECT count(*) FROM (
      SELECT user_id FROM visits UNION SELECT user_id FROM intervals
    ) AS accounts),
    'opens', (SELECT count(*) FROM visits),
    'activeSeconds', (SELECT count(*) * 15 FROM intervals),
    'days', (SELECT jsonb_agg(jsonb_build_object(
      'date', first_day + day_index, 'opens', coalesce(by_day.opens, 0)
    ) ORDER BY day_index) FROM generate_series(0, p_days - 1) AS series(day_index)
      LEFT JOIN by_day ON by_day.day = first_day + day_index),
    'hours', (SELECT jsonb_agg(coalesce(by_hour.opens, 0) ORDER BY series.hour)
      FROM generate_series(0, 23) AS series(hour) LEFT JOIN by_hour USING (hour))
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_web_usage(uuid, boolean), public.get_platform_web_usage(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_web_usage(uuid, boolean), public.get_platform_web_usage(integer) TO authenticated;

COMMIT;
