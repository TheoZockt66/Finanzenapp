import { supabase, FINANZEN_TABLES } from '../supabase';
import type {
  CreateCreditLoanData,
  CreateCreditRepaymentData,
  FinanzenCreditLoan,
  FinanzenCreditLoanWithRepayments,
  FinanzenCreditRepayment,
  UpdateCreditLoanData,
} from '../types';

type SupabaseLoanRow = FinanzenCreditLoan & {
  repayments?: FinanzenCreditRepayment[] | null;
};

function mapLoanRow(row: SupabaseLoanRow): FinanzenCreditLoanWithRepayments {
  return {
    ...row,
    repayments: (row.repayments ?? []).slice().sort((a, b) =>
      (b.payment_date ?? '').localeCompare(a.payment_date ?? ''),
    ),
  };
}

export async function getCreditLoans(userId: string): Promise<FinanzenCreditLoanWithRepayments[]> {
  const { data, error } = await supabase
    .from<SupabaseLoanRow>(FINANZEN_TABLES.CREDIT_LOANS)
    .select(
      `
        *,
        repayments:${FINANZEN_TABLES.CREDIT_REPAYMENTS}(*)
      `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching credit loans:', error);
    throw error;
  }

  return (data ?? []).map(mapLoanRow);
}

export async function createCreditLoan(
  payload: CreateCreditLoanData & { user_id: string },
): Promise<FinanzenCreditLoanWithRepayments | null> {
  const { data, error } = await supabase
    .from<FinanzenCreditLoan>(FINANZEN_TABLES.CREDIT_LOANS)
    .insert({
      ...payload,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating credit loan:', error);
    throw error;
  }

  if (!data) return null;
  return mapLoanRow({ ...data, repayments: [] });
}

export async function updateCreditLoan(
  loanId: string,
  userId: string,
  payload: UpdateCreditLoanData,
): Promise<FinanzenCreditLoanWithRepayments | null> {
  const { data, error } = await supabase
    .from<SupabaseLoanRow>(FINANZEN_TABLES.CREDIT_LOANS)
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)
    .eq('user_id', userId)
    .select(
      `
        *,
        repayments:${FINANZEN_TABLES.CREDIT_REPAYMENTS}(*)
      `,
    )
    .single();

  if (error) {
    console.error('Error updating credit loan:', error);
    throw error;
  }

  return data ? mapLoanRow(data) : null;
}

export async function deleteCreditLoan(loanId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from(FINANZEN_TABLES.CREDIT_LOANS)
    .delete()
    .eq('id', loanId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting credit loan:', error);
    throw error;
  }

  return true;
}

export async function createCreditRepayment(
  payload: CreateCreditRepaymentData & { user_id: string },
): Promise<FinanzenCreditRepayment | null> {
  const { data, error } = await supabase
    .from<FinanzenCreditRepayment>(FINANZEN_TABLES.CREDIT_REPAYMENTS)
    .insert({
      ...payload,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating credit repayment:', error);
    throw error;
  }

  return data ?? null;
}

export async function deleteCreditRepayment(
  repaymentId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from(FINANZEN_TABLES.CREDIT_REPAYMENTS)
    .delete()
    .eq('id', repaymentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting credit repayment:', error);
    throw error;
  }

  return true;
}
