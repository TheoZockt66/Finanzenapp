-- KORRIGIERTE Query zum Umbenennen der Tabellen mit "finanzen_" Prefix
-- Diese Query sollte NACH dem Erstellen der ursprünglichen Tabellen ausgeführt werden
-- WICHTIG: Korrekte Reihenfolge - erst Triggers/Views löschen, dann umbenennen, dann neu erstellen

-- =============================================
-- SCHRITT 1: ALTE TRIGGERS UND VIEWS LÖSCHEN
-- =============================================

-- Triggers löschen (BEVOR wir die Tabellen umbenennen!)
DROP TRIGGER IF EXISTS sync_budget_on_transaction_insert ON public.transactions;
DROP TRIGGER IF EXISTS sync_budget_on_transaction_delete ON public.transactions;
DROP TRIGGER IF EXISTS update_cost_plan_total_on_category_change ON public.cost_categories;
DROP TRIGGER IF EXISTS update_cost_category_total_on_item_change ON public.cost_items;

-- Views löschen
DROP VIEW IF EXISTS public.monthly_transaction_summary;
DROP VIEW IF EXISTS public.budget_utilization;
DROP VIEW IF EXISTS public.cost_plan_progress;

-- =============================================
-- SCHRITT 2: TABELLEN UMBENENNEN
-- =============================================

-- Kategorien für Transaktionen
ALTER TABLE public.transaction_categories RENAME TO finanzen_transaction_categories;

-- Budgets
ALTER TABLE public.budgets RENAME TO finanzen_budgets;

-- Transaktionen
ALTER TABLE public.transactions RENAME TO finanzen_transactions;

-- Kostenpläne
ALTER TABLE public.cost_plans RENAME TO finanzen_cost_plans;

-- Kostenkategorien
ALTER TABLE public.cost_categories RENAME TO finanzen_cost_categories;

-- Kostenposten
ALTER TABLE public.cost_items RENAME TO finanzen_cost_items;

-- Einkommensquellen
ALTER TABLE public.income_sources RENAME TO finanzen_income_sources;

-- Budget Reset Historie
ALTER TABLE public.budget_resets RENAME TO finanzen_budget_resets;

-- =============================================
-- SCHRITT 3: NEUE VIEWS ERSTELLEN
-- =============================================

-- Monthly transaction summary view
CREATE VIEW public.finanzen_monthly_transaction_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) as month,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM public.finanzen_transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date), type;

-- Budget utilization view
CREATE VIEW public.finanzen_budget_utilization AS
SELECT 
  b.id,
  b.user_id,
  b.name,
  b.amount as budget_amount,
  b.spent,
  b.carryover,
  (b.amount + b.carryover - b.spent) as available,
  ROUND((b.spent / NULLIF(b.amount + b.carryover, 0) * 100), 2) as utilization_percent
FROM public.finanzen_budgets b
WHERE b.is_active = true;

-- Cost plan progress view
CREATE VIEW public.finanzen_cost_plan_progress AS
SELECT 
  cp.id,
  cp.user_id,
  cp.name,
  cp.total_estimated_cost,
  COALESCE(SUM(cc.actual_total), 0) as total_actual_cost,
  ROUND((COALESCE(SUM(cc.actual_total), 0) / NULLIF(cp.total_estimated_cost, 0) * 100), 2) as completion_percent,
  COUNT(ci.id) as total_items,
  COUNT(CASE WHEN ci.is_completed = true THEN 1 END) as completed_items
FROM public.finanzen_cost_plans cp
LEFT JOIN public.finanzen_cost_categories cc ON cp.id = cc.cost_plan_id
LEFT JOIN public.finanzen_cost_items ci ON cc.id = ci.cost_category_id
WHERE cp.is_active = true
GROUP BY cp.id, cp.user_id, cp.name, cp.total_estimated_cost;

-- =============================================
-- SCHRITT 4: FUNCTIONS UPDATEN
-- =============================================

-- Function to create default categories for new users (updated table name)
CREATE OR REPLACE FUNCTION create_default_categories(user_uuid uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.finanzen_transaction_categories (user_id, name, color, is_default) VALUES
    (user_uuid, 'Lebensmittel', 'green', true),
    (user_uuid, 'Transport', 'blue', true),
    (user_uuid, 'Unterhaltung', 'orange', true),
    (user_uuid, 'Gesundheit', 'red', true),
    (user_uuid, 'Bildung', 'purple', true),
    (user_uuid, 'Kleidung', 'pink', true),
    (user_uuid, 'Haushalt', 'cyan', true),
    (user_uuid, 'Sonstiges', 'gray', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update budget spent amount when transaction is added/updated (updated table name)
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an expense transaction with a budget
  IF NEW.type = 'expense' AND NEW.budget_id IS NOT NULL THEN
    -- Update budget spent amount
    UPDATE public.finanzen_budgets 
    SET spent = spent + NEW.amount
    WHERE id = NEW.budget_id AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revert budget spent amount when transaction is deleted/updated (updated table name)
CREATE OR REPLACE FUNCTION revert_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- If this was an expense transaction with a budget
  IF OLD.type = 'expense' AND OLD.budget_id IS NOT NULL THEN
    -- Revert budget spent amount
    UPDATE public.finanzen_budgets 
    SET spent = spent - OLD.amount
    WHERE id = OLD.budget_id AND user_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate total estimated cost for cost plans
CREATE OR REPLACE FUNCTION update_cost_plan_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cost plan total when categories change
  UPDATE public.finanzen_cost_plans 
  SET total_estimated_cost = (
    SELECT COALESCE(SUM(estimated_total), 0) 
    FROM public.finanzen_cost_categories 
    WHERE cost_plan_id = COALESCE(NEW.cost_plan_id, OLD.cost_plan_id)
  )
  WHERE id = COALESCE(NEW.cost_plan_id, OLD.cost_plan_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate category totals from items
CREATE OR REPLACE FUNCTION update_cost_category_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Update category totals when items change
  UPDATE public.finanzen_cost_categories 
  SET 
    estimated_total = (
      SELECT COALESCE(SUM(estimated_cost * quantity), 0) 
      FROM public.finanzen_cost_items 
      WHERE cost_category_id = COALESCE(NEW.cost_category_id, OLD.cost_category_id)
    ),
    actual_total = (
      SELECT COALESCE(SUM(COALESCE(actual_cost, estimated_cost) * quantity), 0) 
      FROM public.finanzen_cost_items 
      WHERE cost_category_id = COALESCE(NEW.cost_category_id, OLD.cost_category_id)
        AND is_completed = true
    )
  WHERE id = COALESCE(NEW.cost_category_id, OLD.cost_category_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SCHRITT 5: NEUE TRIGGERS ERSTELLEN
-- =============================================

-- Budget synchronization triggers
CREATE TRIGGER sync_budget_on_transaction_insert
  AFTER INSERT ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_spent();

CREATE TRIGGER sync_budget_on_transaction_delete
  BEFORE DELETE ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION revert_budget_spent();

-- Cost plan total calculation triggers
CREATE TRIGGER update_cost_plan_total_on_category_change
  AFTER INSERT OR UPDATE OR DELETE ON public.finanzen_cost_categories
  FOR EACH ROW EXECUTE FUNCTION update_cost_plan_total();

CREATE TRIGGER update_cost_category_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.finanzen_cost_items
  FOR EACH ROW EXECUTE FUNCTION update_cost_category_total();

-- =============================================
-- SCHRITT 6: RLS POLICIES AKTUALISIEREN
-- =============================================

-- Die RLS Policies werden automatisch mit den Tabellen umbenannt,
-- aber wir können die Namen anpassen für bessere Klarheit:

-- Transaction Categories Policies
DROP POLICY IF EXISTS "Users can view own transaction categories" ON public.finanzen_transaction_categories;
DROP POLICY IF EXISTS "Users can insert own transaction categories" ON public.finanzen_transaction_categories;
DROP POLICY IF EXISTS "Users can update own transaction categories" ON public.finanzen_transaction_categories;
DROP POLICY IF EXISTS "Users can delete own transaction categories" ON public.finanzen_transaction_categories;

CREATE POLICY "Users can view own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets Policies
DROP POLICY IF EXISTS "Users can view own budgets" ON public.finanzen_budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.finanzen_budgets;
DROP POLICY IF EXISTS "Users can update own budgets" ON public.finanzen_budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.finanzen_budgets;

CREATE POLICY "Users can view own finanzen budgets" ON public.finanzen_budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen budgets" ON public.finanzen_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen budgets" ON public.finanzen_budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen budgets" ON public.finanzen_budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.finanzen_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.finanzen_transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.finanzen_transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.finanzen_transactions;

CREATE POLICY "Users can view own finanzen transactions" ON public.finanzen_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen transactions" ON public.finanzen_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen transactions" ON public.finanzen_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen transactions" ON public.finanzen_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Plans Policies
DROP POLICY IF EXISTS "Users can view own cost plans" ON public.finanzen_cost_plans;
DROP POLICY IF EXISTS "Users can insert own cost plans" ON public.finanzen_cost_plans;
DROP POLICY IF EXISTS "Users can update own cost plans" ON public.finanzen_cost_plans;
DROP POLICY IF EXISTS "Users can delete own cost plans" ON public.finanzen_cost_plans;

CREATE POLICY "Users can view own finanzen cost plans" ON public.finanzen_cost_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen cost plans" ON public.finanzen_cost_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen cost plans" ON public.finanzen_cost_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen cost plans" ON public.finanzen_cost_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Categories Policies
DROP POLICY IF EXISTS "Users can view own cost categories" ON public.finanzen_cost_categories;
DROP POLICY IF EXISTS "Users can insert own cost categories" ON public.finanzen_cost_categories;
DROP POLICY IF EXISTS "Users can update own cost categories" ON public.finanzen_cost_categories;
DROP POLICY IF EXISTS "Users can delete own cost categories" ON public.finanzen_cost_categories;

CREATE POLICY "Users can view own finanzen cost categories" ON public.finanzen_cost_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen cost categories" ON public.finanzen_cost_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen cost categories" ON public.finanzen_cost_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen cost categories" ON public.finanzen_cost_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Items Policies
DROP POLICY IF EXISTS "Users can view own cost items" ON public.finanzen_cost_items;
DROP POLICY IF EXISTS "Users can insert own cost items" ON public.finanzen_cost_items;
DROP POLICY IF EXISTS "Users can update own cost items" ON public.finanzen_cost_items;
DROP POLICY IF EXISTS "Users can delete own cost items" ON public.finanzen_cost_items;

CREATE POLICY "Users can view own finanzen cost items" ON public.finanzen_cost_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen cost items" ON public.finanzen_cost_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen cost items" ON public.finanzen_cost_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen cost items" ON public.finanzen_cost_items
  FOR DELETE USING (auth.uid() = user_id);

-- Income Sources Policies
DROP POLICY IF EXISTS "Users can view own income sources" ON public.finanzen_income_sources;
DROP POLICY IF EXISTS "Users can insert own income sources" ON public.finanzen_income_sources;
DROP POLICY IF EXISTS "Users can update own income sources" ON public.finanzen_income_sources;
DROP POLICY IF EXISTS "Users can delete own income sources" ON public.finanzen_income_sources;

CREATE POLICY "Users can view own finanzen income sources" ON public.finanzen_income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen income sources" ON public.finanzen_income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen income sources" ON public.finanzen_income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen income sources" ON public.finanzen_income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Budget Resets Policies
DROP POLICY IF EXISTS "Users can view own budget resets" ON public.finanzen_budget_resets;
DROP POLICY IF EXISTS "Users can insert own budget resets" ON public.finanzen_budget_resets;

CREATE POLICY "Users can view own finanzen budget resets" ON public.finanzen_budget_resets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen budget resets" ON public.finanzen_budget_resets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- SCHRITT 7: KOMMENTARE UPDATEN
-- =============================================

COMMENT ON TABLE public.finanzen_transaction_categories IS 'Kategorien für Transaktionen (Lebensmittel, Transport, etc.)';
COMMENT ON TABLE public.finanzen_budgets IS 'Budgets mit Übertrag-Funktionalität';
COMMENT ON TABLE public.finanzen_transactions IS 'Alle Einnahmen und Ausgaben';
COMMENT ON TABLE public.finanzen_cost_plans IS 'Kostenpläne für verschiedene Szenarien';
COMMENT ON TABLE public.finanzen_cost_categories IS 'Kategorien innerhalb eines Kostenplans';
COMMENT ON TABLE public.finanzen_cost_items IS 'Einzelne Kostenpunkte in einer Kategorie';
COMMENT ON TABLE public.finanzen_income_sources IS 'Einkommensquellen (Gehalt, etc.)';
COMMENT ON TABLE public.finanzen_budget_resets IS 'Historie der Budget-Resets';

-- =============================================
-- FERTIG!
-- =============================================

-- Alle Tabellen haben jetzt den "finanzen_" Prefix:
-- - finanzen_transaction_categories
-- - finanzen_budgets  
-- - finanzen_transactions
-- - finanzen_cost_plans
-- - finanzen_cost_categories
-- - finanzen_cost_items
-- - finanzen_income_sources
-- - finanzen_budget_resets
-- 
-- Views:
-- - finanzen_monthly_transaction_summary
-- - finanzen_budget_utilization
-- - finanzen_cost_plan_progress