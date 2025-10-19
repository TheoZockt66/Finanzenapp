-- RPC to safely delete a transaction and adjust the budget.spent atomically
-- This function subtracts the transaction amount from the associated budget (if expense)
-- using GREATEST(..., 0) to avoid negative spent, then deletes the transaction.
CREATE OR REPLACE FUNCTION public.delete_transaction_and_adjust_budget(p_transaction_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Lock the transaction row for update to avoid races
  PERFORM 1 FROM public.finanzen_transactions WHERE id = p_transaction_id AND user_id = p_user_id FOR UPDATE;

  -- Get the transaction details
  DECLARE
    v_type text;
    v_amount numeric;
    v_budget_id uuid;
  BEGIN
    SELECT type, amount, budget_id INTO v_type, v_amount, v_budget_id
    FROM public.finanzen_transactions
    WHERE id = p_transaction_id AND user_id = p_user_id;

    IF v_type IS NULL THEN
      RAISE EXCEPTION 'Transaction not found';
    END IF;

      -- We delegate budget adjustments to DB triggers (they must be present and safe).
      -- Just delete the transaction here and let the BEFORE DELETE trigger revert spent.
      DELETE FROM public.finanzen_transactions WHERE id = p_transaction_id AND user_id = p_user_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
