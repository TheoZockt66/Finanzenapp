import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCostPlansSnapshot,
  createCostPlan,
  updateCostPlan,
  deleteCostPlan,
  createCostCategory,
  updateCostCategory,
  deleteCostCategory,
  createCostItem,
  updateCostItem,
  deleteCostItem,
  createIncomeSource,
  updateIncomeSource,
  deleteIncomeSource,
  calculateMonthlyAmount
} from '../lib/services/costPlanService';
import type {
  FinanzenCostPlan,
  FinanzenIncomeSource,
  FinanzenCostPlanWithDetails
} from '../lib/types';
import { readCache, writeCache, withCacheKey } from '../lib/utils/browserCache';
import { notifications } from '@mantine/notifications';

// Auth Error Handler
const handleAuthError = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('refresh_token_not_found') ||
      errorMessage.includes('Invalid Refresh Token') ||
      errorMessage.includes('AuthApiError')) {
    console.log('🔐 Auth error in hook, redirecting to login...');
    notifications.show({
      title: 'Anmeldung abgelaufen',
      message: 'Bitte melde dich erneut an.',
      color: 'yellow'
    });
    // Redirect to auth page after a short delay
    setTimeout(() => {
      window.location.href = '/auth';
    }, 2000);
    return true;
  }
  return false;
};

// Combined interface for the UI
export type CostPlanWithDetails = FinanzenCostPlanWithDetails;

export interface IncomeSourceWithMonthly extends FinanzenIncomeSource {
  monthlyAmount: number;
}

export function useCostPlans() {
  const { user } = useAuth();
  const [costPlans, setCostPlans] = useState<CostPlanWithDetails[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSourceWithMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const costPlansRef = useRef<CostPlanWithDetails[]>([]);
  const incomeSourcesRef = useRef<IncomeSourceWithMonthly[]>([]);
  const cacheKey = withCacheKey('finanzen:costPlansSnapshot', user?.id);

  useEffect(() => {
    costPlansRef.current = costPlans;
  }, [costPlans]);

  useEffect(() => {
    incomeSourcesRef.current = incomeSources;
  }, [incomeSources]);

  const syncCache = useCallback(
    (plans: CostPlanWithDetails[], incomes: IncomeSourceWithMonthly[]) => {
      if (cacheKey) {
        writeCache(cacheKey, { costPlans: plans, incomeSources: incomes });
      }
    },
    [cacheKey],
  );

  const loadData = useCallback(
    async (options?: { skipLoading?: boolean }) => {
      const skipInitialLoading = options?.skipLoading ?? false;

      if (!user?.id) {
        setCostPlans([]);
        setIncomeSources([]);
        setLoading(false);
        setRefreshing(false);
        setError(null);
        return { costPlans: [] as CostPlanWithDetails[], incomeSources: [] as IncomeSourceWithMonthly[] };
      }

      const shouldShowInitialLoader = !skipInitialLoading && costPlansRef.current.length === 0;

      if (shouldShowInitialLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const snapshot = await getCostPlansSnapshot();
        const nextCostPlans = snapshot.costPlans ?? [];
        const nextIncomeSources = (snapshot.incomeSources ?? []).map((source) => ({
          ...source,
          monthlyAmount: calculateMonthlyAmount(source.amount, source.frequency),
        }));

        costPlansRef.current = nextCostPlans;
        incomeSourcesRef.current = nextIncomeSources;
        setCostPlans(nextCostPlans);
        setIncomeSources(nextIncomeSources);
        syncCache(nextCostPlans, nextIncomeSources);

        return { costPlans: nextCostPlans, incomeSources: nextIncomeSources };
      } catch (error) {
        console.error('Error loading cost plan data:', error);

        if (handleAuthError(error)) {
          return { costPlans: costPlansRef.current, incomeSources: incomeSourcesRef.current };
        }

        setError('Fehler beim Laden der Kostenplaene');
        throw error;
      } finally {
        if (shouldShowInitialLoader) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [user?.id, syncCache],
  );

  useEffect(() => {
    if (!user?.id) {
      setCostPlans([]);
      setIncomeSources([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return;
    }

    if (!cacheKey) {
      void loadData();
      return;
    }

    const cached = readCache<{ costPlans: CostPlanWithDetails[]; incomeSources: IncomeSourceWithMonthly[] }>(cacheKey);
    if (cached) {
      const cachedPlans = Array.isArray(cached.costPlans) ? cached.costPlans : [];
      const cachedIncomesRaw = Array.isArray(cached.incomeSources) ? cached.incomeSources : [];
      const cachedIncomes = cachedIncomesRaw.map((source) => ({
        ...source,
        monthlyAmount: source.monthlyAmount ?? calculateMonthlyAmount(source.amount, source.frequency),
      }));
      costPlansRef.current = cachedPlans;
      incomeSourcesRef.current = cachedIncomes;
      setCostPlans(cachedPlans);
      setIncomeSources(cachedIncomes);
      setLoading(false);
      void loadData({ skipLoading: true });
    } else {
      void loadData();
    }
  }, [user?.id, cacheKey, loadData]);

  const applyCostPlansUpdate = useCallback(
    (updater: (prev: CostPlanWithDetails[]) => CostPlanWithDetails[]) => {
      setCostPlans((prev) => {
        const next = updater(prev);
        costPlansRef.current = next;
        syncCache(next, incomeSourcesRef.current);
        return next;
      });
    },
    [syncCache],
  );

  const applyIncomeSourcesUpdate = useCallback(
    (updater: (prev: IncomeSourceWithMonthly[]) => IncomeSourceWithMonthly[]) => {
      setIncomeSources((prev) => {
        const next = updater(prev);
        incomeSourcesRef.current = next;
        syncCache(costPlansRef.current, next);
        return next;
      });
    },
    [syncCache],
  );

  const refreshData = useCallback(
    () => loadData({ skipLoading: costPlansRef.current.length > 0 }),
    [loadData],
  );

  // =============================================
  // COST PLAN OPERATIONS
  // =============================================

  const addCostPlan = async (name: string, description?: string): Promise<FinanzenCostPlan | null> => {
    if (!user?.id) return null;

    try {
      const newPlan = await createCostPlan({
        user_id: user.id,
        name,
        description,
        is_active: true
      });

      // Add to state with empty categories and items
      applyCostPlansUpdate(prev => [...prev, {
        ...newPlan,
        categories: [],
        costItems: []
      }]);

      notifications.show({
        title: 'Erfolg',
        message: 'Kostenplan wurde erstellt',
        color: 'green'
      });

      return newPlan;
    } catch (error) {
      console.error('Error creating cost plan:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kostenplan konnte nicht erstellt werden',
        color: 'red'
      });
      return null;
    }
  };

  const editCostPlan = async (planId: string, name: string, description?: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const updatedPlan = await updateCostPlan(planId, user.id, { name, description });
      
      applyCostPlansUpdate(prev => prev.map(plan => 
        plan.id === planId 
          ? { ...plan, ...updatedPlan }
          : plan
      ));

      notifications.show({
        title: 'Erfolg',
        message: 'Kostenplan wurde aktualisiert',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error updating cost plan:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      notifications.show({
        title: 'Fehler',
        message: `Kostenplan konnte nicht aktualisiert werden: ${errorMessage}`,
        color: 'red'
      });
      return false;
    }
  };

  const removeCostPlan = async (planId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await deleteCostPlan(planId, user.id);
      
      applyCostPlansUpdate(prev => prev.filter(plan => plan.id !== planId));

      notifications.show({
        title: 'Erfolg',
        message: 'Kostenplan wurde gelöscht',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error deleting cost plan:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kostenplan konnte nicht gelöscht werden',
        color: 'red'
      });
      return false;
    }
  };

  // =============================================
  // COST CATEGORY OPERATIONS
  // =============================================

  const addCostCategory = async (planId: string, name: string, color: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const newCategory = await createCostCategory({
        cost_plan_id: planId,
        user_id: user.id,
        name,
        color
      });

      applyCostPlansUpdate(prev => prev.map(plan => 
        plan.id === planId 
          ? { ...plan, categories: [...plan.categories, newCategory] }
          : plan
      ));

      notifications.show({
        title: 'Erfolg',
        message: 'Kategorie wurde erstellt',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error creating cost category:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kategorie konnte nicht erstellt werden',
        color: 'red'
      });
      return false;
    }
  };

  const editCostCategory = async (categoryId: string, name: string, color: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const updatedCategory = await updateCostCategory(categoryId, user.id, { name, color });
      
      applyCostPlansUpdate(prev => prev.map(plan => ({
        ...plan,
        categories: plan.categories.map(cat => 
          cat.id === categoryId ? updatedCategory : cat
        )
      })));

      notifications.show({
        title: 'Erfolg',
        message: 'Kategorie wurde aktualisiert',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error updating cost category:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kategorie konnte nicht aktualisiert werden',
        color: 'red'
      });
      return false;
    }
  };

  const removeCostCategory = async (planId: string, categoryId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await deleteCostCategory(categoryId, user.id);
      
      applyCostPlansUpdate(prev => prev.map(plan => 
        plan.id === planId 
          ? { 
              ...plan, 
              categories: plan.categories.filter(cat => cat.id !== categoryId),
              costItems: plan.costItems.filter(item => item.cost_category_id !== categoryId)
            }
          : plan
      ));

      notifications.show({
        title: 'Erfolg',
        message: 'Kategorie wurde gelöscht',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error deleting cost category:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kategorie konnte nicht gelöscht werden',
        color: 'red'
      });
      return false;
    }
  };

  // =============================================
  // COST ITEM OPERATIONS
  // =============================================

  const addCostItem = async (
    planId: string,
    categoryId: string, 
    data: {
      name: string;
      estimated_cost: number;
      quantity: number;
      unit?: string;
      priority: 'low' | 'medium' | 'high';
      notes?: string;
    }
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const newItem = await createCostItem({
        cost_category_id: categoryId,
        user_id: user.id,
        ...data
      });

      applyCostPlansUpdate(prev => prev.map(plan => 
        plan.id === planId 
          ? { ...plan, costItems: [...plan.costItems, newItem] }
          : plan
      ));

      notifications.show({
        title: 'Erfolg',
        message: 'Kostenposten wurde erstellt',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error creating cost item:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kostenposten konnte nicht erstellt werden',
        color: 'red'
      });
      return false;
    }
  };

  const editCostItem = async (
    planId: string,
    itemId: string, 
    data: {
      name?: string;
      estimated_cost?: number;
      actual_cost?: number;
      quantity?: number;
      unit?: string;
      priority?: 'low' | 'medium' | 'high';
      is_completed?: boolean;
      notes?: string;
    }
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const updatedItem = await updateCostItem(itemId, user.id, data);
      
      applyCostPlansUpdate(prev => prev.map(plan => 
        plan.id === planId 
          ? { 
              ...plan, 
              costItems: plan.costItems.map(item => 
                item.id === itemId ? updatedItem : item
              )
            }
          : plan
      ));

      notifications.show({
        title: 'Erfolg',
        message: 'Kostenposten wurde aktualisiert',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error updating cost item:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kostenposten konnte nicht aktualisiert werden',
        color: 'red'
      });
      return false;
    }
  };

  const removeCostItem = async (planId: string, itemId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await deleteCostItem(itemId, user.id);
      
      applyCostPlansUpdate(prev => prev.map(plan => 
        plan.id === planId 
          ? { ...plan, costItems: plan.costItems.filter(item => item.id !== itemId) }
          : plan
      ));

      notifications.show({
        title: 'Erfolg',
        message: 'Kostenposten wurde gelöscht',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error deleting cost item:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Kostenposten konnte nicht gelöscht werden',
        color: 'red'
      });
      return false;
    }
  };

  // =============================================
  // INCOME SOURCE OPERATIONS
  // =============================================

  const addIncomeSource = async (planId: string, data: {
    name: string;
    amount: number;
    frequency: 'weekly' | 'monthly' | 'yearly' | 'one-time';
    start_date: string;
    end_date?: string;
    description?: string;
  }): Promise<boolean> => {
    if (!user?.id || !planId) return false;

    try {
      const newSource = await createIncomeSource({
        user_id: user.id,
        cost_plan_id: planId,
        is_active: true,
        ...data
      });

      const sourceWithMonthly = {
        ...newSource,
        monthlyAmount: calculateMonthlyAmount(newSource.amount, newSource.frequency)
      };

      applyIncomeSourcesUpdate(prev => [...prev, sourceWithMonthly]);

      notifications.show({
        title: 'Erfolg',
        message: 'Einkommensquelle wurde erstellt',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error creating income source:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Einkommensquelle konnte nicht erstellt werden',
        color: 'red'
      });
      return false;
    }
  };

  const editIncomeSource = async (sourceId: string, planId: string, data: {
    name?: string;
    amount?: number;
    frequency?: 'weekly' | 'monthly' | 'yearly' | 'one-time';
    start_date?: string;
    end_date?: string;
    description?: string;
  }): Promise<boolean> => {
    if (!user?.id || !planId) return false;

    try {
      const updatedSource = await updateIncomeSource(sourceId, user.id, {
        ...data,
        cost_plan_id: planId
      });
      
      const sourceWithMonthly = {
        ...updatedSource,
        monthlyAmount: calculateMonthlyAmount(updatedSource.amount, updatedSource.frequency)
      };

      applyIncomeSourcesUpdate(prev => prev.map(source => {
        if (source.id === sourceId) {
          return sourceWithMonthly;
        }
        return source;
      }));

      notifications.show({
        title: 'Erfolg',
        message: 'Einkommensquelle wurde aktualisiert',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error updating income source:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Einkommensquelle konnte nicht aktualisiert werden',
        color: 'red'
      });
      return false;
    }
  };

  const removeIncomeSource = async (sourceId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      await deleteIncomeSource(sourceId, user.id);
      
      applyIncomeSourcesUpdate(prev => prev.filter(source => source.id !== sourceId));

      notifications.show({
        title: 'Erfolg',
        message: 'Einkommensquelle wurde gelöscht',
        color: 'green'
      });

      return true;
    } catch (error) {
      console.error('Error deleting income source:', error);
      notifications.show({
        title: 'Fehler',
        message: 'Einkommensquelle konnte nicht gelöscht werden',
        color: 'red'
      });
      return false;
    }
  };

  return {
    costPlans,
    incomeSources,
    loading,
    refreshing,
    error,
    refresh: refreshData,
    
    // Cost Plan operations
    addCostPlan,
    editCostPlan,
    removeCostPlan,
    
    // Cost Category operations
    addCostCategory,
    editCostCategory,
    removeCostCategory,
    
    // Cost Item operations
    addCostItem,
    editCostItem,
    removeCostItem,
    
    // Income Source operations
    addIncomeSource,
    editIncomeSource,
    removeIncomeSource
  };
}
