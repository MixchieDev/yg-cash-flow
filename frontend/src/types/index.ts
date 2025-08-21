export interface User {
  id: number
  email: string
  username: string
  full_name?: string
  is_active: boolean
  is_superuser: boolean
  created_at: string
  updated_at?: string
}

export interface Company {
  id: number
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  tax_number?: string
  vat_rate: number
  currency: string
  owner_id: number
  created_at: string
  updated_at?: string
}

export interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
  contact_person?: string
  payment_terms: number
  is_active: boolean
  notes?: string
  company_id: number
  created_at: string
  updated_at?: string
  company_name?: string
  product_type?: string
  revenue_model?: string
  partner?: string
  contract_start?: string
}

export interface OneOffItem {
  id: number
  name: string
  description?: string
  amount: number
  vat_amount: number
  item_type: 'income' | 'expense'
  planned_date: string
  is_confirmed: 'planned' | 'confirmed' | 'completed' | 'cancelled'
  source?: string  // Who you receive from / pay to
  reference?: string
  notes?: string
  company_id: number
  category_id?: number
  created_at: string
  updated_at?: string
}

export interface Transaction {
  id: number
  description: string
  amount: number
  vat_amount: number
  type: 'income' | 'expense'
  status: 'pending' | 'completed' | 'cancelled'
  transaction_date: string
  due_date?: string
  payment_date?: string
  reference?: string
  notes?: string
  company_id: number
  customer_id?: number
  created_at: string
  updated_at?: string
}

export interface Expense {
  id: number
  description: string
  amount: number
  vat_amount: number
  expense_date: string
  receipt_number?: string
  supplier?: string
  notes?: string
  company_id: number
  category_id?: number
  created_at: string
  updated_at?: string
}

export interface ExpenseCategory {
  id: number
  name: string
  description?: string
  created_at: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  full_name?: string
}

export interface Token {
  access_token: string
  token_type: string
}

// New Projection System Types
export type FrequencyType = 'weekly' | 'monthly' | 'quarterly' | 'annually'

export interface RecurringIncome {
  id: number
  name: string
  description?: string
  amount: number
  vat_amount?: number
  frequency: FrequencyType
  start_date: string
  end_date?: string
  day_of_month?: number  // 1-31 for monthly/quarterly
  day_of_week?: number   // 0-6 for weekly (0=Monday)
  is_active: 'active' | 'paused' | 'ended'
  notes?: string
  company_id: number
  customer_id?: number
  created_at: string
  updated_at?: string
}

export interface RecurringExpense {
  id: number
  name: string
  description?: string
  amount: number
  vat_amount?: number
  frequency: FrequencyType
  start_date: string
  end_date?: string
  day_of_month?: number
  day_of_week?: number
  is_active: 'active' | 'paused' | 'ended'
  supplier?: string
  reference?: string
  notes?: string
  company_id: number
  category_id?: number
  created_at: string
  updated_at?: string
}

export interface CashFlowProjection {
  id: number
  projection_date: string
  income_amount: number
  expense_amount: number
  net_flow: number
  running_balance: number
  company_id: number
  created_at: string
}

export interface ProjectionItem {
  id: number
  projection_date: string
  item_name: string
  item_type: 'income' | 'expense'
  amount: number
  vat_amount: number
  source_type: 'recurring_income' | 'recurring_expense'
  source_id: number
  company_id: number
  created_at: string
}

export interface ProjectionSummary {
  total_projected_income: number
  total_projected_expenses: number
  net_projected_flow: number
  final_balance: number
  days_with_negative_balance: number
  lowest_balance: number
  highest_balance: number
}

export interface ProjectionRequest {
  start_date: string
  end_date: string
  starting_balance?: number
}

export interface ProjectionResponse {
  projections: CashFlowProjection[]
  summary: ProjectionSummary
  start_date: string
  end_date: string
}

export interface DailyProjection {
  date: string
  income: number
  expenses: number
  net_flow: number
  running_balance: number
  items: ProjectionItem[]
}