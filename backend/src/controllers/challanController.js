import { getPool } from '../config/db.js';

// Generate sequential challan number: CH-YYYYMMDD-XXXX
async function generateChallanNumber(connection) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM sales_challans WHERE challan_number LIKE ?`,
    [`CH-${dateStr}-%`]
  );
  
  const nextSeq = String(rows[0].count + 1).padStart(4, '0');
  return `CH-${dateStr}-${nextSeq}`;
}

// Get paginated and filtered challan list
export async function getChallans(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const status = req.query.status || '';
  const search = req.query.search || '';

  try {
    const pool = getPool();
    let whereClauses = ['1=1'];
    let params = [];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (search) {
      whereClauses.push('challan_number LIKE ?');
      params.push(`%${search}%`);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM sales_challans WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT c.*, u.name as created_by_name 
       FROM sales_challans c
       JOIN users u ON c.created_by = u.id
       WHERE ${whereSql} 
       ORDER BY c.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      challans: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getChallans error:', error);
    res.status(500).json({ error: 'Failed to retrieve challans' });
  }
}

// Get challan details by ID
export async function getChallanById(req, res) {
  const { id } = req.params;

  try {
    const pool = getPool();
    const [challanRows] = await pool.query(
      `SELECT c.*, u.name as created_by_name 
       FROM sales_challans c
       JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [id]
    );

    const challans = challanRows;
    if (challans.length === 0) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    const [itemRows] = await pool.query(
      `SELECT * FROM sales_challan_items WHERE challan_id = ?`,
      [id]
    );

    res.json({
      challan: challans[0],
      items: itemRows
    });
  } catch (error) {
    console.error('getChallanById error:', error);
    res.status(500).json({ error: 'Failed to retrieve challan details' });
  }
}

// Create a new sales challan
export async function createChallan(req, res) {
  const { customer_id, products, status } = req.body;

  if (!customer_id || !products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Required fields: customer_id, products (non-empty array)' });
  }

  const challanStatus = status || 'Draft';
  if (!['Draft', 'Confirmed'].includes(challanStatus)) {
    return res.status(400).json({ error: "Status must be 'Draft' or 'Confirmed'" });
  }

  for (const p of products) {
    if (!p.product_id || p.quantity === undefined || p.quantity <= 0) {
      return res.status(400).json({ error: 'Each product must have product_id and a positive quantity' });
    }
  }

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [custRows] = await conn.query('SELECT * FROM customers WHERE id = ?', [customer_id]);
    const customers = custRows;
    if (customers.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Customer not found' });
    }
    const customer = customers[0];
    const customerSnapshot = {
      id: customer.id,
      name: customer.name,
      business_name: customer.business_name,
      email: customer.email,
      mobile: customer.mobile,
      gst_number: customer.gst_number,
      address: customer.address
    };

    const challanNumber = await generateChallanNumber(conn);

    let totalQuantity = 0;
    const challanItems = [];

    for (const item of products) {
      const query = challanStatus === 'Confirmed'
        ? 'SELECT * FROM products WHERE id = ? FOR UPDATE'
        : 'SELECT * FROM products WHERE id = ?';
        
      const [prodRows] = await conn.query(query, [item.product_id]);
      const productList = prodRows;

      if (productList.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: `Product with ID ${item.product_id} not found` });
      }

      const product = productList[0];
      const quantity = parseInt(item.quantity);

      if (challanStatus === 'Confirmed') {
        if (product.current_stock < quantity) {
          await conn.rollback();
          return res.status(400).json({ 
            error: `Insufficient stock for product '${product.name}' (SKU: ${product.sku}). Available: ${product.current_stock}, Requested: ${quantity}` 
          });
        }

        const newStock = product.current_stock - quantity;
        await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, product.id]);
      }

      totalQuantity += quantity;

      const productSnapshot = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit_price: product.unit_price,
        location: product.location
      };

      challanItems.push({
        product_id: product.id,
        product_snapshot: productSnapshot,
        quantity,
        unit_price: product.unit_price
      });
    }

    const [challanResult] = await conn.query(
      `INSERT INTO sales_challans 
       (challan_number, customer_id, customer_snapshot, total_quantity, status, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        challanNumber,
        customer_id,
        JSON.stringify(customerSnapshot),
        totalQuantity,
        challanStatus,
        req.user.id
      ]
    );

    const challanId = challanResult.insertId;

    for (const ci of challanItems) {
      await conn.query(
        `INSERT INTO sales_challan_items 
         (challan_id, product_id, product_snapshot, quantity, unit_price) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          challanId,
          ci.product_id,
          JSON.stringify(ci.product_snapshot),
          ci.quantity,
          ci.unit_price
        ]
      );

      if (challanStatus === 'Confirmed') {
        await conn.query(
          `INSERT INTO stock_movement_logs 
           (product_id, quantity_changed, movement_type, reason, created_by) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            ci.product_id,
            ci.quantity,
            'OUT',
            `Sales Challan ${challanNumber} Confirmed`,
            req.user.id
          ]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: challanId, challan_number: challanNumber, message: 'Challan created successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('createChallan error:', error);
    res.status(500).json({ error: 'Failed to create challan' });
  } finally {
    conn.release();
  }
}

// Update Challan Status
export async function updateChallanStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Confirmed', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'Confirmed' or 'Cancelled'" });
  }

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [challanRows] = await conn.query('SELECT * FROM sales_challans WHERE id = ? FOR UPDATE', [id]);
    const challans = challanRows;

    if (challans.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Challan not found' });
    }

    const challan = challans[0];

    if (challan.status === status) {
      await conn.rollback();
      return res.status(400).json({ error: `Challan is already in '${status}' status.` });
    }

    if (challan.status === 'Cancelled') {
      await conn.rollback();
      return res.status(400).json({ error: 'Cannot modify a cancelled challan.' });
    }

    const [items] = await conn.query('SELECT * FROM sales_challan_items WHERE challan_id = ?', [id]);
    const itemRows = items;

    if (challan.status === 'Draft' && status === 'Confirmed') {
      for (const item of itemRows) {
        if (!item.product_id) {
          await conn.rollback();
          return res.status(400).json({ error: 'Cannot confirm challan: product reference is missing.' });
        }

        const [prodRows] = await conn.query('SELECT current_stock, name FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
        const products = prodRows;

        if (products.length === 0) {
          await conn.rollback();
          return res.status(400).json({ error: `Product with ID ${item.product_id} no longer exists.` });
        }

        const product = products[0];
        if (product.current_stock < item.quantity) {
          await conn.rollback();
          return res.status(400).json({ 
            error: `Insufficient stock for product '${product.name}'. Available: ${product.current_stock}, Required: ${item.quantity}` 
          });
        }

        const newStock = product.current_stock - item.quantity;
        await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.product_id]);

        await conn.query(
          `INSERT INTO stock_movement_logs 
           (product_id, quantity_changed, movement_type, reason, created_by) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            item.product_id,
            item.quantity,
            'OUT',
            `Sales Challan ${challan.challan_number} Confirmed`,
            req.user.id
          ]
        );
      }
    }

    if (challan.status === 'Confirmed' && status === 'Cancelled') {
      for (const item of itemRows) {
        if (item.product_id) {
          const [prodRows] = await conn.query('SELECT current_stock FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
          const products = prodRows;

          if (products.length > 0) {
            const newStock = products[0].current_stock + item.quantity;
            await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.product_id]);

            await conn.query(
              `INSERT INTO stock_movement_logs 
               (product_id, quantity_changed, movement_type, reason, created_by) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                item.product_id,
                item.quantity,
                'IN',
                `Sales Challan ${challan.challan_number} Cancelled (Returned)`,
                req.user.id
              ]
            );
          }
        }
      }
    }

    await conn.query('UPDATE sales_challans SET status = ? WHERE id = ?', [status, id]);

    await conn.commit();
    res.json({ message: `Challan status updated to ${status} successfully` });
  } catch (error) {
    await conn.rollback();
    console.error('updateChallanStatus error:', error);
    res.status(500).json({ error: 'Failed to update challan status' });
  } finally {
    conn.release();
  }
}
