import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import PhotoUpload from '../components/PhotoUpload'
import { useAppStore } from '../store'

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

  const createRepair = useAppStore((state) => state.createRepair)

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
      await createRepair({
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        brand: formData.brand,
        model: formData.model.trim(),
        imei: formData.imei.trim() || undefined,
        faultDescription: formData.faultDescription.trim(),
        appearanceCheck: formData.appearanceCheck.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      })

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
                <input
                  type="text"
                  name="imei"
                  value={formData.imei}
                  onChange={handleChange}
                  placeholder="请输入IMEI（可选）"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
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
    </div>
  )
}
