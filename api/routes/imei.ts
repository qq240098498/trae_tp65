import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

interface ImeiRecordRow {
  id: number
  imei: string
  brand: string
  model: string
  repair_id: number | null
  is_motherboard_repaired: number
  is_device_exchanged: number
  old_imei: string | null
  new_imei: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function getImeiRecordWithRepair(id: number) {
  const sql = `
    SELECT ir.*, 
      r.id as repair_id,
      c.name as customer_name,
      c.phone as customer_phone,
      r.fault_description,
      r.status,
      r.created_at as repair_created_at
    FROM imei_records ir
    LEFT JOIN repairs r ON ir.repair_id = r.id
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE ir.id = ?
  `
  const row = db.prepare(sql).get(id) as any
  if (!row) return null
  return transformImeiRecord(row)
}

function transformImeiRecord(row: any) {
  const record: ImeiRecordRow & { repair?: any } = {
    id: row.id,
    imei: row.imei,
    brand: row.brand,
    model: row.model,
    repair_id: row.repair_id,
    is_motherboard_repaired: row.is_motherboard_repaired,
    is_device_exchanged: row.is_device_exchanged,
    old_imei: row.old_imei,
    new_imei: row.new_imei,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
  if (row.repair_id && row.customer_name) {
    record.repair = {
      id: row.repair_id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      fault_description: row.fault_description,
      status: row.status,
      created_at: row.repair_created_at,
    }
  }
  return record
}

function getAllImeiRecordsWithRepair(imei?: string, keyword?: string) {
  let sql = `
    SELECT ir.*,
      r.id as repair_id,
      c.name as customer_name,
      c.phone as customer_phone,
      r.fault_description,
      r.status,
      r.created_at as repair_created_at
    FROM imei_records ir
    LEFT JOIN repairs r ON ir.repair_id = r.id
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (imei) {
    sql += ' AND ir.imei = ?'
    params.push(imei)
  }

  if (keyword) {
    sql += ' AND (ir.imei LIKE ? OR ir.brand LIKE ? OR ir.model LIKE ? OR ir.notes LIKE ?)'
    const search = `%${keyword}%`
    params.push(search, search, search, search)
  }

  sql += ' ORDER BY ir.created_at DESC'

  const rows = db.prepare(sql).all(...params) as any[]
  return rows.map(transformImeiRecord)
}

function getImeiHistory(imei: string) {
  const sql = `
    SELECT ir.*,
      r.id as repair_id,
      c.name as customer_name,
      c.phone as customer_phone,
      r.fault_description,
      r.status,
      r.created_at as repair_created_at
    FROM imei_records ir
    LEFT JOIN repairs r ON ir.repair_id = r.id
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE ir.imei = ?
    ORDER BY ir.created_at DESC
  `
  const rows = db.prepare(sql).all(imei) as any[]
  return rows.map(transformImeiRecord)
}

function checkMotherboardRepair(imei: string): boolean {
  const sql = `
    SELECT COUNT(*) as count FROM imei_records
    WHERE imei = ? AND is_motherboard_repaired = 1
  `
  const result = db.prepare(sql).get(imei) as { count: number }
  return result.count > 0
}

function checkDeviceExchange(imei: string): boolean {
  const sql = `
    SELECT COUNT(*) as count FROM imei_records
    WHERE old_imei = ? OR new_imei = ?
  `
  const result = db.prepare(sql).get(imei, imei) as { count: number }
  return result.count > 0
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imei, keyword } = req.query
    const records = getAllImeiRecordsWithRepair(
      imei as string | undefined,
      keyword as string | undefined
    )
    res.json({
      success: true,
      data: records,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.get('/history/:imei', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imei } = req.params
    if (!imei || imei.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'IMEI不能为空',
      })
      return
    }

    const history = getImeiHistory(imei)
    const hasMotherboardRepair = checkMotherboardRepair(imei)
    const hasDeviceExchange = checkDeviceExchange(imei)

    res.json({
      success: true,
      data: {
        history,
        hasMotherboardRepair,
        hasDeviceExchange,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.get('/check/:imei', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imei } = req.params
    if (!imei || imei.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'IMEI不能为空',
      })
      return
    }

    const hasMotherboardRepair = checkMotherboardRepair(imei)
    const hasDeviceExchange = checkDeviceExchange(imei)
    const history = getImeiHistory(imei)

    let warnings: string[] = []
    if (hasMotherboardRepair) {
      warnings.push('该设备曾进行过主板维修')
    }
    if (hasDeviceExchange) {
      warnings.push('该IMEI涉及换机记录，请仔细核对')
    }

    res.json({
      success: true,
      data: {
        imei,
        hasMotherboardRepair,
        hasDeviceExchange,
        warnings,
        recordCount: history.length,
        lastRepair: history.length > 0 ? history[0] : null,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const record = getImeiRecordWithRepair(Number(req.params.id))
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'IMEI记录不存在',
      })
      return
    }
    res.json({
      success: true,
      data: record,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const transaction = db.transaction(() => {
    const { imei, brand, model, repair_id, is_motherboard_repaired, is_device_exchanged, old_imei, new_imei, notes } = req.body

    if (!imei || !imei.trim()) {
      throw new Error('IMEI不能为空')
    }
    if (!brand || !brand.trim()) {
      throw new Error('品牌不能为空')
    }
    if (!model || !model.trim()) {
      throw new Error('型号不能为空')
    }

    const info = db.prepare(`
      INSERT INTO imei_records (imei, brand, model, repair_id, is_motherboard_repaired, is_device_exchanged, old_imei, new_imei, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      imei.trim(),
      brand.trim(),
      model.trim(),
      repair_id || null,
      is_motherboard_repaired ? 1 : 0,
      is_device_exchanged ? 1 : 0,
      old_imei?.trim() || null,
      new_imei?.trim() || null,
      notes?.trim() || null
    )

    return Number(info.lastInsertRowid)
  })

  try {
    const recordId = transaction()
    const record = getImeiRecordWithRepair(recordId)
    res.json({
      success: true,
      data: record,
      message: 'IMEI记录登记成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const transaction = db.transaction(() => {
    const recordId = Number(req.params.id)
    const { imei, brand, model, repair_id, is_motherboard_repaired, is_device_exchanged, old_imei, new_imei, notes } = req.body

    const existing = db.prepare('SELECT id FROM imei_records WHERE id = ?').get(recordId)
    if (!existing) {
      throw new Error('IMEI记录不存在')
    }

    db.prepare(`
      UPDATE imei_records 
      SET imei = ?, brand = ?, model = ?, repair_id = ?, is_motherboard_repaired = ?, 
          is_device_exchanged = ?, old_imei = ?, new_imei = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      imei?.trim() || '',
      brand?.trim() || '',
      model?.trim() || '',
      repair_id || null,
      is_motherboard_repaired ? 1 : 0,
      is_device_exchanged ? 1 : 0,
      old_imei?.trim() || null,
      new_imei?.trim() || null,
      notes?.trim() || null,
      recordId
    )

    return recordId
  })

  try {
    const recordId = transaction()
    const record = getImeiRecordWithRepair(recordId)
    res.json({
      success: true,
      data: record,
      message: 'IMEI记录更新成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/:id/mark-motherboard', async (req: Request, res: Response): Promise<void> => {
  try {
    const recordId = Number(req.params.id)
    const { notes } = req.body

    const existing = db.prepare('SELECT * FROM imei_records WHERE id = ?').get(recordId) as ImeiRecordRow | undefined
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'IMEI记录不存在',
      })
      return
    }

    db.prepare(`
      UPDATE imei_records 
      SET is_motherboard_repaired = 1, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(notes?.trim() || existing.notes, recordId)

    const record = getImeiRecordWithRepair(recordId)
    res.json({
      success: true,
      data: record,
      message: '已标记主板维修',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/:id/mark-exchange', async (req: Request, res: Response): Promise<void> => {
  const transaction = db.transaction(() => {
    const recordId = Number(req.params.id)
    const { old_imei, new_imei, notes } = req.body

    if (!old_imei || !old_imei.trim()) {
      throw new Error('原IMEI不能为空')
    }
    if (!new_imei || !new_imei.trim()) {
      throw new Error('新IMEI不能为空')
    }

    const existing = db.prepare('SELECT * FROM imei_records WHERE id = ?').get(recordId) as ImeiRecordRow | undefined
    if (!existing) {
      throw new Error('IMEI记录不存在')
    }

    db.prepare(`
      UPDATE imei_records 
      SET is_device_exchanged = 1, old_imei = ?, new_imei = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(old_imei.trim(), new_imei.trim(), notes?.trim() || existing.notes, recordId)

    db.prepare(`
      INSERT INTO imei_records (imei, brand, model, repair_id, is_motherboard_repaired, is_device_exchanged, old_imei, new_imei, notes)
      VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?)
    `).run(
      new_imei.trim(),
      existing.brand,
      existing.model,
      existing.repair_id,
      old_imei.trim(),
      new_imei.trim(),
      notes?.trim() || '换机登记'
    )

    return recordId
  })

  try {
    const recordId = transaction()
    const record = getImeiRecordWithRepair(recordId)
    res.json({
      success: true,
      data: record,
      message: '已标记换机并创建新IMEI记录',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const info = db.prepare('DELETE FROM imei_records WHERE id = ?').run(req.params.id)
    if (info.changes === 0) {
      res.status(404).json({
        success: false,
        error: 'IMEI记录不存在',
      })
      return
    }
    res.json({
      success: true,
      message: '删除成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

export default router

