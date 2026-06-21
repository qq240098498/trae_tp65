export type RepairStatus = 'pending' | 'repairing' | 'ready' | 'picked'

export const statusLabels: Record<RepairStatus, string> = {
  pending: '待修',
  repairing: '维修中',
  ready: '待取',
  picked: '已取',
}

export const statusColors: Record<RepairStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  repairing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  picked: 'bg-gray-100 text-gray-800',
}

export interface Customer {
  id: number
  name: string
  phone: string
  created_at: string
}

export interface RepairItem {
  id: number
  name: string
  code: string
  default_price: number
  description: string
}

export interface Part {
  id: number
  type: 'screen' | 'battery' | 'other'
  brand: string
  model: string
  color: string | null
  capacity: string | null
  name: string
  sku: string
  stock: number
  price: number
  cost: number
  created_at: string
  updated_at: string
}

export interface RepairService {
  id: number
  repair_id: number
  repair_item_id: number
  price: number
  name?: string
  code?: string
}

export interface RepairPart {
  id: number
  repair_id: number
  part_id: number
  quantity: number
  price: number
  created_at: string
  name?: string
  sku?: string
  type?: string
  brand?: string
  model?: string
  color?: string | null
  capacity?: string | null
}

export interface RepairPhoto {
  id: number
  repair_id: number
  photo_data: string
  photo_type: string
  created_at: string
}

export interface RepairStatusLog {
  id: number
  repair_id: number
  status: string
  remark: string
  created_at: string
}

export interface Signature {
  id: number
  repair_id: number
  signature_data: string
  signer_name: string | null
  created_at: string
}

export interface Repair {
  id: number
  customer_id: number
  brand: string
  model: string
  imei: string | null
  fault_description: string
  appearance_check: string | null
  status: RepairStatus
  total_price: number
  created_at: string
  updated_at: string
  picked_at: string | null
  customer_name: string
  customer_phone: string
  services?: RepairService[]
  parts?: RepairPart[]
  photos?: RepairPhoto[]
  logs?: RepairStatusLog[]
  signature?: Signature
}

export interface RepairStats {
  pending: number
  repairing: number
  ready: number
  picked: number
  todayRevenue: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
