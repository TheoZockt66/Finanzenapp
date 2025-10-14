import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getTransactionById } from '../lib/services/costPlanService';
import type { FinanzenTransaction } from '../lib/types';

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<FinanzenTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTransactions(user.id);
      setTransactions(data);
    } catch {
      setError('Fehler beim Laden der Transaktionen');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const addTransaction = async (transaction: Partial<FinanzenTransaction>) => {
    if (!user?.id) return null;
    const newTransaction = await createTransaction({ ...transaction, user_id: user.id });
    if (newTransaction) setTransactions(prev => [...prev, newTransaction]);
    return newTransaction;
  };

  const editTransaction = async (transactionId: string, data: Partial<FinanzenTransaction>) => {
    if (!user?.id) return null;
    const updated = await updateTransaction(transactionId, user.id, data);
    if (updated) setTransactions(prev => prev.map(t => t.id === transactionId ? updated : t));
    return updated;
  };

  const removeTransaction = async (transactionId: string) => {
    if (!user?.id) return false;
    const success = await deleteTransaction(transactionId, user.id);
    if (success) setTransactions(prev => prev.filter(t => t.id !== transactionId));
    return success;
  };

  return {
    transactions,
    loading,
    error,
    refresh: loadTransactions,
    addTransaction,
    editTransaction,
    removeTransaction,
    getTransactionById: async (id: string) => user?.id ? await getTransactionById(id, user.id) : null
  };
}
