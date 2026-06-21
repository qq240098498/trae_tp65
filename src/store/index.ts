import { create } from 'zustand'
import type { Repair, Part, RepairItem, RepairStats, RepairStatus } from '../types'
import { repairApi, partApi, repairItemApi } from '../lib/api'

interface AppState {
  repairs: Repair[]
  parts: Part[]
  repairItems: RepairItem[]
  stats: RepairStats | null
  loading: boolean
  error: string | null

  fetchRepairs: (status?: RepairStatus) => Promise<void>
  fetchStats: () => Promise<void>
  fetchParts: (params?: {
    type?: string
    brand?: string
    model?: string
    keyword?: string
  }) => Promise<void>
  fetchRepairItems: () => Promise<void>

  createRepair: typeof repairApi.create
  updateRepairStatus: typeof repairApi.updateStatus
  addRepairServices: typeof repairApi.addServices
  addRepairParts: typeof repairApi.addParts
  saveSignature: typeof repairApi.saveSignature
  deleteRepair: typeof repairApi.delete

  createPart: typeof partApi.create
  updatePart: typeof partApi.update
  updatePartStock: typeof partApi.updateStock
  deletePart: typeof partApi.delete

  setError: (error: string | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  repairs: [],
  parts: [],
  repairItems: [],
  stats: null,
  loading: false,
  error: null,

  fetchRepairs: async (status?: RepairStatus) => {
    try {
      set({ loading: true, error: null })
      const repairs = await repairApi.list(status)
      set({ repairs })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  fetchStats: async () => {
    try {
      set({ error: null })
      const stats = await repairApi.getStats()
      set({ stats })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  fetchParts: async (params) => {
    try {
      set({ loading: true, error: null })
      const parts = await partApi.list(params)
      set({ parts })
    } catch (error) {
      set({ error: (error as Error).message })
    } finally {
      set({ loading: false })
    }
  },

  fetchRepairItems: async () => {
    try {
      set({ error: null })
      const repairItems = await repairItemApi.list()
      set({ repairItems })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  createRepair: async (data) => {
    const result = await repairApi.create(data)
    await get().fetchRepairs()
    await get().fetchStats()
    return result
  },

  updateRepairStatus: async (id, status, remark) => {
    await repairApi.updateStatus(id, status, remark)
    await get().fetchRepairs()
    await get().fetchStats()
  },

  addRepairServices: async (id, services) => {
    await repairApi.addServices(id, services)
    await get().fetchRepairs()
  },

  addRepairParts: async (id, parts) => {
    await repairApi.addParts(id, parts)
    await get().fetchRepairs()
    await get().fetchParts()
  },

  saveSignature: async (id, signatureData, signerName) => {
    await repairApi.saveSignature(id, signatureData, signerName)
  },

  deleteRepair: async (id) => {
    await repairApi.delete(id)
    await get().fetchRepairs()
    await get().fetchStats()
  },

  createPart: async (data) => {
    const result = await partApi.create(data)
    await get().fetchParts()
    return result
  },

  updatePart: async (id, data) => {
    await partApi.update(id, data)
    await get().fetchParts()
  },

  updatePartStock: async (id, quantity, operation) => {
    const result = await partApi.updateStock(id, quantity, operation)
    await get().fetchParts()
    return result
  },

  deletePart: async (id) => {
    await partApi.delete(id)
    await get().fetchParts()
  },

  setError: (error) => set({ error }),
}))
