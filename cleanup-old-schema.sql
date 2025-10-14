-- LÖSCHE ALTE TABELLEN (falls bereits erstellt ohne Prefix)
-- Nur ausführen, wenn du bereits die alte database-schema.sql verwendet hast

-- Views löschen
DROP VIEW IF EXISTS public.monthly_transaction_summary;
DROP VIEW IF EXISTS public.budget_utilization;

-- Triggers löschen
DROP TRIGGER IF EXISTS sync_budget_on_transaction_insert ON public.transactions;
DROP TRIGGER IF EXISTS sync_budget_on_transaction_delete ON public.transactions;
DROP TRIGGER IF EXISTS update_cost_plan_total_on_category_change ON public.cost_categories;
DROP TRIGGER IF EXISTS update_cost_category_total_on_item_change ON public.cost_items;

-- Functions löschen
DROP FUNCTION IF EXISTS create_default_categories(uuid);
DROP FUNCTION IF EXISTS update_budget_spent();
DROP FUNCTION IF EXISTS revert_budget_spent();
DROP FUNCTION IF EXISTS update_cost_plan_total();
DROP FUNCTION IF EXISTS update_cost_category_total();

-- Tabellen löschen (in umgekehrter Reihenfolge wegen Foreign Keys)
DROP TABLE IF EXISTS public.budget_resets;
DROP TABLE IF EXISTS public.cost_items;
DROP TABLE IF EXISTS public.cost_categories;
DROP TABLE IF EXISTS public.cost_plans;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.budgets;
DROP TABLE IF EXISTS public.income_sources;
DROP TABLE IF EXISTS public.transaction_categories;

-- Jetzt kannst du die neue database-schema-mit-prefix.sql ausführen!