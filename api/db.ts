import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'repair_shop.db')
export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDatabase() {
  const createCustomers = `
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  db.exec(createCustomers)

  const createRepairs = `
    CREATE TABLE IF NOT EXISTS repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      imei TEXT,
      fault_description TEXT NOT NULL,
      appearance_check TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'repairing', 'ready', 'picked')),
      total_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      picked_at DATETIME,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `
  db.exec(createRepairs)

  const createRepairItems = `
    CREATE TABLE IF NOT EXISTS repair_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      default_price REAL DEFAULT 0,
      description TEXT
    )
  `
  db.exec(createRepairItems)

  const createRepairServices = `
    CREATE TABLE IF NOT EXISTS repair_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL,
      repair_item_id INTEGER NOT NULL,
      price REAL DEFAULT 0,
      FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE,
      FOREIGN KEY (repair_item_id) REFERENCES repair_items(id)
    )
  `
  db.exec(createRepairServices)

  const createParts = `
    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('screen', 'battery', 'other')),
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      color TEXT,
      capacity TEXT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      stock INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
  db.exec(createParts)

  const createRepairParts = `
    CREATE TABLE IF NOT EXISTS repair_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL,
      part_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE,
      FOREIGN KEY (part_id) REFERENCES parts(id)
    )
  `
  db.exec(createRepairParts)

  const createRepairPhotos = `
    CREATE TABLE IF NOT EXISTS repair_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL,
      photo_data TEXT NOT NULL,
      photo_type TEXT DEFAULT 'appearance',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE
    )
  `
  db.exec(createRepairPhotos)

  const createRepairStatusLogs = `
    CREATE TABLE IF NOT EXISTS repair_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      remark TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE
    )
  `
  db.exec(createRepairStatusLogs)

  const createSignatures = `
    CREATE TABLE IF NOT EXISTS signatures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repair_id INTEGER NOT NULL UNIQUE,
      signature_data TEXT NOT NULL,
      signer_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE
    )
  `
  db.exec(createSignatures)

  const defaultItems = [
    { name: '换屏', code: 'screen_replace', default_price: 200, description: '更换屏幕总成' },
    { name: '换电池', code: 'battery_replace', default_price: 100, description: '更换电池' },
    { name: '换尾插', code: 'tail_replace', default_price: 80, description: '更换尾插接口' },
    { name: '主板维修', code: 'motherboard_repair', default_price: 300, description: '主板故障检测与维修' },
    { name: '进水处理', code: 'water_damage', default_price: 150, description: '进水设备清洗处理' },
    { name: '换摄像头', code: 'camera_replace', default_price: 120, description: '更换摄像头' },
    { name: '换听筒', code: 'earpiece_replace', default_price: 60, description: '更换听筒' },
    { name: '系统重装', code: 'os_reinstall', default_price: 50, description: '系统刷机/重装' },
  ]

  const checkItems = db.prepare('SELECT COUNT(*) as count FROM repair_items')
  const result = checkItems.get() as { count: number }
  if (result.count === 0) {
    const insertItem = db.prepare(
      'INSERT INTO repair_items (name, code, default_price, description) VALUES (?, ?, ?, ?)'
    )
    defaultItems.forEach((item) => {
      insertItem.run(item.name, item.code, item.default_price, item.description)
    })
  }

  const defaultParts = [
    { type: 'screen', brand: 'Apple', model: 'iPhone 13', color: '黑色', capacity: null, name: 'iPhone 13 黑色屏幕总成', sku: 'SCR-IP13-BLK', stock: 5, price: 600, cost: 450 },
    { type: 'screen', brand: 'Apple', model: 'iPhone 13', color: '白色', capacity: null, name: 'iPhone 13 白色屏幕总成', sku: 'SCR-IP13-WHT', stock: 3, price: 600, cost: 450 },
    { type: 'screen', brand: 'Apple', model: 'iPhone 14', color: '黑色', capacity: null, name: 'iPhone 14 黑色屏幕总成', sku: 'SCR-IP14-BLK', stock: 4, price: 800, cost: 600 },
    { type: 'screen', brand: 'Huawei', model: 'Mate 40 Pro', color: '黑色', capacity: null, name: 'Mate 40 Pro 黑色屏幕总成', sku: 'SCR-M40P-BLK', stock: 2, price: 700, cost: 520 },
    { type: 'screen', brand: 'Xiaomi', model: 'Mi 12', color: '黑色', capacity: null, name: 'Mi 12 黑色屏幕总成', sku: 'SCR-MI12-BLK', stock: 6, price: 450, cost: 330 },
    { type: 'battery', brand: 'Apple', model: 'iPhone 13', color: null, capacity: '3227mAh', name: 'iPhone 13 电池 (3227mAh)', sku: 'BAT-IP13-3227', stock: 10, price: 180, cost: 120 },
    { type: 'battery', brand: 'Apple', model: 'iPhone 14', color: null, capacity: '3279mAh', name: 'iPhone 14 电池 (3279mAh)', sku: 'BAT-IP14-3279', stock: 8, price: 200, cost: 140 },
    { type: 'battery', brand: 'Huawei', model: 'Mate 40 Pro', color: null, capacity: '4400mAh', name: 'Mate 40 Pro 电池 (4400mAh)', sku: 'BAT-M40P-4400', stock: 5, price: 150, cost: 100 },
    { type: 'battery', brand: 'Xiaomi', model: 'Mi 12', color: null, capacity: '4500mAh', name: 'Mi 12 电池 (4500mAh)', sku: 'BAT-MI12-4500', stock: 7, price: 130, cost: 85 },
  ]

  const checkParts = db.prepare('SELECT COUNT(*) as count FROM parts')
  const partsResult = checkParts.get() as { count: number }
  if (partsResult.count === 0) {
    const insertPart = db.prepare(
      'INSERT INTO parts (type, brand, model, color, capacity, name, sku, stock, price, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    defaultParts.forEach((p) => {
      insertPart.run(p.type, p.brand, p.model, p.color, p.capacity, p.name, p.sku, p.stock, p.price, p.cost)
    })
  }
}
