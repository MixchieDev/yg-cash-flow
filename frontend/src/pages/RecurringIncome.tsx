import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, PlayIcon, PauseIcon, StopIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useCompanyStore } from '../stores/companyStore'
import { recurringIncomeApi, customerApi } from '../services/api'
import { RecurringIncome as RecurringIncomeType, Customer, FrequencyType } from '../types'

const frequencyOptions: { value: FrequencyType; label: string; description: string }[] = [
  { value: 'weekly', label: 'Weekly', description: 'Every week on the same day' },
  { value: 'monthly', label: 'Monthly', description: 'Every month on the same date' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'annually', label: 'Annually', description: 'Once per year' }
]

const dayOfWeekOptions = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' }
]

// Helper function to safely render error messages
const getErrorMessage = (error: any): string => {
  if (!error) return ''
  if (typeof error.message === 'string') return error.message
  if (error.msg && typeof error.msg === 'string') return error.msg
  if (typeof error === 'string') return error
  return 'Invalid input'
}

export default function RecurringIncome() {
  const { selectedCompany } = useCompanyStore()
  const [incomePatterns, setIncomePatterns] = useState<RecurringIncomeType[]>([])
  const [filteredPatterns, setFilteredPatterns] = useState<RecurringIncomeType[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<RecurringIncomeType | null>(null)
  const [selectedPatterns, setSelectedPatterns] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Omit<RecurringIncomeType, 'id' | 'created_at' | 'updated_at'>>()
  const watchedFrequency = watch('frequency')

  useEffect(() => {
    if (selectedCompany) {
      fetchIncomePatterns()
      fetchCustomers()
    }
  }, [selectedCompany])

  // Filter patterns based on search and filters
  useEffect(() => {
    let filtered = incomePatterns

    if (searchTerm) {
      filtered = filtered.filter(pattern =>
        pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pattern.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pattern.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (frequencyFilter !== 'all') {
      filtered = filtered.filter(pattern => pattern.frequency === frequencyFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(pattern => pattern.is_active === statusFilter)
    }

    setFilteredPatterns(filtered)
  }, [incomePatterns, searchTerm, frequencyFilter, statusFilter])

  const fetchIncomePatterns = async () => {
    if (!selectedCompany) return
    
    setIsLoading(true)
    try {
      const data = await recurringIncomeApi.getByCompany(selectedCompany.id)
      setIncomePatterns(data)
    } catch (error: any) {
      console.error('Error fetching income patterns:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to fetch income patterns'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCustomers = async () => {
    if (!selectedCompany) return
    
    try {
      const data = await customerApi.getByCompany(selectedCompany.id)
      setCustomers(data)
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const onSubmit = async (data: Omit<RecurringIncomeType, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany) return
    
    try {
      setError(null)
      const patternData = {
        ...data,
        company_id: selectedCompany.id,
        customer_id: data.customer_id || undefined,
        amount: Number(data.amount),
        vat_amount: Number(data.vat_amount || 0),
        day_of_month: data.frequency === 'monthly' || data.frequency === 'quarterly' ? data.day_of_month : undefined,
        day_of_week: data.frequency === 'weekly' ? data.day_of_week : undefined,
      }
      
      if (editingPattern) {
        const updated = await recurringIncomeApi.update(editingPattern.id, patternData)
        setIncomePatterns(incomePatterns.map(p => p.id === editingPattern.id ? updated : p))
      } else {
        const newPattern = await recurringIncomeApi.create(patternData)
        setIncomePatterns([...incomePatterns, newPattern])
      }
      setShowModal(false)
      setEditingPattern(null)
      reset()
    } catch (error: any) {
      console.error('Error saving income pattern:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to save income pattern'
      setError(errorMessage)
    }
  }

  const handleEdit = (pattern: RecurringIncomeType) => {
    setEditingPattern(pattern)
    reset({
      ...pattern,
      start_date: pattern.start_date.split('T')[0],
      end_date: pattern.end_date?.split('T')[0],
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this income pattern?')) {
      try {
        setError(null)
        await recurringIncomeApi.delete(id)
        setIncomePatterns(incomePatterns.filter(p => p.id !== id))
        setSelectedPatterns(selectedPatterns.filter(p => p !== id))
      } catch (error: any) {
        console.error('Error deleting income pattern:', error)
        setError(error.response?.data?.detail || error.message || 'Failed to delete income pattern')
      }
    }
  }

  const handleStatusChange = async (id: number, newStatus: 'active' | 'paused' | 'ended') => {
    try {
      setError(null)
      const updated = await recurringIncomeApi.update(id, { is_active: newStatus })
      setIncomePatterns(incomePatterns.map(p => p.id === id ? updated : p))
    } catch (error: any) {
      console.error('Error updating pattern status:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to update pattern status')
    }
  }

  const handleSelectPattern = (id: number) => {
    setSelectedPatterns(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedPatterns.length === filteredPatterns.length) {
      setSelectedPatterns([])
    } else {
      setSelectedPatterns(filteredPatterns.map(p => p.id))
    }
  }

  const handleBulkStatusChange = async (status: 'active' | 'paused' | 'ended') => {
    try {
      setError(null)
      await Promise.all(
        selectedPatterns.map(id => 
          recurringIncomeApi.update(id, { is_active: status })
        )
      )
      fetchIncomePatterns() // Refresh data
      setSelectedPatterns([])
    } catch (error: any) {
      console.error('Error updating pattern statuses:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to update pattern statuses')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'ended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFrequencyDescription = (pattern: RecurringIncomeType) => {
    const freq = frequencyOptions.find(f => f.value === pattern.frequency)
    let description = freq?.label || pattern.frequency
    
    if (pattern.frequency === 'weekly' && pattern.day_of_week !== undefined) {
      const dayName = dayOfWeekOptions.find(d => d.value === pattern.day_of_week)
      description += ` (${dayName?.label})`
    } else if ((pattern.frequency === 'monthly' || pattern.frequency === 'quarterly') && pattern.day_of_month) {
      description += ` (${pattern.day_of_month}${getOrdinalSuffix(pattern.day_of_month)})`
    }
    
    return description
  }

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th'
    switch (day % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  const totalProjectedIncome = filteredPatterns
    .filter(p => p.is_active === 'active')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  if (!selectedCompany) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">No company selected</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please select a company from the dashboard first.
        </p>
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
          <h1 className="text-xl font-semibold text-gray-900">Recurring Income Patterns</h1>
          <p className="mt-2 text-sm text-gray-700">
            Set up recurring income schedules for {selectedCompany.name}. {filteredPatterns.length} of {incomePatterns.length} patterns shown.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingPattern(null)
              reset({
                company_id: selectedCompany.id,
                frequency: 'monthly' as FrequencyType,
                is_active: 'active',
                start_date: new Date().toISOString().split('T')[0],
                amount: 0,
                vat_amount: 0,
              })
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Income Pattern
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col space-y-4">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search income patterns by name, description, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="all">All Frequencies</option>
                {frequencyOptions.map((freq) => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="ended">Ended</option>
              </select>
            </div>

            <div className="flex items-end">
              {(searchTerm || frequencyFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFrequencyFilter('all')
                    setStatusFilter('all')
                  }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mt-6 bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Active Projected Income</dt>
                <dd className="text-lg font-medium text-gray-900">
                  ${totalProjectedIncome.toFixed(2)}
                </dd>
              </dl>
            </div>
            <div className="ml-5">
              <span className="text-xs text-gray-500">
                {filteredPatterns.filter(p => p.is_active === 'active').length} active patterns
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPatterns.length > 0 && (
        <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-indigo-900">
                {selectedPatterns.length} pattern{selectedPatterns.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkStatusChange('active')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkStatusChange('paused')}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Pause
              </button>
              <button
                onClick={() => handleBulkStatusChange('ended')}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                End
              </button>
              <button
                onClick={() => setSelectedPatterns([])}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedPatterns.length === filteredPatterns.length && filteredPatterns.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Income Pattern
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
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
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Loading income patterns...
                      </td>
                    </tr>
                  ) : filteredPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {incomePatterns.length === 0 ? 'No income patterns found. Set up your first recurring income!' : 'No patterns match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPatterns.map((pattern) => (
                      <tr key={pattern.id} className={selectedPatterns.includes(pattern.id) ? 'bg-indigo-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedPatterns.includes(pattern.id)}
                            onChange={() => handleSelectPattern(pattern.id)}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{pattern.name}</div>
                          {pattern.description && (
                            <div className="text-sm text-gray-500">{pattern.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-green-600">
                            +${(Number(pattern.amount) || 0).toFixed(2)}
                          </div>
                          {(Number(pattern.vat_amount) || 0) > 0 && (
                            <div className="text-sm text-gray-500">VAT: ${(Number(pattern.vat_amount) || 0).toFixed(2)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {getFrequencyDescription(pattern)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>Start: {new Date(pattern.start_date).toLocaleDateString()}</div>
                          {pattern.end_date && (
                            <div>End: {new Date(pattern.end_date).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(pattern.is_active)}`}>
                            {pattern.is_active}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {pattern.is_active === 'active' && (
                              <button
                                onClick={() => handleStatusChange(pattern.id, 'paused')}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Pause Pattern"
                              >
                                <PauseIcon className="h-4 w-4" />
                              </button>
                            )}
                            {pattern.is_active === 'paused' && (
                              <button
                                onClick={() => handleStatusChange(pattern.id, 'active')}
                                className="text-green-600 hover:text-green-900"
                                title="Resume Pattern"
                              >
                                <PlayIcon className="h-4 w-4" />
                              </button>
                            )}
                            {pattern.is_active !== 'ended' && (
                              <button
                                onClick={() => handleStatusChange(pattern.id, 'ended')}
                                className="text-red-600 hover:text-red-900"
                                title="End Pattern"
                              >
                                <StopIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(pattern)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit Pattern"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(pattern.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Pattern"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for creating/editing income patterns */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPattern ? 'Edit Income Pattern' : 'Add New Income Pattern'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Monthly salary, consulting fees, etc."
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.name)}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Optional description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    {...register('amount', { 
                      required: 'Amount is required', 
                      valueAsNumber: true,
                      min: { value: 0.01, message: 'Amount must be greater than 0' }
                    })}
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.amount)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">VAT Amount</label>
                  <input
                    {...register('vat_amount', { 
                      valueAsNumber: true,
                      min: { value: 0, message: 'VAT amount cannot be negative' }
                    })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.vat_amount && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.vat_amount)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Frequency</label>
                  <select
                    {...register('frequency', { required: 'Frequency is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {frequencyOptions.map((freq) => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label} - {freq.description}
                      </option>
                    ))}
                  </select>
                  {errors.frequency && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.frequency)}</p>
                  )}
                </div>

                {watchedFrequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Day of Week</label>
                    <select
                      {...register('day_of_week', { 
                        valueAsNumber: true,
                        required: watchedFrequency === 'weekly' ? 'Day of week is required for weekly frequency' : false
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {dayOfWeekOptions.map((day) => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                    {errors.day_of_week && (
                      <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.day_of_week)}</p>
                    )}
                  </div>
                )}

                {(watchedFrequency === 'monthly' || watchedFrequency === 'quarterly') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Day of Month</label>
                    <input
                      {...register('day_of_month', { 
                        valueAsNumber: true,
                        min: { value: 1, message: 'Day must be between 1 and 28' },
                        max: { value: 28, message: 'Day must be between 1 and 28 (to avoid month-end issues)' }
                      })}
                      type="number"
                      min="1"
                      max="28"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="1-28"
                    />
                    {errors.day_of_month && (
                      <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.day_of_month)}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <select
                    {...register('customer_id')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select customer (optional)</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    {...register('start_date', { required: 'Start date is required' })}
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.start_date)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
                  <input
                    {...register('end_date')}
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave blank for ongoing income</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    {...register('is_active')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Additional notes about this income pattern..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingPattern(null)
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
                    {editingPattern ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}