import React, { useState, useEffect, useMemo } from 'react'
import { Search, Eye, CheckCircle, User, Phone, Smartphone, AlertCircle, Clock, Wrench, Package, FileText } from 'lucide-react'
import { useAppStore } from '../store'
import type { Repair } from '../types'
import Modal from '../components/Modal'
import SignaturePad from '../components/SignaturePad'
import { cn } from '../lib/utils'

export default function Pickup() {
  const {
    repairs,
    loading,
    fetchRepairs,
    updateRepairStatus,
    saveSignature,
  } = useAppStore()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null)
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [inspectionResult, setInspectionResult] = useState('')
  const [signatureData, setSignatureData] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchRepairs('ready')
  }, [fetchRepairs])

  const filteredRepairs = useMemo(() => {
    return repairs.filter((repair) => {
      if (repair.status !== 'ready') return false
      const keyword = searchKeyword.toLowerCase()
      return (
        !searchKeyword ||
        repair.customer_name.toLowerCase().includes(keyword) ||
        repair.customer_phone.includes(keyword) ||
        (repair.imei && repair.imei.includes(keyword)) ||
        repair.id.toString().includes(keyword)
      )
    })
  }, [repairs, searchKeyword])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const calculateTotal = (repair: Repair) => {
    const servicesTotal = repair.services?.reduce((sum, s) => sum + s.price, 0) || 0
    const partsTotal = repair.parts?.reduce((sum, p) => sum + p.price * p.quantity, 0) || 0
    return servicesTotal + partsTotal
  }

  const openPickupModal = (repair: Repair) => {
    setSelectedRepair(repair)
    setInspectionResult('')
    setSignatureData('')
    setIsPickupModalOpen(true)
  }

  const openDetailModal = (repair: Repair) => {
    setSelectedRepair(repair)
    setIsDetailModalOpen(true)
  }

  const closePickupModal = () => {
    setIsPickupModalOpen(false)
    setSelectedRepair(null)
    setInspectionResult('')
    setSignatureData('')
  }

  const closeDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedRepair(null)
  }

  const handlePickup = async () => {
    if (!selectedRepair) return
    if (!inspectionResult.trim()) {
      alert('请填写验机结果')
      return
    }
    if (!signatureData) {
      alert('请客户签字确认')
      return
    }

    setIsSubmitting(true)
    try {
      await saveSignature(selectedRepair.id, signatureData, selectedRepair.customer_name)
      await updateRepairStatus(selectedRepair.id, 'picked', `验机结果：${inspectionResult}`)
      alert('取机成功！')
      closePickupModal()
      await fetchRepairs('ready')
    } catch (error) {
      console.error('取机失败:', error)
      alert('取机失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">取机验机</h1>
        <p className="text-gray-500">处理待取机的维修订单</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="搜索单号、客户姓名、电话或IMEI..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center px-3 py-2 rounded-lg font-medium',
                'bg-green-100 text-green-800'
              )}>
                待取单：{filteredRepairs.length}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">手机</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">故障</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
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
                    暂无待取维修单
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
                        <div className="font-medium text-gray-900">{repair.brand} {repair.model}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate" title={repair.fault_description}>
                        {repair.fault_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-green-600">¥{repair.total_price.toFixed(2)}</span>
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
                          详情
                        </button>
                        <button
                          onClick={() => openPickupModal(repair)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <CheckCircle size={14} />
                          取机验机
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
        isOpen={isPickupModalOpen}
        onClose={closePickupModal}
        title={`取机验机 #${selectedRepair?.id}`}
        size="xl"
        footer={
          <>
            <button
              onClick={closePickupModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handlePickup}
              disabled={isSubmitting}
              className="px-6 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中...' : '确认取机'}
            </button>
          </>
        }
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
                    <span className="text-gray-500">品牌：</span>
                    <span className="font-medium">{selectedRepair.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">型号：</span>
                    <span className="font-medium">{selectedRepair.model}</span>
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

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Wrench size={18} className="text-blue-500" />
                维修项目
              </h4>
              <div className="space-y-2">
                {selectedRepair.services && selectedRepair.services.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 text-left text-gray-500 font-medium">名称</th>
                          <th className="py-2 text-right text-gray-500 font-medium">价格</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRepair.services.map((service, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2">{service.name}</td>
                            <td className="py-2 text-right font-medium">¥{service.price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">暂无维修项目</div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package size={18} className="text-green-500" />
                使用配件
              </h4>
              <div className="space-y-2">
                {selectedRepair.parts && selectedRepair.parts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 text-left text-gray-500 font-medium">名称</th>
                          <th className="py-2 text-center text-gray-500 font-medium">数量</th>
                          <th className="py-2 text-right text-gray-500 font-medium">单价</th>
                          <th className="py-2 text-right text-gray-500 font-medium">小计</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRepair.parts.map((part, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2">{part.name}</td>
                            <td className="py-2 text-center">{part.quantity}</td>
                            <td className="py-2 text-right">¥{part.price.toFixed(2)}</td>
                            <td className="py-2 text-right font-medium">¥{(part.price * part.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">暂无使用配件</div>
                )}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">应收金额</span>
                <span className="text-2xl font-bold text-green-600">¥{calculateTotal(selectedRepair).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText size={18} className="text-orange-500" />
                验机结果
              </label>
              <textarea
                value={inspectionResult}
                onChange={(e) => setInspectionResult(e.target.value)}
                placeholder="请详细描述验机情况，包括手机外观、功能测试、配件完整性等..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                客户签字确认
              </label>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex flex-col items-center">
                  <SignaturePad
                    value={signatureData}
                    onChange={setSignatureData}
                    width={500}
                    height={200}
                  />
                  <p className="text-xs text-gray-500 mt-2">请客户在上方签字确认取机</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">取机确认</p>
                  <p>请确认：</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>手机维修完成，功能正常</li>
                    <li>客户已验收并确认验机结果</li>
                    <li>客户已签字确认</li>
                    <li>款项已结清</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
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

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" />
                故障描述
              </h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRepair.fault_description}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Wrench size={18} className="text-blue-500" />
                维修项目
              </h4>
              <div className="space-y-2">
                {selectedRepair.services && selectedRepair.services.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 text-left text-gray-500 font-medium">名称</th>
                          <th className="py-2 text-right text-gray-500 font-medium">价格</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRepair.services.map((service, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2">{service.name}</td>
                            <td className="py-2 text-right font-medium">¥{service.price.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">暂无维修项目</div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package size={18} className="text-green-500" />
                使用配件
              </h4>
              <div className="space-y-2">
                {selectedRepair.parts && selectedRepair.parts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-2 text-left text-gray-500 font-medium">名称</th>
                          <th className="py-2 text-center text-gray-500 font-medium">数量</th>
                          <th className="py-2 text-right text-gray-500 font-medium">单价</th>
                          <th className="py-2 text-right text-gray-500 font-medium">小计</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRepair.parts.map((part, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2">{part.name}</td>
                            <td className="py-2 text-center">{part.quantity}</td>
                            <td className="py-2 text-right">¥{part.price.toFixed(2)}</td>
                            <td className="py-2 text-right font-medium">¥{(part.price * part.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">暂无使用配件</div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">合计金额</span>
                <span className="text-2xl font-bold text-blue-600">¥{calculateTotal(selectedRepair).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  closeDetailModal()
                  openPickupModal(selectedRepair)
                }}
                className="inline-flex items-center gap-2 px-6 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
              >
                <CheckCircle size={18} />
                前往取机
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
