import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBudgets, createBudget, updateBudget, deleteBudget, getBudgetById } from '../lib/services/costPlanService';
import type { FinanzenBudget } from '../lib/types';
import { readCache, writeCache, withCacheKey } from '../lib/utils/browserCache';

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<FinanzenBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = withCacheKey('finanzen:budgets', user?.id);
  const budgetsRef = useRef<FinanzenBudget[]>([]);

  useEffect(() => {
    budgetsRef.current = budgets;
  }, [budgets]);

  const loadBudgets = useCallback(async (options?: { skipLoading?: boolean }) => {
    if (!user?.id) {
      setBudgets([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return [];
    }

    const shouldShowInitialLoader = !options?.skipLoading && budgetsRef.current.length === 0;
    if (shouldShowInitialLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    let data: FinanzenBudget[] = budgetsRef.current;

    try {
      data = await getBudgets(user.id);
      setBudgets(data);
      if (cacheKey) {
        writeCache(cacheKey, data);
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Fehler beim Laden der Budgets');
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
      setBudgets([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    if (!cacheKey) {
      void loadBudgets();
      return;
    }

    const cached = readCache<FinanzenBudget[]>(cacheKey);
    if (cached) {
      setBudgets(cached);
      setLoading(false);
    }

    void loadBudgets({ skipLoading: Boolean(cached) });
  }, [user?.id, cacheKey, loadBudgets]);

  const addBudget = async (budget: Partial<FinanzenBudget>) => {
    if (!user?.id) return null;
    const newBudget = await createBudget({ ...budget, user_id: user.id });
    if (newBudget) {
      setBudgets(prev => {
        const next = [...prev, newBudget];
        if (cacheKey) {
          writeCache(cacheKey, next);
        }
        return next;
      });
    }
    return newBudget;
  };

  const editBudget = async (budgetId: string, data: Partial<FinanzenBudget>) => {
    if (!user?.id) return null;
    const updated = await updateBudget(budgetId, user.id, data);
    if (updated) {
      setBudgets(prev => {
        const next = prev.map(b => (b.id === budgetId ? updated : b));
        if (cacheKey) {
          writeCache(cacheKey, next);
        }
        return next;
      });
    }
    return updated;
  };

  const removeBudget = async (budgetId: string) => {
    if (!user?.id) return false;
    const success = await deleteBudget(budgetId, user.id);
    if (success) {
      setBudgets(prev => {
        const next = prev.filter(b => b.id !== budgetId);
        if (cacheKey) {
          writeCache(cacheKey, next);
        }
        return next;
      });
    }
    return success;
  };

  return {
    budgets,
    loading,
    refreshing,
    error,
    refresh: () => loadBudgets({ skipLoading: budgetsRef.current.length > 0 }),
    addBudget,
    editBudget,
    removeBudget,
    getBudgetById: async (id: string) => (user?.id ? await getBudgetById(id, user.id) : null)
  };
}
