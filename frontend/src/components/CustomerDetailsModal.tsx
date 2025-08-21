import { useEffect, useState } from 'react'
import { XMarkIcon, EnvelopeIcon, PhoneIcon, UserIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { Customer, Transaction } from '../types'
import { transactionApi } from '../services/api'

interface CustomerDetailsModalProps {
  customer: Customer
  onClose: () => void
}

export default function CustomerDetailsModal({ customer, onClose }: CustomerDetailsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchCustomerTransactions()
  }, [customer])

  const fetchCustomerTransactions = async () => {
    setIsLoading(true)
    try {
      // Get all transactions for the company and filter by customer
      const allTransactions = await transactionApi.getByCompany(customer.company_id)
      const customerTransactions = allTransactions.filter(t => t.customer_id === customer.id)
      setTransactions(customerTransactions)
    } catch (error) {
      console.error('Error fetching customer transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const outstandingAmount = transactions
    .filter(t => t.type === 'income' && t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0)

  const overdueTransactions = transactions.filter(t => 
    t.type === 'income' && 
    t.status === 'pending' && 
    t.due_date && 
    new Date(t.due_date) < new Date()
  )

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{customer.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
              
              <div className="space-y-3">
                {customer.email && (
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{customer.email}</span>
                  </div>
                )}
                
                {customer.phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{customer.phone}</span>
                  </div>
                )}
                
                {customer.contact_person && (
                  <div className="flex items-center">
                    <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{customer.contact_person}</span>
                  </div>
                )}

                <div className="flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{customer.payment_terms} days payment terms</span>
                </div>
              </div>

              {customer.address && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Address</h5>
                  <p className="text-sm text-gray-600">{customer.address}</p>
                </div>
              )}

              {customer.notes && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Notes</h5>
                  <p className="text-sm text-gray-600">{customer.notes}</p>
                </div>
              )}

              <div className="mt-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {customer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Business Information */}
            <div className="bg-indigo-50 p-4 rounded-lg mt-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Business Information</h4>
              
              <div className="space-y-3">
                {customer.company_name && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Company: </span>
                    <span className="text-sm text-gray-600">{customer.company_name}</span>
                  </div>
                )}
                
                {customer.product_type && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Product Type: </span>
                    <span className="text-sm text-gray-600">{customer.product_type}</span>
                  </div>
                )}
                
                {customer.revenue_model && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Revenue Model: </span>
                    <span className="text-sm text-gray-600">{customer.revenue_model}</span>
                  </div>
                )}
                
                {customer.partner && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Partner: </span>
                    <span className="text-sm text-gray-600">{customer.partner}</span>
                  </div>
                )}
                
                {customer.contract_start && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Contract Start: </span>
                    <span className="text-sm text-gray-600">{new Date(customer.contract_start).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Revenue</span>
                  <span className="text-sm font-medium text-green-600">${totalIncome.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Outstanding</span>
                  <span className="text-sm font-medium text-yellow-600">${outstandingAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Overdue Items</span>
                  <span className="text-sm font-medium text-red-600">{overdueTransactions.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-2">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h4>
            
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No transactions found for this customer.</div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <li key={transaction.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-3 ${
                              transaction.type === 'income' ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.transaction_date).toLocaleDateString()}
                                {transaction.due_date && (
                                  <span> • Due: {new Date(transaction.due_date).toLocaleDateString()}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : transaction.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status}
                          </span>
                          
                          <span className={`text-sm font-medium ${
                            transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}