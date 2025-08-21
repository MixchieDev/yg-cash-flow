import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { Expense, ExpenseCategory } from '../types'

ChartJS.register(ArcElement, Tooltip, Legend)

interface ExpenseChartProps {
  expenses: Expense[]
  categories: ExpenseCategory[]
}

export default function ExpenseChart({ expenses, categories }: ExpenseChartProps) {
  const processData = () => {
    const categoryTotals: { [key: string]: number } = {}
    
    expenses.forEach(expense => {
      const categoryName = expense.category_id 
        ? categories.find(c => c.id === expense.category_id)?.name || 'Unknown'
        : 'Uncategorized'
      
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + expense.amount
    })

    const labels = Object.keys(categoryTotals)
    const data = Object.values(categoryTotals)
    
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
      '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
    ]

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(color => color),
          borderWidth: 1,
        },
      ],
    }
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Expenses by Category',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((sum: number, value: number) => sum + value, 0)
            const percentage = ((context.raw / total) * 100).toFixed(1)
            return `${context.label}: $${context.raw.toFixed(2)} (${percentage}%)`
          }
        }
      }
    },
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Expenses by Category</h3>
        <div className="text-center text-gray-500 py-8">
          No expense data available to display chart
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <Doughnut data={processData()} options={options} />
    </div>
  )
}