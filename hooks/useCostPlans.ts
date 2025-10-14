import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCostPlans,
  getCostCategories,
  getCostItemsByPlan,
  getIncomeSourcesByUser,
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
  FinanzenCostCategory, 
  FinanzenCostItem,
  FinanzenIncomeSource
} from '../lib/types';
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
export interface CostPlanWithDetails extends FinanzenCostPlan {
  categories: FinanzenCostCategory[];
  costItems: FinanzenCostItem[];
}

export interface IncomeSourceWithMonthly extends FinanzenIncomeSource {
  monthlyAmount: number;
}

export function useCostPlans() {
  const { user } = useAuth();
  const [costPlans, setCostPlans] = useState<CostPlanWithDetails[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSourceWithMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load cost plans
      const plans = await getCostPlans(user.id);
      
      // Load categories and cost items for each plan
      const plansWithDetails = await Promise.all(
        plans.map(async (plan) => {
          const [categories, costItems] = await Promise.all([
            getCostCategories(plan.id, user.id),
            getCostItemsByPlan(plan.id, user.id)
          ]);

          return {
            ...plan,
            categories,
            costItems
          };
        })
      );

      // Load income sources
      const sources = await getIncomeSourcesByUser(user.id);
      const sourcesWithMonthly = sources.map(source => ({
        ...source,
        monthlyAmount: calculateMonthlyAmount(source.amount, source.frequency)
      }));

      setCostPlans(plansWithDetails);
      setIncomeSources(sourcesWithMonthly);
    } catch (error) {
      console.error('Error loading cost plan data:', error);
      
      // Check for auth errors first
      if (handleAuthError(error)) {
        return; // Auth error handled, stop execution
      }
      
      setError('Fehler beim Laden der Kostenpläne');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      setCostPlans(prev => [...prev, {
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
      
      setCostPlans(prev => prev.map(plan => 
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
      
      setCostPlans(prev => prev.filter(plan => plan.id !== planId));

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

      setCostPlans(prev => prev.map(plan => 
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
      
      setCostPlans(prev => prev.map(plan => ({
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
      
      setCostPlans(prev => prev.map(plan => 
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

      setCostPlans(prev => prev.map(plan => 
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
      
      setCostPlans(prev => prev.map(plan => 
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
      
      setCostPlans(prev => prev.map(plan => 
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

  const addIncomeSource = async (data: {
    name: string;
    amount: number;
    frequency: 'weekly' | 'monthly' | 'yearly' | 'one-time';
    start_date: string;
    end_date?: string;
    description?: string;
  }): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const newSource = await createIncomeSource({
        user_id: user.id,
        is_active: true,
        ...data
      });

      const sourceWithMonthly = {
        ...newSource,
        monthlyAmount: calculateMonthlyAmount(newSource.amount, newSource.frequency)
      };

      setIncomeSources(prev => [...prev, sourceWithMonthly]);

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

  const editIncomeSource = async (sourceId: string, data: {
    name?: string;
    amount?: number;
    frequency?: 'weekly' | 'monthly' | 'yearly' | 'one-time';
    start_date?: string;
    end_date?: string;
    description?: string;
  }): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const updatedSource = await updateIncomeSource(sourceId, user.id, data);
      
      const sourceWithMonthly = {
        ...updatedSource,
        monthlyAmount: calculateMonthlyAmount(updatedSource.amount, updatedSource.frequency)
      };

      setIncomeSources(prev => prev.map(source => 
        source.id === sourceId ? sourceWithMonthly : source
      ));

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
      
      setIncomeSources(prev => prev.filter(source => source.id !== sourceId));

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
    error,
    refresh: loadData,
    
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