import { useState, useEffect, useCallback, useRef } from 'react';
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
import { readCache, writeCache, withCacheKey } from '../lib/utils/browserCache';

const CATEGORY_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

export function useTransactionCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<FinanzenTransactionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheKey = withCacheKey('finanzen:categories', user?.id);
  const categoriesRef = useRef<FinanzenTransactionCategory[]>([]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const loadCategories = useCallback(async (options?: { skipLoading?: boolean }) => {
    if (!user?.id) {
      setCategories([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return [];
    }

    const shouldShowInitialLoader = !options?.skipLoading && categoriesRef.current.length === 0;
    if (shouldShowInitialLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    let data: FinanzenTransactionCategory[] = categoriesRef.current;

    try {
      data = await getTransactionCategories(user.id);
      setCategories(data);
      if (cacheKey) {
        writeCache(cacheKey, data, CATEGORY_CACHE_TTL);
      }
    } catch (err) {
      console.error('Error loading transaction categories:', err);
      setError('Fehler beim Laden der Kategorien');
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
      setCategories([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    if (!cacheKey) {
      void loadCategories();
      return;
    }

    const cached = readCache<FinanzenTransactionCategory[]>(cacheKey);
    if (cached) {
      setCategories(cached);
      setLoading(false);
    }

    void loadCategories({ skipLoading: Boolean(cached) });
  }, [user?.id, cacheKey, loadCategories]);

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
      setCategories((prev) => {
        const next = [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'de'));
        if (cacheKey) {
          writeCache(cacheKey, next, CATEGORY_CACHE_TTL);
        }
        return next;
      });
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
      setCategories((prev) => {
        const next = prev
          .map((category) => (category.id === categoryId ? updated : category))
          .sort((a, b) => a.name.localeCompare(b.name, 'de'));
        if (cacheKey) {
          writeCache(cacheKey, next, CATEGORY_CACHE_TTL);
        }
        return next;
      });
    }
    return updated;
  };

  const removeCategory = async (categoryId: string) => {
    if (!user?.id) {
      throw new Error('Nicht angemeldet');
    }

    const success = await deleteTransactionCategory(categoryId, user.id);
    if (success) {
      setCategories((prev) => {
        const next = prev.filter((category) => category.id !== categoryId);
        if (cacheKey) {
          writeCache(cacheKey, next, CATEGORY_CACHE_TTL);
        }
        return next;
      });
    }
    return success;
  };

  return {
    categories,
    loading,
    refreshing,
    error,
    refresh: () => loadCategories({ skipLoading: categoriesRef.current.length > 0 }),
    addCategory,
    editCategory,
    removeCategory,
  };
}
