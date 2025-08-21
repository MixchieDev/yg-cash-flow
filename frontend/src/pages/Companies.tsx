import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon, Cog6ToothIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { useCompanyStore } from '../stores/companyStore'
import { Company } from '../types'
import { debugAuth } from '../utils/debug'

export default function Companies() {
  const { companies, selectedCompany, selectCompany, fetchCompanies, createCompany, updateCompany, deleteCompany, isLoading } = useCompanyStore()
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<Company | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<Company, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>()

  useEffect(() => {
    fetchCompanies()
    debugAuth() // Debug authentication on component mount
  }, [fetchCompanies])

  // Filter companies based on search
  useEffect(() => {
    let filtered = companies

    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredCompanies(filtered)
  }, [companies, searchTerm])

  const onSubmit = async (data: Omit<Company, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null)
      console.log('Submitting company data:', data)
      debugAuth() // Debug auth before API call
      
      if (editingCompany) {
        await updateCompany(editingCompany.id, data)
      } else {
        await createCompany(data)
      }
      setShowModal(false)
      setEditingCompany(null)
      reset()
    } catch (error: any) {
      console.error('Error saving company:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to save company')
    }
  }

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    reset(company)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this company? This will also delete all associated customers, transactions, and expenses.')) {
      try {
        setError(null)
        await deleteCompany(id)
        // If the deleted company was selected, clear the selection
        if (selectedCompany?.id === id) {
          selectCompany(null)
        }
      } catch (error: any) {
        console.error('Error deleting company:', error)
        setError(error.response?.data?.detail || error.message || 'Failed to delete company')
      }
    }
  }

  const handleViewDetails = (company: Company) => {
    setSelectedCompanyDetails(company)
    setShowDetailsModal(true)
  }

  const handleSelectCompany = (company: Company) => {
    selectCompany(company)
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
          <h1 className="text-xl font-semibold text-gray-900">Companies</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your companies and their information. {filteredCompanies.length} of {companies.length} companies shown.
            {selectedCompany && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Selected: {selectedCompany.name}
              </span>
            )}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingCompany(null)
              reset()
              setShowModal(true)
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Company
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
                placeholder="Search companies by name, description, or email..."
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
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      VAT Rate
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
                        Loading companies...
                      </td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        {companies.length === 0 ? 'No companies found. Add your first company!' : 'No companies match your search criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => (
                      <tr 
                        key={company.id} 
                        className={`hover:bg-gray-50 ${selectedCompany?.id === company.id ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{company.name}</div>
                              <div className="text-sm text-gray-500">{company.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{company.email}</div>
                          <div className="text-sm text-gray-500">{company.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {company.vat_rate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {selectedCompany?.id === company.id ? (
                            <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                              Selected
                            </span>
                          ) : (
                            <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Available
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {selectedCompany?.id !== company.id && (
                              <button
                                onClick={() => handleSelectCompany(company)}
                                className="text-green-600 hover:text-green-900"
                                title="Select Company"
                              >
                                ✓
                              </button>
                            )}
                            <button
                              onClick={() => handleViewDetails(company)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(company)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit Company"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(company.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Company"
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

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCompany ? 'Edit Company' : 'Add New Company'}
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
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Brief description of the company..."
                  />
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
                    placeholder="company@example.com"
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
                  <label className="block text-sm font-medium text-gray-700">VAT Rate (%)</label>
                  <input
                    {...register('vat_rate', { 
                      required: 'VAT rate is required',
                      valueAsNumber: true,
                      min: { value: 0, message: 'VAT rate must be 0 or greater' },
                      max: { value: 100, message: 'VAT rate cannot exceed 100%' }
                    })}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="20.00"
                  />
                  {errors.vat_rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.vat_rate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="123 Business St, City, State, ZIP"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    {...register('website')}
                    type="url"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="https://company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax Number</label>
                  <input
                    {...register('tax_number')}
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Tax ID or registration number"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCompany(null)
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
                    {editingCompany ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Company Details Modal */}
      {showDetailsModal && selectedCompanyDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mr-4">
                    <BuildingOfficeIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{selectedCompanyDetails.name}</h3>
                    <p className="text-sm text-gray-500">{selectedCompanyDetails.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedCompanyDetails(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Contact Information</h4>
                  <div className="space-y-3">
                    {selectedCompanyDetails.email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="text-sm text-gray-900">{selectedCompanyDetails.email}</dd>
                      </div>
                    )}
                    {selectedCompanyDetails.phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="text-sm text-gray-900">{selectedCompanyDetails.phone}</dd>
                      </div>
                    )}
                    {selectedCompanyDetails.website && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Website</dt>
                        <dd className="text-sm text-gray-900">
                          <a href={selectedCompanyDetails.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                            {selectedCompanyDetails.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    {selectedCompanyDetails.address && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd className="text-sm text-gray-900 whitespace-pre-line">{selectedCompanyDetails.address}</dd>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Business Information</h4>
                  <div className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">VAT Rate</dt>
                      <dd className="text-sm text-gray-900">{selectedCompanyDetails.vat_rate}%</dd>
                    </div>
                    {selectedCompanyDetails.tax_number && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tax Number</dt>
                        <dd className="text-sm text-gray-900">{selectedCompanyDetails.tax_number}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(selectedCompanyDetails.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(selectedCompanyDetails.updated_at).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd>
                        {selectedCompany?.id === selectedCompanyDetails.id ? (
                          <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            Currently Selected
                          </span>
                        ) : (
                          <span className="inline-flex px-2 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Available
                          </span>
                        )}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                {selectedCompany?.id !== selectedCompanyDetails.id && (
                  <button
                    onClick={() => {
                      handleSelectCompany(selectedCompanyDetails)
                      setShowDetailsModal(false)
                      setSelectedCompanyDetails(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Select This Company
                  </button>
                )}
                <button
                  onClick={() => {
                    handleEdit(selectedCompanyDetails)
                    setShowDetailsModal(false)
                    setSelectedCompanyDetails(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Edit Company
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedCompanyDetails(null)
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