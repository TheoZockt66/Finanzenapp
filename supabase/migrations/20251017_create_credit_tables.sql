-- Create tables for credit management

CREATE TABLE IF NOT EXISTS public.finanzen_credit_loans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  role text NOT NULL CHECK (role IN ('borrower', 'lender')),
  principal numeric(14, 2) NOT NULL CHECK (principal >= 0),
  interest_rate numeric(7, 4) NOT NULL CHECK (interest_rate >= 0),
  term_months integer NOT NULL CHECK (term_months > 0),
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'bi-monthly', 'quarterly', 'yearly')),
  start_date date NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finanzen_credit_repayments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id uuid NOT NULL REFERENCES public.finanzen_credit_loans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finanzen_credit_loans_user_id
  ON public.finanzen_credit_loans (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finanzen_credit_repayments_loan
  ON public.finanzen_credit_repayments (loan_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_finanzen_credit_repayments_user
  ON public.finanzen_credit_repayments (user_id, payment_date DESC);

-- Automatically update updated_at
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_finanzen_credit_loans_set_timestamp ON public.finanzen_credit_loans;
CREATE TRIGGER trg_finanzen_credit_loans_set_timestamp
BEFORE UPDATE ON public.finanzen_credit_loans
FOR EACH ROW
EXECUTE PROCEDURE public.set_timestamp();

DROP TRIGGER IF EXISTS trg_finanzen_credit_repayments_set_timestamp ON public.finanzen_credit_repayments;
CREATE TRIGGER trg_finanzen_credit_repayments_set_timestamp
BEFORE UPDATE ON public.finanzen_credit_repayments
FOR EACH ROW
EXECUTE PROCEDURE public.set_timestamp();
