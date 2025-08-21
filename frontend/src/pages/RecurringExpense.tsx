import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, PlayIcon, PauseIcon, StopIcon, CurrencyDollarIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { useCompanyStore } from '../stores/companyStore'
import { recurringExpenseApi, expenseCategoryApi } from '../services/api'
import { RecurringExpense as RecurringExpenseType, ExpenseCategory, FrequencyType } from '../types'
import { formatCurrency } from '../utils/currency'

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

export default function RecurringExpense() {
  const { selectedCompany } = useCompanyStore()
  
  const formatAmount = (amount: number) => {
    return formatCurrency(amount, selectedCompany?.currency || 'USD')
  }
  const [expensePatterns, setExpensePatterns] = useState<RecurringExpenseType[]>([])
  const [filteredPatterns, setFilteredPatterns] = useState<RecurringExpenseType[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<RecurringExpenseType | null>(null)
  const [selectedPatterns, setSelectedPatterns] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const [showImportResults, setShowImportResults] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Omit<RecurringExpenseType, 'id' | 'created_at' | 'updated_at'>>()
  const watchedFrequency = watch('frequency')

  useEffect(() => {
    if (selectedCompany) {
      fetchExpensePatterns()
      fetchCategories()
    }
  }, [selectedCompany])

  // Filter patterns based on search and filters
  useEffect(() => {
    let filtered = expensePatterns

    if (searchTerm) {
      filtered = filtered.filter(pattern =>
        pattern.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pattern.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pattern.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
  }, [expensePatterns, searchTerm, frequencyFilter, statusFilter])

  const fetchExpensePatterns = async () => {
    if (!selectedCompany) return
    
    setIsLoading(true)
    try {
      const data = await recurringExpenseApi.getByCompany(selectedCompany.id)
      setExpensePatterns(data)
    } catch (error: any) {
      console.error('Error fetching expense patterns:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to fetch expense patterns'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await expenseCategoryApi.getAll()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const onSubmit = async (data: Omit<RecurringExpenseType, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany) return
    
    try {
      setError(null)
      const patternData = {
        ...data,
        company_id: selectedCompany.id,
        category_id: data.category_id || undefined,
        amount: Number(data.amount),
        vat_amount: Number(data.vat_amount || 0),
        day_of_month: data.frequency === 'monthly' || data.frequency === 'quarterly' ? data.day_of_month : undefined,
        day_of_week: data.frequency === 'weekly' ? data.day_of_week : undefined,
        end_date: data.end_date && data.end_date.trim() ? data.end_date : undefined,
        description: data.description && data.description.trim() ? data.description : undefined,
        supplier: data.supplier && data.supplier.trim() ? data.supplier : undefined,
        reference: data.reference && data.reference.trim() ? data.reference : undefined,
        notes: data.notes && data.notes.trim() ? data.notes : undefined,
      }
      
      if (editingPattern) {
        const updated = await recurringExpenseApi.update(editingPattern.id, patternData)
        setExpensePatterns(expensePatterns.map(p => p.id === editingPattern.id ? updated : p))
      } else {
        const newPattern = await recurringExpenseApi.create(patternData)
        setExpensePatterns([...expensePatterns, newPattern])
      }
      setShowModal(false)
      setEditingPattern(null)
      reset()
    } catch (error: any) {
      console.error('Error saving expense pattern:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to save expense pattern'
      setError(errorMessage)
    }
  }

  const handleEdit = (pattern: RecurringExpenseType) => {
    setEditingPattern(pattern)
    reset({
      ...pattern,
      start_date: pattern.start_date.split('T')[0],
      end_date: pattern.end_date?.split('T')[0],
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this expense pattern?')) {
      try {
        setError(null)
        await recurringExpenseApi.delete(id)
        setExpensePatterns(expensePatterns.filter(p => p.id !== id))
        setSelectedPatterns(selectedPatterns.filter(p => p !== id))
      } catch (error: any) {
        console.error('Error deleting expense pattern:', error)
        const errorMessage = typeof error.response?.data?.detail === 'string' 
          ? error.response.data.detail 
          : typeof error.message === 'string' 
          ? error.message 
          : 'Failed to delete expense pattern'
        setError(errorMessage)
      }
    }
  }

  const handleStatusChange = async (id: number, newStatus: 'active' | 'paused' | 'ended') => {
    try {
      setError(null)
      const updated = await recurringExpenseApi.update(id, { is_active: newStatus })
      setExpensePatterns(expensePatterns.map(p => p.id === id ? updated : p))
    } catch (error: any) {
      console.error('Error updating pattern status:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to update pattern status'
      setError(errorMessage)
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
          recurringExpenseApi.update(id, { is_active: status })
        )
      )
      fetchExpensePatterns() // Refresh data
      setSelectedPatterns([])
    } catch (error: any) {
      console.error('Error updating pattern statuses:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to update pattern statuses'
      setError(errorMessage)
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

  const getFrequencyDescription = (pattern: RecurringExpenseType) => {
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

  const handleDownloadTemplate = async () => {
    try {
      const templateData = await recurringExpenseApi.downloadTemplate()
      
      // Create and download the template file
      const blob = new Blob([templateData.content], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', templateData.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedCompany) return

    setIsImporting(true)
    setError(null)
    
    try {
      const results = await recurringExpenseApi.importCSV(selectedCompany.id, file)
      setImportResults(results)
      setShowImportResults(true)
      
      // Refresh the expense patterns list
      fetchExpensePatterns()
    } catch (error: any) {
      console.error('Error importing CSV:', error)
      let errorMessage = 'Failed to import CSV file'
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Handle validation errors array
          errorMessage = error.response.data.detail.map((err: any) => {
            if (typeof err === 'string') return err
            return err.msg || JSON.stringify(err)
          }).join(', ')
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = async () => {
    if (!selectedCompany) return

    try {
      const exportData = await recurringExpenseApi.exportCSV(selectedCompany.id)
      
      // Create and download the file
      const blob = new Blob([exportData.content], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', exportData.filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      setError('Failed to export data')
    }
  }

  const totalProjectedExpenses = filteredPatterns
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
          <h1 className="text-xl font-semibold text-gray-900">Recurring Expense Patterns</h1>
          <p className="mt-2 text-sm text-gray-700">
            Set up recurring expense schedules for {selectedCompany.name}. {filteredPatterns.length} of {expensePatterns.length} patterns shown.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="flex space-x-3">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              title="Download CSV template with sample data"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              Template
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              {isImporting ? 'Importing...' : 'Import CSV'}
            </button>
            {expensePatterns.length > 0 && (
              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                Export CSV
              </button>
            )}
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
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Expense Pattern
            </button>
          </div>
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="Search expense patterns by name, description, supplier, or notes..."
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
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
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Active Projected Expenses</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {formatAmount(totalProjectedExpenses)}
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
        <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-red-900">
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
                        className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-500 focus:ring-red-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expense Pattern
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
                        Loading expense patterns...
                      </td>
                    </tr>
                  ) : filteredPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {expensePatterns.length === 0 ? 'No expense patterns found. Set up your first recurring expense!' : 'No patterns match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPatterns.map((pattern) => (
                      <tr key={pattern.id} className={selectedPatterns.includes(pattern.id) ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedPatterns.includes(pattern.id)}
                            onChange={() => handleSelectPattern(pattern.id)}
                            className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-500 focus:ring-red-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{pattern.name}</div>
                          {pattern.description && (
                            <div className="text-sm text-gray-500">{pattern.description}</div>
                          )}
                          {pattern.supplier && (
                            <div className="text-sm text-gray-500">Supplier: {pattern.supplier}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-red-600">
                            -{formatAmount(Number(pattern.amount) || 0)}
                          </div>
                          {(Number(pattern.vat_amount) || 0) > 0 && (
                            <div className="text-sm text-gray-500">VAT: {formatAmount(Number(pattern.vat_amount) || 0)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
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
                              className="text-red-600 hover:text-red-900"
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

      {/* Modal for creating/editing expense patterns */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPattern ? 'Edit Expense Pattern' : 'Add New Expense Pattern'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    placeholder="Monthly rent, software subscription, etc."
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                      placeholder="1-28"
                    />
                    {errors.day_of_month && (
                      <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.day_of_month)}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    {...register('category_id')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  >
                    <option value="">Select category (optional)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    {...register('supplier')}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    placeholder="Supplier name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference</label>
                  <input
                    {...register('reference')}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    placeholder="Invoice number, contract reference, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    {...register('start_date', { required: 'Start date is required' })}
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave blank for ongoing expense</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    {...register('is_active')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                    placeholder="Additional notes about this expense pattern..."
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
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {editingPattern ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Import Results Modal */}
      {showImportResults && importResults && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <DocumentArrowDownIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">Import Results</h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-md">
                  <p className="text-sm text-green-700">
                    <strong>Successfully imported:</strong> {importResults.success} expense patterns
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Total processed:</strong> {importResults.total_processed} rows
                  </p>
                </div>
                
                {importResults.imported_items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Imported patterns:</h4>
                    <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded-md">
                      {importResults.imported_items.map((name: string, index: number) => (
                        <div key={index} className="text-sm text-gray-600">• {name}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                {importResults.errors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-900 mb-2">Errors ({importResults.errors.length}):</h4>
                    <div className="max-h-32 overflow-y-auto bg-red-50 p-3 rounded-md">
                      {importResults.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-700">• {error}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowImportResults(false)}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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