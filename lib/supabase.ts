import { createClient } from '@supabase/supabase-js';

// Build-sichere Supabase-Konfiguration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Prüfe ob wir echte Credentials haben
const hasValidCredentials = supabaseUrl !== 'https://placeholder.supabase.co' && 
                           supabaseAnonKey !== 'placeholder-key' && 
                           !!supabaseUrl && 
                           !!supabaseAnonKey;

// Supabase Client erstellen (build-sicher)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: hasValidCredentials,
    persistSession: hasValidCredentials,
    detectSessionInUrl: hasValidCredentials
  }
});

// Environment info für UI
export function getEnvironmentInfo() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  
  return {
    environment: isDevelopment ? 'Development' : 'Production',
    hostname: hostname,
    isDevelopment: isDevelopment,
    isProduction: !isDevelopment,
    supabaseUrl: supabaseUrl,
    hasValidConfig: hasValidCredentials,
    isPlaceholder: !hasValidCredentials
  };
}

// Finanzen Table constants mit "finanzen_" Prefix
export const FINANZEN_TABLES = {
  TRANSACTION_CATEGORIES: 'finanzen_transaction_categories',
  BUDGETS: 'finanzen_budgets',
  TRANSACTIONS: 'finanzen_transactions',
  COST_PLANS: 'finanzen_cost_plans',
  COST_CATEGORIES: 'finanzen_cost_categories',
  COST_ITEMS: 'finanzen_cost_items',
  INCOME_SOURCES: 'finanzen_income_sources',
  BUDGET_RESETS: 'finanzen_budget_resets',
  CREDIT_LOANS: 'finanzen_credit_loans',
  CREDIT_REPAYMENTS: 'finanzen_credit_repayments'
} as const;

// Views
export const FINANZEN_VIEWS = {
  MONTHLY_TRANSACTION_SUMMARY: 'finanzen_monthly_transaction_summary',
  BUDGET_UTILIZATION: 'finanzen_budget_utilization',
  COST_PLAN_PROGRESS: 'finanzen_cost_plan_progress'
} as const;

// Functions
export const FINANZEN_FUNCTIONS = {
  CREATE_DEFAULT_CATEGORIES: 'create_default_finanzen_categories'
} as const;
