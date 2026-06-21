import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Loader2, AlertTriangle, Search, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import PhotoUpload from '../components/PhotoUpload'
import Modal from '../components/Modal'
import { useAppStore } from '../store'
import { imeiApi } from '../lib/api'
import { cn } from '../lib/utils'

const phoneBrands = ['Apple', 'Huawei', 'Xiaomi', 'OPPO', 'vivo', 'Samsung', '其他']

interface FormData {
  customerName: string
  customerPhone: string
  brand: string
  model: string
  imei: string
  faultDescription: string
  appearanceCheck: string
}

interface FormErrors {
  customerName?: string
  customerPhone?: string
  brand?: string
  model?: string
  faultDescription?: string
}

export default function Checkin() {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerPhone: '',
    brand: '',
    model: '',
    imei: '',
    faultDescription: '',
    appearanceCheck: '',
  })

  const [photos, setPhotos] = useState<string[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [imeiCheckResult, setImeiCheckResult] = useState<{
    hasMotherboardRepair: boolean
    hasDeviceExchange: boolean
    warnings: string[]
    recordCount: number
    lastRepair: any
  } | null>(null)
  const [isCheckingImei, setIsCheckingImei] = useState(false)
  const [showImeiHistory, setShowImeiHistory] = useState(false)
  const [imeiHistory, setImeiHistory] = useState<{
    history: any[]
    hasMotherboardRepair: boolean
    hasDeviceExchange: boolean
  } | null>(null)

  const createRepair = useAppStore((state) => state.createRepair)

  const checkImei = useCallback(async (imei: string) => {
    if (!imei.trim()) {
      setImeiCheckResult(null)
      return
    }
    setIsCheckingImei(true)
    try {
      const result = await imeiApi.check(imei.trim())
      setImeiCheckResult(result)
    } catch (error) {
      console.error('IMEI检查失败:', error)
      setImeiCheckResult(null)
    } finally {
      setIsCheckingImei(false)
    }
  }, [])

  const loadImeiHistory = async (imei: string) => {
    if (!imei.trim()) return
    try {
      const history = await imeiApi.getHistory(imei.trim())
      setImeiHistory(history)
      setShowImeiHistory(true)
    } catch (error) {
      console.error('获取IMEI历史失败:', error)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.imei.trim()) {
        checkImei(formData.imei)
      } else {
        setImeiCheckResult(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.imei, checkImei])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = '请输入客户姓名'
    }
    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = '请输入客户电话'
    }
    if (!formData.brand) {
      newErrors.brand = '请选择手机品牌'
    }
    if (!formData.model.trim()) {
      newErrors.model = '请输入手机型号'
    }
    if (!formData.faultDescription.trim()) {
      newErrors.faultDescription = '请输入故障描述'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const newRepair = await createRepair({
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        brand: formData.brand,
        model: formData.model.trim(),
        imei: formData.imei.trim() || undefined,
        faultDescription: formData.faultDescription.trim(),
        appearanceCheck: formData.appearanceCheck.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      })

      if (formData.imei.trim()) {
        try {
          await imeiApi.create({
            imei: formData.imei.trim(),
            brand: formData.brand,
            model: formData.model.trim(),
            repair_id: newRepair.id,
            is_motherboard_repaired: false,
            is_device_exchanged: false,
            notes: `接机登记 - ${formData.faultDescription.trim().substring(0, 100)}`,
          })
        } catch (imeiError) {
          console.error('IMEI记录创建失败:', imeiError)
        }
      }

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

      setFormData({
        customerName: '',
        customerPhone: '',
        brand: '',
        model: '',
        imei: '',
        faultDescription: '',
        appearanceCheck: '',
      })
      setPhotos([])
      setImeiCheckResult(null)
    } catch (error) {
      console.error('提交失败:', error)
      alert(error instanceof Error ? error.message : '提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">接机登记</h1>
          <p className="mt-1 text-sm text-gray-500">
            请填写客户信息和设备故障详情
          </p>
        </div>

        {showSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <CheckCircle2 className="h-5 w-5" />
            <span>接机登记成功！</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  客户姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="请输入客户姓名"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    errors.customerName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                {errors.customerName && (
                  <p className="mt-1 text-xs text-red-500">{errors.customerName}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  客户电话 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  placeholder="请输入客户电话"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    errors.customerPhone
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                {errors.customerPhone && (
                  <p className="mt-1 text-xs text-red-500">{errors.customerPhone}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  手机品牌 <span className="text-red-500">*</span>
                </label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    errors.brand
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                >
                  <option value="">请选择品牌</option>
                  {phoneBrands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                {errors.brand && (
                  <p className="mt-1 text-xs text-red-500">{errors.brand}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  手机型号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="请输入手机型号"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    errors.model
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                {errors.model && (
                  <p className="mt-1 text-xs text-red-500">{errors.model}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  IMEI
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="imei"
                    value={formData.imei}
                    onChange={handleChange}
                    placeholder="请输入IMEI（可选）"
                    className={cn(
                      'w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 pr-24',
                      imeiCheckResult?.warnings?.length
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : imeiCheckResult && imeiCheckResult.recordCount > 0
                        ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-100'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isCheckingImei ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    ) : imeiCheckResult?.warnings?.length ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : imeiCheckResult && imeiCheckResult.recordCount > 0 ? (
                      <Search className="w-4 h-4 text-yellow-500" />
                    ) : imeiCheckResult ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : null}
                  </div>
                </div>
                {imeiCheckResult && (
                  <div className="mt-2">
                    {imeiCheckResult.warnings?.length > 0 ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-red-800">风险提示</div>
                            <ul className="mt-1 space-y-1">
                              {imeiCheckResult.warnings.map((warning, index) => (
                                <li key={index} className="text-xs text-red-700">• {warning}</li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              onClick={() => loadImeiHistory(formData.imei)}
                              className="mt-2 text-xs text-red-600 hover:text-red-800 underline flex items-center gap-1"
                            >
                              <Search className="w-3 h-3" />
                              查看详细维修历史
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : imeiCheckResult.recordCount > 0 ? (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Search className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-yellow-800">
                              该IMEI有 {imeiCheckResult.recordCount} 条维修记录
                            </div>
                            <button
                              type="button"
                              onClick={() => loadImeiHistory(formData.imei)}
                              className="mt-1 text-xs text-yellow-600 hover:text-yellow-800 underline flex items-center gap-1"
                            >
                              <Search className="w-3 h-3" />
                              查看维修历史
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>该IMEI暂无维修记录</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  故障描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="faultDescription"
                  value={formData.faultDescription}
                  onChange={handleChange}
                  rows={4}
                  placeholder="请详细描述故障情况"
                  className={`w-full resize-none rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    errors.faultDescription
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                />
                {errors.faultDescription && (
                  <p className="mt-1 text-xs text-red-500">{errors.faultDescription}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  外观检查
                </label>
                <textarea
                  name="appearanceCheck"
                  value={formData.appearanceCheck}
                  onChange={handleChange}
                  rows={3}
                  placeholder="请描述设备外观情况（可选）"
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <PhotoUpload
                photos={photos}
                onChange={setPhotos}
                maxPhotos={5}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-8 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                '接机登记'
              )}
            </button>
          </div>
        </form>
      </div>

      <Modal
        isOpen={showImeiHistory}
        onClose={() => setShowImeiHistory(false)}
        title="IMEI维修历史"
        size="xl"
      >
        {imeiHistory && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                imeiHistory.hasMotherboardRepair ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              )}>
                {imeiHistory.hasMotherboardRepair ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                <span className="text-sm font-medium">主板维修: {imeiHistory.hasMotherboardRepair ? '有' : '无'}</span>
              </div>
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                imeiHistory.hasDeviceExchange ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
              )}>
                {imeiHistory.hasDeviceExchange ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                <span className="text-sm font-medium">换机记录: {imeiHistory.hasDeviceExchange ? '有' : '无'}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                <span className="text-sm font-medium">记录总数: {imeiHistory.history.length}</span>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {imeiHistory.history.map((record: any) => (
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
                    {new Date(record.created_at).toLocaleString('zh-CN')}
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
