import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Transaction } from '../types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface CashFlowChartProps {
  transactions: Transaction[]
}

export default function CashFlowChart({ transactions }: CashFlowChartProps) {
  const processData = () => {
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    )

    const monthlyData: { [key: string]: { income: number; expenses: number; balance: number } } = {}
    let runningBalance = 0

    sortedTransactions.forEach(transaction => {
      const date = new Date(transaction.transaction_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0, balance: runningBalance }
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount
        runningBalance += transaction.amount
      } else {
        monthlyData[monthKey].expenses += transaction.amount
        runningBalance -= transaction.amount
      }
      
      monthlyData[monthKey].balance = runningBalance
    })

    const labels = Object.keys(monthlyData).slice(-6)
    const incomeData = labels.map(key => monthlyData[key]?.income || 0)
    const expenseData = labels.map(key => monthlyData[key]?.expenses || 0)
    const balanceData = labels.map(key => monthlyData[key]?.balance || 0)

    return {
      labels: labels.map(label => {
        const [year, month] = label.split('-')
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })
      }),
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          tension: 0.1,
        },
        {
          label: 'Balance',
          data: balanceData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.1,
        },
      ],
    }
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Cash Flow Trend (Last 6 Months)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toFixed(0)
          }
        }
      },
    },
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cash Flow Trend</h3>
        <div className="text-center text-gray-500 py-8">
          No transaction data available to display chart
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <Line data={processData()} options={options} />
    </div>
  )
}