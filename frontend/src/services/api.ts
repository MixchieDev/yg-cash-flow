import axios from 'axios'
import { 
  User, Company, Customer, Transaction, Expense, ExpenseCategory, Token, LoginCredentials, RegisterData,
  RecurringIncome, RecurringExpense, OneOffItem, ProjectionRequest, ProjectionResponse, CashFlowProjection, DailyProjection,
  BankAccount
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage')
  console.log('API Request - Auth Storage:', authStorage)
  
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage)
      console.log('API Request - Parsed Storage:', parsed)
      
      // Zustand persist stores the data in different ways depending on version
      const token = parsed.state?.token || parsed.token
      console.log('API Request - Extracted Token:', token ? 'Present' : 'Missing')
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Error parsing auth token:', error)
    }
  } else {
    console.log('API Request - No auth storage found')
  }
  
  console.log('API Request - Final Headers:', config.headers)
  return config
})

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth storage on 401 errors
      localStorage.removeItem('auth-storage')
      // Redirect to login page
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<Token> => {
    const formData = new FormData()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)
    
    const response = await api.post('/api/v1/auth/token', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  register: async (data: RegisterData): Promise<User> => {
    const response = await api.post('/api/v1/auth/register', data)
    return response.data
  },

  getCurrentUser: async (token: string): Promise<User> => {
    const response = await api.get('/api/v1/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  },
}

export const companyApi = {
  getAll: async (): Promise<Company[]> => {
    const response = await api.get('/api/v1/companies/')
    return response.data
  },

  getById: async (id: number): Promise<Company> => {
    const response = await api.get(`/api/v1/companies/${id}`)
    return response.data
  },

  create: async (company: Omit<Company, 'id' | 'owner_id' | 'created_at' | 'updated_at'>): Promise<Company> => {
    const response = await api.post('/api/v1/companies/', company)
    return response.data
  },

  update: async (id: number, company: Partial<Company>): Promise<Company> => {
    const response = await api.put(`/api/v1/companies/${id}`, company)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/companies/${id}`)
  },
}

export const customerApi = {
  getByCompany: async (companyId: number): Promise<Customer[]> => {
    const response = await api.get(`/api/v1/customers/company/${companyId}`)
    return response.data
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await api.get(`/api/v1/customers/${id}`)
    return response.data
  },

  create: async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const response = await api.post('/api/v1/customers/', customer)
    return response.data
  },

  update: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    const response = await api.put(`/api/v1/customers/${id}`, customer)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/customers/${id}`)
  },

  importCSV: async (companyId: number, file: File): Promise<{
    success: number,
    imported_customers: string[],
    errors: string[],
    total_processed: number
  }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(`/api/v1/customers/company/${companyId}/import-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  exportCSV: async (companyId: number): Promise<{
    filename: string,
    content: string,
    count: number
  }> => {
    const response = await api.get(`/api/v1/customers/company/${companyId}/export-csv`)
    return response.data
  },

  downloadTemplate: async (): Promise<{
    filename: string,
    content: string,
    instructions: Record<string, string>
  }> => {
    const response = await api.get('/api/v1/customers/import-template')
    return response.data
  },
}

export const transactionApi = {
  getByCompany: async (companyId: number, filters?: any): Promise<Transaction[]> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key])
        }
      })
    }
    const response = await api.get(`/api/v1/transactions/company/${companyId}?${params}`)
    return response.data
  },

  getById: async (id: number): Promise<Transaction> => {
    const response = await api.get(`/api/v1/transactions/${id}`)
    return response.data
  },

  create: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> => {
    const response = await api.post('/api/v1/transactions/', transaction)
    return response.data
  },

  update: async (id: number, transaction: Partial<Transaction>): Promise<Transaction> => {
    const response = await api.put(`/api/v1/transactions/${id}`, transaction)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/transactions/${id}`)
  },
}

export const expenseApi = {
  getByCompany: async (companyId: number, filters?: any): Promise<Expense[]> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key])
        }
      })
    }
    const response = await api.get(`/api/v1/expenses/company/${companyId}?${params}`)
    return response.data
  },

  getById: async (id: number): Promise<Expense> => {
    const response = await api.get(`/api/v1/expenses/${id}`)
    return response.data
  },

  create: async (expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const response = await api.post('/api/v1/expenses/', expense)
    return response.data
  },

  update: async (id: number, expense: Partial<Expense>): Promise<Expense> => {
    const response = await api.put(`/api/v1/expenses/${id}`, expense)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/expenses/${id}`)
  },

  getCategories: async (): Promise<ExpenseCategory[]> => {
    const response = await api.get('/api/v1/expenses/categories/')
    return response.data
  },

  createCategory: async (category: Omit<ExpenseCategory, 'id' | 'created_at'>): Promise<ExpenseCategory> => {
    const response = await api.post('/api/v1/expenses/categories/', category)
    return response.data
  },
}

export const recurringIncomeApi = {
  getByCompany: async (companyId: number): Promise<RecurringIncome[]> => {
    const response = await api.get(`/api/v1/recurring-income/company/${companyId}`)
    return response.data
  },

  getById: async (id: number): Promise<RecurringIncome> => {
    const response = await api.get(`/api/v1/recurring-income/${id}`)
    return response.data
  },

  create: async (income: Omit<RecurringIncome, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringIncome> => {
    const response = await api.post('/api/v1/recurring-income/', income)
    return response.data
  },

  update: async (id: number, income: Partial<RecurringIncome>): Promise<RecurringIncome> => {
    const response = await api.put(`/api/v1/recurring-income/${id}`, income)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/recurring-income/${id}`)
  },

  downloadTemplate: async (): Promise<{ filename: string; content: string; instructions: any }> => {
    const response = await api.get('/api/v1/recurring-income/import-template')
    return response.data
  },

  importCSV: async (companyId: number, file: File): Promise<{ success: number; imported_items: string[]; errors: string[]; total_processed: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(`/api/v1/recurring-income/company/${companyId}/import-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  exportCSV: async (companyId: number): Promise<{ filename: string; content: string; count: number }> => {
    const response = await api.get(`/api/v1/recurring-income/company/${companyId}/export-csv`)
    return response.data
  },
}

export const recurringExpenseApi = {
  getByCompany: async (companyId: number): Promise<RecurringExpense[]> => {
    const response = await api.get(`/api/v1/recurring-expenses/company/${companyId}`)
    return response.data
  },

  getById: async (id: number): Promise<RecurringExpense> => {
    const response = await api.get(`/api/v1/recurring-expenses/${id}`)
    return response.data
  },

  create: async (expense: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringExpense> => {
    const response = await api.post('/api/v1/recurring-expenses/', expense)
    return response.data
  },

  update: async (id: number, expense: Partial<RecurringExpense>): Promise<RecurringExpense> => {
    const response = await api.put(`/api/v1/recurring-expenses/${id}`, expense)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/recurring-expenses/${id}`)
  },

  downloadTemplate: async (): Promise<{ filename: string; content: string; instructions: any }> => {
    const response = await api.get('/api/v1/recurring-expenses/import-template')
    return response.data
  },

  importCSV: async (companyId: number, file: File): Promise<{ success: number; imported_items: string[]; errors: string[]; total_processed: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(`/api/v1/recurring-expenses/company/${companyId}/import-csv`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  exportCSV: async (companyId: number): Promise<{ filename: string; content: string; count: number }> => {
    const response = await api.get(`/api/v1/recurring-expenses/company/${companyId}/export-csv`)
    return response.data
  },
}

export const oneOffItemApi = {
  getByCompany: async (
    companyId: number, 
    itemType?: 'income' | 'expense', 
    status?: 'planned' | 'confirmed' | 'completed' | 'cancelled'
  ): Promise<OneOffItem[]> => {
    const params = new URLSearchParams()
    if (itemType) params.append('item_type', itemType)
    if (status) params.append('status', status)
    const queryString = params.toString()
    const url = `/api/v1/one-off-items/company/${companyId}${queryString ? `?${queryString}` : ''}`
    const response = await api.get(url)
    return response.data
  },

  getById: async (id: number): Promise<OneOffItem> => {
    const response = await api.get(`/api/v1/one-off-items/${id}`)
    return response.data
  },

  create: async (item: Omit<OneOffItem, 'id' | 'created_at' | 'updated_at'>): Promise<OneOffItem> => {
    const response = await api.post('/api/v1/one-off-items/', item)
    return response.data
  },

  update: async (id: number, item: Partial<OneOffItem>): Promise<OneOffItem> => {
    const response = await api.put(`/api/v1/one-off-items/${id}`, item)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/one-off-items/${id}`)
  },

  updateStatus: async (id: number, status: 'planned' | 'confirmed' | 'completed' | 'cancelled'): Promise<OneOffItem> => {
    const response = await api.put(`/api/v1/one-off-items/${id}/status`, { new_status: status })
    return response.data
  },
}

export const projectionApi = {
  generate: async (companyId: number, request: ProjectionRequest): Promise<{ detail: string }> => {
    const response = await api.post(`/api/v1/projections/generate/${companyId}`, request)
    return response.data
  },

  get: async (companyId: number, startDate: string, endDate: string): Promise<ProjectionResponse> => {
    const response = await api.get(`/api/v1/projections/${companyId}?start_date=${startDate}&end_date=${endDate}`)
    return response.data
  },

  getDailyDetails: async (companyId: number, date: string): Promise<DailyProjection> => {
    const response = await api.get(`/api/v1/projections/${companyId}/daily/${date}`)
    return response.data
  },

  getSummary: async (
    companyId: number,
    view: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly',
    startDate?: string,
    endDate?: string
  ): Promise<{
    summary: Array<{
      period: string
      income: number
      expenses: number
      net_flow: number
      running_balance: number
    }>
    view: string
    start_date: string
    end_date: string
  }> => {
    const params = new URLSearchParams({ view })
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/projections/${companyId}/summary?${params}`)
    return response.data
  },
}

export const expenseCategoryApi = {
  getAll: async (): Promise<ExpenseCategory[]> => {
    const response = await api.get('/api/v1/expense-categories/')
    return response.data
  },

  getById: async (id: number): Promise<ExpenseCategory> => {
    const response = await api.get(`/api/v1/expense-categories/${id}`)
    return response.data
  },

  create: async (category: Omit<ExpenseCategory, 'id' | 'created_at'>): Promise<ExpenseCategory> => {
    const response = await api.post('/api/v1/expense-categories/', category)
    return response.data
  },

  update: async (id: number, category: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const response = await api.put(`/api/v1/expense-categories/${id}`, category)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/expense-categories/${id}`)
  },

  importCSV: async (file: File): Promise<{
    success: number,
    imported_categories: string[],
    errors: string[],
    total_processed: number
  }> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/api/v1/expense-categories/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  exportCSV: async (): Promise<{
    filename: string,
    content: string,
    count: number
  }> => {
    const response = await api.get('/api/v1/expense-categories/export-csv')
    return response.data
  },

  downloadTemplate: async (): Promise<{
    filename: string,
    content: string,
    instructions: Record<string, string>
  }> => {
    const response = await api.get('/api/v1/expense-categories/import-template')
    return response.data
  },
}

export const bankAccountApi = {
  getByCompany: async (companyId: number): Promise<BankAccount[]> => {
    const response = await api.get(`/api/v1/bank-accounts/company/${companyId}`)
    return response.data
  },

  getById: async (id: number): Promise<BankAccount> => {
    const response = await api.get(`/api/v1/bank-accounts/${id}`)
    return response.data
  },

  create: async (bankAccount: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>): Promise<BankAccount> => {
    const response = await api.post('/api/v1/bank-accounts/', bankAccount)
    return response.data
  },

  update: async (id: number, bankAccount: Partial<BankAccount>): Promise<BankAccount> => {
    const response = await api.put(`/api/v1/bank-accounts/${id}`, bankAccount)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/bank-accounts/${id}`)
  },

  setDefault: async (id: number): Promise<void> => {
    await api.put(`/api/v1/bank-accounts/${id}/set-default`)
  },
}