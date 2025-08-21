import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon, UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../stores/authStore'
import { useCompanyStore } from '../stores/companyStore'

export default function Header() {
  const { user, logout } = useAuthStore()
  const { selectedCompany } = useCompanyStore()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Cash Flow Management</h1>
            {selectedCompany && (
              <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {selectedCompany.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Welcome, {user?.full_name || user?.username}
            </div>
            
            {/* User Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
                <ChevronDownIcon className="ml-1 w-4 h-4 text-gray-400" />
              </button>

              {isUserMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <UserIcon className="mr-3 h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        logout()
                        setIsUserMenuOpen(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
              
              {/* Click outside to close dropdown */}
              {isUserMenuOpen && (
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setIsUserMenuOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}