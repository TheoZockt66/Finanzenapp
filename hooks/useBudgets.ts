import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBudgets, createBudget, updateBudget, deleteBudget, getBudgetById } from '../lib/services/costPlanService';
import type { FinanzenBudget } from '../lib/types';

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<FinanzenBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBudgets(user.id);
      setBudgets(data);
    } catch {
      setError('Fehler beim Laden der Budgets');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const addBudget = async (budget: Partial<FinanzenBudget>) => {
    if (!user?.id) return null;
    const newBudget = await createBudget({ ...budget, user_id: user.id });
    if (newBudget) setBudgets(prev => [...prev, newBudget]);
    return newBudget;
  };

  const editBudget = async (budgetId: string, data: Partial<FinanzenBudget>) => {
    if (!user?.id) return null;
    const updated = await updateBudget(budgetId, user.id, data);
    if (updated) setBudgets(prev => prev.map(b => b.id === budgetId ? updated : b));
    return updated;
  };

  const removeBudget = async (budgetId: string) => {
    if (!user?.id) return false;
    const success = await deleteBudget(budgetId, user.id);
    if (success) setBudgets(prev => prev.filter(b => b.id !== budgetId));
    return success;
  };

  return {
    budgets,
    loading,
    error,
    refresh: loadBudgets,
    addBudget,
    editBudget,
    removeBudget,
    getBudgetById: async (id: string) => user?.id ? await getBudgetById(id, user.id) : null
  };
}
