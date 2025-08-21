import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  BuildingOfficeIcon, 
  UserGroupIcon, 
  BanknotesIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Companies', href: '/companies', icon: BuildingOfficeIcon },
  { name: 'Bank Accounts', href: '/bank-accounts', icon: BuildingLibraryIcon },
  { name: 'Customers', href: '/customers', icon: UserGroupIcon },
  { name: 'Expense Categories', href: '/expense-categories', icon: TagIcon },
  { name: 'Recurring Income', href: '/recurring-income', icon: ArrowTrendingUpIcon },
  { name: 'Recurring Expenses', href: '/recurring-expenses', icon: ArrowTrendingDownIcon },
  { name: 'Projections', href: '/projections', icon: CalendarDaysIcon },
  { name: 'One-off Items', href: '/one-off-items', icon: ClipboardDocumentListIcon },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-gray-800">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isCurrent = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    isCurrent
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isCurrent ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}