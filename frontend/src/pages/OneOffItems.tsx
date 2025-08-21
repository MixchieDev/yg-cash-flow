import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, PlayIcon, PauseIcon, CheckIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { useCompanyStore } from '../stores/companyStore'
import { oneOffItemApi, expenseCategoryApi } from '../services/api'
import { OneOffItem, ExpenseCategory } from '../types'
import { formatCurrency } from '../utils/currency'

const itemTypeOptions = [
  { value: 'income', label: 'Income', description: 'Money coming in' },
  { value: 'expense', label: 'Expense', description: 'Money going out' }
]

const statusOptions = [
  { value: 'planned', label: 'Planned', color: 'bg-blue-100 text-blue-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
]

// Helper function to safely render error messages
const getErrorMessage = (error: any): string => {
  if (!error) return ''
  if (typeof error.message === 'string') return error.message
  if (error.msg && typeof error.msg === 'string') return error.msg
  if (typeof error === 'string') return error
  return 'Invalid input'
}

export default function OneOffItems() {
  const { selectedCompany } = useCompanyStore()
  
  const formatAmount = (amount: number) => {
    return formatCurrency(amount, selectedCompany?.currency || 'USD')
  }
  const [items, setItems] = useState<OneOffItem[]>([])
  const [filteredItems, setFilteredItems] = useState<OneOffItem[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<OneOffItem | null>(null)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Omit<OneOffItem, 'id' | 'created_at' | 'updated_at'>>()
  const watchedItemType = watch('item_type')

  useEffect(() => {
    if (selectedCompany) {
      fetchItems()
      fetchCategories()
    }
  }, [selectedCompany])

  // Filter items based on search and filters
  useEffect(() => {
    let filtered = items

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.item_type === typeFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.is_confirmed === statusFilter)
    }

    setFilteredItems(filtered)
  }, [items, searchTerm, typeFilter, statusFilter])

  const fetchItems = async () => {
    if (!selectedCompany) return
    
    setIsLoading(true)
    try {
      const data = await oneOffItemApi.getByCompany(selectedCompany.id)
      setItems(data)
    } catch (error: any) {
      console.error('Error fetching one-off items:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to fetch one-off items'
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

  const onSubmit = async (data: Omit<OneOffItem, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany) return
    
    try {
      setError(null)
      const itemData = {
        ...data,
        company_id: selectedCompany.id,
        category_id: data.item_type === 'expense' && data.category_id ? data.category_id : undefined,
        amount: Number(data.amount),
        vat_amount: Number(data.vat_amount || 0),
        planned_date: new Date(data.planned_date).toISOString(),
        description: data.description && data.description.trim() ? data.description : undefined,
        source: data.source && data.source.trim() ? data.source : undefined,
        reference: data.reference && data.reference.trim() ? data.reference : undefined,
        notes: data.notes && data.notes.trim() ? data.notes : undefined,
      }
      
      if (editingItem) {
        const updated = await oneOffItemApi.update(editingItem.id, itemData)
        setItems(items.map(i => i.id === editingItem.id ? updated : i))
      } else {
        const newItem = await oneOffItemApi.create(itemData)
        setItems([...items, newItem])
      }
      setShowModal(false)
      setEditingItem(null)
      reset()
    } catch (error: any) {
      console.error('Error saving one-off item:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to save one-off item'
      setError(errorMessage)
    }
  }

  const handleEdit = (item: OneOffItem) => {
    setEditingItem(item)
    reset({
      ...item,
      planned_date: item.planned_date.split('T')[0],
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this one-off item?')) {
      try {
        setError(null)
        await oneOffItemApi.delete(id)
        setItems(items.filter(i => i.id !== id))
        setSelectedItems(selectedItems.filter(i => i !== id))
      } catch (error: any) {
        console.error('Error deleting one-off item:', error)
        const errorMessage = typeof error.response?.data?.detail === 'string' 
          ? error.response.data.detail 
          : typeof error.message === 'string' 
          ? error.message 
          : 'Failed to delete one-off item'
        setError(errorMessage)
      }
    }
  }

  const handleStatusChange = async (id: number, newStatus: 'planned' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      setError(null)
      const updated = await oneOffItemApi.updateStatus(id, newStatus)
      setItems(items.map(i => i.id === id ? updated : i))
    } catch (error: any) {
      console.error('Error updating item status:', error)
      const errorMessage = typeof error.response?.data?.detail === 'string' 
        ? error.response.data.detail 
        : typeof error.message === 'string' 
        ? error.message 
        : 'Failed to update item status'
      setError(errorMessage)
    }
  }

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === filteredItems.length 
        ? [] 
        : filteredItems.map(i => i.id)
    )
  }


  const getStatusColor = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status)
    return option?.color || 'bg-gray-100 text-gray-800'
  }

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
          <h1 className="text-xl font-semibold text-gray-900">One-off Items</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage irregular income and expenses that will be included in your cash flow projections.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingItem(null)
              reset({
                name: '',
                description: '',
                amount: 0,
                vat_amount: 0,
                item_type: 'expense',
                planned_date: new Date().toISOString().split('T')[0],
                is_confirmed: 'planned',
                source: '',
                reference: '',
                notes: '',
                company_id: selectedCompany.id
              })
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add One-off Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setTypeFilter('all')
                setStatusFilter('all')
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="relative px-6 py-3">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Planned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                        No one-off items found. Add some items to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className={selectedItems.includes(item.id) ? 'bg-gray-50' : ''}>
                        <td className="relative px-6 py-4">
                          <input
                            type="checkbox"
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.item_type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.item_type === 'income' ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={item.item_type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {item.item_type === 'income' ? '+' : '-'}{formatAmount(Number(item.amount) || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                            {new Date(item.planned_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.is_confirmed)}`}>
                            {item.is_confirmed}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.source || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <div className="flex items-center space-x-2">
                            {item.is_confirmed === 'planned' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'confirmed')}
                                className="text-green-600 hover:text-green-900"
                                title="Mark as confirmed"
                              >
                                <PlayIcon className="h-4 w-4" />
                              </button>
                            )}
                            {item.is_confirmed === 'confirmed' && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'completed')}
                                className="text-blue-600 hover:text-blue-900"
                                title="Mark as completed"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            )}
                            {(item.is_confirmed === 'planned' || item.is_confirmed === 'confirmed') && (
                              <button
                                onClick={() => handleStatusChange(item.id, 'cancelled')}
                                className="text-red-600 hover:text-red-900"
                                title="Cancel item"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit One-off Item' : 'Add New One-off Item'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name*</label>
                    <input
                      {...register('name', { required: 'Name is required' })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Item name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.name)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type*</label>
                    <select
                      {...register('item_type', { required: 'Type is required' })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {itemTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.item_type && (
                      <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.item_type)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount*</label>
                    <input
                      {...register('amount', { 
                        required: 'Amount is required',
                        min: { value: 0.01, message: 'Amount must be greater than 0' }
                      })}
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.amount)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">VAT Amount</label>
                    <input
                      {...register('vat_amount')}
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Planned Date*</label>
                    <input
                      {...register('planned_date', { required: 'Planned date is required' })}
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.planned_date && (
                      <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.planned_date)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      {...register('is_confirmed')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source</label>
                    <input
                      {...register('source')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Who you receive from / pay to"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reference</label>
                    <input
                      {...register('reference')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Reference number or code"
                    />
                  </div>

                  {watchedItemType === 'expense' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select
                        {...register('category_id')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    {...register('description')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Brief description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingItem(null)
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
                    {editingItem ? 'Update' : 'Create'}
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