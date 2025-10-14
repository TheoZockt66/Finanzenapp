import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactionCategories } from '../lib/services/costPlanService';
import type { FinanzenTransactionCategory } from '../lib/types';

export function useTransactionCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<FinanzenTransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!user?.id) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getTransactionCategories(user.id);
      setCategories(data);
    } catch (err) {
      console.error('Error loading transaction categories:', err);
      setError('Fehler beim Laden der Kategorien');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
  };
}
