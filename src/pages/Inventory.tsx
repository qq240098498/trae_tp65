import { useEffect, useState, useMemo } from 'react'
import {
  Monitor,
  Battery,
  Package,
  Search,
  Plus,
  ArrowUpCircle,
  Edit2,
  Trash2,
  Filter,
  MonitorSmartphone,
  Zap,
  Box,
  AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '../store'
import type { Part } from '../types'
import { cn } from '../lib/utils'
import Modal from '../components/Modal'

type TabType = 'screen' | 'battery' | 'all'

interface StockInForm {
  quantity: number
  remark: string
}

interface PartForm {
  type: 'screen' | 'battery' | 'other'
  brand: string
  model: string
  color: string
  capacity: string
  name: string
  sku: string
  stock: number
  price: number
  cost: number
}

const typeIcons = {
  screen: MonitorSmartphone,
  battery: Zap,
  other: Box,
}

const typeLabels = {
  screen: '屏幕',
  battery: '电池',
  other: '其他',
}

const typeColors = {
  screen: 'text-blue-600 bg-blue-50',
  battery: 'text-green-600 bg-green-50',
  other: 'text-gray-600 bg-gray-50',
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  bgColor,
}: {
  icon: React.ElementType
  value: number | string
  label: string
  color: string
  bgColor: string
}) {
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

function getStockColor(stock: number) {
  if (stock === 0) return 'text-red-600 font-semibold'
  if (stock < 3) return 'text-orange-600 font-semibold'
  return 'text-gray-900'
}

function getSpecLabel(part: Part) {
  if (part.type === 'screen') return part.color || '-'
  if (part.type === 'battery') return part.capacity || '-'
  return '-'
}

function formatCurrency(value: number) {
  return `¥${value.toFixed(2)}`
}

export default function Inventory() {
  const { parts, loading, fetchParts, createPart, updatePart, updatePartStock, deletePart } =
    useAppStore()

  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [stockInModalOpen, setStockInModalOpen] = useState(false)
  const [partModalOpen, setPartModalOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [stockInForm, setStockInForm] = useState<StockInForm>({ quantity: 1, remark: '' })
  const [partForm, setPartForm] = useState<PartForm>({
    type: 'screen',
    brand: '',
    model: '',
    color: '',
    capacity: '',
    name: '',
    sku: '',
    stock: 0,
    price: 0,
    cost: 0,
  })

  useEffect(() => {
    fetchParts()
  }, [fetchParts])

  const uniqueBrands = useMemo(() => {
    const brands = new Set(parts.map((p) => p.brand))
    return Array.from(brands).sort()
  }, [parts])

  const filteredParts = useMemo(() => {
    let result = [...parts]

    if (activeTab !== 'all') {
      result = result.filter((p) => p.type === activeTab)
    }

    if (selectedBrand) {
      result = result.filter((p) => p.brand === selectedBrand)
    }

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.sku.toLowerCase().includes(keyword) ||
          p.brand.toLowerCase().includes(keyword) ||
          p.model.toLowerCase().includes(keyword)
      )
    }

    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      if (a.brand !== b.brand) return a.brand.localeCompare(b.brand)
      if (a.model !== b.model) return a.model.localeCompare(b.model)
      const specA = getSpecLabel(a)
      const specB = getSpecLabel(b)
      return specA.localeCompare(specB)
    })
  }, [parts, activeTab, selectedBrand, searchKeyword])

  const stats = useMemo(() => {
    const screenCount = parts.filter((p) => p.type === 'screen').reduce((sum, p) => sum + p.stock, 0)
    const batteryCount = parts
      .filter((p) => p.type === 'battery')
      .reduce((sum, p) => sum + p.stock, 0)
    const lowStockCount = parts.filter((p) => p.stock < 3).length
    return { screenCount, batteryCount, lowStockCount }
  }, [parts])

  const handleOpenStockIn = (part: Part) => {
    setSelectedPart(part)
    setStockInForm({ quantity: 1, remark: '' })
    setStockInModalOpen(true)
  }

  const handleStockIn = async () => {
    if (!selectedPart || stockInForm.quantity <= 0) return
    try {
      await updatePartStock(selectedPart.id, stockInForm.quantity, 'add')
      setStockInModalOpen(false)
      setSelectedPart(null)
    } catch (error) {
      console.error('入库失败:', error)
    }
  }

  const handleOpenAddPart = () => {
    setEditingPart(null)
    setPartForm({
      type: 'screen',
      brand: '',
      model: '',
      color: '',
      capacity: '',
      name: '',
      sku: '',
      stock: 0,
      price: 0,
      cost: 0,
    })
    setPartModalOpen(true)
  }

  const handleOpenEditPart = (part: Part) => {
    setEditingPart(part)
    setPartForm({
      type: part.type,
      brand: part.brand,
      model: part.model,
      color: part.color || '',
      capacity: part.capacity || '',
      name: part.name,
      sku: part.sku,
      stock: part.stock,
      price: part.price,
      cost: part.cost,
    })
    setPartModalOpen(true)
  }

  const handleSavePart = async () => {
    try {
      const data = {
        type: partForm.type,
        brand: partForm.brand,
        model: partForm.model,
        color: partForm.type === 'screen' ? partForm.color || null : null,
        capacity: partForm.type === 'battery' ? partForm.capacity || null : null,
        name: partForm.name,
        sku: partForm.sku,
        stock: partForm.stock,
        price: partForm.price,
        cost: partForm.cost,
      }

      if (editingPart) {
        await updatePart(editingPart.id, data)
      } else {
        await createPart(data)
      }

      setPartModalOpen(false)
      setEditingPart(null)
    } catch (error) {
      console.error('保存失败:', error)
    }
  }

  const handleDeletePart = async (part: Part) => {
    if (!window.confirm(`确定要删除 "${part.name}" 吗？`)) return
    try {
      await deletePart(part.id)
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const TypeIcon = ({ type }: { type: Part['type'] }) => {
    const Icon = typeIcons[type]
    return (
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center',
          typeColors[type]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">库存管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理屏幕、电池及其他配件库存</p>
        </div>
        <button
          onClick={handleOpenAddPart}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          新增配件
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Monitor}
          value={stats.screenCount}
          label="屏幕总数"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Battery}
          value={stats.batteryCount}
          label="电池总数"
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={AlertTriangle}
          value={stats.lowStockCount}
          label="低库存预警"
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Package className="w-4 h-4" />
              全部配件
            </button>
            <button
              onClick={() => setActiveTab('screen')}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'screen'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <MonitorSmartphone className="w-4 h-4" />
              屏幕库存
            </button>
            <button
              onClick={() => setActiveTab('battery')}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'battery'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Zap className="w-4 h-4" />
              电池库存
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索名称、SKU、品牌、型号..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white min-w-[140px]"
            >
              <option value="">全部品牌</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-500">共 {filteredParts.length} 条记录</div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">加载中...</div>
          ) : filteredParts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">暂无配件数据</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    品牌
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    型号
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    规格
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名称
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    库存数量
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    售价
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    成本
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParts.map((part) => (
                  <tr key={part.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <TypeIcon type={part.type} />
                        <span className="text-sm text-gray-600">{typeLabels[part.type]}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">{part.brand}</td>
                    <td className="px-5 py-4 text-sm text-gray-900">{part.model}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{getSpecLabel(part)}</td>
                    <td className="px-5 py-4 text-sm text-gray-900 font-medium">{part.name}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 font-mono">{part.sku}</td>
                    <td className="px-5 py-4 text-sm">
                      <span className={getStockColor(part.stock)}>{part.stock}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      {formatCurrency(part.price)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {formatCurrency(part.cost)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenStockIn(part)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="入库"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                          入库
                        </button>
                        <button
                          onClick={() => handleOpenEditPart(part)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeletePart(part)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        isOpen={stockInModalOpen}
        onClose={() => {
          setStockInModalOpen(false)
          setSelectedPart(null)
        }}
        title="入库登记"
        size="sm"
        footer={
          <>
            <button
              onClick={() => {
                setStockInModalOpen(false)
                setSelectedPart(null)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleStockIn}
              disabled={stockInForm.quantity <= 0}
              className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 rounded-lg transition-colors"
            >
              确认入库
            </button>
          </>
        }
      >
        {selectedPart && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <TypeIcon type={selectedPart.type} />
                <div>
                  <div className="font-medium text-gray-900">{selectedPart.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedPart.brand} {selectedPart.model} {getSpecLabel(selectedPart)}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-500">当前库存</div>
                <div className={cn('text-xl font-bold mt-1', getStockColor(selectedPart.stock))}>
                  {selectedPart.stock} 件
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                入库数量
              </label>
              <input
                type="number"
                min="1"
                value={stockInForm.quantity}
                onChange={(e) => setStockInForm({ ...stockInForm, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                备注 <span className="text-gray-400 font-normal">(可选)</span>
              </label>
              <textarea
                value={stockInForm.remark}
                onChange={(e) => setStockInForm({ ...stockInForm, remark: e.target.value })}
                placeholder="输入入库备注..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={partModalOpen}
        onClose={() => {
          setPartModalOpen(false)
          setEditingPart(null)
        }}
        title={editingPart ? '编辑配件' : '新增配件'}
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setPartModalOpen(false)
                setEditingPart(null)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSavePart}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {editingPart ? '保存修改' : '创建配件'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={partForm.type}
                onChange={(e) =>
                  setPartForm({ ...partForm, type: e.target.value as PartForm['type'] })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="screen">屏幕</option>
                <option value="battery">电池</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                品牌 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={partForm.brand}
                onChange={(e) => setPartForm({ ...partForm, brand: e.target.value })}
                placeholder="例如：苹果、华为"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                型号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={partForm.model}
                onChange={(e) => setPartForm({ ...partForm, model: e.target.value })}
                placeholder="例如：iPhone 15 Pro"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {partForm.type === 'screen' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  颜色 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={partForm.color}
                  onChange={(e) => setPartForm({ ...partForm, color: e.target.value })}
                  placeholder="例如：黑色、白色"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {partForm.type === 'battery' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  容量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={partForm.capacity}
                  onChange={(e) => setPartForm({ ...partForm, capacity: e.target.value })}
                  placeholder="例如：3274mAh"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={partForm.name}
                onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                placeholder="例如：iPhone 15 Pro 屏幕总成"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={partForm.sku}
                onChange={(e) => setPartForm({ ...partForm, sku: e.target.value })}
                placeholder="例如：IP15P-SCR-BLK"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                库存 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={partForm.stock}
                onChange={(e) =>
                  setPartForm({ ...partForm, stock: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                售价 (元) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={partForm.price}
                onChange={(e) =>
                  setPartForm({ ...partForm, price: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                成本 (元) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={partForm.cost}
                onChange={(e) =>
                  setPartForm({ ...partForm, cost: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
