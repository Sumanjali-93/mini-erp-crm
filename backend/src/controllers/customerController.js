import { getPool } from '../config/db.js';

// Get paginated and filtered customers list
export async function getCustomers(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';
  const status = req.query.status || '';
  const type = req.query.type || '';

  try {
    const pool = getPool();
    let whereClauses = ['1=1'];
    let params = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR business_name LIKE ? OR mobile LIKE ? OR email LIKE ?)');
      const wild = `%${search}%`;
      params.push(wild, wild, wild, wild);
    }

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM customers WHERE ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const queryParams = [...params, limit, offset];
    const [rows] = await pool.query(
      `SELECT * FROM customers WHERE ${whereSql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      queryParams
    );

    res.json({
      customers: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getCustomers error:', error);
    res.status(500).json({ error: 'Failed to retrieve customers' });
  }
}

// Get customer details by ID (including followups)
export async function getCustomerById(req, res) {
  const { id } = req.params;

  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    const customers = rows;

    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [followupRows] = await pool.query(
      `SELECT f.*, u.name as created_by_name 
       FROM customer_followups f 
       JOIN users u ON f.created_by = u.id 
       WHERE f.customer_id = ? 
       ORDER BY f.created_at DESC`,
      [id]
    );

    res.json({
      customer: customers[0],
      followups: followupRows
    });
  } catch (error) {
    console.error('getCustomerById error:', error);
    res.status(500).json({ error: 'Failed to retrieve customer details' });
  }
}

// Add a new customer
export async function createCustomer(req, res) {
  const {
    name,
    mobile,
    email,
    business_name,
    gst_number,
    type,
    address,
    status,
    follow_up_date,
    notes
  } = req.body;

  if (!name || !mobile || !email || !business_name || !type || !address) {
    return res.status(400).json({ error: 'Required fields: name, mobile, email, business_name, type, address' });
  }

  const validTypes = ['Retail', 'Wholesale', 'Distributor'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
  }

  const validStatuses = ['Lead', 'Active', 'Inactive'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO customers 
       (name, mobile, email, business_name, gst_number, type, address, status, follow_up_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        mobile,
        email,
        business_name,
        gst_number || null,
        type,
        address,
        status || 'Lead',
        follow_up_date || null,
        notes || null
      ]
    );

    const newId = result.insertId;

    await pool.query(
      'INSERT INTO customer_followups (customer_id, note, created_by) VALUES (?, ?, ?)',
      [newId, 'Customer profile created', req.user.id]
    );

    res.status(201).json({ id: newId, message: 'Customer created successfully' });
  } catch (error) {
    console.error('createCustomer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
}

// Edit customer details
export async function updateCustomer(req, res) {
  const { id } = req.params;
  const {
    name,
    mobile,
    email,
    business_name,
    gst_number,
    type,
    address,
    status,
    follow_up_date,
    notes
  } = req.body;

  if (!name || !mobile || !email || !business_name || !type || !address) {
    return res.status(400).json({ error: 'Required fields: name, mobile, email, business_name, type, address' });
  }

  try {
    const pool = getPool();
    
    const [check] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await pool.query(
      `UPDATE customers 
       SET name = ?, mobile = ?, email = ?, business_name = ?, gst_number = ?, 
           type = ?, address = ?, status = ?, follow_up_date = ?, notes = ? 
       WHERE id = ?`,
      [
        name,
        mobile,
        email,
        business_name,
        gst_number || null,
        type,
        address,
        status || 'Lead',
        follow_up_date || null,
        notes || null,
        id
      ]
    );

    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    console.error('updateCustomer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
}

// Add follow-up note
export async function addFollowUp(req, res) {
  const { id } = req.params;
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({ error: 'Follow-up note is required' });
  }

  try {
    const pool = getPool();

    const [check] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await pool.query(
      'INSERT INTO customer_followups (customer_id, note, created_by) VALUES (?, ?, ?)',
      [id, note, req.user.id]
    );

    res.status(201).json({ message: 'Follow-up note added successfully' });
  } catch (error) {
    console.error('addFollowUp error:', error);
    res.status(500).json({ error: 'Failed to add follow-up note' });
  }
}
