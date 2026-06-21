import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, brand, model, keyword } = req.query
    let sql = 'SELECT * FROM parts WHERE 1=1'
    const params: (string | number)[] = []

    if (type) {
      sql += ' AND type = ?'
      params.push(type as string)
    }
    if (brand) {
      sql += ' AND brand = ?'
      params.push(brand as string)
    }
    if (model) {
      sql += ' AND model = ?'
      params.push(model as string)
    }
    if (keyword) {
      sql += ' AND (name LIKE ? OR sku LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    sql += ' ORDER BY type, brand, model, version, color, capacity'
    const parts = db.prepare(sql).all(...params)

    res.json({
      success: true,
      data: parts,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.get('/low-stock', async (req: Request, res: Response): Promise<void> => {
  try {
    const parts = db
      .prepare(
        "SELECT * FROM parts WHERE safety_stock > 0 AND stock < safety_stock ORDER BY (safety_stock - stock) DESC, type, brand, model"
      )
      .all()

    res.json({
      success: true,
      data: parts,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.get('/screens', async (req: Request, res: Response): Promise<void> => {
  try {
    const { brand, model } = req.query
    let sql = "SELECT * FROM parts WHERE type = 'screen'"
    const params: (string | number)[] = []

    if (brand) {
      sql += ' AND brand = ?'
      params.push(brand as string)
    }
    if (model) {
      sql += ' AND model = ?'
      params.push(model as string)
    }

    sql += ' ORDER BY brand, model, version, color'
    const parts = db.prepare(sql).all(...params)

    res.json({
      success: true,
      data: parts,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.get('/batteries', async (req: Request, res: Response): Promise<void> => {
  try {
    const { brand, model } = req.query
    let sql = "SELECT * FROM parts WHERE type = 'battery'"
    const params: (string | number)[] = []

    if (brand) {
      sql += ' AND brand = ?'
      params.push(brand as string)
    }
    if (model) {
      sql += ' AND model = ?'
      params.push(model as string)
    }

    sql += ' ORDER BY brand, model, version, capacity'
    const parts = db.prepare(sql).all(...params)

    res.json({
      success: true,
      data: parts,
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
    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id)
    if (!part) {
      res.status(404).json({
        success: false,
        error: '配件不存在',
      })
      return
    }
    res.json({
      success: true,
      data: part,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, brand, model, color, capacity, version, safety_stock, name, sku, stock, price, cost } = req.body
    const info = db
      .prepare(
        'INSERT INTO parts (type, brand, model, color, capacity, version, safety_stock, name, sku, stock, price, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        type,
        brand,
        model,
        color || null,
        capacity || null,
        version || 'original',
        safety_stock ?? 0,
        name,
        sku,
        stock || 0,
        price || 0,
        cost || 0
      )

    res.json({
      success: true,
      data: {
        id: info.lastInsertRowid,
        type,
        brand,
        model,
        color,
        capacity,
        version: version || 'original',
        safety_stock: safety_stock ?? 0,
        name,
        sku,
        stock,
        price,
        cost,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, brand, model, color, capacity, version, safety_stock, name, sku, stock, price, cost } = req.body
    const info = db
      .prepare(
        'UPDATE parts SET type = ?, brand = ?, model = ?, color = ?, capacity = ?, version = ?, safety_stock = ?, name = ?, sku = ?, stock = ?, price = ?, cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .run(
        type,
        brand,
        model,
        color || null,
        capacity || null,
        version || 'original',
        safety_stock ?? 0,
        name,
        sku,
        stock || 0,
        price || 0,
        cost || 0,
        req.params.id
      )

    if (info.changes === 0) {
      res.status(404).json({
        success: false,
        error: '配件不存在',
      })
      return
    }

    res.json({
      success: true,
      message: '更新成功',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    })
  }
})

router.post('/:id/stock', async (req: Request, res: Response): Promise<void> => {
  try {
    const { quantity, operation } = req.body
    const part = db.prepare('SELECT * FROM parts WHERE id = ?').get(req.params.id)

    if (!part) {
      res.status(404).json({
        success: false,
        error: '配件不存在',
      })
      return
    }

    const partData = part as { stock: number }
    let newStock = partData.stock
    if (operation === 'add') {
      newStock += quantity
    } else if (operation === 'reduce') {
      if (partData.stock < quantity) {
        res.status(400).json({
          success: false,
          error: '库存不足',
        })
        return
      }
      newStock -= quantity
    }

    db.prepare('UPDATE parts SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      newStock,
      req.params.id
    )

    res.json({
      success: true,
      data: { stock: newStock },
      message: '库存更新成功',
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
    const info = db.prepare('DELETE FROM parts WHERE id = ?').run(req.params.id)
    if (info.changes === 0) {
      res.status(404).json({
        success: false,
        error: '配件不存在',
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
