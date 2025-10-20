'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  createCreditLoan,
  createCreditRepayment,
  deleteCreditLoan,
  deleteCreditRepayment,
  getCreditLoans,
  updateCreditLoan,
} from '../lib/services/creditService';
import type {
  CreateCreditLoanData,
  CreateCreditRepaymentData,
  FinanzenCreditLoanWithRepayments,
  UpdateCreditLoanData,
} from '../lib/types';
import { readCache, writeCache, withCacheKey } from '../lib/utils/browserCache';

const CREDIT_CACHE_TTL = 1000 * 60 * 2;

export function useCredits() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<FinanzenCreditLoanWithRepayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = withCacheKey('finanzen:credit_loans', user?.id);
  const loansRef = useRef<FinanzenCreditLoanWithRepayments[]>([]);

  useEffect(() => {
    loansRef.current = loans;
  }, [loans]);

  const loadLoans = useCallback(
    async (options?: { skipLoading?: boolean }) => {
      if (!user?.id) {
        setLoans([]);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return [];
      }

      const shouldShowInitialLoader = !options?.skipLoading && loansRef.current.length === 0;
      if (shouldShowInitialLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const data = await getCreditLoans(user.id);
        setLoans(data);
        if (cacheKey) {
          writeCache(cacheKey, data, CREDIT_CACHE_TTL);
        }
        return data;
      } catch (err) {
        console.error('Error loading credit loans:', err);
        setError('Fehler beim Laden der Kredite.');
        return loansRef.current;
      } finally {
        if (shouldShowInitialLoader) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [user?.id, cacheKey],
  );

  useEffect(() => {
    if (!user?.id) {
      setLoans([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    const cached = cacheKey ? readCache<FinanzenCreditLoanWithRepayments[]>(cacheKey) : null;
    if (cached) {
      setLoans(cached);
      setLoading(false);
    }

    void loadLoans({ skipLoading: Boolean(cached) });
  }, [user?.id, cacheKey, loadLoans]);

  const refresh = useCallback(
    () => loadLoans({ skipLoading: loansRef.current.length > 0 }),
    [loadLoans],
  );

  const addLoan = useCallback(
    async (payload: CreateCreditLoanData) => {
      if (!user?.id) return null;
      const created = await createCreditLoan({ ...payload, user_id: user.id });
      if (created) {
        setLoans((prev) => {
          const next = [created, ...prev];
          if (cacheKey) {
            writeCache(cacheKey, next, CREDIT_CACHE_TTL);
          }
          return next;
        });
      }
      return created;
    },
    [cacheKey, user?.id],
  );

  const editLoan = useCallback(
    async (loanId: string, data: UpdateCreditLoanData) => {
      if (!user?.id) return null;
      const updated = await updateCreditLoan(loanId, user.id, data);
      if (updated) {
        setLoans((prev) => {
          const next = prev.map((loan) => (loan.id === loanId ? updated : loan));
          if (cacheKey) {
            writeCache(cacheKey, next, CREDIT_CACHE_TTL);
          }
          return next;
        });
      }
      return updated;
    },
    [cacheKey, user?.id],
  );

  const removeLoan = useCallback(
    async (loanId: string) => {
      if (!user?.id) return false;
      const success = await deleteCreditLoan(loanId, user.id);
      if (success) {
        setLoans((prev) => {
          const next = prev.filter((loan) => loan.id !== loanId);
          if (cacheKey) {
            writeCache(cacheKey, next, CREDIT_CACHE_TTL);
          }
          return next;
        });
      }
      return success;
    },
    [cacheKey, user?.id],
  );

  const addRepayment = useCallback(
    async (payload: CreateCreditRepaymentData & { loan_id: string }) => {
      if (!user?.id) return null;
      const created = await createCreditRepayment({ ...payload, user_id: user.id });
      if (created) {
        setLoans((prev) => {
          const next = prev.map((loan) =>
            loan.id === payload.loan_id
              ? { ...loan, repayments: [created, ...loan.repayments] }
              : loan,
          );
          if (cacheKey) {
            writeCache(cacheKey, next, CREDIT_CACHE_TTL);
          }
          return next;
        });
      }
      return created;
    },
    [cacheKey, user?.id],
  );

  const removeRepayment = useCallback(
    async (loanId: string, repaymentId: string) => {
      if (!user?.id) return false;
      const success = await deleteCreditRepayment(repaymentId, user.id);
      if (success) {
        setLoans((prev) => {
          const next = prev.map((loan) =>
            loan.id === loanId
              ? {
                  ...loan,
                  repayments: loan.repayments.filter((repayment) => repayment.id !== repaymentId),
                }
              : loan,
          );
          if (cacheKey) {
            writeCache(cacheKey, next, CREDIT_CACHE_TTL);
          }
          return next;
        });
      }
      return success;
    },
    [cacheKey, user?.id],
  );

  return {
    loans,
    loading,
    refreshing,
    error,
    refresh,
    addLoan,
    editLoan,
    removeLoan,
    addRepayment,
    removeRepayment,
  };
}
