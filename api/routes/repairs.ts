import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

interface RepairWithCustomer {
  id: number
  customer_id: number
  brand: string
  model: string
  imei: string | null
  fault_description: string
  appearance_check: string | null
  status: string
  total_price: number
  created_at: string
  updated_at: string
  picked_at: string | null
  customer_name: string
  customer_phone: string
}

function getRepairWithCustomer(id: number): RepairWithCustomer | undefined {
  const sql = `
    SELECT r.*, c.name as customer_name, c.phone as customer_phone
    FROM repairs r
    JOIN customers c ON r.customer_id = c.id
    WHERE r.id = ?
  `
  return db.prepare(sql).get(id) as RepairWithCustomer | undefined
}

function getAllRepairsWithCustomer(status?: string): RepairWithCustomer[] {
  let sql = `
    SELECT r.*, c.name as customer_name, c.phone as customer_phone
    FROM repairs r
    JOIN customers c ON r.customer_id = c.id
  `
  if (status) {
    sql += " WHERE r.status = ?"
    sql += " ORDER BY r.created_at DESC"
    return db.prepare(sql).all(status) as RepairWithCustomer[]
  }
  sql += " ORDER BY r.created_at DESC"
  return db.prepare(sql).all() as RepairWithCustomer[]
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query
    const repairs = getAllRepairsWithCustomer(status as string)
    res.json({
      success: true,
      data: repairs,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const pending = db.prepare("SELECT COUNT(*) as count FROM repairs WHERE status = 'pending'").get() as { count: number }
    const repairing = db.prepare("SELECT COUNT(*) as count FROM repairs WHERE status = 'repairing'").get() as { count: number }
    const ready = db.prepare("SELECT COUNT(*) as count FROM repairs WHERE status = 'ready'").get() as { count: number }
    const picked = db.prepare("SELECT COUNT(*) as count FROM repairs WHERE status = 'picked'").get() as { count: number }

    const todaySql = `
      SELECT SUM(total_price) as total FROM repairs
      WHERE DATE(created_at) = DATE('now')
    `
    const todayRevenue = db.prepare(todaySql).get() as { total: number | null }

    res.json({
      success: true,
      data: {
        pending: pending.count,
        repairing: repairing.count,
        ready: ready.count,
        picked: picked.count,
        todayRevenue: todayRevenue.total || 0,
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
    const repair = getRepairWithCustomer(Number(req.params.id))
    if (!repair) {
      res.status(404).json({
        success: false,
        error: '维修单不存在',
      })
      return
    }

    const services = db.prepare(`
      SELECT rs.*, ri.name, ri.code
      FROM repair_services rs
      JOIN repair_items ri ON rs.repair_item_id = ri.id
      WHERE rs.repair_id = ?
    `).all(req.params.id)

    const parts = db.prepare(`
      SELECT rp.*, p.name, p.sku, p.type, p.brand, p.model, p.color, p.capacity
      FROM repair_parts rp
      JOIN parts p ON rp.part_id = p.id
      WHERE rp.repair_id = ?
    `).all(req.params.id)

    const photos = db.prepare(`
      SELECT * FROM repair_photos WHERE repair_id = ?
    `).all(req.params.id)

    const logs = db.prepare(`
      SELECT * FROM repair_status_logs WHERE repair_id = ? ORDER BY created_at DESC
    `).all(req.params.id)

    const signature = db.prepare(`
      SELECT * FROM signatures WHERE repair_id = ?
    `).get(req.params.id)

    res.json({
      success: true,
      data: {
        ...repair,
        services,
        parts,
        photos,
        logs,
        signature,
      },
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
    const { customerName, customerPhone, brand, model, imei, faultDescription, appearanceCheck, photos } = req.body

    let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(customerPhone)
    let customerId: number

    if (customer) {
      customerId = (customer as { id: number }).id
    } else {
      const customerInfo = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(customerName, customerPhone)
      customerId = Number(customerInfo.lastInsertRowid)
    }

    const repairInfo = db.prepare(`
      INSERT INTO repairs (customer_id, brand, model, imei, fault_description, appearance_check)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(customerId, brand, model, imei || null, faultDescription, appearanceCheck || null)

    const repairId = Number(repairInfo.lastInsertRowid)

    if (photos && photos.length > 0) {
      const insertPhoto = db.prepare('INSERT INTO repair_photos (repair_id, photo_data, photo_type) VALUES (?, ?, ?)')
      photos.forEach((photo: string) => {
        insertPhoto.run(repairId, photo, 'appearance')
      })
    }

    db.prepare('INSERT INTO repair_status_logs (repair_id, status, remark) VALUES (?, ?, ?)').run(
      repairId,
      'pending',
      '接机登记'
    )

    return repairId
  })

  try {
    const repairId = transaction()
    const repair = getRepairWithCustomer(repairId)
    res.json({
      success: true,
      data: repair,
      message: '接机登记成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/:id/services', async (req: Request, res: Response): Promise<void> => {
  const transaction = db.transaction(() => {
    const { services } = req.body
    const repairId = Number(req.params.id)

    db.prepare('DELETE FROM repair_services WHERE repair_id = ?').run(repairId)

    const insertService = db.prepare(`
      INSERT INTO repair_services (repair_id, repair_item_id, price)
      VALUES (?, ?, ?)
    `)

    services.forEach((s: { repair_item_id: number; price: number }) => {
      insertService.run(repairId, s.repair_item_id, s.price)
    })

    updateTotalPrice(repairId)
  })

  try {
    transaction()
    res.json({
      success: true,
      message: '维修项目添加成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

function updateTotalPrice(repairId: number) {
  const servicesTotal = db.prepare(`
    SELECT COALESCE(SUM(price), 0) as total FROM repair_services WHERE repair_id = ?
  `).get(repairId) as { total: number }

  const partsTotal = db.prepare(`
    SELECT COALESCE(SUM(price * quantity), 0) as total FROM repair_parts WHERE repair_id = ?
  `).get(repairId) as { total: number }

  const total = servicesTotal.total + partsTotal.total

  db.prepare('UPDATE repairs SET total_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(total, repairId)
}

router.post('/:id/parts', async (req: Request, res: Response): Promise<void> => {
  const transaction = db.transaction(() => {
    const { parts } = req.body
    const repairId = Number(req.params.id)

    const existingParts = db.prepare('SELECT part_id, quantity FROM repair_parts WHERE repair_id = ?').all(repairId) as { part_id: number; quantity: number }[]
    existingParts.forEach(ep => {
      db.prepare('UPDATE parts SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(ep.quantity, ep.part_id)
    })

    db.prepare('DELETE FROM repair_parts WHERE repair_id = ?').run(repairId)

    const insertPart = db.prepare(`
      INSERT INTO repair_parts (repair_id, part_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `)

    parts.forEach((p: { part_id: number; quantity: number; price: number }) => {
      const part = db.prepare('SELECT stock FROM parts WHERE id = ?').get(p.part_id) as { stock: number }
      if (!part) {
        throw new Error(`配件 ${p.part_id} 不存在`)
      }
      if (part.stock < p.quantity) {
        throw new Error(`配件库存不足`)
      }

      insertPart.run(repairId, p.part_id, p.quantity, p.price)
      db.prepare('UPDATE parts SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(p.quantity, p.part_id)
    })

    updateTotalPrice(repairId)
  })

  try {
    transaction()
    res.json({
      success: true,
      message: '配件出库成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, remark } = req.body
    const repairId = Number(req.params.id)

    const validStatuses = ['pending', 'repairing', 'ready', 'picked']
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: '无效的状态值',
      })
      return
    }

    const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(repairId)
    if (!repair) {
      res.status(404).json({
        success: false,
        error: '维修单不存在',
      })
      return
    }

    if (status === 'picked') {
      db.prepare("UPDATE repairs SET status = ?, picked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, repairId)
    } else {
      db.prepare("UPDATE repairs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, repairId)
    }

    db.prepare('INSERT INTO repair_status_logs (repair_id, status, remark) VALUES (?, ?, ?)').run(
      repairId,
      status,
      remark || ''
    )

    res.json({
      success: true,
      message: '状态更新成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/:id/signature', async (req: Request, res: Response): Promise<void> => {
  try {
    const { signatureData, signerName } = req.body
    const repairId = Number(req.params.id)

    const repair = db.prepare('SELECT * FROM repairs WHERE id = ?').get(repairId)
    if (!repair) {
      res.status(404).json({
        success: false,
        error: '维修单不存在',
      })
      return
    }

    const existingSig = db.prepare('SELECT * FROM signatures WHERE repair_id = ?').get(repairId)
    if (existingSig) {
      db.prepare('UPDATE signatures SET signature_data = ?, signer_name = ? WHERE repair_id = ?').run(
        signatureData,
        signerName || null,
        repairId
      )
    } else {
      db.prepare('INSERT INTO signatures (repair_id, signature_data, signer_name) VALUES (?, ?, ?)').run(
        repairId,
        signatureData,
        signerName || null
      )
    }

    res.json({
      success: true,
      message: '签字保存成功',
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
    const info = db.prepare('DELETE FROM repairs WHERE id = ?').run(req.params.id)
    if (info.changes === 0) {
      res.status(404).json({
        success: false,
        error: '维修单不存在',
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
