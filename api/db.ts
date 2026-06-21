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
      version TEXT DEFAULT 'original' CHECK (version IN ('original', 'high_copy', 'after_press')),
      safety_stock INTEGER DEFAULT 0,
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

  const partColumns = db.prepare('PRAGMA table_info(parts)').all() as { name: string }[]
  const partColumnNames = partColumns.map((c) => c.name)
  if (!partColumnNames.includes('version')) {
    db.exec("ALTER TABLE parts ADD COLUMN version TEXT DEFAULT 'original'")
  }
  if (!partColumnNames.includes('safety_stock')) {
    db.exec('ALTER TABLE parts ADD COLUMN safety_stock INTEGER DEFAULT 0')
    db.exec("UPDATE parts SET safety_stock = 3 WHERE type = 'screen'")
    db.exec("UPDATE parts SET safety_stock = 5 WHERE type = 'battery'")
    db.exec("UPDATE parts SET safety_stock = 2 WHERE type = 'other'")
  }

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
    { type: 'screen', brand: 'Apple', model: 'iPhone 13', color: '黑色', capacity: null, version: 'original', safety_stock: 3, name: 'iPhone 13 黑色屏幕总成 (原装)', sku: 'SCR-IP13-BLK-ORG', stock: 5, price: 600, cost: 450 },
    { type: 'screen', brand: 'Apple', model: 'iPhone 13', color: '黑色', capacity: null, version: 'high_copy', safety_stock: 3, name: 'iPhone 13 黑色屏幕总成 (高仿)', sku: 'SCR-IP13-BLK-CPY', stock: 2, price: 350, cost: 200 },
    { type: 'screen', brand: 'Apple', model: 'iPhone 13', color: '白色', capacity: null, version: 'original', safety_stock: 3, name: 'iPhone 13 白色屏幕总成 (原装)', sku: 'SCR-IP13-WHT-ORG', stock: 3, price: 600, cost: 450 },
    { type: 'screen', brand: 'Apple', model: 'iPhone 14', color: '黑色', capacity: null, version: 'after_press', safety_stock: 3, name: 'iPhone 14 黑色屏幕总成 (后压)', sku: 'SCR-IP14-BLK-RFB', stock: 1, price: 500, cost: 300 },
    { type: 'screen', brand: 'Huawei', model: 'Mate 40 Pro', color: '黑色', capacity: null, version: 'original', safety_stock: 3, name: 'Mate 40 Pro 黑色屏幕总成 (原装)', sku: 'SCR-M40P-BLK-ORG', stock: 2, price: 700, cost: 520 },
    { type: 'screen', brand: 'Xiaomi', model: 'Mi 12', color: '黑色', capacity: null, version: 'high_copy', safety_stock: 3, name: 'Mi 12 黑色屏幕总成 (高仿)', sku: 'SCR-MI12-BLK-CPY', stock: 6, price: 280, cost: 160 },
    { type: 'battery', brand: 'Apple', model: 'iPhone 13', color: null, capacity: '3227mAh', version: 'original', safety_stock: 5, name: 'iPhone 13 电池 (3227mAh 原装)', sku: 'BAT-IP13-3227-ORG', stock: 10, price: 180, cost: 120 },
    { type: 'battery', brand: 'Apple', model: 'iPhone 14', color: null, capacity: '3279mAh', version: 'high_copy', safety_stock: 5, name: 'iPhone 14 电池 (3279mAh 高仿)', sku: 'BAT-IP14-3279-CPY', stock: 4, price: 90, cost: 50 },
    { type: 'battery', brand: 'Huawei', model: 'Mate 40 Pro', color: null, capacity: '4400mAh', version: 'original', safety_stock: 5, name: 'Mate 40 Pro 电池 (4400mAh 原装)', sku: 'BAT-M40P-4400-ORG', stock: 5, price: 150, cost: 100 },
    { type: 'battery', brand: 'Xiaomi', model: 'Mi 12', color: null, capacity: '4500mAh', version: 'original', safety_stock: 5, name: 'Mi 12 电池 (4500mAh 原装)', sku: 'BAT-MI12-4500-ORG', stock: 7, price: 130, cost: 85 },
  ]

  const checkParts = db.prepare('SELECT COUNT(*) as count FROM parts')
  const partsResult = checkParts.get() as { count: number }
  if (partsResult.count === 0) {
    const insertPart = db.prepare(
      'INSERT INTO parts (type, brand, model, color, capacity, version, safety_stock, name, sku, stock, price, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    defaultParts.forEach((p) => {
      insertPart.run(p.type, p.brand, p.model, p.color, p.capacity, p.version, p.safety_stock, p.name, p.sku, p.stock, p.price, p.cost)
    })
  }
}
