import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompanyStore } from '../stores/companyStore'
import { recurringIncomeApi, recurringExpenseApi, oneOffItemApi, projectionApi } from '../services/api'
import { RecurringIncome, RecurringExpense, OneOffItem } from '../types'
import { formatCurrency } from '../utils/currency'
import {
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClipboardDocumentListIcon,
  PlayIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const { companies, selectedCompany, fetchCompanies, setSelectedCompany } = useCompanyStore()
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [oneOffItems, setOneOffItems] = useState<OneOffItem[]>([])
  const [projectionSummary, setProjectionSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({
    activeIncomePatterns: 0,
    activeExpensePatterns: 0,
    plannedOneOffs: 0,
    projectedBalance30Days: 0,
    monthlyIncomeTotal: 0,
    monthlyExpenseTotal: 0
  })

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    if (selectedCompany) {
      fetchDashboardData()
    }
  }, [selectedCompany])

  const fetchDashboardData = async () => {
    if (!selectedCompany) return
    
    setIsLoading(true)
    try {
      // Fetch all the data needed for dashboard
      const [incomes, expenses, oneOffs] = await Promise.all([
        recurringIncomeApi.getByCompany(selectedCompany.id),
        recurringExpenseApi.getByCompany(selectedCompany.id),
        oneOffItemApi.getByCompany(selectedCompany.id)
      ])

      setRecurringIncomes(incomes)
      setRecurringExpenses(expenses)
      setOneOffItems(oneOffs)

      // Try to fetch recent projections summary for quick insights
      try {
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30) // Next 30 days
        
        const summary = await projectionApi.getSummary(
          selectedCompany.id,
          'monthly',
          new Date().toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )
        setProjectionSummary(summary)
      } catch (error) {
        console.log('No projections available yet')
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Calculate stats from recurring patterns and one-offs
    const activeIncomes = recurringIncomes.filter(i => i.is_active === 'active')
    const activeExpenses = recurringExpenses.filter(e => e.is_active === 'active')
    const plannedItems = oneOffItems.filter(item => ['planned', 'confirmed'].includes(item.is_confirmed))
    
    // Calculate monthly totals (approximate)
    const monthlyIncome = activeIncomes.reduce((sum, income) => {
      const amount = Number(income.amount) || 0
      let monthlyAmount = amount
      if (income.frequency === 'weekly') monthlyAmount *= 4.33
      else if (income.frequency === 'quarterly') monthlyAmount /= 3
      else if (income.frequency === 'annually') monthlyAmount /= 12
      return sum + monthlyAmount
    }, 0)
    
    const monthlyExpense = activeExpenses.reduce((sum, expense) => {
      const amount = Number(expense.amount) || 0
      let monthlyAmount = amount
      if (expense.frequency === 'weekly') monthlyAmount *= 4.33
      else if (expense.frequency === 'quarterly') monthlyAmount /= 3
      else if (expense.frequency === 'annually') monthlyAmount /= 12
      return sum + monthlyAmount
    }, 0)

    const projected30Days = Number(projectionSummary?.summary?.[0]?.running_balance) || 0

    setStats({
      activeIncomePatterns: activeIncomes.length,
      activeExpensePatterns: activeExpenses.length,
      plannedOneOffs: plannedItems.length,
      projectedBalance30Days: projected30Days,
      monthlyIncomeTotal: monthlyIncome,
      monthlyExpenseTotal: monthlyExpense
    })
  }, [recurringIncomes, recurringExpenses, oneOffItems, projectionSummary])

  const formatAmount = (amount: number) => {
    return formatCurrency(amount, selectedCompany?.currency || 'USD')
  }

  const getUpcomingItems = () => {
    const today = new Date()
    const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    return oneOffItems
      .filter(item => {
        const itemDate = new Date(item.planned_date)
        return itemDate >= today && itemDate <= next30Days && ['planned', 'confirmed'].includes(item.is_confirmed)
      })
      .sort((a, b) => new Date(a.planned_date).getTime() - new Date(b.planned_date).getTime())
      .slice(0, 5)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cash Flow Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your cash flow projections and recurring patterns
        </p>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No companies</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first company.
          </p>
          <div className="mt-6">
            <Link
              to="/companies"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Company
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Select Company</label>
            <select
              value={selectedCompany?.id || ''}
              onChange={(e) => {
                const company = companies.find(c => c.id === parseInt(e.target.value))
                setSelectedCompany(company || null)
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Select a company...</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCompany && (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Active Income Patterns
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.activeIncomePatterns}
                          </dd>
                          <dd className="text-xs text-gray-500">
                            ~{formatAmount(stats.monthlyIncomeTotal)}/month
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Active Expense Patterns
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.activeExpensePatterns}
                          </dd>
                          <dd className="text-xs text-gray-500">
                            ~{formatAmount(stats.monthlyExpenseTotal)}/month
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Upcoming One-offs
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.plannedOneOffs}
                          </dd>
                          <dd className="text-xs text-gray-500">
                            Next 30 days
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CalendarDaysIcon className="h-8 w-8 text-indigo-500" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Net Monthly Flow
                          </dt>
                          <dd className={`text-lg font-medium ${
                            (stats.monthlyIncomeTotal - stats.monthlyExpenseTotal) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatAmount(stats.monthlyIncomeTotal - stats.monthlyExpenseTotal)}
                          </dd>
                          <dd className="text-xs text-gray-500">
                            Projected average
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      to="/projections"
                      className="inline-flex items-center w-full px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <PlayIcon className="mr-2 h-4 w-4" />
                      Generate Projections
                    </Link>
                    <Link
                      to="/recurring-income"
                      className="inline-flex items-center w-full px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add Income Pattern
                    </Link>
                    <Link
                      to="/recurring-expenses"
                      className="inline-flex items-center w-full px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add Expense Pattern
                    </Link>
                  </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming One-off Items</h3>
                  {getUpcomingItems().length === 0 ? (
                    <p className="text-sm text-gray-500">No upcoming items in the next 30 days</p>
                  ) : (
                    <div className="space-y-3">
                      {getUpcomingItems().map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(item.planned_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-sm font-medium ${
                            item.item_type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.item_type === 'income' ? '+' : '-'}{formatAmount(Number(item.amount) || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        stats.activeIncomePatterns > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-700">Income Patterns</span>
                      <span className="ml-auto text-sm text-gray-500">{stats.activeIncomePatterns}</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        stats.activeExpensePatterns > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-700">Expense Patterns</span>
                      <span className="ml-auto text-sm text-gray-500">{stats.activeExpensePatterns}</span>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        projectionSummary ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-sm text-gray-700">Projections</span>
                      <span className="ml-auto text-sm text-gray-500">
                        {projectionSummary ? 'Generated' : 'Need Generation'}
                      </span>
                    </div>
                  </div>
                  {!projectionSummary && (
                    <Link
                      to="/projections"
                      className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      <EyeIcon className="mr-1 h-4 w-4" />
                      View Projections
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}