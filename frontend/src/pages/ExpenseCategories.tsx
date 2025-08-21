import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, TagIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { expenseCategoryApi } from '../services/api'
import { ExpenseCategory } from '../types'

export default function ExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [filteredCategories, setFilteredCategories] = useState<ExpenseCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<any>(null)
  const [showImportResults, setShowImportResults] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<ExpenseCategory, 'id' | 'created_at'>>()

  useEffect(() => {
    fetchCategories()
  }, [])

  // Filter categories based on search
  useEffect(() => {
    let filtered = categories

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCategories(filtered)
  }, [categories, searchTerm])

  const fetchCategories = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await expenseCategoryApi.getAll()
      setCategories(data)
    } catch (error: any) {
      console.error('Error fetching expense categories:', error)
      setError('Failed to load expense categories')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: Omit<ExpenseCategory, 'id' | 'created_at'>) => {
    try {
      setError(null)
      if (editingCategory) {
        const updated = await expenseCategoryApi.update(editingCategory.id, data)
        setCategories(categories.map(c => c.id === editingCategory.id ? updated : c))
      } else {
        const newCategory = await expenseCategoryApi.create(data)
        setCategories([...categories, newCategory])
      }
      setShowModal(false)
      setEditingCategory(null)
      reset()
    } catch (error: any) {
      console.error('Error saving expense category:', error)
      setError(error.response?.data?.detail || 'Failed to save expense category')
    }
  }

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category)
    reset(category)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this expense category? This action cannot be undone.')) {
      try {
        setError(null)
        await expenseCategoryApi.delete(id)
        setCategories(categories.filter(c => c.id !== id))
      } catch (error: any) {
        console.error('Error deleting expense category:', error)
        setError(error.response?.data?.detail || 'Failed to delete expense category')
      }
    }
  }

  const handleAdd = () => {
    setEditingCategory(null)
    reset({ name: '', description: '' })
    setShowModal(true)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError(null)
    
    try {
      const results = await expenseCategoryApi.importCSV(file)
      setImportResults(results)
      setShowImportResults(true)
      fetchCategories() // Refresh category list
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to import expense categories')
    } finally {
      setIsImporting(false)
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = async () => {
    try {
      const exportData = await expenseCategoryApi.exportCSV()
      
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
      setError(error.response?.data?.detail || 'Failed to export expense categories')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateData = await expenseCategoryApi.downloadTemplate()
      
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
      setError(error.response?.data?.detail || 'Failed to download template')
    }
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Expense Categories</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your expense categories to standardize expense tracking across your business.
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
            {categories.length > 0 && (
              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                Export CSV
              </button>
            )}
            <button
              onClick={handleAdd}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Category
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-700">{typeof error === 'string' ? error : JSON.stringify(error)}</div>
        </div>
      )}

      {/* Search */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {filteredCategories.length} of {categories.length} categories
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {isLoading ? (
            <li className="px-6 py-4 text-center text-gray-500">Loading categories...</li>
          ) : filteredCategories.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              {categories.length === 0 ? 'No expense categories yet. Add your first one!' : 'No categories match your search.'}
            </li>
          ) : (
            filteredCategories.map((category) => (
              <li key={category.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <TagIcon className="h-6 w-6 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {category.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Created {new Date(category.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-md"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-md"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category Name *
                  </label>
                  <input
                    {...register('name', { 
                      required: 'Category name is required',
                      minLength: { value: 2, message: 'Category name must be at least 2 characters' }
                    })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g., Office Supplies, Marketing, Travel"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Optional description of this expense category"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCategory(null)
                      reset()
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    {editingCategory ? 'Update' : 'Create'}
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
                    <strong>Successfully imported:</strong> {importResults.success} categories
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Total processed:</strong> {importResults.total_processed} rows
                  </p>
                </div>
                
                {importResults.imported_categories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Imported categories:</h4>
                    <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded-md">
                      {importResults.imported_categories.map((name: string, index: number) => (
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