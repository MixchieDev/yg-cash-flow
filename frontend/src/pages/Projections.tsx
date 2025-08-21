import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { 
  CalendarDaysIcon, 
  ChartBarIcon, 
  PlayIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { useCompanyStore } from '../stores/companyStore'
import { projectionApi } from '../services/api'
import { ProjectionRequest } from '../types'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

type ViewType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

interface ProjectionSummaryItem {
  period: string
  income: number
  expenses: number
  net_flow: number
  running_balance: number
}

interface ProjectionSummaryResponse {
  summary: ProjectionSummaryItem[]
  view: string
  start_date: string
  end_date: string
}

// Helper function to safely render error messages
const getErrorMessage = (error: any): string => {
  if (!error) return ''
  if (typeof error.message === 'string') return error.message
  if (error.msg && typeof error.msg === 'string') return error.msg
  if (typeof error === 'string') return error
  return 'Invalid input'
}

export default function Projections() {
  const { selectedCompany } = useCompanyStore()
  const [currentView, setCurrentView] = useState<ViewType>('monthly')
  const [projectionData, setProjectionData] = useState<ProjectionSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [viewStartDate, setViewStartDate] = useState<string>('')
  const [viewEndDate, setViewEndDate] = useState<string>('')
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectionRequest>()

  useEffect(() => {
    if (selectedCompany) {
      // Initialize default date range if not set
      if (!viewStartDate || !viewEndDate) {
        const today = new Date()
        const defaultStart = today.toISOString().split('T')[0]
        let defaultEnd: string
        
        switch (currentView) {
          case 'daily':
            defaultEnd = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()).toISOString().split('T')[0]
            break
          case 'weekly':
            defaultEnd = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()).toISOString().split('T')[0]
            break
          case 'monthly':
            defaultEnd = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
            break
          case 'quarterly':
            defaultEnd = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().split('T')[0]
            break
          case 'yearly':
            defaultEnd = new Date(today.getFullYear() + 3, today.getMonth(), today.getDate()).toISOString().split('T')[0]
            break
          default:
            defaultEnd = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0]
        }
        
        setViewStartDate(defaultStart)
        setViewEndDate(defaultEnd)
        return
      }
      
      loadProjections()
    }
  }, [selectedCompany, currentView, viewStartDate, viewEndDate])

  const loadProjections = async () => {
    if (!selectedCompany || !viewStartDate || !viewEndDate) return
    
    setIsLoading(true)
    try {
      setError(null)
      
      const data = await projectionApi.getSummary(selectedCompany.id, currentView, viewStartDate, viewEndDate)
      setProjectionData(data)
    } catch (error: any) {
      console.error('Error loading projections:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to load projections')
    } finally {
      setIsLoading(false)
    }
  }

  const generateProjections = async (data: ProjectionRequest) => {
    if (!selectedCompany) return
    
    try {
      setError(null)
      await projectionApi.generate(selectedCompany.id, data)
      
      // Update the view date range to match the generated projection range
      setViewStartDate(data.start_date)
      setViewEndDate(data.end_date)
      
      setShowGenerateModal(false)
      reset()
      // loadProjections will be called automatically by useEffect when viewStartDate/viewEndDate change
    } catch (error: any) {
      console.error('Error generating projections:', error)
      setError(error.response?.data?.detail || error.message || 'Failed to generate projections')
    }
  }

  const viewOptions = [
    { value: 'daily', label: 'Daily', description: 'Day-by-day view' },
    { value: 'weekly', label: 'Weekly', description: 'Week-by-week view' },
    { value: 'monthly', label: 'Monthly', description: 'Month-by-month view' },
    { value: 'quarterly', label: 'Quarterly', description: 'Quarter-by-quarter view' },
    { value: 'yearly', label: 'Yearly', description: 'Year-by-year view' }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatPeriod = (period: string, view: ViewType) => {
    if (view === 'daily') {
      return new Date(period).toLocaleDateString()
    }
    if (view === 'weekly') {
      return period.replace('Week of ', '')
    }
    if (view === 'monthly') {
      const [year, month] = period.split('-')
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    }
    return period
  }

  const getBalanceColor = (balance: number) => {
    if (balance < 0) return 'text-red-600'
    if (balance < 10000) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getNetFlowColor = (netFlow: number) => {
    if (netFlow > 0) return 'text-green-600'
    if (netFlow < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const exportToCSV = () => {
    if (!projectionData || !projectionData.summary.length) return
    
    const headers = ['Period', 'Income', 'Expenses', 'Net Flow', 'Running Balance']
    const rows = projectionData.summary.map(item => [
      formatPeriod(item.period, currentView),
      item.income.toFixed(2),
      item.expenses.toFixed(2),
      item.net_flow.toFixed(2),
      item.running_balance.toFixed(2)
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `cash-flow-projections-${currentView}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToJSON = () => {
    if (!projectionData) return
    
    const exportData = {
      company: selectedCompany?.name,
      view: currentView,
      exported_at: new Date().toISOString(),
      date_range: {
        start: projectionData.start_date,
        end: projectionData.end_date
      },
      summary: projectionData.summary,
      totals: {
        total_income: projectionData.summary.reduce((sum, item) => sum + item.income, 0),
        total_expenses: projectionData.summary.reduce((sum, item) => sum + item.expenses, 0),
        net_flow: projectionData.summary.reduce((sum, item) => sum + item.net_flow, 0),
        final_balance: projectionData.summary[projectionData.summary.length - 1]?.running_balance || 0
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `cash-flow-projections-${currentView}-${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = async () => {
    if (!projectionData || !projectionData.summary.length) return
    
    try {
      // Create a new jsPDF instance
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20
      
      // Add title
      pdf.setFontSize(20)
      pdf.setTextColor(0, 0, 0)
      pdf.text('Cash Flow Projections Report', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15
      
      // Add company and date info
      pdf.setFontSize(12)
      pdf.text(`Company: ${selectedCompany?.name}`, 20, yPosition)
      yPosition += 7
      pdf.text(`View: ${currentView.charAt(0).toUpperCase() + currentView.slice(1)}`, 20, yPosition)
      yPosition += 7
      pdf.text(`Period: ${new Date(projectionData.start_date).toLocaleDateString()} - ${new Date(projectionData.end_date).toLocaleDateString()}`, 20, yPosition)
      yPosition += 7
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition)
      yPosition += 15
      
      // Add summary totals
      pdf.setFontSize(14)
      pdf.text('Summary', 20, yPosition)
      yPosition += 10
      
      pdf.setFontSize(11)
      const totalIncome = projectionData.summary.reduce((sum, item) => sum + item.income, 0)
      const totalExpenses = projectionData.summary.reduce((sum, item) => sum + item.expenses, 0)
      const netFlow = totalIncome - totalExpenses
      const finalBalance = projectionData.summary[projectionData.summary.length - 1]?.running_balance || 0
      
      pdf.text(`Total Projected Income: ${formatCurrency(totalIncome)}`, 20, yPosition)
      yPosition += 7
      pdf.text(`Total Projected Expenses: ${formatCurrency(totalExpenses)}`, 20, yPosition)
      yPosition += 7
      pdf.text(`Net Projected Flow: ${formatCurrency(netFlow)}`, 20, yPosition)
      yPosition += 7
      pdf.text(`Final Balance: ${formatCurrency(finalBalance)}`, 20, yPosition)
      yPosition += 15
      
      // Capture the chart
      const chartElement = document.querySelector('canvas') as HTMLCanvasElement
      if (chartElement) {
        const chartCanvas = await html2canvas(chartElement, {
          backgroundColor: 'white',
          scale: 2
        })
        
        const chartImgData = chartCanvas.toDataURL('image/png')
        const chartWidth = pageWidth - 40
        const chartHeight = (chartCanvas.height * chartWidth) / chartCanvas.width
        
        // Check if we need a new page for the chart
        if (yPosition + chartHeight > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        
        pdf.addImage(chartImgData, 'PNG', 20, yPosition, chartWidth, chartHeight)
        yPosition += chartHeight + 15
      }
      
      // Add data table
      if (yPosition + 50 > pageHeight) {
        pdf.addPage()
        yPosition = 20
      }
      
      pdf.setFontSize(14)
      pdf.text('Detailed Projections', 20, yPosition)
      yPosition += 10
      
      // Table headers
      pdf.setFontSize(10)
      const colWidths = [40, 30, 30, 30, 35]
      const headers = ['Period', 'Income', 'Expenses', 'Net Flow', 'Running Balance']
      let xPosition = 20
      
      pdf.setFillColor(240, 240, 240)
      pdf.rect(20, yPosition - 5, pageWidth - 40, 8, 'F')
      
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition)
        xPosition += colWidths[index]
      })
      yPosition += 10
      
      // Table rows
      projectionData.summary.forEach((item, index) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        
        xPosition = 20
        const rowData = [
          formatPeriod(item.period, currentView),
          formatCurrency(item.income),
          formatCurrency(item.expenses),
          formatCurrency(item.net_flow),
          formatCurrency(item.running_balance)
        ]
        
        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250)
          pdf.rect(20, yPosition - 5, pageWidth - 40, 8, 'F')
        }
        
        rowData.forEach((data, colIndex) => {
          pdf.text(data, xPosition, yPosition)
          xPosition += colWidths[colIndex]
        })
        yPosition += 8
      })
      
      // Save the PDF
      pdf.save(`cash-flow-projections-${currentView}-${new Date().toISOString().split('T')[0]}.pdf`)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      setError('Failed to generate PDF report')
    }
  }

  const getChartData = () => {
    if (!projectionData || !projectionData.summary.length) return null
    
    const labels = projectionData.summary.map(item => formatPeriod(item.period, currentView))
    const runningBalanceData = projectionData.summary.map(item => item.running_balance)
    const incomeData = projectionData.summary.map(item => item.income)
    const expenseData = projectionData.summary.map(item => item.expenses) // Show as positive values
    
    return {
      labels,
      datasets: [
        {
          label: 'Running Balance',
          data: runningBalanceData,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: false,
          tension: 0.2,
          pointBackgroundColor: 'rgb(99, 102, 241)',
          pointBorderColor: 'rgb(99, 102, 241)',
        },
        {
          label: 'Income',
          data: incomeData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          tension: 0.2,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: 'rgb(34, 197, 94)',
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.2,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: 'rgb(239, 68, 68)',
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Cash Flow Projections - ${currentView.charAt(0).toUpperCase() + currentView.slice(1)} View`,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y
            return `${context.dataset.label}: ${formatCurrency(value)}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value)
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
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
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
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
          <h1 className="text-xl font-semibold text-gray-900">Cash Flow Projections</h1>
          <p className="mt-2 text-sm text-gray-700">
            View projected cash flows for {selectedCompany.name} based on your recurring income and expense patterns.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div className="flex space-x-3">
            {projectionData && projectionData.summary.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <ArrowDownTrayIcon className="-ml-1 mr-1 h-4 w-4" aria-hidden="true" />
                  CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <ArrowDownTrayIcon className="-ml-1 mr-1 h-4 w-4" aria-hidden="true" />
                  JSON
                </button>
                <button
                  onClick={exportToPDF}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <ArrowDownTrayIcon className="-ml-1 mr-1 h-4 w-4" aria-hidden="true" />
                  PDF
                </button>
              </div>
            )}
            <button
              onClick={() => {
                const today = new Date()
                reset({
                  start_date: today.toISOString().split('T')[0],
                  end_date: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0],
                  starting_balance: 0
                })
                setShowGenerateModal(true)
              }}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Generate Projections
            </button>
          </div>
        </div>
      </div>

      {/* View Selector and Date Range */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">View Options</h3>
              <p className="text-sm text-gray-500">Choose how you want to view your cash flow projections</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <select
                value={currentView}
                onChange={(e) => setCurrentView(e.target.value as ViewType)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {viewOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                value={viewStartDate}
                onChange={(e) => setViewStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                value={viewEndDate}
                onChange={(e) => setViewEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <button
                onClick={loadProjections}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Refresh View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {projectionData && projectionData.summary.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowUpIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Projected Income</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(projectionData.summary.reduce((sum, item) => sum + item.income, 0))}
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
                  <ArrowDownIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Projected Expenses</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(projectionData.summary.reduce((sum, item) => sum + item.expenses, 0))}
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
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Net Projected Flow</dt>
                    <dd className={`text-lg font-medium ${getNetFlowColor(projectionData.summary.reduce((sum, item) => sum + item.net_flow, 0))}`}>
                      {formatCurrency(projectionData.summary.reduce((sum, item) => sum + item.net_flow, 0))}
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
                  <CurrencyDollarIcon className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Final Balance</dt>
                    <dd className={`text-lg font-medium ${getBalanceColor(projectionData.summary[projectionData.summary.length - 1]?.running_balance || 0)}`}>
                      {formatCurrency(projectionData.summary[projectionData.summary.length - 1]?.running_balance || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Chart */}
      {projectionData && projectionData.summary.length > 0 && getChartData() && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <div className="h-96">
            <Line data={getChartData()!} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Projections Table */}
      <div className="mt-6 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Income
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expenses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Flow
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Running Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Loading projections...
                      </td>
                    </tr>
                  ) : projectionData && projectionData.summary.length > 0 ? (
                    projectionData.summary.map((item, index) => (
                      <tr key={index} className={item.running_balance < 0 ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatPeriod(item.period, currentView)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          +{formatCurrency(item.income)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          -{formatCurrency(item.expenses)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getNetFlowColor(item.net_flow)}`}>
                          {item.net_flow >= 0 ? '+' : ''}{formatCurrency(item.net_flow)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getBalanceColor(item.running_balance)}`}>
                          {formatCurrency(item.running_balance)}
                          {item.running_balance < 0 && (
                            <ExclamationTriangleIcon className="inline ml-1 h-4 w-4 text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        <div className="flex flex-col items-center py-8">
                          <InformationCircleIcon className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projections Available</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Generate projections to see your cash flow forecast based on recurring patterns.
                          </p>
                          <button
                            onClick={() => setShowGenerateModal(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            <PlayIcon className="-ml-1 mr-2 h-4 w-4" />
                            Generate Projections
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Period Information */}
      {projectionData && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Projection Period</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Showing {currentView} projections from {new Date(projectionData.start_date).toLocaleDateString()} 
                  to {new Date(projectionData.end_date).toLocaleDateString()}
                </p>
                <p className="mt-1">
                  Based on {currentView === 'yearly' ? 'yearly' : currentView} view with running balance calculations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Projections Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Cash Flow Projections</h3>
              <form onSubmit={handleSubmit(generateProjections)} className="space-y-4">
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
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    {...register('end_date', { required: 'End date is required' })}
                    type="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.end_date)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Starting Balance</label>
                  <input
                    {...register('starting_balance', { 
                      valueAsNumber: true,
                      required: 'Starting balance is required' 
                    })}
                    type="number"
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="0.00"
                  />
                  {errors.starting_balance && (
                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.starting_balance)}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Current cash balance to start projections from</p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGenerateModal(false)
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
                    Generate
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