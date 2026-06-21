import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Phone,
  Smartphone,
  AlertCircle,
  Check,
  Camera,
  Wrench,
  Package,
  Clock,
  Plus,
  Trash2,
  Edit2,
  PenTool,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '../store'
import {
  statusColors,
  statusLabels,
  type Repair,
  type RepairStatus,
} from '../types'
import Modal from '../components/Modal'
import { cn } from '../lib/utils'
import { repairApi } from '../lib/api'

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

export default function RepairDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    parts,
    repairItems,
    fetchParts,
    fetchRepairItems,
    addRepairServices,
    addRepairParts,
    updateRepairStatus,
  } = useAppStore()

  const [repair, setRepair] = useState<Repair | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([])

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [isPartModalOpen, setIsPartModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string>('')

  const [newStatus, setNewStatus] = useState<RepairStatus>('pending')
  const [statusRemark, setStatusRemark] = useState('')

  const [customServiceName, setCustomServiceName] = useState('')
  const [customServicePrice, setCustomServicePrice] = useState('')

  const [isSavingServices, setIsSavingServices] = useState(false)
  const [isSavingParts, setIsSavingParts] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchParts()
    fetchRepairItems()
  }, [fetchParts, fetchRepairItems])

  useEffect(() => {
    const fetchRepairDetail = async () => {
      if (!id) return
      try {
        setLoading(true)
        setError(null)
        const data = await repairApi.get(parseInt(id))
        setRepair(data)
        setSelectedServices(
          data.services?.map((s) => ({
            repair_item_id: s.repair_item_id,
            name: s.name || '',
            price: s.price,
          })) || []
        )
        setSelectedParts(
          data.parts?.map((p) => ({
            part_id: p.part_id,
            name: p.name || '',
            sku: p.sku || '',
            quantity: p.quantity,
            price: p.price,
            stock: 0,
          })) || []
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取维修单详情失败')
      } finally {
        setLoading(false)
      }
    }

    fetchRepairDetail()
  }, [id])

  const totalAmount = useMemo(() => {
    const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0)
    const partsTotal = selectedParts.reduce((sum, p) => sum + p.price * p.quantity, 0)
    return servicesTotal + partsTotal
  }, [selectedServices, selectedParts])

  const nextStatus = useMemo(() => {
    if (!repair) return null
    const statusFlow: RepairStatus[] = ['pending', 'repairing', 'ready', 'picked']
    const currentIndex = statusFlow.indexOf(repair.status)
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1]
    }
    return null
  }, [repair])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const handleAddService = (item: typeof repairItems[0]) => {
    const exists = selectedServices.find((s) => s.repair_item_id === item.id)
    if (!exists) {
      setSelectedServices([
        ...selectedServices,
        {
          repair_item_id: item.id,
          name: item.name,
          price: item.default_price,
        },
      ])
    }
  }

  const handleAddCustomService = () => {
    if (!customServiceName.trim() || !customServicePrice) return
    const price = parseFloat(customServicePrice)
    if (isNaN(price)) return
    setSelectedServices([
      ...selectedServices,
      {
        repair_item_id: 0,
        name: customServiceName.trim(),
        price,
      },
    ])
    setCustomServiceName('')
    setCustomServicePrice('')
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
    const exists = selectedParts.find((p) => p.part_id === part.id)
    if (!exists) {
      setSelectedParts([
        ...selectedParts,
        {
          part_id: part.id,
          name: part.name,
          sku: part.sku,
          quantity: 1,
          price: part.price,
          stock: part.stock,
        },
      ])
    }
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
    if (!repair) return
    try {
      setIsSavingServices(true)
      await addRepairServices(
        repair.id,
        selectedServices.map((s) => ({
          repair_item_id: s.repair_item_id,
          price: s.price,
        }))
      )
      const updated = await repairApi.get(repair.id)
      setRepair(updated)
      alert('维修项目保存成功')
    } catch (error) {
      console.error('保存维修项目失败:', error)
      alert(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsSavingServices(false)
    }
  }

  const saveParts = async () => {
    if (!repair) return
    try {
      setIsSavingParts(true)
      await addRepairParts(
        repair.id,
        selectedParts.map((p) => ({
          part_id: p.part_id,
          quantity: p.quantity,
          price: p.price,
        }))
      )
      const updated = await repairApi.get(repair.id)
      setRepair(updated)
      alert('配件保存成功')
    } catch (error) {
      console.error('保存配件失败:', error)
      alert(error instanceof Error ? error.message : '保存失败')
    } finally {
      setIsSavingParts(false)
    }
  }

  const openStatusModal = () => {
    if (!repair) return
    setNewStatus(repair.status)
    setStatusRemark('')
    setIsStatusModalOpen(true)
  }

  const handleQuickStatusChange = async () => {
    if (!repair || !nextStatus) return
    try {
      setIsUpdatingStatus(true)
      await updateRepairStatus(repair.id, nextStatus)
      const updated = await repairApi.get(repair.id)
      setRepair(updated)
    } catch (error) {
      console.error('状态更新失败:', error)
      alert(error instanceof Error ? error.message : '状态更新失败')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleStatusChange = async () => {
    if (!repair) return
    try {
      setIsUpdatingStatus(true)
      await updateRepairStatus(repair.id, newStatus, statusRemark)
      const updated = await repairApi.get(repair.id)
      setRepair(updated)
      setIsStatusModalOpen(false)
    } catch (error) {
      console.error('状态更新失败:', error)
      alert(error instanceof Error ? error.message : '状态更新失败')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const openPhotoPreview = (photoData: string) => {
    setSelectedPhoto(photoData)
    setIsPhotoModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-500" />
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !repair) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-4 text-gray-900 font-medium">{error || '维修单不存在'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft size={16} />
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            返回
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                维修单详情 #{repair.id}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                创建于 {formatDate(repair.created_at)}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex w-fit items-center px-3 py-1.5 rounded-full text-sm font-medium',
                statusColors[repair.status]
              )}
            >
              {statusLabels[repair.status]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} className="text-blue-500" />
              客户信息
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <User size={16} />
                  姓名
                </span>
                <span className="font-medium text-gray-900">{repair.customer_name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <Phone size={16} />
                  电话
                </span>
                <span className="font-medium text-gray-900">{repair.customer_phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Smartphone size={20} className="text-green-500" />
              手机信息
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">品牌型号</span>
                <span className="font-medium text-gray-900">
                  {repair.brand} {repair.model}
                </span>
              </div>
              {repair.imei && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">IMEI</span>
                  <span className="font-medium text-gray-900 font-mono">
                    {repair.imei}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-500" />
              故障描述
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {repair.fault_description}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Check size={20} className="text-purple-500" />
              外观检查
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {repair.appearance_check || '无'}
            </p>
          </div>
        </div>

        {repair.photos && repair.photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera size={20} className="text-pink-500" />
              外观照片
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {repair.photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => openPhotoPreview(photo.photo_data)}
                  className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-200 hover:border-blue-400 transition-all"
                >
                  <img
                    src={photo.photo_data}
                    alt={`维修照片 ${photo.id}`}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {photo.photo_type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wrench size={20} className="text-blue-500" />
              维修项目
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsServiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus size={16} />
                添加项目
              </button>
              <button
                onClick={saveServices}
                disabled={isSavingServices}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingServices ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                保存
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedServices.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                暂无维修项目，点击上方按钮添加
              </div>
            ) : (
              selectedServices.map((service, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <Wrench size={18} className="text-gray-400 hidden sm:block" />
                  <span className="flex-1 font-medium text-gray-900">
                    {service.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={service.price}
                      onChange={(e) => handleUpdateServicePrice(index, e.target.value)}
                      className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-gray-500">元</span>
                    <button
                      onClick={() => handleRemoveService(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package size={20} className="text-green-500" />
              使用配件
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPartModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus size={16} />
                添加配件
              </button>
              <button
                onClick={saveParts}
                disabled={isSavingParts}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingParts ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                保存
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedParts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                暂无使用配件，点击上方按钮添加
              </div>
            ) : (
              selectedParts.map((part, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <Package size={18} className="text-gray-400 hidden sm:block" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {part.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {part.sku} | 库存: {part.stock}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={part.stock || undefined}
                      value={part.quantity}
                      onChange={(e) => handleUpdatePartQuantity(index, e.target.value)}
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <span className="text-gray-400">×</span>
                    <input
                      type="number"
                      value={part.price}
                      onChange={(e) => handleUpdatePartPrice(index, e.target.value)}
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <span className="text-gray-500">元</span>
                    <span className="w-24 text-right font-semibold text-gray-900">
                      ¥{(part.price * part.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemovePart(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {repair.signature && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PenTool size={20} className="text-indigo-500" />
              签字信息
            </h3>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <img
                src={repair.signature.signature_data}
                alt="客户签字"
                className="max-h-32 mx-auto"
              />
              <div className="mt-3 text-center text-sm text-gray-500">
                {repair.signature.signer_name && (
                  <div>签名人：{repair.signature.signer_name}</div>
                )}
                <div>签字时间：{formatDate(repair.signature.created_at)}</div>
              </div>
            </div>
          </div>
        )}

        {repair.logs && repair.logs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              状态变更日志
            </h3>
            <div className="relative pl-6">
              {repair.logs.map((log, index) => (
                <div key={log.id} className="relative pb-6 last:pb-0">
                  {index < repair.logs!.length - 1 && (
                    <div className="absolute left-[-1.25rem] top-6 bottom-0 w-0.5 bg-gray-200" />
                  )}
                  <div className="absolute left-[-1.25rem] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                  <div className="bg-gray-50 rounded-lg p-4 ml-2">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          statusColors[log.status as RepairStatus] ||
                            'bg-gray-100 text-gray-800'
                        )}
                      >
                        {statusLabels[log.status as RepairStatus] || log.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    {log.remark && (
                      <p className="text-sm text-gray-600">{log.remark}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 -mx-4 sm:mx-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-500">合计金额</div>
              <div className="text-3xl font-bold text-blue-600">
                ¥{totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openStatusModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 size={16} />
                状态变更
              </button>
              {nextStatus && (
                <button
                  onClick={handleQuickStatusChange}
                  disabled={isUpdatingStatus}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isUpdatingStatus ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  标记为{statusLabels[nextStatus]}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title="添加维修项目"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择维修项目
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {repairItems.map((item) => {
                const isSelected = selectedServices.some(
                  (s) => s.repair_item_id === item.id
                )
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAddService(item)}
                    disabled={isSelected}
                    className={cn(
                      'p-3 text-left rounded-lg border transition-all',
                      isSelected
                        ? 'bg-blue-50 border-blue-300 opacity-60 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.code}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-blue-600">
                        ¥{item.default_price}
                      </div>
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.description}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              自定义项目
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="项目名称"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="价格"
                value={customServicePrice}
                onChange={(e) => setCustomServicePrice(e.target.value)}
                className="w-full sm:w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddCustomService}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors font-medium"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPartModalOpen}
        onClose={() => setIsPartModalOpen(false)}
        title="添加配件"
        size="lg"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择配件（仅显示有库存）
          </label>
          <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
            {parts
              .filter((p) => p.stock > 0)
              .map((part) => {
                const isSelected = selectedParts.some(
                  (p) => p.part_id === part.id
                )
                return (
                  <button
                    key={part.id}
                    onClick={() => handleAddPart(part)}
                    disabled={isSelected}
                    className={cn(
                      'p-3 text-left rounded-lg border transition-all',
                      isSelected
                        ? 'bg-green-50 border-green-300 opacity-60 cursor-not-allowed'
                        : 'bg-gray-50 border-gray-200 hover:bg-green-50 hover:border-green-300'
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{part.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {part.brand} {part.model} | {part.sku}
                          {part.color && ` | ${part.color}`}
                          {part.capacity && ` | ${part.capacity}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-600">
                          ¥{part.price}
                        </div>
                        <div
                          className={cn(
                            'text-xs mt-0.5',
                            part.stock <= 5 ? 'text-red-500' : 'text-gray-500'
                          )}
                        >
                          库存: {part.stock}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>
          {parts.filter((p) => p.stock > 0).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              暂无可用库存
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="状态变更"
        size="md"
        footer={
          <>
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleStatusChange}
              disabled={isUpdatingStatus}
              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 size={16} className="inline animate-spin mr-2" />
                  变更中...
                </>
              ) : (
                '确认变更'
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500 mb-1">当前单号</div>
            <div className="font-semibold text-gray-900">
              #{repair.id} - {repair.customer_name}
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">当前状态：</span>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-1',
                  statusColors[repair.status]
                )}
              >
                {statusLabels[repair.status]}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              变更状态
            </label>
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
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      statusColors[status]
                    )}
                  >
                    {statusLabels[status]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注（可选）
            </label>
            <textarea
              value={statusRemark}
              onChange={(e) => setStatusRemark(e.target.value)}
              placeholder="请输入状态变更备注..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title="照片预览"
        size="xl"
      >
        <div className="flex items-center justify-center bg-gray-900 rounded-lg p-4">
          <img
            src={selectedPhoto}
            alt="照片预览"
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      </Modal>
    </div>
  )
}
