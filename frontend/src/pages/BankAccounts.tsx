import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon, StarIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useCompanyStore } from '../stores/companyStore'
import { bankAccountApi } from '../services/api'
import { BankAccount } from '../types'
import { formatCurrency } from '../utils/currency'

const accountTypeOptions = [
  { value: 'checking', label: 'Checking Account', description: 'For daily operations and transactions' },
  { value: 'savings', label: 'Savings Account', description: 'For long-term savings and reserves' },
  { value: 'credit_line', label: 'Credit Line', description: 'For credit-based transactions' },
  { value: 'investment', label: 'Investment Account', description: 'For investment holdings' }
]

export default function BankAccounts() {
  const { selectedCompany } = useCompanyStore()
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<BankAccount[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<BankAccount | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>>()

  useEffect(() => {
    if (selectedCompany) {
      fetchBankAccounts()
    }
  }, [selectedCompany])

  // Filter accounts based on search
  useEffect(() => {
    let filtered = bankAccounts

    if (searchTerm) {
      filtered = filtered.filter(account =>
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAccounts(filtered)
  }, [bankAccounts, searchTerm])

  const fetchBankAccounts = async () => {
    if (!selectedCompany) return
    
    setIsLoading(true)
    try {
      const accounts = await bankAccountApi.getByCompany(selectedCompany.id)
      setBankAccounts(accounts)
      setError(null)
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error)
      setError('Failed to load bank accounts')
    } finally {
      setIsLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, selectedCompany?.currency || 'USD')
  }

  const onSubmit = async (data: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany) return

    try {
      setError(null)
      const accountData = {
        ...data,
        company_id: selectedCompany.id
      }
      
      if (editingAccount) {
        await bankAccountApi.update(editingAccount.id, accountData)
      } else {
        await bankAccountApi.create(accountData)
      }
      
      await fetchBankAccounts()
      setShowModal(false)
      setEditingAccount(null)
      reset()
    } catch (error: any) {
      console.error('Error saving bank account:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to save bank account')
    }
  }

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    reset({
      ...account,
      current_balance: Number(account.current_balance)
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number, accountName: string) => {
    if (confirm(`Are you sure you want to deactivate the account "${accountName}"? This will not delete the account but make it inactive.`)) {
      try {
        setError(null)
        await bankAccountApi.delete(id)
        await fetchBankAccounts()
      } catch (error: any) {
        console.error('Error deactivating bank account:', error)
        setError(error.response?.data?.detail || error.message || 'Failed to deactivate bank account')
      }
    }
  }

  const handleSetDefault = async (id: number, accountName: string) => {
    if (confirm(`Set "${accountName}" as the default account for new transactions?`)) {
      try {
        setError(null)
        await bankAccountApi.setDefault(id)
        await fetchBankAccounts()
      } catch (error: any) {
        console.error('Error setting default account:', error)
        setError(error.response?.data?.detail || error.message || 'Failed to set default account')
      }
    }
  }

  const handleViewDetails = (account: BankAccount) => {
    setSelectedAccountDetails(account)
    setShowDetailsModal(true)
  }

  const getAccountTypeInfo = (accountType: string) => {
    return accountTypeOptions.find(option => option.value === accountType) || 
           { value: accountType, label: accountType, description: '' }
  }

  const getTotalBalance = () => {
    return bankAccounts
      .filter(account => account.is_active)
      .reduce((total, account) => total + Number(account.current_balance), 0)
  }

  if (!selectedCompany) {
    return (
      <div className="text-center py-12">
        <BuildingLibraryIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Company Selected</h3>
        <p className="mt-1 text-sm text-gray-500">Please select a company to manage bank accounts.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Bank Accounts</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage bank accounts for {selectedCompany.name}. {filteredAccounts.length} of {bankAccounts.length} accounts shown.
            {bankAccounts.length > 0 && (
              <span className="ml-2 font-medium text-indigo-600">
                Total Balance: {formatAmount(getTotalBalance())}
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingAccount(null)
              reset({
                company_id: selectedCompany.id,
                name: '',
                bank_name: '',
                account_number: '',
                account_type: 'checking',
                current_balance: 0,
                is_active: true,
                is_default: false,
                notes: ''
              })
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Account
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search accounts by name, bank, type, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank & Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Loading bank accounts...
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        {bankAccounts.length === 0 ? 'No bank accounts found. Add your first account!' : 'No accounts match your search criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => {
                      const typeInfo = getAccountTypeInfo(account.account_type)
                      return (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <BuildingLibraryIcon className="h-6 w-6 text-indigo-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900">{account.name}</div>
                                  {account.is_default && (
                                    <StarIconSolid className="ml-1 h-4 w-4 text-yellow-400" title="Default Account" />
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {account.account_number ? `****${account.account_number}` : 'No account number'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{account.bank_name || 'No bank specified'}</div>
                            <div className="text-sm text-gray-500">{typeInfo.label}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${Number(account.current_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatAmount(Number(account.current_balance))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                                account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {account.is_active ? 'Active' : 'Inactive'}
                              </span>
                              {account.is_default && (
                                <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              {!account.is_default && account.is_active && (
                                <button
                                  onClick={() => handleSetDefault(account.id, account.name)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Set as Default"
                                >
                                  <StarIcon className="h-5 w-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleViewDetails(account)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(account)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Edit Account"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              {account.is_active && (
                                <button
                                  onClick={() => handleDelete(account.id, account.name)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Deactivate Account"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Name</label>
                  <input
                    {...register('name', { required: 'Account name is required' })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Primary Checking"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <input
                    {...register('bank_name')}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Chase Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number (Last 4 digits)</label>
                  <input
                    {...register('account_number', {
                      maxLength: { value: 4, message: 'Enter only last 4 digits' },
                      pattern: { value: /^\d{0,4}$/, message: 'Enter only numbers' }
                    })}
                    type="text"
                    maxLength={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="1234"
                  />
                  {errors.account_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.account_number.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Type</label>
                  <select
                    {...register('account_type', { required: 'Account type is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {accountTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.account_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.account_type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Balance</label>
                  <input
                    {...register('current_balance', { 
                      required: 'Current balance is required',
                      valueAsNumber: true
                    })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.current_balance && (
                    <p className="mt-1 text-sm text-red-600">{errors.current_balance.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      {...register('is_active')}
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">Active</label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      {...register('is_default')}
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">Default Account</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Additional notes about this account..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingAccount(null)
                      reset()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {editingAccount ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedAccountDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-2xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                    <BuildingLibraryIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      {selectedAccountDetails.name}
                      {selectedAccountDetails.is_default && (
                        <StarIconSolid className="ml-2 h-5 w-5 text-yellow-400" title="Default Account" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{getAccountTypeInfo(selectedAccountDetails.account_type).label}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedAccountDetails(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Account Information</h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                      <dd className="text-sm text-gray-900">{selectedAccountDetails.bank_name || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Account Number</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedAccountDetails.account_number ? `****${selectedAccountDetails.account_number}` : 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Account Type</dt>
                      <dd className="text-sm text-gray-900">{getAccountTypeInfo(selectedAccountDetails.account_type).label}</dd>
                      <dd className="text-xs text-gray-500">{getAccountTypeInfo(selectedAccountDetails.account_type).description}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Current Balance</dt>
                      <dd className={`text-lg font-semibold ${Number(selectedAccountDetails.current_balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatAmount(Number(selectedAccountDetails.current_balance))}
                      </dd>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Status & Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd>
                        <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                          selectedAccountDetails.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedAccountDetails.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {selectedAccountDetails.is_default && (
                          <span className="ml-2 inline-flex px-2 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Default Account
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(selectedAccountDetails.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                    {selectedAccountDetails.updated_at && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(selectedAccountDetails.updated_at).toLocaleDateString()}
                        </dd>
                      </div>
                    )}
                    {selectedAccountDetails.notes && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Notes</dt>
                        <dd className="text-sm text-gray-900 whitespace-pre-line">{selectedAccountDetails.notes}</dd>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                {!selectedAccountDetails.is_default && selectedAccountDetails.is_active && (
                  <button
                    onClick={() => {
                      handleSetDefault(selectedAccountDetails.id, selectedAccountDetails.name)
                      setShowDetailsModal(false)
                      setSelectedAccountDetails(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => {
                    handleEdit(selectedAccountDetails)
                    setShowDetailsModal(false)
                    setSelectedAccountDetails(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Edit Account
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedAccountDetails(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}