import type {
  Repair,
  RepairStats,
  RepairItem,
  Part,
  ApiResponse,
  RepairStatus,
} from '../types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
  const data = (await response.json()) as ApiResponse<T>
  if (!data.success) {
    throw new Error(data.error || data.message || '请求失败')
  }
  return data.data as T
}

export const repairApi = {
  list: (status?: RepairStatus) =>
    request<Repair[]>(`/repairs${status ? `?status=${status}` : ''}`),

  getStats: () => request<RepairStats>('/repairs/stats'),

  get: (id: number) => request<Repair>(`/repairs/${id}`),

  create: (data: {
    customerName: string
    customerPhone: string
    brand: string
    model: string
    imei?: string
    faultDescription: string
    appearanceCheck?: string
    photos?: string[]
  }) =>
    request<Repair>('/repairs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, status: RepairStatus, remark?: string) =>
    request<void>(`/repairs/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, remark }),
    }),

  addServices: (id: number, services: { repair_item_id: number; price: number }[]) =>
    request<void>(`/repairs/${id}/services`, {
      method: 'POST',
      body: JSON.stringify({ services }),
    }),

  addParts: (id: number, parts: { part_id: number; quantity: number; price: number }[]) =>
    request<void>(`/repairs/${id}/parts`, {
      method: 'POST',
      body: JSON.stringify({ parts }),
    }),

  saveSignature: (id: number, signatureData: string, signerName?: string) =>
    request<void>(`/repairs/${id}/signature`, {
      method: 'POST',
      body: JSON.stringify({ signatureData, signerName }),
    }),

  delete: (id: number) =>
    request<void>(`/repairs/${id}`, {
      method: 'DELETE',
    }),
}

export const partApi = {
  list: (params?: { type?: string; brand?: string; model?: string; keyword?: string }) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).filter(([, v]) => v) as [string, string][]
        ).toString()
      : ''
    return request<Part[]>(`/parts${query}`)
  },

  getScreens: (params?: { brand?: string; model?: string }) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).filter(([, v]) => v) as [string, string][]
        ).toString()
      : ''
    return request<Part[]>(`/parts/screens${query}`)
  },

  getBatteries: (params?: { brand?: string; model?: string }) => {
    const query = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).filter(([, v]) => v) as [string, string][]
        ).toString()
      : ''
    return request<Part[]>(`/parts/batteries${query}`)
  },

  get: (id: number) => request<Part>(`/parts/${id}`),

  create: (data: Omit<Part, 'id' | 'created_at' | 'updated_at'>) =>
    request<Part>('/parts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Omit<Part, 'id' | 'created_at' | 'updated_at'>) =>
    request<void>(`/parts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateStock: (id: number, quantity: number, operation: 'add' | 'reduce') =>
    request<{ stock: number }>(`/parts/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify({ quantity, operation }),
    }),

  delete: (id: number) =>
    request<void>(`/parts/${id}`, {
      method: 'DELETE',
    }),
}

export const repairItemApi = {
  list: () => request<RepairItem[]>('/repair-items'),

  get: (id: number) => request<RepairItem>(`/repair-items/${id}`),

  create: (data: Omit<RepairItem, 'id'>) =>
    request<RepairItem>('/repair-items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Omit<RepairItem, 'id'>) =>
    request<void>(`/repair-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/repair-items/${id}`, {
      method: 'DELETE',
    }),
}
