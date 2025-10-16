// =============================================
// TRANSACTION CATEGORIES
// =============================================

import { supabase, FINANZEN_TABLES } from '../supabase';
import type {
  FinanzenBudget,
  FinanzenTransaction,
  FinanzenTransactionCategory,
  FinanzenCostPlan,
  FinanzenCostCategory,
  FinanzenCostItem,
  FinanzenIncomeSource,
  FinanzenCostPlanWithDetails,
  FinanzenCostPlansSnapshot,
  CreateCostPlanData,
  UpdateCostPlanData,
  CreateIncomeSourceData,
  UpdateIncomeSourceData,
  CreateTransactionCategoryData,
  UpdateTransactionCategoryData
} from '../types';

export async function getTransactionCategories(userId: string): Promise<FinanzenTransactionCategory[]> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.TRANSACTION_CATEGORIES)
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching transaction categories:', error);
    throw error;
  }

  return data || [];
}

export async function createTransactionCategory(
  data: CreateTransactionCategoryData
): Promise<FinanzenTransactionCategory | null> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.TRANSACTION_CATEGORIES)
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction category:', error);
    throw error;
  }

  return result || null;
}

export async function updateTransactionCategory(
  categoryId: string,
  userId: string,
  data: UpdateTransactionCategoryData
): Promise<FinanzenTransactionCategory | null> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.TRANSACTION_CATEGORIES)
    .update(data)
    .eq('id', categoryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating transaction category:', error);
    throw error;
  }

  return result || null;
}

export async function deleteTransactionCategory(
  categoryId: string,
  userId: string
): Promise<boolean> {
  try {
    console.log('deleteTransactionCategory called:', { categoryId, userId });

    // 1) Set category_id = NULL on transactions belonging to this user and category
    const { error: nullifyError } = await supabase
      .from(FINANZEN_TABLES.TRANSACTIONS)
      .update({ category_id: null })
      .eq('category_id', categoryId)
      .eq('user_id', userId);

    if (nullifyError) {
      console.error('Error nullifying transaction.category_id before deleting category:', nullifyError);
      throw nullifyError;
    }

    // 2) Delete the category
    const { error } = await supabase
      .from(FINANZEN_TABLES.TRANSACTION_CATEGORIES)
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting transaction category:', error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error('deleteTransactionCategory failed:', err);
    throw err;
  }
}

// =============================================
// BUDGETS
// =============================================

export async function getBudgets(userId: string): Promise<FinanzenBudget[]> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.BUDGETS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }
  return data || [];
}

export async function getBudgetById(budgetId: string, userId: string): Promise<FinanzenBudget | null> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.BUDGETS)
    .select('*')
    .eq('id', budgetId)
    .eq('user_id', userId)
    .single();
  if (error) {
    console.error('Error fetching budget by id:', error);
    throw error;
  }
  return data || null;
}

export async function createBudget(data: Partial<FinanzenBudget>): Promise<FinanzenBudget | null> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.BUDGETS)
    .insert([data])
    .select()
    .single();
  if (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
  return result || null;
}

export async function updateBudget(budgetId: string, userId: string, data: Partial<FinanzenBudget>): Promise<FinanzenBudget | null> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.BUDGETS)
    .update(data)
    .eq('id', budgetId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
  return result || null;
}

export async function deleteBudget(budgetId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from(FINANZEN_TABLES.BUDGETS)
    .delete()
    .eq('id', budgetId)
    .eq('user_id', userId);
  if (error) {
    console.error('Error deleting budget:', error);
    return false;
  }
  return true;
}

// =============================================
// TRANSACTIONS
// =============================================

export async function getTransactions(userId: string): Promise<FinanzenTransaction[]> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.TRANSACTIONS)
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });
  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
  return data || [];
}

export async function getTransactionById(transactionId: string, userId: string): Promise<FinanzenTransaction | null> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.TRANSACTIONS)
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();
  if (error) {
    console.error('Error fetching transaction by id:', error);
    throw error;
  }
  return data || null;
}

export async function createTransaction(data: Partial<FinanzenTransaction>): Promise<FinanzenTransaction | null> {
  console.log('createTransaction called with:', data);
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.TRANSACTIONS)
    .insert([data])
    .select()
    .single();
  console.log('createTransaction result:', { result, error });
  if (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
  return result || null;
}

export async function updateTransaction(transactionId: string, userId: string, data: Partial<FinanzenTransaction>): Promise<FinanzenTransaction | null> {
  try {
    // Add updated_at timestamp
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>;

    console.log('updateTransaction called with:', { transactionId, userId, updateData });

    const { data: result, error } = await supabase
      .from(FINANZEN_TABLES.TRANSACTIONS)
      .update(updateData)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .select()
      .single();

    console.log('updateTransaction result:', { result, error });

    if (error) {
      console.error('Error updating transaction:', error);
      // Provide more context when throwing
      throw new Error(`Error updating transaction ${transactionId}: ${error.message || JSON.stringify(error)}`);
    }

    return result || null;
  } catch (err) {
    console.error('💥 updateTransaction failed:', err);
    throw err;
  }
}

export async function deleteTransaction(transactionId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from(FINANZEN_TABLES.TRANSACTIONS)
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);
  if (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }
  return true;
}
// =============================================
// COST PLANS
// =============================================

export async function getCostPlans(userId: string): Promise<FinanzenCostPlan[]> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.COST_PLANS)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cost plans:', error);
    throw error;
  }

  return data || [];
}

export async function getCostPlansSnapshot(): Promise<FinanzenCostPlansSnapshot> {
  const { data, error } = await supabase.rpc('get_finanzen_cost_plans_snapshot');

  if (error) {
    console.error('Error fetching cost plan snapshot:', error);
    throw error;
  }

  const snapshot = (data ?? {}) as Partial<FinanzenCostPlansSnapshot>;
  const costPlans = Array.isArray(snapshot.costPlans)
    ? (snapshot.costPlans as FinanzenCostPlanWithDetails[])
    : [];
  const incomeSources = Array.isArray(snapshot.incomeSources)
    ? (snapshot.incomeSources as FinanzenIncomeSource[])
    : [];

  return {
    costPlans,
    incomeSources,
  };
}

export async function getCostPlanById(planId: string, userId: string): Promise<FinanzenCostPlan | null> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.COST_PLANS)
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching cost plan:', error);
    throw error;
  }

  return data;
}

export async function createCostPlan(data: CreateCostPlanData): Promise<FinanzenCostPlan> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.COST_PLANS)
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating cost plan:', error);
    
    // Fallback für Unique Constraint - versuche mit Timestamp-Suffix
    if (error.code === '23505' && error.message?.includes('finanzen_cost_plans_user_name_unique')) {
      console.log('🔄 Retrying with timestamp suffix due to unique constraint...');
      const timestamp = new Date().getTime();
      const modifiedData = {
        ...data,
        name: `${data.name} (${timestamp})`
      };
      
      const { data: retryResult, error: retryError } = await supabase
        .from(FINANZEN_TABLES.COST_PLANS)
        .insert(modifiedData)
        .select()
        .single();

      if (retryError) {
        console.error('Error on retry:', retryError);
        throw retryError;
      }

      return retryResult;
    }
    
    throw error;
  }

  return result;
}

export async function updateCostPlan(planId: string, userId: string, data: UpdateCostPlanData): Promise<FinanzenCostPlan> {
  try {
    console.log('🔄 Updating cost plan:', { planId, userId, data });
    
    // Erst prüfen ob der Plan existiert
    const { data: existingPlan, error: selectError } = await supabase
      .from(FINANZEN_TABLES.COST_PLANS)
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (selectError) {
      console.error('❌ Error finding cost plan:', selectError);
      throw new Error(`Plan nicht gefunden: ${selectError.message}`);
    }

    if (!existingPlan) {
      throw new Error('Kostenplan nicht gefunden');
    }

    console.log('✅ Found existing plan:', existingPlan);

    // Nur die Felder updaten, die wirklich geändert werden sollen
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.target_date !== undefined) updateData.target_date = data.target_date;
    
    // Setze updated_at
    updateData.updated_at = new Date().toISOString();

    console.log('📝 Update data:', updateData);

    const { data: result, error } = await supabase
      .from(FINANZEN_TABLES.COST_PLANS)
      .update(updateData)
      .eq('id', planId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating cost plan:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      
      // Fallback für Unique Constraint - versuche mit Timestamp-Suffix
      if (error.code === '23505' && error.message?.includes('finanzen_cost_plans_user_name_unique') && data.name) {
        console.log('🔄 Retrying update with timestamp suffix due to unique constraint...');
        const timestamp = new Date().getTime();
        const modifiedUpdateData = {
          ...updateData,
          name: `${data.name} (${timestamp})`
        };
        
        const { data: retryResult, error: retryError } = await supabase
          .from(FINANZEN_TABLES.COST_PLANS)
          .update(modifiedUpdateData)
          .eq('id', planId)
          .eq('user_id', userId)
          .select()
          .single();

        if (retryError) {
          console.error('Error on retry:', retryError);
          throw new Error(`Update fehlgeschlagen: ${retryError.message || 'Unbekannter Fehler'}`);
        }

        console.log('✅ Retry update successful:', retryResult);
        return retryResult;
      }
      
      throw new Error(`Update fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
    }

    if (!result) {
      throw new Error('Kein Ergebnis vom Update erhalten');
    }

    console.log('✅ Update successful:', result);
    return result;
  } catch (error) {
    console.error('💥 Error in updateCostPlan:', error);
    throw error;
  }
}

export async function deleteCostPlan(planId: string, userId: string): Promise<void> {
  try {
    console.log('🗑️ Starting cascade delete for plan:', planId);
    
    // 1. Erst alle Kategorie-IDs dieses Plans holen
    console.log('🔄 Getting categories for plan...');
    const { data: categories, error: categoriesSelectError } = await supabase
      .from(FINANZEN_TABLES.COST_CATEGORIES)
      .select('id')
      .eq('cost_plan_id', planId)
      .eq('user_id', userId);

    if (categoriesSelectError) {
      console.error('❌ Error getting categories:', categoriesSelectError);
    } else {
      console.log('✅ Found categories:', categories?.length || 0);
      
      // 2. Alle Kostenpositionen löschen, die zu diesen Kategorien gehören
      if (categories && categories.length > 0) {
        const categoryIds = categories.map(cat => cat.id);
        console.log('🔄 Deleting cost items for categories:', categoryIds);
        
        const { error: costItemsError } = await supabase
          .from(FINANZEN_TABLES.COST_ITEMS)
          .delete()
          .eq('user_id', userId)
          .in('cost_category_id', categoryIds);

        if (costItemsError) {
          console.error('❌ Error deleting cost items:', costItemsError);
        } else {
          console.log('✅ Cost items deleted');
        }
      }

      // 3. Dann alle Kategorien dieses Plans löschen
      console.log('🔄 Deleting categories...');
      const { error: categoriesDeleteError } = await supabase
        .from(FINANZEN_TABLES.COST_CATEGORIES)
        .delete()
        .eq('cost_plan_id', planId)
        .eq('user_id', userId);

      if (categoriesDeleteError) {
        console.error('❌ Error deleting categories:', categoriesDeleteError);
      } else {
        console.log('✅ Categories deleted');
      }
    }

    // 4. Schließlich den Plan selbst löschen
    console.log('🔄 Deleting plan...');
    const { error: planError } = await supabase
      .from(FINANZEN_TABLES.COST_PLANS)
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (planError) {
      console.error('❌ Error deleting cost plan:', planError);
      throw new Error(`Plan konnte nicht gelöscht werden: ${planError.message}`);
    }

    console.log('✅ Plan cascade delete completed successfully');
  } catch (error) {
    console.error('💥 Error in cascade delete:', error);
    throw error;
  }
}

// =============================================
// COST CATEGORIES
// =============================================

export async function getCostCategories(planId: string, userId: string): Promise<FinanzenCostCategory[]> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.COST_CATEGORIES)
    .select('*')
    .eq('cost_plan_id', planId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching cost categories:', error);
    throw error;
  }

  return data || [];
}

export async function createCostCategory(data: {
  cost_plan_id: string;
  user_id: string;
  name: string;
  color: string;
}): Promise<FinanzenCostCategory> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.COST_CATEGORIES)
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating cost category:', error);
    throw error;
  }

  return result;
}

export async function updateCostCategory(categoryId: string, userId: string, data: {
  name?: string;
  color?: string;
}): Promise<FinanzenCostCategory> {
  // Füge updated_at hinzu
  const updateData = {
    ...data,
    updated_at: new Date().toISOString()
  };

  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.COST_CATEGORIES)
    .update(updateData)
    .eq('id', categoryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating cost category:', error);
    throw error;
  }

  return result;
}

export async function deleteCostCategory(categoryId: string, userId: string): Promise<void> {
  // This will cascade delete all cost items in this category
  const { error } = await supabase
    .from(FINANZEN_TABLES.COST_CATEGORIES)
    .delete()
    .eq('id', categoryId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting cost category:', error);
    throw error;
  }
}

// =============================================
// COST ITEMS
// =============================================

export async function getCostItems(categoryId: string, userId: string): Promise<FinanzenCostItem[]> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.COST_ITEMS)
    .select('*')
    .eq('cost_category_id', categoryId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching cost items:', error);
    throw error;
  }

  return data || [];
}

export async function getCostItemsByPlan(planId: string, userId: string): Promise<FinanzenCostItem[]> {
  // Erst die Kategorien für diesen Plan holen
  const { data: categories, error: categoryError } = await supabase
    .from(FINANZEN_TABLES.COST_CATEGORIES)
    .select('id')
    .eq('cost_plan_id', planId)
    .eq('user_id', userId);

  if (categoryError) {
    console.error('Error fetching categories for plan:', categoryError);
    throw categoryError;
  }

  if (!categories || categories.length === 0) {
    return []; // Keine Kategorien = keine Items
  }

  const categoryIds = categories.map(cat => cat.id);

  // Dann die Cost Items für diese Kategorien holen
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.COST_ITEMS)
    .select(`
      *,
      cost_category:${FINANZEN_TABLES.COST_CATEGORIES}(
        id,
        name,
        color,
        cost_plan_id
      )
    `)
    .eq('user_id', userId)
    .in('cost_category_id', categoryIds);

  if (error) {
    console.error('Error fetching cost items by plan:', error);
    throw error;
  }

  console.log(`🔍 getCostItemsByPlan for plan ${planId}: found ${data?.length || 0} items`);
  
  return data || [];
}

export async function createCostItem(data: {
  cost_category_id: string;
  user_id: string;
  name: string;
  estimated_cost: number;
  actual_cost?: number;
  quantity: number;
  unit?: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
}): Promise<FinanzenCostItem> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.COST_ITEMS)
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating cost item:', error);
    throw error;
  }

  return result;
}

export async function updateCostItem(itemId: string, userId: string, data: {
  name?: string;
  estimated_cost?: number;
  actual_cost?: number;
  quantity?: number;
  unit?: string;
  priority?: 'low' | 'medium' | 'high';
  is_completed?: boolean;
  notes?: string;
}): Promise<FinanzenCostItem> {
  // Füge updated_at hinzu
  const updateData = {
    ...data,
    updated_at: new Date().toISOString()
  };

  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.COST_ITEMS)
    .update(updateData)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating cost item:', error);
    throw error;
  }

  return result;
}

export async function deleteCostItem(itemId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from(FINANZEN_TABLES.COST_ITEMS)
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting cost item:', error);
    throw error;
  }
}

// =============================================
// INCOME SOURCES
// =============================================

export async function getIncomeSourcesByUser(userId: string): Promise<FinanzenIncomeSource[]> {
  const { data, error } = await supabase
    .from(FINANZEN_TABLES.INCOME_SOURCES)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching income sources:', error);
    throw error;
  }

  return data || [];
}

export async function createIncomeSource(data: CreateIncomeSourceData): Promise<FinanzenIncomeSource> {
  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.INCOME_SOURCES)
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating income source:', error);
    throw error;
  }

  return result;
}

export async function updateIncomeSource(sourceId: string, userId: string, data: UpdateIncomeSourceData): Promise<FinanzenIncomeSource> {
  // Füge updated_at hinzu
  const updateData = {
    ...data,
    updated_at: new Date().toISOString()
  };

  const { data: result, error } = await supabase
    .from(FINANZEN_TABLES.INCOME_SOURCES)
    .update(updateData)
    .eq('id', sourceId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating income source:', error);
    throw error;
  }

  return result;
}

export async function deleteIncomeSource(sourceId: string, userId: string): Promise<void> {
  // Soft delete - mark as inactive
  const { error } = await supabase
    .from(FINANZEN_TABLES.INCOME_SOURCES)
    .update({ is_active: false })
    .eq('id', sourceId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting income source:', error);
    throw error;
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

// Convert frequency to monthly multiplier
export function getMonthlyMultiplier(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 4.33; // Average weeks per month
    case 'monthly': return 1;
    case 'yearly': return 1/12;
    case 'one-time': return 0; // One-time income doesn't count toward monthly
    default: return 1;
  }
}

// Calculate monthly amount from frequency and amount
export function calculateMonthlyAmount(amount: number, frequency: string): number {
  return amount * getMonthlyMultiplier(frequency);
}

// Get cost plan with all details (categories and items)
export async function getCostPlanWithDetails(planId: string, userId: string) {
  try {
    // Get the plan
    const plan = await getCostPlanById(planId, userId);
    if (!plan) return null;

    // Get categories
    const categories = await getCostCategories(planId, userId);
    
    // Get all cost items for this plan
    const costItems = await getCostItemsByPlan(planId, userId);

    // Calculate total estimated cost
    const total_estimated_cost = costItems.reduce((sum, item) => sum + (item.estimated_cost * item.quantity), 0);

    return {
      ...plan,
      categories,
      costItems,
      total_estimated_cost
    };
  } catch (error) {
    console.error('Error getting cost plan with details:', error);
    return null;
  }
}
