import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Wrench,
  PackageCheck,
  DollarSign,
  Eye,
} from 'lucide-react'
import { useAppStore } from '../store'
import { statusLabels, statusColors } from '../types'
import { cn } from '../lib/utils'

interface StatCardProps {
  icon: React.ElementType
  value: number | string
  label: string
  color: string
  bgColor: string
}

function StatCard({ icon: Icon, value, label, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { stats, repairs, loading, fetchStats, fetchRepairs } = useAppStore()

  useEffect(() => {
    fetchStats()
    fetchRepairs()
  }, [fetchStats, fetchRepairs])

  const recentRepairs = repairs.slice(0, 8)

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (value: number) => {
    return `¥${value.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作台</h1>
          <p className="text-gray-500 text-sm mt-1">
            欢迎使用手机维修管理系统
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardList}
          value={stats?.pending ?? 0}
          label="待修"
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <StatCard
          icon={Wrench}
          value={stats?.repairing ?? 0}
          label="维修中"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={PackageCheck}
          value={stats?.ready ?? 0}
          label="待取"
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={DollarSign}
          value={formatCurrency(stats?.todayRevenue ?? 0)}
          label="今日营收"
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">最近维修单</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : recentRepairs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无维修单</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    单号
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    客户
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    手机
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金额
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登记时间
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRepairs.map((repair) => (
                  <tr key={repair.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      #{repair.id.toString().padStart(4, '0')}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      <div>{repair.customer_name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {repair.customer_phone}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {repair.brand} {repair.model}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          statusColors[repair.status]
                        )}
                      >
                        {statusLabels[repair.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900 font-medium">
                      {formatCurrency(repair.total_price)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {formatTime(repair.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/repairs/${repair.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
