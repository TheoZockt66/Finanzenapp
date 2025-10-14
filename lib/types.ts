// TypeScript Types für Finanzen-Datenbank mit "finanzen_" Prefix

export interface FinanzenTransactionCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanzenBudget {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  spent: number;
  carryover: number;
  period: 'weekly' | 'monthly' | 'yearly';
  is_active: boolean;
  auto_reset: boolean;
  reset_day?: number;
  category_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanzenTransaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  category_id?: string;
  budget_id?: string;
  transaction_date: string;
  is_recurring: boolean;
  recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanzenCostPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  total_estimated_cost: number;
  is_active: boolean;
  target_date?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanzenCostCategory {
  id: string;
  cost_plan_id: string;
  user_id: string;
  name: string;
  estimated_total: number;
  actual_total: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface FinanzenCostItem {
  id: string;
  cost_category_id: string;
  user_id: string;
  name: string;
  estimated_cost: number;
  actual_cost?: number;
  quantity: number;
  unit?: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanzenIncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly' | 'one-time';
  is_active: boolean;
  start_date: string;
  end_date?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanzenBudgetReset {
  id: string;
  budget_id: string;
  user_id: string;
  reset_date: string;
  previous_spent: number;
  carryover_amount: number;
  new_period_start: string;
  created_at: string;
}

// View Types
export interface FinanzenMonthlyTransactionSummary {
  user_id: string;
  month: string;
  type: 'income' | 'expense';
  total_amount: number;
  transaction_count: number;
}

export interface FinanzenBudgetUtilization {
  id: string;
  user_id: string;
  name: string;
  budget_amount: number;
  spent: number;
  carryover: number;
  available: number;
  utilization_percent: number;
}

export interface FinanzenCostPlanProgress {
  id: string;
  user_id: string;
  name: string;
  total_estimated_cost: number;
  total_actual_cost: number;
  completion_percent: number;
  total_items: number;
  completed_items: number;
}

// Database Operations Types
export type CreateTransactionCategoryData = Omit<FinanzenTransactionCategory, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTransactionCategoryData = Partial<Omit<FinanzenTransactionCategory, 'id' | 'user_id' | 'created_at'>>;

export type CreateBudgetData = Omit<FinanzenBudget, 'id' | 'spent' | 'created_at' | 'updated_at'>;
export type UpdateBudgetData = Partial<Omit<FinanzenBudget, 'id' | 'user_id' | 'created_at'>>;

export type CreateTransactionData = Omit<FinanzenTransaction, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTransactionData = Partial<Omit<FinanzenTransaction, 'id' | 'user_id' | 'created_at'>>;

export type CreateCostPlanData = Omit<FinanzenCostPlan, 'id' | 'total_estimated_cost' | 'created_at' | 'updated_at'>;
export type UpdateCostPlanData = Partial<Omit<FinanzenCostPlan, 'id' | 'user_id' | 'created_at'>>;

export type CreateIncomeSourceData = Omit<FinanzenIncomeSource, 'id' | 'created_at' | 'updated_at'>;
export type UpdateIncomeSourceData = Partial<Omit<FinanzenIncomeSource, 'id' | 'user_id' | 'created_at'>>;

// Form Types für UI
export interface TransactionFormData {
  amount: number;
  description: string;
  type: 'income' | 'expense';
  category_id?: string;
  budget_id?: string;
  transaction_date: Date;
  is_recurring: boolean;
  recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags?: string[];
  notes?: string;
}

export interface BudgetFormData {
  name: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  auto_reset: boolean;
  reset_day?: number;
  category_id?: string;
}

export interface CategoryFormData {
  name: string;
  color: string;
  icon?: string;
}

export interface IncomeSourceFormData {
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly' | 'one-time';
  start_date: Date;
  end_date?: Date;
  description?: string;
}