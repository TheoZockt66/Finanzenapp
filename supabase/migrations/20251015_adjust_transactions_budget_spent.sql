-- Align finanzen_transactions schema with frontend requirements and
-- keep budget spend totals in sync when transactions change.

-- 1) Allow empty descriptions by switching to TEXT with a default value.
ALTER TABLE public.finanzen_transactions
  ALTER COLUMN description TYPE TEXT;

ALTER TABLE public.finanzen_transactions
  ALTER COLUMN description SET DEFAULT '';

UPDATE public.finanzen_transactions
  SET description = COALESCE(description, '');

ALTER TABLE public.finanzen_transactions
  ALTER COLUMN description SET NOT NULL;

-- 2) Replace helper functions so budget totals stay consistent.
CREATE OR REPLACE FUNCTION update_finanzen_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'expense' AND NEW.budget_id IS NOT NULL AND NEW.amount IS NOT NULL THEN
    UPDATE public.finanzen_budgets
    SET spent = COALESCE(spent, 0) + NEW.amount
    WHERE id = NEW.budget_id AND user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION revert_finanzen_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'expense' AND OLD.budget_id IS NOT NULL AND OLD.amount IS NOT NULL THEN
    UPDATE public.finanzen_budgets
    SET spent = GREATEST(COALESCE(spent, 0) - OLD.amount, 0)
    WHERE id = OLD.budget_id AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Add update triggers so edits move budget totals correctly.
DROP TRIGGER IF EXISTS sync_finanzen_budget_on_transaction_update_before
  ON public.finanzen_transactions;

DROP TRIGGER IF EXISTS sync_finanzen_budget_on_transaction_update_after
  ON public.finanzen_transactions;

CREATE TRIGGER sync_finanzen_budget_on_transaction_update_before
  BEFORE UPDATE ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION revert_finanzen_budget_spent();

CREATE TRIGGER sync_finanzen_budget_on_transaction_update_after
  AFTER UPDATE ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION update_finanzen_budget_spent();
