-- Add plan association to income sources
ALTER TABLE public.finanzen_income_sources
  ADD COLUMN IF NOT EXISTS cost_plan_id uuid REFERENCES public.finanzen_cost_plans(id) ON DELETE CASCADE;

-- Existing unique constraint (user_id, name) must allow duplicates per plan
ALTER TABLE public.finanzen_income_sources
  DROP CONSTRAINT IF EXISTS finanzen_income_sources_user_name_unique;

CREATE UNIQUE INDEX IF NOT EXISTS finanzen_income_sources_unique_plan_name
  ON public.finanzen_income_sources (user_id, cost_plan_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS finanzen_income_sources_unique_global_name
  ON public.finanzen_income_sources (user_id, name)
  WHERE cost_plan_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_finanzen_income_sources_cost_plan_id
  ON public.finanzen_income_sources (cost_plan_id);

-- Backfill: assign unlinked income sources to the first plan per user (if available)
WITH first_plan_per_user AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.finanzen_cost_plans
  ORDER BY user_id, created_at
)
UPDATE public.finanzen_income_sources src
SET cost_plan_id = plan.id
FROM first_plan_per_user plan
WHERE src.cost_plan_id IS NULL
  AND src.user_id = plan.user_id;
