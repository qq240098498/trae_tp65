import React, { useState, useEffect, useMemo } from 'react'
import { Search, Eye, Edit2, Plus, Trash2, ChevronDown, Camera, Package, Wrench, Clock, User, Phone, Smartphone, AlertCircle, Check } from 'lucide-react'
import { useAppStore } from '../store'
import { statusColors, statusLabels, type Repair, type RepairStatus, type RepairService, type RepairPart } from '../types'
import Modal from '../components/Modal'
import { cn } from '../lib/utils'

interface SelectedService {
  repair_item_id: number
  name: string
  price: number
}

interface SelectedPart {
  part_id: number
  name: string
  sku: string
  quantity: number
  price: number
  stock: number
}

interface RepairListProps {
  defaultStatus?: RepairStatus | 'all'
  pageTitle?: string
}

export default function RepairList({ defaultStatus = 'all', pageTitle = '维修管理' }: RepairListProps) {
  const {
    repairs,
    parts,
    repairItems,
    loading,
    fetchRepairs,
    fetchParts,
    fetchRepairItems,
    addRepairServices,
    addRepairParts,
    updateRepairStatus,
  } = useAppStore()

  const [activeFilter, setActiveFilter] = useState<RepairStatus | 'all'>(defaultStatus)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<RepairStatus>('pending')
  const [statusRemark, setStatusRemark] = useState('')

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([])
  const [isAddingService, setIsAddingService] = useState(false)
  const [isAddingPart, setIsAddingPart] = useState(false)
  const [customServiceName, setCustomServiceName] = useState('')
  const [customServicePrice, setCustomServicePrice] = useState('')

  useEffect(() => {
    fetchRepairs()
    fetchParts()
    fetchRepairItems()
  }, [fetchRepairs, fetchParts, fetchRepairItems])

  const filteredRepairs = useMemo(() => {
    return repairs.filter((repair) => {
      const matchStatus = activeFilter === 'all' || repair.status === activeFilter
      const keyword = searchKeyword.toLowerCase()
      const matchSearch =
        !searchKeyword ||
        repair.customer_name.toLowerCase().includes(keyword) ||
        repair.customer_phone.includes(keyword) ||
        (repair.imei && repair.imei.includes(keyword))
      return matchStatus && matchSearch
    })
  }, [repairs, activeFilter, searchKeyword])

  const openDetailModal = (repair: Repair) => {
    setSelectedRepair(repair)
    setSelectedServices(repair.services?.map(s => ({
      repair_item_id: s.repair_item_id,
      name: s.name || '',
      price: s.price,
    })) || [])
    setSelectedParts(repair.parts?.map(p => ({
      part_id: p.part_id,
      name: p.name || '',
      sku: p.sku || '',
      quantity: p.quantity,
      price: p.price,
      stock: 0,
    })) || [])
    setIsDetailModalOpen(true)
  }

  const openStatusModal = (repair: Repair) => {
    setSelectedRepair(repair)
    setNewStatus(repair.status)
    setStatusRemark('')
    setIsStatusModalOpen(true)
  }

  const handleStatusChange = async () => {
    if (!selectedRepair) return
    try {
      await updateRepairStatus(selectedRepair.id, newStatus, statusRemark)
      setIsStatusModalOpen(false)
      setSelectedRepair(null)
    } catch (error) {
      console.error('状态更新失败:', error)
    }
  }

  const handleAddService = (item: typeof repairItems[0]) => {
    const exists = selectedServices.find(s => s.repair_item_id === item.id)
    if (!exists) {
      setSelectedServices([...selectedServices, {
        repair_item_id: item.id,
        name: item.name,
        price: item.default_price,
      }])
    }
    setIsAddingService(false)
  }

  const handleAddCustomService = () => {
    if (!customServiceName.trim() || !customServicePrice) return
    const price = parseFloat(customServicePrice)
    if (isNaN(price)) return
    setSelectedServices([...selectedServices, {
      repair_item_id: 0,
      name: customServiceName.trim(),
      price,
    }])
    setCustomServiceName('')
    setCustomServicePrice('')
    setIsAddingService(false)
  }

  const handleRemoveService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index))
  }

  const handleUpdateServicePrice = (index: number, price: string) => {
    const newPrice = parseFloat(price) || 0
    const updated = [...selectedServices]
    updated[index].price = newPrice
    setSelectedServices(updated)
  }

  const handleAddPart = (part: typeof parts[0]) => {
    const exists = selectedParts.find(p => p.part_id === part.id)
    if (!exists) {
      setSelectedParts([...selectedParts, {
        part_id: part.id,
        name: part.name,
        sku: part.sku,
        quantity: 1,
        price: part.price,
        stock: part.stock,
      }])
    }
    setIsAddingPart(false)
  }

  const handleRemovePart = (index: number) => {
    setSelectedParts(selectedParts.filter((_, i) => i !== index))
  }

  const handleUpdatePartQuantity = (index: number, quantity: string) => {
    const newQty = parseInt(quantity) || 0
    const updated = [...selectedParts]
    updated[index].quantity = newQty
    setSelectedParts(updated)
  }

  const handleUpdatePartPrice = (index: number, price: string) => {
    const newPrice = parseFloat(price) || 0
    const updated = [...selectedParts]
    updated[index].price = newPrice
    setSelectedParts(updated)
  }

  const saveServices = async () => {
    if (!selectedRepair) return
    try {
      await addRepairServices(selectedRepair.id, selectedServices.map(s => ({
        repair_item_id: s.repair_item_id,
        name: s.name,
        price: s.price,
      })))
      alert('维修项目保存成功')
    } catch (error) {
      console.error('保存维修项目失败:', error)
    }
  }

  const saveParts = async () => {
    if (!selectedRepair) return
    try {
      await addRepairParts(selectedRepair.id, selectedParts.map(p => ({
        part_id: p.part_id,
        quantity: p.quantity,
        price: p.price,
      })))
      alert('配件保存成功')
    } catch (error) {
      console.error('保存配件失败:', error)
    }
  }

  const calculateTotal = () => {
    const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0)
    const partsTotal = selectedParts.reduce((sum, p) => sum + p.price * p.quantity, 0)
    return servicesTotal + partsTotal
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const filters: Array<{ key: RepairStatus | 'all'; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待修' },
    { key: 'repairing', label: '维修中' },
    { key: 'ready', label: '待取' },
    { key: 'picked', label: '已取' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
        <p className="text-gray-500">管理维修订单</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索客户姓名、电话或IMEI..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium transition-all',
                    activeFilter === filter.key
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户信息</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机信息</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登记时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : filteredRepairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="mx-auto mb-2 text-gray-400" size={40} />
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredRepairs.map((repair) => (
                  <tr key={repair.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">#{repair.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{repair.customer_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone size={12} />
                            {repair.customer_phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Smartphone size={16} className="text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{repair.brand} {repair.model}</div>
                          {repair.imei && (
                            <div className="text-sm text-gray-500">IMEI: {repair.imei}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        statusColors[repair.status]
                      )}>
                        {statusLabels[repair.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">¥{repair.total_price.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(repair.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetailModal(repair)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={14} />
                          查看详情
                        </button>
                        <button
                          onClick={() => openStatusModal(repair)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <Edit2 size={14} />
                          状态变更
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

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedRepair(null)
        }}
        title={`维修单详情 #${selectedRepair?.id}`}
        size="xl"
      >
        {selectedRepair && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User size={18} className="text-blue-500" />
                  客户信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">姓名：</span>
                    <span className="font-medium">{selectedRepair.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">电话：</span>
                    <span className="font-medium">{selectedRepair.customer_phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Smartphone size={18} className="text-green-500" />
                  手机信息
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">品牌型号：</span>
                    <span className="font-medium">{selectedRepair.brand} {selectedRepair.model}</span>
                  </div>
                  {selectedRepair.imei && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">IMEI：</span>
                      <span className="font-medium font-mono">{selectedRepair.imei}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle size={18} className="text-orange-500" />
                  故障描述
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRepair.fault_description}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Check size={18} className="text-purple-500" />
                  外观检查
                </h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRepair.appearance_check || '无'}</p>
              </div>
            </div>

            {selectedRepair.photos && selectedRepair.photos.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Camera size={18} className="text-pink-500" />
                  照片预览
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedRepair.photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.photo_data}
                        alt={`维修照片 ${photo.id}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {photo.photo_type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Wrench size={18} className="text-blue-500" />
                  维修项目
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsAddingService(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={14} />
                    添加项目
                  </button>
                  <button
                    onClick={saveServices}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Check size={14} />
                    保存
                  </button>
                </div>
              </div>

              {isAddingService && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">选择维修项目</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {repairItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleAddService(item)}
                          className="p-2 text-left text-sm bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-gray-500">¥{item.default_price}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">自定义项目</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="项目名称"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="价格"
                        value={customServicePrice}
                        onChange={(e) => setCustomServicePrice(e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleAddCustomService}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddingService(false)}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {selectedServices.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">暂无维修项目</div>
                ) : (
                  selectedServices.map((service, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <Wrench size={16} className="text-gray-400" />
                      <span className="flex-1 font-medium">{service.name}</span>
                      <input
                        type="number"
                        value={service.price}
                        onChange={(e) => handleUpdateServicePrice(index, e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-500">元</span>
                      <button
                        onClick={() => handleRemoveService(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package size={18} className="text-green-500" />
                  使用配件
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsAddingPart(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Plus size={14} />
                    添加配件
                  </button>
                  <button
                    onClick={saveParts}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Check size={14} />
                    保存
                  </button>
                </div>
              </div>

              {isAddingPart && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">选择配件</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {parts
                      .filter(p => p.stock > 0)
                      .map((part) => (
                        <button
                          key={part.id}
                          onClick={() => handleAddPart(part)}
                          className="p-3 text-left bg-gray-50 hover:bg-green-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{part.name}</div>
                              <div className="text-xs text-gray-500">{part.brand} {part.model} | {part.sku}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">¥{part.price}</div>
                              <div className="text-xs text-gray-500">库存: {part.stock}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                  <button
                    onClick={() => setIsAddingPart(false)}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                  >
                    取消
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {selectedParts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">暂无使用配件</div>
                ) : (
                  selectedParts.map((part, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      <Package size={16} className="text-gray-400" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{part.name}</div>
                        <div className="text-xs text-gray-500">{part.sku} | 库存: {part.stock}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max={part.stock}
                          value={part.quantity}
                          onChange={(e) => handleUpdatePartQuantity(index, e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-gray-500">×</span>
                        <input
                          type="number"
                          value={part.price}
                          onChange={(e) => handleUpdatePartPrice(index, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-gray-500">元</span>
                        <span className="w-20 text-right font-semibold">¥{(part.price * part.quantity).toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => handleRemovePart(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">合计金额</span>
                <span className="text-2xl font-bold text-blue-600">¥{calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {selectedRepair.logs && selectedRepair.logs.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-gray-500" />
                  状态变更日志
                </h4>
                <div className="space-y-3">
                  {selectedRepair.logs.map((log, index) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                        )} />
                        {index < selectedRepair.logs!.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            statusColors[log.status as RepairStatus] || 'bg-gray-100 text-gray-800'
                          )}>
                            {statusLabels[log.status as RepairStatus] || log.status}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                        </div>
                        {log.remark && (
                          <p className="mt-1 text-sm text-gray-600">{log.remark}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false)
          setSelectedRepair(null)
        }}
        title="状态变更"
        size="md"
        footer={
          <>
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleStatusChange}
              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              确认变更
            </button>
          </>
        }
      >
        {selectedRepair && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">当前单号</div>
              <div className="font-semibold">#{selectedRepair.id} - {selectedRepair.customer_name}</div>
              <div className="mt-2">
                <span className="text-sm text-gray-500">当前状态：</span>
                <span className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-1',
                  statusColors[selectedRepair.status]
                )}>
                  {statusLabels[selectedRepair.status]}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">变更状态</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(statusLabels) as RepairStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setNewStatus(status)}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all text-left',
                      newStatus === status
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      statusColors[status]
                    )}>
                      {statusLabels[status]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">备注（可选）</label>
              <textarea
                value={statusRemark}
                onChange={(e) => setStatusRemark(e.target.value)}
                placeholder="请输入状态变更备注..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
