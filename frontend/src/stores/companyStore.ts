import { create } from 'zustand'
import { Company } from '../types'
import { companyApi } from '../services/api'

interface CompanyState {
  companies: Company[]
  selectedCompany: Company | null
  isLoading: boolean
  fetchCompanies: () => Promise<void>
  createCompany: (company: Omit<Company, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateCompany: (id: number, company: Partial<Company>) => Promise<void>
  deleteCompany: (id: number) => Promise<void>
  setSelectedCompany: (company: Company | null) => void
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  selectedCompany: null,
  isLoading: false,

  fetchCompanies: async () => {
    set({ isLoading: true })
    try {
      const companies = await companyApi.getAll()
      set({ companies, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  createCompany: async (companyData) => {
    set({ isLoading: true })
    try {
      const company = await companyApi.create(companyData)
      set(state => ({
        companies: [...state.companies, company],
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  updateCompany: async (id, companyData) => {
    set({ isLoading: true })
    try {
      const company = await companyApi.update(id, companyData)
      set(state => ({
        companies: state.companies.map(c => c.id === id ? company : c),
        selectedCompany: state.selectedCompany?.id === id ? company : state.selectedCompany,
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  deleteCompany: async (id) => {
    set({ isLoading: true })
    try {
      await companyApi.delete(id)
      set(state => ({
        companies: state.companies.filter(c => c.id !== id),
        selectedCompany: state.selectedCompany?.id === id ? null : state.selectedCompany,
        isLoading: false
      }))
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  setSelectedCompany: (company) => {
    set({ selectedCompany: company })
  }
}))