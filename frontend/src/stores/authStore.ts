import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, Token, LoginCredentials, RegisterData } from '../types'
import { authApi } from '../services/api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true })
        try {
          const tokenResponse = await authApi.login(credentials)
          console.log('Login response:', tokenResponse)
          
          const user = await authApi.getCurrentUser(tokenResponse.access_token)
          console.log('User data:', user)
          
          set({
            user,
            token: tokenResponse.access_token,
            isLoading: false
          })
        } catch (error) {
          set({ isLoading: false })
          console.error('Login error:', error)
          throw error
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true })
        try {
          const user = await authApi.register(data)
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isLoading: false
        })
      },

      setUser: (user: User) => {
        set({ user })
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token
      })
    }
  )
)