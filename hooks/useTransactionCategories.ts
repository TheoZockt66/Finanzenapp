import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTransactionCategories,
  createTransactionCategory,
  updateTransactionCategory,
  deleteTransactionCategory,
} from '../lib/services/costPlanService';
import type {
  FinanzenTransactionCategory,
  CreateTransactionCategoryData,
  UpdateTransactionCategoryData,
} from '../lib/types';

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

  const addCategory = async (input: { name: string; color: string; icon?: string }) => {
    if (!user?.id) {
      throw new Error('Nicht angemeldet');
    }

    const payload: CreateTransactionCategoryData = {
      user_id: user.id,
      name: input.name,
      color: input.color,
      icon: input.icon,
      is_default: false,
    };

    const created = await createTransactionCategory(payload);
    if (created) {
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'de'))
      );
    }
    return created;
  };

  const editCategory = async (
    categoryId: string,
    data: UpdateTransactionCategoryData
  ) => {
    if (!user?.id) {
      throw new Error('Nicht angemeldet');
    }

    const updated = await updateTransactionCategory(categoryId, user.id, data);
    if (updated) {
      setCategories((prev) =>
        prev
          .map((category) => (category.id === categoryId ? updated : category))
          .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      );
    }
    return updated;
  };

  const removeCategory = async (categoryId: string) => {
    if (!user?.id) {
      throw new Error('Nicht angemeldet');
    }

    const success = await deleteTransactionCategory(categoryId, user.id);
    if (success) {
      setCategories((prev) => prev.filter((category) => category.id !== categoryId));
    }
    return success;
  };

  return {
    categories,
    loading,
    error,
    refresh: loadCategories,
    addCategory,
    editCategory,
    removeCategory,
  };
}
