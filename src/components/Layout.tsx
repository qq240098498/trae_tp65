import { NavLink, Outlet } from 'react-router-dom'
import {
  Home,
  ClipboardList,
  Wrench,
  PackageCheck,
  CheckCircle,
  Package,
  Smartphone,
  Search,
} from 'lucide-react'
import { cn } from '../lib/utils'

interface MenuItem {
  path: string
  label: string
  icon: React.ElementType
}

const menuItems: MenuItem[] = [
  { path: '/', label: '工作台', icon: Home },
  { path: '/checkin', label: '接机登记', icon: ClipboardList },
  { path: '/repairs/pending', label: '待修', icon: ClipboardList },
  { path: '/repairs/repairing', label: '维修中', icon: Wrench },
  { path: '/repairs/ready', label: '待取机', icon: PackageCheck },
  { path: '/repairs/completed', label: '已完成', icon: CheckCircle },
  { path: '/inventory', label: '库存管理', icon: Package },
  { path: '/imei', label: '串号管理', icon: Search },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-base">
            手机维修管理系统
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
