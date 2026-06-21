import { Router, type Request, type Response } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const items = db.prepare('SELECT * FROM repair_items ORDER BY name').all()
    res.json({
      success: true,
      data: items,
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
    const item = db.prepare('SELECT * FROM repair_items WHERE id = ?').get(req.params.id)
    if (!item) {
      res.status(404).json({
        success: false,
        error: '维修项目不存在',
      })
      return
    }
    res.json({
      success: true,
      data: item,
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
    const { name, code, default_price, description } = req.body
    const info = db
      .prepare(
        'INSERT INTO repair_items (name, code, default_price, description) VALUES (?, ?, ?, ?)'
      )
      .run(name, code, default_price || 0, description || '')

    res.json({
      success: true,
      data: {
        id: info.lastInsertRowid,
        name,
        code,
        default_price,
        description,
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
    const { name, code, default_price, description } = req.body
    const info = db
      .prepare(
        'UPDATE repair_items SET name = ?, code = ?, default_price = ?, description = ? WHERE id = ?'
      )
      .run(name, code, default_price || 0, description || '', req.params.id)

    if (info.changes === 0) {
      res.status(404).json({
        success: false,
        error: '维修项目不存在',
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

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const info = db.prepare('DELETE FROM repair_items WHERE id = ?').run(req.params.id)
    if (info.changes === 0) {
      res.status(404).json({
        success: false,
        error: '维修项目不存在',
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
