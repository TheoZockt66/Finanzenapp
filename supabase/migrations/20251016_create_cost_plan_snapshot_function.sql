-- Function to fetch cost plans (with categories & items) and income sources in a single call
create or replace function public.get_finanzen_cost_plans_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Unauthorized';
  end if;

  result := jsonb_build_object(
    'costPlans',
    coalesce(
      (
        select jsonb_agg(plan_payload)
        from (
          select jsonb_build_object(
            'id', cp.id,
            'user_id', cp.user_id,
            'name', cp.name,
            'description', cp.description,
            'total_estimated_cost', cp.total_estimated_cost,
            'is_active', cp.is_active,
            'target_date', cp.target_date,
            'created_at', cp.created_at,
            'updated_at', cp.updated_at,
            'categories',
              coalesce(
                (
                  select jsonb_agg(cat_payload)
                  from (
                    select jsonb_build_object(
                      'id', cc.id,
                      'cost_plan_id', cc.cost_plan_id,
                      'user_id', cc.user_id,
                      'name', cc.name,
                      'estimated_total', cc.estimated_total,
                      'actual_total', cc.actual_total,
                      'color', cc.color,
                      'created_at', cc.created_at,
                      'updated_at', cc.updated_at
                    ) as cat_payload
                    from public.finanzen_cost_categories cc
                    where cc.cost_plan_id = cp.id
                      and cc.user_id = uid
                    order by cc.created_at asc
                  ) cat_data
                ),
                '[]'::jsonb
              ),
            'costItems',
              coalesce(
                (
                  select jsonb_agg(item_payload)
                  from (
                    select jsonb_build_object(
                      'id', ci.id,
                      'cost_category_id', ci.cost_category_id,
                      'user_id', ci.user_id,
                      'name', ci.name,
                      'estimated_cost', ci.estimated_cost,
                      'actual_cost', ci.actual_cost,
                      'quantity', ci.quantity,
                      'unit', ci.unit,
                      'priority', ci.priority,
                      'notes', ci.notes,
                      'is_completed', ci.is_completed,
                      'created_at', ci.created_at,
                      'updated_at', ci.updated_at
                    ) as item_payload
                    from public.finanzen_cost_items ci
                    join public.finanzen_cost_categories cc
                      on cc.id = ci.cost_category_id
                    where cc.cost_plan_id = cp.id
                      and ci.user_id = uid
                      and cc.user_id = uid
                    order by ci.created_at asc
                  ) item_data
                ),
                '[]'::jsonb
              )
          ) as plan_payload
          from public.finanzen_cost_plans cp
          where cp.user_id = uid
            and cp.is_active = true
          order by cp.created_at desc
        ) plans
      ),
      '[]'::jsonb
    ),
    'incomeSources',
    coalesce(
      (
        select jsonb_agg(src_payload)
        from (
          select jsonb_build_object(
            'id', src.id,
            'user_id', src.user_id,
            'name', src.name,
            'amount', src.amount,
            'frequency', src.frequency,
            'is_active', src.is_active,
            'start_date', src.start_date,
            'end_date', src.end_date,
            'description', src.description,
            'created_at', src.created_at,
            'updated_at', src.updated_at
          ) as src_payload
          from public.finanzen_income_sources src
          where src.user_id = uid
            and src.is_active = true
          order by src.created_at asc
        ) src_data
      ),
      '[]'::jsonb
    )
  );

  return result;
end;
$$;
