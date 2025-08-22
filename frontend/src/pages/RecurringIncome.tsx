import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, PlayIcon, PauseIcon, StopIcon, CalendarIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, AdjustmentsHorizontalIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useCompanyStore } from '../stores/companyStore'
import { recurringIncomeApi, customerApi, bankAccountApi } from '../services/api'
import { RecurringIncome as RecurringIncomeType, Customer, FrequencyType } from '../types'
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

export default function RecurringIncome() {
  const { selectedCompany } = useCompanyStore()
  
  const formatAmount = (amount: number) => {
    return formatCurrency(amount, selectedCompany?.currency || 'USD')
  }
  const [incomePatterns, setIncomePatterns] = useState<RecurringIncomeType[]>([])
  const [filteredPatterns, setFilteredPatterns] = useState<RecurringIncomeType[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: number
    name: string
    account_type: string
    current_balance: number
    is_default: boolean
  }>>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [bankAccountFilter, setBankAccountFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingPattern, setEditingPattern] = useState<RecurringIncomeType | null>(null)
  const [selectedPatterns, setSelectedPatterns] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const [showImportResults, setShowImportResults] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    customer: true,
    name: true,
    description: true,
    amount: true,
    frequency: true,
    start_date: true,
    end_date: false,
    status: true,
    notes: false,
    bank_account: true
  })
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Omit<RecurringIncomeType, 'id' | 'created_at' | 'updated_at'>>()
  const watchedFrequency = watch('frequency')

  useEffect(() => {
    if (selectedCompany) {
      fetchIncomePatterns()
      fetchCustomers()
      fetchBankAccounts()
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

    if (bankAccountFilter !== 'all') {
      filtered = filtered.filter(pattern => pattern.bank_account_id === Number(bankAccountFilter))
    }

    setFilteredPatterns(filtered)
  }, [incomePatterns, searchTerm, frequencyFilter, statusFilter, bankAccountFilter])

  // Close column settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColumnSettings) {
        const target = event.target as Element
        if (!target.closest('.relative')) {
          setShowColumnSettings(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showColumnSettings])

  const toggleColumn = (columnKey: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }))
  }

  const handleCellEdit = (id: number, field: string, currentValue: any) => {
    setEditingCell({ id, field })
    setEditingValue(String(currentValue || ''))
  }

  const handleCellSave = async () => {
    if (!editingCell || !selectedCompany) return

    try {
      const pattern = incomePatterns.find(p => p.id === editingCell.id)
      if (!pattern) return

      let updateValue: any = editingValue

      // Handle different field types
      if (editingCell.field === 'amount' || editingCell.field === 'vat_amount') {
        updateValue = parseFloat(editingValue) || 0
      } else if (editingCell.field === 'day_of_month') {
        updateValue = parseInt(editingValue) || null
      } else if (editingCell.field === 'day_of_week') {
        updateValue = parseInt(editingValue) || null
      } else if (editingCell.field === 'start_date' || editingCell.field === 'end_date') {
        updateValue = editingValue || null
      } else if (editingCell.field === 'bank_account_id') {
        updateValue = editingValue ? parseInt(editingValue) : null
      }

      const updatedPattern = await recurringIncomeApi.update(editingCell.id, {
        [editingCell.field]: updateValue
      })
      
      setIncomePatterns(patterns => 
        patterns.map(p => p.id === editingCell.id ? updatedPattern : p)
      )
      
      setEditingCell(null)
      setEditingValue('')
    } catch (error) {
      console.error('Error updating pattern:', error)
      setError('Failed to update pattern')
    }
  }

  const handleCellCancel = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(Boolean).length + 2 // +1 for checkbox, +1 for actions column
  }

  const renderEditableCell = (pattern: RecurringIncomeType, field: string, value: any, className: string = '') => {
    const isEditing = editingCell?.id === pattern.id && editingCell?.field === field
    
    if (isEditing) {
      return (
        <div className="flex items-center space-x-2">
          {field === 'bank_account_id' ? (
            <select
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave()
                if (e.key === 'Escape') handleCellCancel()
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            >
              <option value="">Select account</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.account_type})
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field === 'amount' || field === 'vat_amount' ? 'number' : field.includes('date') ? 'date' : 'text'}
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave()
                if (e.key === 'Escape') handleCellCancel()
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          )}
          <button
            onClick={handleCellSave}
            className="text-green-600 hover:text-green-900"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleCellCancel}
            className="text-red-600 hover:text-red-900"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
    
    return (
      <div 
        className={`cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${className}`}
        onClick={() => handleCellEdit(pattern.id, field, value)}
        title="Click to edit"
      >
        {field === 'amount' || field === 'vat_amount' 
          ? formatAmount(Number(value) || 0)
          : field.includes('date') 
            ? value ? new Date(value).toLocaleDateString() : '-'
            : field === 'bank_account_id'
            ? bankAccounts.find(acc => acc.id === value)?.name || 'N/A'
            : String(value || '-')
        }
      </div>
    )
  }

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

  const fetchBankAccounts = async () => {
    if (!selectedCompany) return
    
    try {
      const data = await bankAccountApi.getByCompany(selectedCompany.id)
      setBankAccounts(data)
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
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
        bank_account_id: data.bank_account_id ? Number(data.bank_account_id) : undefined,
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
      bank_account_id: pattern.bank_account_id?.toString() || '',
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

  const handleDownloadTemplate = async () => {
    try {
      const templateData = await recurringIncomeApi.downloadTemplate()
      
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
    } catch (error: any) {
      console.error('Template download error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to download template'
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
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
      const results = await recurringIncomeApi.importCSV(selectedCompany.id, file)
      setImportResults(results)
      setShowImportResults(true)
      fetchIncomePatterns() // Refresh data
    } catch (error: any) {
      console.error('Import error:', error)
      let errorMessage = 'Failed to import recurring income'
      
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation errors
          const errors = error.response.data.detail.map((err: any) => {
            if (typeof err === 'string') return err
            if (err.msg) return err.msg
            if (err.message) return err.message
            return JSON.stringify(err)
          })
          errorMessage = errors.join(', ')
        } else {
          errorMessage = JSON.stringify(error.response.data.detail)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setIsImporting(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = async () => {
    if (!selectedCompany) return

    try {
      const exportData = await recurringIncomeApi.exportCSV(selectedCompany.id)
      
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
    } catch (error: any) {
      console.error('Export error:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to export recurring income'
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
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
          <div className="flex space-x-3">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              title="Download CSV template with sample data"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              Template
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              {isImporting ? 'Importing...' : 'Import CSV'}
            </button>
            {incomePatterns.length > 0 && (
              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                Export CSV
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowColumnSettings(!showColumnSettings)}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                title="Column Settings"
              >
                <AdjustmentsHorizontalIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                Columns
              </button>
              {showColumnSettings && (
                <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b">
                      Show/Hide Columns
                    </div>
                    {Object.entries({
                      customer: 'Customer',
                      name: 'Name',
                      description: 'Description',
                      amount: 'Amount',
                      frequency: 'Frequency',
                      start_date: 'Start Date',
                      end_date: 'End Date',
                      status: 'Status',
                      notes: 'Notes',
                      bank_account: 'Bank Account'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center px-4 py-2 text-sm hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={visibleColumns[key as keyof typeof visibleColumns]}
                          onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              Add Pattern
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
              <select
                value={bankAccountFilter}
                onChange={(e) => setBankAccountFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="all">All Accounts</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              {(searchTerm || frequencyFilter !== 'all' || statusFilter !== 'all' || bankAccountFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFrequencyFilter('all')
                    setStatusFilter('all')
                    setBankAccountFilter('all')
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
                  {formatAmount(totalProjectedIncome)}
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
                    {visibleColumns.customer && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                    )}
                    {visibleColumns.name && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                    )}
                    {visibleColumns.description && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    )}
                    {visibleColumns.amount && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    )}
                    {visibleColumns.frequency && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Frequency
                      </th>
                    )}
                    {visibleColumns.start_date && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Date
                      </th>
                    )}
                    {visibleColumns.end_date && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    )}
                    {visibleColumns.notes && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    )}
                    {visibleColumns.bank_account && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Account
                      </th>
                    )}
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={getVisibleColumnCount()} className="px-6 py-4 text-center text-gray-500">
                        Loading income patterns...
                      </td>
                    </tr>
                  ) : filteredPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={getVisibleColumnCount()} className="px-6 py-4 text-center text-gray-500">
                        {incomePatterns.length === 0 ? 'No income patterns found. Set up your first recurring income!' : 'No patterns match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPatterns.map((pattern) => {
                      // Get customer name for display
                      const customer = customers.find(c => c.id === pattern.customer_id)
                      const customerName = customer?.name || '-'

                      return (
                        <tr key={pattern.id} className={selectedPatterns.includes(pattern.id) ? 'bg-indigo-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedPatterns.includes(pattern.id)}
                              onChange={() => handleSelectPattern(pattern.id)}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                          </td>
                          {visibleColumns.customer && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customerName}
                            </td>
                          )}
                          {visibleColumns.name && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {renderEditableCell(pattern, 'name', pattern.name, 'font-medium')}
                              </div>
                            </td>
                          )}
                          {visibleColumns.description && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {renderEditableCell(pattern, 'description', pattern.description)}
                              </div>
                            </td>
                          )}
                          {visibleColumns.amount && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-green-600">
                                {renderEditableCell(pattern, 'amount', pattern.amount, 'text-green-600')}
                              </div>
                              {(Number(pattern.vat_amount) || 0) > 0 && (
                                <div className="text-sm text-gray-500">
                                  VAT: {renderEditableCell(pattern, 'vat_amount', pattern.vat_amount)}
                                </div>
                              )}
                            </td>
                          )}
                          {visibleColumns.frequency && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {getFrequencyDescription(pattern)}
                              </span>
                            </td>
                          )}
                          {visibleColumns.start_date && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderEditableCell(pattern, 'start_date', pattern.start_date)}
                            </td>
                          )}
                          {visibleColumns.end_date && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderEditableCell(pattern, 'end_date', pattern.end_date)}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${getStatusColor(pattern.is_active)}`}>
                                {pattern.is_active}
                              </span>
                            </td>
                          )}
                          {visibleColumns.notes && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderEditableCell(pattern, 'notes', pattern.notes)}
                            </td>
                          )}
                          {visibleColumns.bank_account && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderEditableCell(pattern, 'bank_account_id', pattern.bank_account_id)}
                            </td>
                          )}
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
                      )
                    })
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
                  <label className="block text-sm font-medium text-gray-700">Bank Account</label>
                  <select
                    {...register('bank_account_id', { required: 'Bank account is required' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.account_type}) - {formatAmount(account.current_balance)}
                      </option>
                    ))}
                  </select>
                  {errors.bank_account_id && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.bank_account_id)}</p>
                  )}
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

      {/* Hidden file input for CSV import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Import results modal */}
      {showImportResults && importResults && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">Import Results</h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-md">
                  <p className="text-sm text-green-700">
                    <strong>Successfully imported:</strong> {importResults.success} income patterns
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
              
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => {
                    setShowImportResults(false)
                    setImportResults(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
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