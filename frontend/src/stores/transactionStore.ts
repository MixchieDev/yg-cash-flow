import { create } from 'zustand'
import { Transaction } from '../types'
import { transactionApi } from '../services/api'

interface TransactionState {
  transactions: Transaction[]
  isLoading: boolean
  fetchTransactions: (companyId: number, filters?: any) => Promise<void>
  createTransaction: (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateTransaction: (id: number, transaction: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: number) => Promise<void>
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,

  fetchTransactions: async (companyId, filters = {}) => {
    set({ isLoading: true })
    try {
      const transactions = await transactionApi.getByCompany(companyId, filters)
      set({ transactions, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  createTransaction: async (transactionData) => {
    set({ isLoading: true })
    try {
      const transaction = await transactionApi.create(transactionData)
      set(state => ({
        transactions: [...state.transactions, transaction],
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  updateTransaction: async (id, transactionData) => {
    set({ isLoading: true })
    try {
      const transaction = await transactionApi.update(id, transactionData)
      set(state => ({
        transactions: state.transactions.map(t => t.id === id ? transaction : t),
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true })
    try {
      await transactionApi.delete(id)
      set(state => ({
        transactions: state.transactions.filter(t => t.id !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  }
}))