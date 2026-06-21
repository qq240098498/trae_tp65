import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  X,
  Save,
} from 'lucide-react'
import { useAppStore } from '../store'
import { type ImeiRecord } from '../types'
import Modal from '../components/Modal'
import { cn } from '../lib/utils'

const phoneBrands = ['Apple', 'Huawei', 'Xiaomi', 'OPPO', 'vivo', 'Samsung', '其他']

interface FormData {
  imei: string
  brand: string
  model: string
  is_motherboard_repaired: boolean
  is_device_exchanged: boolean
  old_imei: string
  new_imei: string
  notes: string
}

interface FormErrors {
  imei?: string
  brand?: string
  model?: string
  old_imei?: string
  new_imei?: string
}

export default function ImeiRecords() {
  const { imeiRecords, fetchImeiRecords, createImeiRecord, updateImeiRecord, markImeiMotherboard, markImeiExchange, deleteImeiRecord } = useAppStore()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchImei, setSearchImei] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMotherboardModalOpen, setIsMotherboardModalOpen] = useState(false)
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  const [selectedRecord, setSelectedRecord] = useState<ImeiRecord | null>(null)
  const [historyData, setHistoryData] = useState<{
    history: ImeiRecord[]
    hasMotherboardRepair: boolean
    hasDeviceExchange: boolean
  } | null>(null)

  const [formData, setFormData] = useState<FormData>({
    imei: '',
    brand: '',
    model: '',
    is_motherboard_repaired: false,
    is_device_exchanged: false,
    old_imei: '',
    new_imei: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [motherboardNotes, setMotherboardNotes] = useState('')
  const [exchangeData, setExchangeData] = useState({ old_imei: '', new_imei: '', notes: '' })

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setIsLoading(true)
    try {
      await fetchImeiRecords({
        imei: searchImei.trim() || undefined,
        keyword: searchKeyword.trim() || undefined,
      })
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadRecords()
  }

  const handleReset = () => {
    setSearchKeyword('')
    setSearchImei('')
    fetchImeiRecords()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const validateForm = (): boolean => {
    const errors: FormErrors = {}
    if (!formData.imei.trim()) {
      errors.imei = '请输入IMEI串号'
    }
    if (!formData.brand) {
      errors.brand = '请选择品牌'
    }
    if (!formData.model.trim()) {
      errors.model = '请输入型号'
    }
    if (formData.is_device_exchanged) {
      if (!formData.old_imei.trim()) {
        errors.old_imei = '请输入原IMEI'
      }
      if (!formData.new_imei.trim()) {
        errors.new_imei = '请输入新IMEI'
      }
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const openAddModal = () => {
    setFormData({
      imei: '',
      brand: '',
      model: '',
      is_motherboard_repaired: false,
      is_device_exchanged: false,
      old_imei: '',
      new_imei: '',
      notes: '',
    })
    setFormErrors({})
    setIsAddModalOpen(true)
  }

  const openEditModal = (record: ImeiRecord) => {
    setSelectedRecord(record)
    setFormData({
      imei: record.imei,
      brand: record.brand,
      model: record.model,
      is_motherboard_repaired: record.is_motherboard_repaired === 1,
      is_device_exchanged: record.is_device_exchanged === 1,
      old_imei: record.old_imei || '',
      new_imei: record.new_imei || '',
      notes: record.notes || '',
    })
    setFormErrors({})
    setIsEditModalOpen(true)
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleAddSubmit = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await createImeiRecord({
        ...formData,
        repair_id: undefined,
      })
      setIsAddModalOpen(false)
      alert('登记成功')
    } catch (error) {
      console.error('登记失败:', error)
      alert(error instanceof Error ? error.message : '登记失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!selectedRecord || !validateForm()) return
    setIsSubmitting(true)
    try {
      await updateImeiRecord(selectedRecord.id, formData)
      setIsEditModalOpen(false)
      alert('更新成功')
    } catch (error) {
      console.error('更新失败:', error)
      alert(error instanceof Error ? error.message : '更新失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openMotherboardModal = (record: ImeiRecord) => {
    setSelectedRecord(record)
    setMotherboardNotes('')
    setIsMotherboardModalOpen(true)
  }

  const handleMarkMotherboard = async () => {
    if (!selectedRecord) return
    setIsSubmitting(true)
    try {
      await markImeiMotherboard(selectedRecord.id, motherboardNotes || undefined)
      setIsMotherboardModalOpen(false)
      alert('已标记主板维修')
    } catch (error) {
      console.error('标记失败:', error)
      alert(error instanceof Error ? error.message : '标记失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openExchangeModal = (record: ImeiRecord) => {
    setSelectedRecord(record)
    setExchangeData({ old_imei: record.imei, new_imei: '', notes: '' })
    setIsExchangeModalOpen(true)
  }

  const handleMarkExchange = async () => {
    if (!selectedRecord || !exchangeData.old_imei.trim() || !exchangeData.new_imei.trim()) {
      alert('请填写原IMEI和新IMEI')
      return
    }
    setIsSubmitting(true)
    try {
      await markImeiExchange(
        selectedRecord.id,
        exchangeData.old_imei.trim(),
        exchangeData.new_imei.trim(),
        exchangeData.notes.trim() || undefined
      )
      setIsExchangeModalOpen(false)
      alert('已标记换机并创建新IMEI记录')
    } catch (error) {
      console.error('标记失败:', error)
      alert(error instanceof Error ? error.message : '标记失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (record: ImeiRecord) => {
    if (!confirm(`确定要删除 IMEI: ${record.imei} 的记录吗？`)) return
    try {
      await deleteImeiRecord(record.id)
      alert('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      alert(error instanceof Error ? error.message : '删除失败')
    }
  }

  const openHistoryModal = async (record: ImeiRecord) => {
    setIsLoading(true)
    try {
      const { imeiApi } = await import('../lib/api')
      const data = await imeiApi.getHistory(record.imei)
      setHistoryData(data)
      setSelectedRecord(record)
      setIsHistoryModalOpen(true)
    } catch (error) {
      console.error('获取历史失败:', error)
      alert(error instanceof Error ? error.message : '获取历史失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">串号管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理手机IMEI串号维修记录，标记主板维修和换机情况，防止赃物和掉包纠纷
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">IMEI搜索</label>
              <input
                type="text"
                value={searchImei}
                onChange={(e) => setSearchImei(e.target.value)}
                placeholder="输入IMEI精确搜索"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">关键词</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="输入品牌、型号、备注模糊搜索"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Search size={18} />
                搜索
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={18} />
                重置
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Plus size={18} />
                登记串号
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-500">加载中...</span>
            </div>
          ) : imeiRecords.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Smartphone className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>暂无串号记录</p>
              <button
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <Plus size={16} />
                立即登记
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IMEI</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">品牌型号</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">主板维修</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">换机记录</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">关联客户</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">登记时间</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {imeiRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-mono text-sm text-gray-900">{record.imei}</div>
                        {record.old_imei && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <span className="line-through">{record.old_imei}</span>
                            <ArrowRight size={12} />
                            <span>{record.new_imei}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {record.brand} {record.model}
                        </div>
                        {record.notes && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">
                            {record.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {record.is_motherboard_repaired === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle size={12} />
                            已维修
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <XCircle size={12} />
                            无
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {record.is_device_exchanged === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <AlertTriangle size={12} />
                            已换机
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <XCircle size={12} />
                            无
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {record.repair ? (
                          <div>
                            <div className="text-sm text-gray-900">{record.repair.customer_name}</div>
                            <div className="text-xs text-gray-500">{record.repair.customer_phone}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openHistoryModal(record)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="查看历史"
                          >
                            <Search size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 size={16} />
                          </button>
                          {record.is_motherboard_repaired !== 1 && (
                            <button
                              onClick={() => openMotherboardModal(record)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="标记主板维修"
                            >
                              <AlertTriangle size={16} />
                            </button>
                          )}
                          {record.is_device_exchanged !== 1 && (
                            <button
                              onClick={() => openExchangeModal(record)}
                              className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                              title="标记换机"
                            >
                              <RefreshCw size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(record)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="登记串号"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleAddSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              IMEI串号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="imei"
              value={formData.imei}
              onChange={handleFormChange}
              placeholder="请输入15位IMEI串号"
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                formErrors.imei
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
              )}
            />
            {formErrors.imei && <p className="mt-1 text-xs text-red-500">{formErrors.imei}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                品牌 <span className="text-red-500">*</span>
              </label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleFormChange}
                className={cn(
                  'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                  formErrors.brand
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                )}
              >
                <option value="">请选择品牌</option>
                {phoneBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
              {formErrors.brand && <p className="mt-1 text-xs text-red-500">{formErrors.brand}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                型号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleFormChange}
                placeholder="如 iPhone 13"
                className={cn(
                  'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                  formErrors.model
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                )}
              />
              {formErrors.model && <p className="mt-1 text-xs text-red-500">{formErrors.model}</p>}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="font-medium text-gray-700">特殊标记</div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_motherboard_repaired"
                checked={formData.is_motherboard_repaired}
                onChange={handleFormChange}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">已进行主板维修</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_device_exchanged"
                checked={formData.is_device_exchanged}
                onChange={handleFormChange}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">涉及换机</span>
            </label>
          </div>

          {formData.is_device_exchanged && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  原IMEI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="old_imei"
                  value={formData.old_imei}
                  onChange={handleFormChange}
                  placeholder="请输入原IMEI"
                  className={cn(
                    'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                    formErrors.old_imei
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-orange-300 focus:border-orange-500 focus:ring-orange-100'
                  )}
                />
                {formErrors.old_imei && <p className="mt-1 text-xs text-red-500">{formErrors.old_imei}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  新IMEI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="new_imei"
                  value={formData.new_imei}
                  onChange={handleFormChange}
                  placeholder="请输入新IMEI"
                  className={cn(
                    'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                    formErrors.new_imei
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-orange-300 focus:border-orange-500 focus:ring-orange-100'
                  )}
                />
                {formErrors.new_imei && <p className="mt-1 text-xs text-red-500">{formErrors.new_imei}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              rows={3}
              placeholder="填写维修记录、换机原因等信息"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="编辑串号记录"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              IMEI串号 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="imei"
              value={formData.imei}
              onChange={handleFormChange}
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                formErrors.imei
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
              )}
            />
            {formErrors.imei && <p className="mt-1 text-xs text-red-500">{formErrors.imei}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                品牌 <span className="text-red-500">*</span>
              </label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleFormChange}
                className={cn(
                  'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                  formErrors.brand
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                )}
              >
                <option value="">请选择品牌</option>
                {phoneBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
              {formErrors.brand && <p className="mt-1 text-xs text-red-500">{formErrors.brand}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                型号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleFormChange}
                className={cn(
                  'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                  formErrors.model
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                )}
              />
              {formErrors.model && <p className="mt-1 text-xs text-red-500">{formErrors.model}</p>}
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="font-medium text-gray-700">特殊标记</div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_motherboard_repaired"
                checked={formData.is_motherboard_repaired}
                onChange={handleFormChange}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">已进行主板维修</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_device_exchanged"
                checked={formData.is_device_exchanged}
                onChange={handleFormChange}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">涉及换机</span>
            </label>
          </div>

          {formData.is_device_exchanged && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  原IMEI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="old_imei"
                  value={formData.old_imei}
                  onChange={handleFormChange}
                  className={cn(
                    'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                    formErrors.old_imei
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-orange-300 focus:border-orange-500 focus:ring-orange-100'
                  )}
                />
                {formErrors.old_imei && <p className="mt-1 text-xs text-red-500">{formErrors.old_imei}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  新IMEI <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="new_imei"
                  value={formData.new_imei}
                  onChange={handleFormChange}
                  className={cn(
                    'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2',
                    formErrors.new_imei
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-orange-300 focus:border-orange-500 focus:ring-orange-100'
                  )}
                />
                {formErrors.new_imei && <p className="mt-1 text-xs text-red-500">{formErrors.new_imei}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isMotherboardModalOpen}
        onClose={() => setIsMotherboardModalOpen(false)}
        title="标记主板维修"
        size="md"
        footer={
          <>
            <button
              onClick={() => setIsMotherboardModalOpen(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleMarkMotherboard}
              disabled={isSubmitting}
              className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {isSubmitting ? '标记中...' : '确认标记'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">重要提示</div>
                <div className="text-sm text-red-700 mt-1">
                  标记主板维修后，该IMEI将永久记录此信息。后续接机时系统会自动提示，防止赃物和掉包纠纷。
                </div>
              </div>
            </div>
          </div>

          {selectedRecord && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">IMEI</div>
              <div className="font-mono font-semibold text-gray-900 mt-1">{selectedRecord.imei}</div>
              <div className="text-sm text-gray-500 mt-2">设备</div>
              <div className="font-medium text-gray-900 mt-1">
                {selectedRecord.brand} {selectedRecord.model}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">备注说明</label>
            <textarea
              value={motherboardNotes}
              onChange={(e) => setMotherboardNotes(e.target.value)}
              rows={3}
              placeholder="描述主板维修情况、更换部件等信息"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        title="标记换机"
        size="md"
        footer={
          <>
            <button
              onClick={() => setIsExchangeModalOpen(false)}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={handleMarkExchange}
              disabled={isSubmitting}
              className="px-6 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {isSubmitting ? '标记中...' : '确认换机'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-orange-800">重要提示</div>
                <div className="text-sm text-orange-700 mt-1">
                  标记换机后，系统将同时更新原IMEI记录并创建新IMEI记录。两个IMEI都会关联换机信息，防止后续纠纷。
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                原IMEI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exchangeData.old_imei}
                onChange={(e) => setExchangeData({ ...exchangeData, old_imei: e.target.value })}
                placeholder="原设备IMEI"
                className="w-full rounded-lg border border-orange-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                新IMEI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exchangeData.new_imei}
                onChange={(e) => setExchangeData({ ...exchangeData, new_imei: e.target.value })}
                placeholder="新设备IMEI"
                className="w-full rounded-lg border border-orange-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">换机原因</label>
            <textarea
              value={exchangeData.notes}
              onChange={(e) => setExchangeData({ ...exchangeData, notes: e.target.value })}
              rows={3}
              placeholder="描述换机原因、新旧设备差异等信息"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="IMEI维修历史"
        size="xl"
      >
        {historyData && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                historyData.hasMotherboardRepair ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              )}>
                {historyData.hasMotherboardRepair ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                <span className="text-sm font-medium">主板维修: {historyData.hasMotherboardRepair ? '有' : '无'}</span>
              </div>
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                historyData.hasDeviceExchange ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
              )}>
                {historyData.hasDeviceExchange ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                <span className="text-sm font-medium">换机记录: {historyData.hasDeviceExchange ? '有' : '无'}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                <span className="text-sm font-medium">记录总数: {historyData.history.length}</span>
              </div>
            </div>

            {historyData.warnings && historyData.warnings.length > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800">风险提示</div>
                    <ul className="mt-2 space-y-1">
                      {historyData.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-700">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {historyData.history.map((record, index) => (
                <div key={record.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-semibold text-gray-900">
                        {record.imei}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {record.brand} {record.model}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.is_motherboard_repaired === 1 && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          主板维修
                        </span>
                      )}
                      {record.is_device_exchanged === 1 && (
                        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                          换机
                        </span>
                      )}
                    </div>
                  </div>
                  {record.old_imei && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <span className="line-through">{record.old_imei}</span>
                      <ArrowRight size={12} />
                      <span>{record.new_imei}</span>
                    </div>
                  )}
                  {record.repair && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        客户: {record.repair.customer_name} ({record.repair.customer_phone})
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        故障: {record.repair.fault_description}
                      </div>
                    </div>
                  )}
                  {record.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      备注: {record.notes}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-400">
                    {formatDate(record.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
