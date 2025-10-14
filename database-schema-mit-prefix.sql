-- Finanzenapp Database Schema mit "finanzen_" Prefix
-- Erweitert die bestehende Fitness-App Datenbank um Finanz-Features
-- Alle Tabellen haben den "finanzen_" Prefix für bessere Organisation

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Update timestamp function (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- KATEGORIEN FÜR TRANSAKTIONEN
-- =============================================

CREATE TABLE public.finanzen_transaction_categories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL DEFAULT 'blue',
  icon VARCHAR(50) NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_transaction_categories_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_transaction_categories_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_transaction_categories_user_name_unique UNIQUE (user_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_transaction_categories_user_id ON public.finanzen_transaction_categories 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_finanzen_transaction_categories_updated_at 
BEFORE UPDATE ON finanzen_transaction_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BUDGETS
-- =============================================

CREATE TABLE public.finanzen_budgets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  spent DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
  carryover DECIMAL(10,2) NOT NULL DEFAULT 0,
  period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_reset BOOLEAN NOT NULL DEFAULT true,
  reset_day INTEGER NULL CHECK (reset_day >= 1 AND reset_day <= 31),
  category_id uuid NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_budgets_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_budgets_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_budgets_category_id_fkey FOREIGN KEY (category_id) 
    REFERENCES public.finanzen_transaction_categories (id) ON DELETE SET NULL,
  CONSTRAINT finanzen_budgets_user_name_unique UNIQUE (user_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_budgets_user_id ON public.finanzen_budgets 
USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_budgets_category_id ON public.finanzen_budgets 
USING btree (category_id) TABLESPACE pg_default;

CREATE TRIGGER update_finanzen_budgets_updated_at 
BEFORE UPDATE ON finanzen_budgets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRANSAKTIONEN
-- =============================================

CREATE TABLE public.finanzen_transactions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category_id uuid NULL,
  budget_id uuid NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_interval VARCHAR(20) NULL CHECK (recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
  tags TEXT[] NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_transactions_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_transactions_category_id_fkey FOREIGN KEY (category_id) 
    REFERENCES public.finanzen_transaction_categories (id) ON DELETE SET NULL,
  CONSTRAINT finanzen_transactions_budget_id_fkey FOREIGN KEY (budget_id) 
    REFERENCES public.finanzen_budgets (id) ON DELETE SET NULL
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_transactions_user_id ON public.finanzen_transactions 
USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_transactions_category_id ON public.finanzen_transactions 
USING btree (category_id) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_transactions_budget_id ON public.finanzen_transactions 
USING btree (budget_id) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_transactions_date ON public.finanzen_transactions 
USING btree (transaction_date) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_transactions_type ON public.finanzen_transactions 
USING btree (type) TABLESPACE pg_default;

CREATE TRIGGER update_finanzen_transactions_updated_at 
BEFORE UPDATE ON finanzen_transactions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- KOSTENPLÄNE
-- =============================================

CREATE TABLE public.finanzen_cost_plans (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  total_estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  target_date DATE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_cost_plans_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_cost_plans_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_cost_plans_user_name_unique UNIQUE (user_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_cost_plans_user_id ON public.finanzen_cost_plans 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_finanzen_cost_plans_updated_at 
BEFORE UPDATE ON finanzen_cost_plans 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- KOSTENKATEGORIEN
-- =============================================

CREATE TABLE public.finanzen_cost_categories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  cost_plan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  estimated_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  color VARCHAR(50) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_cost_categories_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_cost_categories_cost_plan_id_fkey FOREIGN KEY (cost_plan_id) 
    REFERENCES public.finanzen_cost_plans (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_cost_categories_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_cost_categories_plan_name_unique UNIQUE (cost_plan_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_cost_categories_cost_plan_id ON public.finanzen_cost_categories 
USING btree (cost_plan_id) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_cost_categories_user_id ON public.finanzen_cost_categories 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_finanzen_cost_categories_updated_at 
BEFORE UPDATE ON finanzen_cost_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- KOSTENPOSTEN
-- =============================================

CREATE TABLE public.finanzen_cost_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  cost_category_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  estimated_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  actual_cost DECIMAL(10,2) NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit VARCHAR(20) NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_cost_items_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_cost_items_cost_category_id_fkey FOREIGN KEY (cost_category_id) 
    REFERENCES public.finanzen_cost_categories (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_cost_items_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_cost_items_cost_category_id ON public.finanzen_cost_items 
USING btree (cost_category_id) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_cost_items_user_id ON public.finanzen_cost_items 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_finanzen_cost_items_updated_at 
BEFORE UPDATE ON finanzen_cost_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- EINKOMMENSQUELLEN
-- =============================================

CREATE TABLE public.finanzen_income_sources (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'yearly', 'one-time')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NULL,
  description TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_income_sources_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_income_sources_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_income_sources_user_name_unique UNIQUE (user_id, name),
  CONSTRAINT finanzen_income_sources_date_check CHECK (end_date IS NULL OR end_date >= start_date)
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_income_sources_user_id ON public.finanzen_income_sources 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_finanzen_income_sources_updated_at 
BEFORE UPDATE ON finanzen_income_sources 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BUDGET RESET HISTORIE
-- =============================================

CREATE TABLE public.finanzen_budget_resets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  budget_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  previous_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  carryover_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  new_period_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT finanzen_budget_resets_pkey PRIMARY KEY (id),
  CONSTRAINT finanzen_budget_resets_budget_id_fkey FOREIGN KEY (budget_id) 
    REFERENCES public.finanzen_budgets (id) ON DELETE CASCADE,
  CONSTRAINT finanzen_budget_resets_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_budget_resets_budget_id ON public.finanzen_budget_resets 
USING btree (budget_id) TABLESPACE pg_default;

CREATE INDEX idx_finanzen_budget_resets_user_id ON public.finanzen_budget_resets 
USING btree (user_id) TABLESPACE pg_default;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.finanzen_transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzen_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzen_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzen_cost_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzen_cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzen_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzen_income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzen_budget_resets ENABLE ROW LEVEL SECURITY;

-- Transaction Categories Policies
CREATE POLICY "Users can view own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen transaction categories" ON public.finanzen_transaction_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can view own finanzen budgets" ON public.finanzen_budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen budgets" ON public.finanzen_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen budgets" ON public.finanzen_budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen budgets" ON public.finanzen_budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view own finanzen transactions" ON public.finanzen_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen transactions" ON public.finanzen_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen transactions" ON public.finanzen_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen transactions" ON public.finanzen_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Plans Policies
CREATE POLICY "Users can view own finanzen cost plans" ON public.finanzen_cost_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen cost plans" ON public.finanzen_cost_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen cost plans" ON public.finanzen_cost_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen cost plans" ON public.finanzen_cost_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Categories Policies
CREATE POLICY "Users can view own finanzen cost categories" ON public.finanzen_cost_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen cost categories" ON public.finanzen_cost_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen cost categories" ON public.finanzen_cost_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen cost categories" ON public.finanzen_cost_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Items Policies
CREATE POLICY "Users can view own finanzen cost items" ON public.finanzen_cost_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen cost items" ON public.finanzen_cost_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen cost items" ON public.finanzen_cost_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen cost items" ON public.finanzen_cost_items
  FOR DELETE USING (auth.uid() = user_id);

-- Income Sources Policies
CREATE POLICY "Users can view own finanzen income sources" ON public.finanzen_income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen income sources" ON public.finanzen_income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finanzen income sources" ON public.finanzen_income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own finanzen income sources" ON public.finanzen_income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Budget Resets Policies
CREATE POLICY "Users can view own finanzen budget resets" ON public.finanzen_budget_resets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finanzen budget resets" ON public.finanzen_budget_resets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_finanzen_categories(user_uuid uuid)
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

-- Function to update budget spent amount when transaction is added/updated
CREATE OR REPLACE FUNCTION update_finanzen_budget_spent()
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

-- Function to revert budget spent amount when transaction is deleted/updated
CREATE OR REPLACE FUNCTION revert_finanzen_budget_spent()
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
CREATE OR REPLACE FUNCTION update_finanzen_cost_plan_total()
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
CREATE OR REPLACE FUNCTION update_finanzen_cost_category_total()
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
-- TRIGGERS
-- =============================================

-- Budget synchronization triggers
CREATE TRIGGER sync_finanzen_budget_on_transaction_insert
  AFTER INSERT ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION update_finanzen_budget_spent();

CREATE TRIGGER sync_finanzen_budget_on_transaction_delete
  BEFORE DELETE ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION revert_finanzen_budget_spent();

-- Cost plan total calculation triggers
CREATE TRIGGER update_finanzen_cost_plan_total_on_category_change
  AFTER INSERT OR UPDATE OR DELETE ON public.finanzen_cost_categories
  FOR EACH ROW EXECUTE FUNCTION update_finanzen_cost_plan_total();

CREATE TRIGGER update_finanzen_cost_category_total_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.finanzen_cost_items
  FOR EACH ROW EXECUTE FUNCTION update_finanzen_cost_category_total();

-- =============================================
-- VIEWS
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
-- INITIAL DATA / DEFAULT CATEGORIES
-- =============================================

-- Diese Funktion kann nach der User-Registrierung aufgerufen werden
-- SELECT create_default_finanzen_categories('user-uuid-here');

-- =============================================
-- KOMMENTARE
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
-- SETUP COMPLETE!
-- =============================================

-- Datenbank Schema erstellt mit folgenden Tabellen:
-- ✅ finanzen_transaction_categories - Kategorien für Transaktionen
-- ✅ finanzen_budgets - Budgets mit Carryover
-- ✅ finanzen_transactions - Einnahmen und Ausgaben
-- ✅ finanzen_cost_plans - Kostenpläne
-- ✅ finanzen_cost_categories - Kostenkategorien
-- ✅ finanzen_cost_items - Einzelne Kostenpunkte
-- ✅ finanzen_income_sources - Einkommensquellen
-- ✅ finanzen_budget_resets - Budget Reset Historie
--
-- ✅ RLS Policies für alle Tabellen
-- ✅ Trigger für automatische Budget-Synchronisation
-- ✅ Views für Analytics und Reporting
-- ✅ Functions für Standard-Kategorien und Berechnungen
--
-- Nächste Schritte:
-- 1. Supabase Environment Variables in .env.local setzen
-- 2. TypeScript Types für die neuen Tabellen erstellen
-- 3. API Routes für CRUD Operationen implementieren
-- 4. Frontend Components mit echten Daten verbinden