-- Finanzenapp Database Schema
-- Erweitert die bestehende Fitness-App Datenbank um Finanz-Features

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

CREATE TABLE public.transaction_categories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL DEFAULT 'blue',
  icon VARCHAR(50) NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT transaction_categories_pkey PRIMARY KEY (id),
  CONSTRAINT transaction_categories_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT transaction_categories_user_name_unique UNIQUE (user_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_transaction_categories_user_id ON public.transaction_categories 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_transaction_categories_updated_at 
BEFORE UPDATE ON transaction_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BUDGETS
-- =============================================

CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  spent DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
  carryover DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (carryover >= 0),
  reset_day INTEGER NOT NULL DEFAULT 1 CHECK (reset_day >= 1 AND reset_day <= 31),
  color VARCHAR(50) NOT NULL DEFAULT 'blue',
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT budgets_user_name_unique UNIQUE (user_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_budgets_user_id ON public.budgets 
USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX idx_budgets_user_active ON public.budgets 
USING btree (user_id, is_active) TABLESPACE pg_default;

CREATE TRIGGER update_budgets_updated_at 
BEFORE UPDATE ON budgets 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRANSAKTIONEN
-- =============================================

CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  category_id uuid NULL,
  budget_id uuid NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) 
    REFERENCES public.transaction_categories (id) ON DELETE SET NULL,
  CONSTRAINT transactions_budget_id_fkey FOREIGN KEY (budget_id) 
    REFERENCES public.budgets (id) ON DELETE SET NULL
) TABLESPACE pg_default;

CREATE INDEX idx_transactions_user_id ON public.transactions 
USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX idx_transactions_user_date ON public.transactions 
USING btree (user_id, transaction_date DESC) TABLESPACE pg_default;

CREATE INDEX idx_transactions_category ON public.transactions 
USING btree (category_id) TABLESPACE pg_default;

CREATE INDEX idx_transactions_budget ON public.transactions 
USING btree (budget_id) TABLESPACE pg_default;

CREATE INDEX idx_transactions_type ON public.transactions 
USING btree (user_id, type) TABLESPACE pg_default;

CREATE TRIGGER update_transactions_updated_at 
BEFORE UPDATE ON transactions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- KOSTENPLÄNE (aus der Costs-Seite)
-- =============================================

CREATE TABLE public.cost_plans (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT cost_plans_pkey PRIMARY KEY (id),
  CONSTRAINT cost_plans_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT cost_plans_user_name_unique UNIQUE (user_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_cost_plans_user_id ON public.cost_plans 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_cost_plans_updated_at 
BEFORE UPDATE ON cost_plans 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- KOSTENKATEGORIEN
-- =============================================

CREATE TABLE public.cost_categories (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  cost_plan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  budget_amount DECIMAL(10,2) NULL CHECK (budget_amount >= 0),
  color VARCHAR(50) NOT NULL DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT cost_categories_pkey PRIMARY KEY (id),
  CONSTRAINT cost_categories_plan_id_fkey FOREIGN KEY (cost_plan_id) 
    REFERENCES public.cost_plans (id) ON DELETE CASCADE,
  CONSTRAINT cost_categories_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT cost_categories_plan_name_unique UNIQUE (cost_plan_id, name)
) TABLESPACE pg_default;

CREATE INDEX idx_cost_categories_plan_id ON public.cost_categories 
USING btree (cost_plan_id) TABLESPACE pg_default;

CREATE INDEX idx_cost_categories_user_id ON public.cost_categories 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_cost_categories_updated_at 
BEFORE UPDATE ON cost_categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- KOSTENPOSTEN
-- =============================================

CREATE TABLE public.cost_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  cost_category_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' 
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly', 'once')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT cost_items_pkey PRIMARY KEY (id),
  CONSTRAINT cost_items_category_id_fkey FOREIGN KEY (cost_category_id) 
    REFERENCES public.cost_categories (id) ON DELETE CASCADE,
  CONSTRAINT cost_items_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_cost_items_category_id ON public.cost_items 
USING btree (cost_category_id) TABLESPACE pg_default;

CREATE INDEX idx_cost_items_user_id ON public.cost_items 
USING btree (user_id) TABLESPACE pg_default;

CREATE TRIGGER update_cost_items_updated_at 
BEFORE UPDATE ON cost_items 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- EINKOMMEN/GEHALT
-- =============================================

CREATE TABLE public.income_sources (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' 
    CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT income_sources_pkey PRIMARY KEY (id),
  CONSTRAINT income_sources_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_income_sources_user_id ON public.income_sources 
USING btree (user_id) TABLESPACE pg_default;

CREATE INDEX idx_income_sources_user_active ON public.income_sources 
USING btree (user_id, is_active) TABLESPACE pg_default;

CREATE TRIGGER update_income_sources_updated_at 
BEFORE UPDATE ON income_sources 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- BUDGET RESET HISTORIE
-- =============================================

CREATE TABLE public.budget_resets (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  budget_id uuid NOT NULL,
  user_id uuid NOT NULL,
  old_spent DECIMAL(10,2) NOT NULL,
  carryover_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT budget_resets_pkey PRIMARY KEY (id),
  CONSTRAINT budget_resets_budget_id_fkey FOREIGN KEY (budget_id) 
    REFERENCES public.budgets (id) ON DELETE CASCADE,
  CONSTRAINT budget_resets_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX idx_budget_resets_budget_id ON public.budget_resets 
USING btree (budget_id) TABLESPACE pg_default;

CREATE INDEX idx_budget_resets_user_date ON public.budget_resets 
USING btree (user_id, reset_date DESC) TABLESPACE pg_default;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_resets ENABLE ROW LEVEL SECURITY;

-- Transaction Categories Policies
CREATE POLICY "Users can view own transaction categories" ON public.transaction_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transaction categories" ON public.transaction_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transaction categories" ON public.transaction_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transaction categories" ON public.transaction_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can view own budgets" ON public.budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets" ON public.budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets" ON public.budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets" ON public.budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Plans Policies
CREATE POLICY "Users can view own cost plans" ON public.cost_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cost plans" ON public.cost_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cost plans" ON public.cost_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cost plans" ON public.cost_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Categories Policies
CREATE POLICY "Users can view own cost categories" ON public.cost_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cost categories" ON public.cost_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cost categories" ON public.cost_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cost categories" ON public.cost_categories
  FOR DELETE USING (auth.uid() = user_id);

-- Cost Items Policies
CREATE POLICY "Users can view own cost items" ON public.cost_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cost items" ON public.cost_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cost items" ON public.cost_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cost items" ON public.cost_items
  FOR DELETE USING (auth.uid() = user_id);

-- Income Sources Policies
CREATE POLICY "Users can view own income sources" ON public.income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income sources" ON public.income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income sources" ON public.income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income sources" ON public.income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Budget Resets Policies
CREATE POLICY "Users can view own budget resets" ON public.budget_resets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget resets" ON public.budget_resets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- DEFAULT CATEGORIES INSERT
-- =============================================

-- Function to create default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories(user_uuid uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.transaction_categories (user_id, name, color, is_default) VALUES
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

-- =============================================
-- FUNCTIONS FOR BUDGET MANAGEMENT
-- =============================================

-- Function to update budget spent amount when transaction is added/updated
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is an expense transaction with a budget
  IF NEW.type = 'expense' AND NEW.budget_id IS NOT NULL THEN
    -- Update budget spent amount
    UPDATE public.budgets 
    SET spent = spent + NEW.amount
    WHERE id = NEW.budget_id AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revert budget spent amount when transaction is deleted/updated
CREATE OR REPLACE FUNCTION revert_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- If this was an expense transaction with a budget
  IF OLD.type = 'expense' AND OLD.budget_id IS NOT NULL THEN
    -- Revert budget spent amount
    UPDATE public.budgets 
    SET spent = spent - OLD.amount
    WHERE id = OLD.budget_id AND user_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for budget synchronization
CREATE TRIGGER sync_budget_on_transaction_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_spent();

CREATE TRIGGER sync_budget_on_transaction_delete
  BEFORE DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION revert_budget_spent();

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- Monthly transaction summary view
CREATE VIEW public.monthly_transaction_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', transaction_date) as month,
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM public.transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date), type;

-- Budget utilization view
CREATE VIEW public.budget_utilization AS
SELECT 
  b.id,
  b.user_id,
  b.name,
  b.amount as budget_amount,
  b.spent,
  b.carryover,
  (b.amount + b.carryover - b.spent) as available,
  ROUND((b.spent / NULLIF(b.amount + b.carryover, 0) * 100), 2) as utilization_percent
FROM public.budgets b
WHERE b.is_active = true;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.transaction_categories IS 'Kategorien für Transaktionen (Lebensmittel, Transport, etc.)';
COMMENT ON TABLE public.budgets IS 'Budgets mit Übertrag-Funktionalität';
COMMENT ON TABLE public.transactions IS 'Alle Einnahmen und Ausgaben';
COMMENT ON TABLE public.cost_plans IS 'Kostenpläne für verschiedene Szenarien';
COMMENT ON TABLE public.cost_categories IS 'Kategorien innerhalb eines Kostenplans';
COMMENT ON TABLE public.cost_items IS 'Einzelne Kostenpunkte in einer Kategorie';
COMMENT ON TABLE public.income_sources IS 'Einkommensquellen (Gehalt, etc.)';
COMMENT ON TABLE public.budget_resets IS 'Historie der Budget-Resets';