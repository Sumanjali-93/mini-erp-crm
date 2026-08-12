import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME
} = process.env;

let pool;

export async function initDatabase() {
  const connection = await mysql.createConnection({
    host: DB_HOST || 'localhost',
    port: Number(DB_PORT) || 3306,
    user: DB_USER || 'root',
    password: DB_PASSWORD || 'password'
  });

  const dbName = DB_NAME || 'mini_erp_crm';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.end();

  pool = mysql.createPool({
    host: DB_HOST || 'localhost',
    port: Number(DB_PORT) || 3306,
    user: DB_USER || 'root',
    password: DB_PASSWORD || 'password',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  console.log(`Connected to MySQL database: ${dbName}`);

  await createTables();
  await seedData();
}

async function createTables() {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('Admin', 'Sales', 'Warehouse', 'Accounts') NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const customersTable = `
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      mobile VARCHAR(20) NOT NULL,
      email VARCHAR(100) NOT NULL,
      business_name VARCHAR(150) NOT NULL,
      gst_number VARCHAR(15) NULL,
      type ENUM('Retail', 'Wholesale', 'Distributor') NOT NULL,
      address TEXT NOT NULL,
      status ENUM('Lead', 'Active', 'Inactive') DEFAULT 'Lead',
      follow_up_date DATE NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  const customerFollowupsTable = `
    CREATE TABLE IF NOT EXISTS customer_followups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      note TEXT NOT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const productsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      sku VARCHAR(50) UNIQUE NOT NULL,
      category VARCHAR(100) NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      current_stock INT NOT NULL DEFAULT 0,
      min_stock_alert INT NOT NULL DEFAULT 5,
      location VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  const stockMovementLogsTable = `
    CREATE TABLE IF NOT EXISTS stock_movement_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      quantity_changed INT NOT NULL,
      movement_type ENUM('IN', 'OUT') NOT NULL,
      reason VARCHAR(255) NOT NULL,
      created_by INT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const salesChallansTable = `
    CREATE TABLE IF NOT EXISTS sales_challans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      challan_number VARCHAR(50) UNIQUE NOT NULL,
      customer_id INT NOT NULL,
      customer_snapshot JSON NOT NULL,
      total_quantity INT NOT NULL DEFAULT 0,
      status ENUM('Draft', 'Confirmed', 'Cancelled') DEFAULT 'Draft',
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const salesChallanItemsTable = `
    CREATE TABLE IF NOT EXISTS sales_challan_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      challan_id INT NOT NULL,
      product_id INT NULL,
      product_snapshot JSON NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (challan_id) REFERENCES sales_challans(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );
  `;

  await pool.query(usersTable);
  await pool.query(customersTable);
  await pool.query(customerFollowupsTable);
  await pool.query(productsTable);
  await pool.query(stockMovementLogsTable);
  await pool.query(salesChallansTable);
  await pool.query(salesChallanItemsTable);
}

async function seedData() {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
  const count = rows[0].count;

  if (count === 0) {
    console.log('Seeding initial role-based users...');
    const usersToSeed = [
      { username: 'admin', password: 'admin123', role: 'Admin', name: 'System Administrator' },
      { username: 'sales', password: 'sales123', role: 'Sales', name: 'John CRM & Sales' },
      { username: 'warehouse', password: 'warehouse123', role: 'Warehouse', name: 'Robert Stock Manager' },
      { username: 'accounts', password: 'accounts123', role: 'Accounts', name: 'Sarah Ledger Accountant' }
    ];

    for (const u of usersToSeed) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        [u.username, hashedPassword, u.role, u.name]
      );
    }
    console.log('Users seeded successfully!');
  }

  // Seed sample products if empty
  const [pRows] = await pool.query('SELECT COUNT(*) as count FROM products');
  const pCount = pRows[0].count;
  if (pCount === 0) {
    console.log('Seeding sample products...');
    const productsToSeed = [
      { name: 'Dell 24" IPS Monitor', sku: 'DELL-MON-24', category: 'Electronics', unit_price: 149.99, current_stock: 25, min_stock_alert: 5, location: 'Warehouse A-01' },
      { name: 'Logitech MX Master 3S Mouse', sku: 'LOGI-MS-MX3', category: 'Accessories', unit_price: 99.99, current_stock: 4, min_stock_alert: 10, location: 'Warehouse A-02' },
      { name: 'Keychron K2 Mechanical Keyboard', sku: 'KCHR-KY-K2', category: 'Accessories', unit_price: 89.99, current_stock: 12, min_stock_alert: 5, location: 'Warehouse A-03' },
      { name: 'Apple MacBook Pro 14"', sku: 'APPL-MBP-14', category: 'Electronics', unit_price: 1999.99, current_stock: 8, min_stock_alert: 3, location: 'Warehouse B-01' }
    ];

    for (const p of productsToSeed) {
      const [res] = await pool.query(
        'INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.name, p.sku, p.category, p.unit_price, p.current_stock, p.min_stock_alert, p.location]
      );
      
      const productId = res.insertId;

      await pool.query(
        'INSERT INTO stock_movement_logs (product_id, quantity_changed, movement_type, reason, created_by) VALUES (?, ?, ?, ?, ?)',
        [productId, p.current_stock, 'IN', 'Initial seed stock', 1]
      );
    }
    console.log('Sample products seeded!');
  }

  // Seed sample customers if empty
  const [cRows] = await pool.query('SELECT COUNT(*) as count FROM customers');
  const cCount = cRows[0].count;
  if (cCount === 0) {
    console.log('Seeding sample customers...');
    const customersToSeed = [
      { name: 'Alice Smith', mobile: '+1234567890', email: 'alice@alphatech.com', business_name: 'Alpha Tech Solutions', gst_number: '27AAAAA1111A1Z1', type: 'Distributor', address: '123 Tech Park, Suite 400, Silicon Valley', status: 'Active', follow_up_date: '2026-08-20', notes: 'Prefers bulk shipping.' },
      { name: 'Bob Johnson', mobile: '+1987654321', email: 'bob@retailco.com', business_name: 'RetailCo Enterprises', gst_number: null, type: 'Retail', address: '456 Market St, Downtown', status: 'Lead', follow_up_date: '2026-08-15', notes: 'Inquired about monitors.' },
      { name: 'Charlie Green', mobile: '+15550199', email: 'charlie@wholesaler.net', business_name: 'Wholesale Depot Inc.', gst_number: '27BBBBB2222B2Z2', type: 'Wholesale', address: '789 Industrial Way, Gateway Hub', status: 'Active', follow_up_date: '2026-08-18', notes: 'Consistently orders accessories.' }
    ];

    for (const c of customersToSeed) {
      await pool.query(
        'INSERT INTO customers (name, mobile, email, business_name, gst_number, type, address, status, follow_up_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [c.name, c.mobile, c.email, c.business_name, c.gst_number, c.type, c.address, c.status, c.follow_up_date, c.notes]
      );
    }
    console.log('Sample customers seeded!');
  }
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase first.');
  }
  return pool;
}
