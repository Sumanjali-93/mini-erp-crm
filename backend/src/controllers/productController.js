import { getPool } from '../config/db.js';

// Get paginated and filtered products list
export async function getProducts(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const category = req.query.category || '';
  const lowStock = req.query.lowStock === 'true';

  try {
    const pool = getPool();
    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR sku LIKE ? OR location LIKE ?)');
      const wild = `%${search}%`;
      params.push(wild, wild, wild);
    }

    if (category) {
      whereClauses.push('category = ?');
      params.push(category);
    }

    if (lowStock) {
      whereClauses.push('current_stock <= min_stock_alert');
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM products WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(
      `SELECT * FROM products WHERE ${whereSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      queryParams
    );

    res.json({
      products: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
}

// Get product details by ID (including stock logs)
export async function getProductById(req, res) {
  const { id } = req.params;

  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    const products = rows;

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [logRows] = await pool.query(
      `SELECT l.*, u.name as created_by_name 
       FROM stock_movement_logs l 
       JOIN users u ON l.created_by = u.id 
       WHERE l.product_id = ? 
       ORDER BY l.timestamp DESC`,
      [id]
    );

    res.json({
      product: products[0],
      logs: logRows
    });
  } catch (error) {
    console.error('getProductById error:', error);
    res.status(500).json({ error: 'Failed to retrieve product details' });
  }
}

// Create a new product
export async function createProduct(req, res) {
  const {
    name,
    sku,
    category,
    unit_price,
    current_stock,
    min_stock_alert,
    location
  } = req.body;

  if (!name || !sku || !category || unit_price === undefined || !location) {
    return res.status(400).json({ error: 'Required fields: name, sku, category, unit_price, location' });
  }

  const price = parseFloat(unit_price);
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'Unit price must be a positive number' });
  }

  const initialStock = parseInt(current_stock) || 0;
  if (initialStock < 0) {
    return res.status(400).json({ error: 'Initial stock cannot be negative' });
  }

  const minAlert = parseInt(min_stock_alert) || 5;

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM products WHERE sku = ?', [sku]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: `Product with SKU '${sku}' already exists.` });
    }

    const [result] = await conn.query(
      `INSERT INTO products 
       (name, sku, category, unit_price, current_stock, min_stock_alert, location) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category, price, initialStock, minAlert, location]
    );

    const newId = result.insertId;

    if (initialStock > 0) {
      await conn.query(
        `INSERT INTO stock_movement_logs 
         (product_id, quantity_changed, movement_type, reason, created_by) 
         VALUES (?, ?, ?, ?, ?)`,
        [newId, initialStock, 'IN', 'Initial stock entry', req.user.id]
      );
    }

    await conn.commit();
    res.status(201).json({ id: newId, message: 'Product created successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('createProduct error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    conn.release();
  }
}

// Edit product details
export async function updateProduct(req, res) {
  const { id } = req.params;
  const {
    name,
    sku,
    category,
    unit_price,
    min_stock_alert,
    location
  } = req.body;

  if (!name || !sku || !category || unit_price === undefined || !location) {
    return res.status(400).json({ error: 'Required fields: name, sku, category, unit_price, location' });
  }

  const price = parseFloat(unit_price);
  if (isNaN(price) || price < 0) {
    return res.status(400).json({ error: 'Unit price must be a positive number' });
  }

  const minAlert = parseInt(min_stock_alert) || 5;

  const pool = getPool();
  try {
    const [check] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const [existing] = await pool.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: `Product with SKU '${sku}' is already in use by another product.` });
    }

    await pool.query(
      `UPDATE products 
       SET name = ?, sku = ?, category = ?, unit_price = ?, min_stock_alert = ?, location = ? 
       WHERE id = ?`,
      [name, sku, category, price, minAlert, location, id]
    );

    res.json({ message: 'Product details updated successfully' });
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
}

// Record stock movement manually
export async function addStockMovement(req, res) {
  const { id } = req.params;
  const { quantity, movement_type, reason } = req.body;

  if (quantity === undefined || !movement_type || !reason) {
    return res.status(400).json({ error: 'Required fields: quantity, movement_type, reason' });
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number' });
  }

  if (movement_type !== 'IN' && movement_type !== 'OUT') {
    return res.status(400).json({ error: "Movement type must be 'IN' or 'OUT'" });
  }

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT current_stock FROM products WHERE id = ? FOR UPDATE', [id]);
    const products = rows;

    if (products.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentStock = products[0].current_stock;
    let newStock = currentStock;

    if (movement_type === 'IN') {
      newStock += qty;
    } else {
      newStock -= qty;
      if (newStock < 0) {
        await conn.rollback();
        return res.status(400).json({ error: `Insufficient stock. Current stock: ${currentStock}, requested reduction: ${qty}` });
      }
    }

    await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, id]);

    await conn.query(
      `INSERT INTO stock_movement_logs 
       (product_id, quantity_changed, movement_type, reason, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, qty, movement_type, reason, req.user.id]
    );

    await conn.commit();
    res.json({ message: 'Stock updated successfully', newStock });
  } catch (error) {
    await conn.rollback();
    console.error('addStockMovement error:', error);
    res.status(500).json({ error: 'Failed to record stock movement' });
  } finally {
    conn.release();
  }
}
