-- Ensure revert_budget_spent uses GREATEST to avoid negative spent values
CREATE OR REPLACE FUNCTION public.revert_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- If this was an expense transaction with a budget
  IF OLD.type = 'expense' AND OLD.budget_id IS NOT NULL AND OLD.amount IS NOT NULL THEN
    -- Revert budget spent amount safely (never below 0)
    UPDATE public.finanzen_budgets
    SET spent = GREATEST(COALESCE(spent, 0) - OLD.amount, 0)
    WHERE id = OLD.budget_id AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure triggers for insert/delete exist and use the correct functions
DROP TRIGGER IF EXISTS sync_budget_on_transaction_insert ON public.finanzen_transactions;
DROP TRIGGER IF EXISTS sync_budget_on_transaction_delete ON public.finanzen_transactions;

CREATE TRIGGER sync_budget_on_transaction_insert
  AFTER INSERT ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_spent();

CREATE TRIGGER sync_budget_on_transaction_delete
  BEFORE DELETE ON public.finanzen_transactions
  FOR EACH ROW EXECUTE FUNCTION revert_budget_spent();
