import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useCompanyStore } from '../stores/companyStore'
import { customerApi } from '../services/api'
import { Customer } from '../types'
import CustomerDetailsModal from '../components/CustomerDetailsModal'

export default function Customers() {
  const { companies, selectedCompany, fetchCompanies } = useCompanyStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [importResults, setImportResults] = useState<any>(null)
  const [showImportResults, setShowImportResults] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    contact: true,
    company: true,
    product_type: true,
    revenue_model: false,
    partner: false,
    contract_start: false,
    payment_terms: true,
    status: true
  })
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>()

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    if (selectedCompany) {
      fetchCustomers()
    }
  }, [selectedCompany])

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

  // Filter customers based on search and status
  useEffect(() => {
    let filtered = customers

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.product_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.revenue_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.partner?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer =>
        statusFilter === 'active' ? customer.is_active : !customer.is_active
      )
    }

    setFilteredCustomers(filtered)
    
    // Clear selections when filter changes
    if (selectedCustomers.size > 0) {
      const stillVisible = Array.from(selectedCustomers).filter(id => 
        filtered.some(customer => customer.id === id)
      )
      if (stillVisible.length !== selectedCustomers.size) {
        setSelectedCustomers(new Set(stillVisible))
      }
    }
  }, [customers, searchTerm, statusFilter, selectedCustomers])

  const fetchCustomers = async () => {
    if (!selectedCompany) return
    
    setIsLoading(true)
    try {
      const data = await customerApi.getByCompany(selectedCompany.id)
      setCustomers(data)
      setSelectedCustomers(new Set()) // Clear selections when refreshing data
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    if (!selectedCompany) return
    
    try {
      if (editingCustomer) {
        const updated = await customerApi.update(editingCustomer.id, data)
        setCustomers(customers.map(c => c.id === editingCustomer.id ? updated : c))
      } else {
        const newCustomer = await customerApi.create({ ...data, company_id: selectedCompany.id })
        setCustomers([...customers, newCustomer])
      }
      setShowModal(false)
      setEditingCustomer(null)
      reset()
    } catch (error) {
      console.error('Error saving customer:', error)
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    reset(customer)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await customerApi.delete(id)
        setCustomers(customers.filter(c => c.id !== id))
      } catch (error) {
        console.error('Error deleting customer:', error)
      }
    }
  }

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailsModal(true)
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
      const results = await customerApi.importCSV(selectedCompany.id, file)
      setImportResults(results)
      setShowImportResults(true)
      fetchCustomers() // Refresh customer list
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to import customers')
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
      const exportData = await customerApi.exportCSV(selectedCompany.id)
      
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
      setError(error.response?.data?.detail || 'Failed to export customers')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateData = await customerApi.downloadTemplate()
      
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

  const toggleColumn = (columnKey: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }))
  }

  const getVisibleColumnCount = () => {
    return Object.values(visibleColumns).filter(Boolean).length + 2 // +1 for checkbox, +1 for actions column
  }

  const handleSelectCustomer = (customerId: number) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return
    
    const count = selectedCustomers.size
    if (confirm(`Are you sure you want to delete ${count} customer${count > 1 ? 's' : ''}?`)) {
      setIsDeleting(true)
      try {
        const deletePromises = Array.from(selectedCustomers).map(id => customerApi.delete(id))
        await Promise.all(deletePromises)
        
        setCustomers(customers.filter(c => !selectedCustomers.has(c.id)))
        setSelectedCustomers(new Set())
      } catch (error) {
        console.error('Error deleting customers:', error)
      } finally {
        setIsDeleting(false)
      }
    }
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
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage customers for {selectedCompany.name}. {filteredCustomers.length} of {customers.length} customers shown.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="flex space-x-3">
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
                      name: 'Name',
                      contact: 'Contact',
                      company: 'Company',
                      product_type: 'Product Type',
                      revenue_model: 'Revenue Model',
                      partner: 'Partner',
                      contract_start: 'Contract Start',
                      payment_terms: 'Payment Terms',
                      status: 'Status'
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
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
            {customers.length > 0 && (
              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-4 w-4" aria-hidden="true" />
                Export CSV
              </button>
            )}
            <button
              onClick={() => {
                setEditingCustomer(null)
                reset({ company_id: selectedCompany.id, payment_terms: 30, is_active: true })
                setShowModal(true)
              }}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCustomers.size > 0 && (
        <div className="mt-6 bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-indigo-900">
                {selectedCustomers.size} customer{selectedCustomers.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedCustomers(new Set())}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear Selection
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {isDeleting ? 'Deleting...' : `Delete (${selectedCustomers.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search customers by name, email, company, product type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Customers</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="relative px-6 py-3">
                      <input
                        type="checkbox"
                        checked={filteredCustomers.length > 0 && selectedCustomers.size === filteredCustomers.length}
                        onChange={handleSelectAll}
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </th>
                    {visibleColumns.name && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                    )}
                    {visibleColumns.contact && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    )}
                    {visibleColumns.company && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                    )}
                    {visibleColumns.product_type && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Type
                      </th>
                    )}
                    {visibleColumns.revenue_model && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue Model
                      </th>
                    )}
                    {visibleColumns.partner && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Partner
                      </th>
                    )}
                    {visibleColumns.contract_start && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contract Start
                      </th>
                    )}
                    {visibleColumns.payment_terms && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Terms
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
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
                        Loading customers...
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={getVisibleColumnCount()} className="px-6 py-4 text-center text-gray-500">
                        {customers.length === 0 ? 'No customers found. Add your first customer!' : 'No customers match your search criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                    <tr key={customer.id} className={selectedCustomers.has(customer.id) ? 'bg-indigo-50' : ''}>
                      <td className="relative px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          className="absolute left-4 top-1/2 -mt-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      {visibleColumns.name && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.contact_person}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.contact && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.email}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </td>
                      )}
                      {visibleColumns.company && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.company_name || '-'}</div>
                        </td>
                      )}
                      {visibleColumns.product_type && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.product_type || '-'}</div>
                        </td>
                      )}
                      {visibleColumns.revenue_model && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.revenue_model || '-'}</div>
                        </td>
                      )}
                      {visibleColumns.partner && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{customer.partner || '-'}</div>
                        </td>
                      )}
                      {visibleColumns.contract_start && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {customer.contract_start ? new Date(customer.contract_start).toLocaleDateString() : '-'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.payment_terms && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.payment_terms} days
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                            customer.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {customer.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewDetails(customer)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit Customer"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Customer"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    {...register('email', {
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Invalid email format'
                      }
                    })}
                    type="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="customer@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                  <input
                    {...register('contact_person')}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="123 Main St, City, State, ZIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Terms (days)</label>
                  <select
                    {...register('payment_terms', { valueAsNumber: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days (Net 30)</option>
                    <option value={45}>45 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Any additional notes about this customer..."
                  />
                </div>

                {/* Business Information Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Business Information</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name</label>
                      <input
                        {...register('company_name')}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Acme Corp"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Product Type</label>
                      <input
                        {...register('product_type')}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="SaaS, Consulting, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Revenue Model</label>
                      <input
                        {...register('revenue_model')}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Subscription, One-time, etc."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Partner</label>
                      <input
                        {...register('partner')}
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Direct, Referral Partner, etc."
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700">Contract Start Date</label>
                    <input
                      {...register('contract_start')}
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      {...register('is_active')}
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCustomer(null)
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
                    {editingCustomer ? 'Update' : 'Create'}
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

      {/* Error display */}
      {error && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">Import Error</h3>
              <p className="text-sm text-gray-500 text-center mb-4">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <strong>Successfully imported:</strong> {importResults.success} customers
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>Total processed:</strong> {importResults.total_processed} rows
                  </p>
                </div>
                
                {importResults.imported_customers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Imported customers:</h4>
                    <div className="max-h-32 overflow-y-auto bg-gray-50 p-3 rounded-md">
                      {importResults.imported_customers.map((name: string, index: number) => (
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

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedCustomer(null)
          }}
        />
      )}
    </div>
  )
}