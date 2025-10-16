import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionById } from '../lib/services/costPlanService';
import type { FinanzenTransaction } from '../lib/types';
import { readCache, writeCache, withCacheKey } from '../lib/utils/browserCache';

const TRANSACTIONS_CACHE_TTL = 1000 * 60 * 2; // 2 minutes

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<FinanzenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = withCacheKey('finanzen:transactions', user?.id);
  const transactionsRef = useRef<FinanzenTransaction[]>([]);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  const loadTransactions = useCallback(async (options?: { skipLoading?: boolean }) => {
    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return [];
    }

    const shouldShowInitialLoader = !options?.skipLoading && transactionsRef.current.length === 0;
    if (shouldShowInitialLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    let data: FinanzenTransaction[] = transactionsRef.current;

    try {
      data = await getTransactions(user.id);
      setTransactions(data);
      if (cacheKey) {
        writeCache(cacheKey, data, TRANSACTIONS_CACHE_TTL);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Fehler beim Laden der Transaktionen');
    } finally {
      if (shouldShowInitialLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }

    return data;
  }, [user?.id, cacheKey]);

  useEffect(() => {
    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    if (!cacheKey) {
      void loadTransactions();
      return;
    }

    const cached = readCache<FinanzenTransaction[]>(cacheKey);
    if (cached) {
      setTransactions(cached);
      setLoading(false);
    }

    void loadTransactions({ skipLoading: Boolean(cached) });
  }, [user?.id, cacheKey, loadTransactions]);

  const addTransaction = async (transaction: Partial<FinanzenTransaction>) => {
    if (!user?.id) return null;
    const newTransaction = await createTransaction({ ...transaction, user_id: user.id });
    if (newTransaction) {
      setTransactions(prev => {
        const next = [...prev, newTransaction];
        if (cacheKey) {
          writeCache(cacheKey, next, TRANSACTIONS_CACHE_TTL);
        }
        return next;
      });
    }
    return newTransaction;
  };

  const editTransaction = async (transactionId: string, data: Partial<FinanzenTransaction>) => {
    if (!user?.id) return null;
    const updated = await updateTransaction(transactionId, user.id, data);
    if (updated) {
      setTransactions(prev => {
        const next = prev.map(t => (t.id === transactionId ? updated : t));
        if (cacheKey) {
          writeCache(cacheKey, next, TRANSACTIONS_CACHE_TTL);
        }
        return next;
      });
    }
    return updated;
  };

  const removeTransaction = async (transactionId: string) => {
    if (!user?.id) return false;
    const success = await deleteTransaction(transactionId, user.id);
    if (success) {
      setTransactions(prev => {
        const next = prev.filter(t => t.id !== transactionId);
        if (cacheKey) {
          writeCache(cacheKey, next, TRANSACTIONS_CACHE_TTL);
        }
        return next;
      });
    }
    return success;
  };

  return {
    transactions,
    loading,
    refreshing,
    error,
    refresh: () => loadTransactions({ skipLoading: transactionsRef.current.length > 0 }),
    addTransaction,
    editTransaction,
    removeTransaction,
    getTransactionById: async (id: string) => (user?.id ? await getTransactionById(id, user.id) : null)
  };
}
