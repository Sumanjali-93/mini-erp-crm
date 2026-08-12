import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { safeFetch } from '../utils/api.js';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit2, 
  X, 
  Package, 
  MapPin, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  TrendingUp
} from 'lucide-react';

export default function Products() {
  const { user, token } = useAuth();

  // Data States
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  // Detail Modal States
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productDetail, setProductDetail] = useState(null);
  const [logs, setLogs] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Product Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit_price: '',
    current_stock: '0',
    min_stock_alert: '5',
    location: ''
  });
  const [formError, setFormError] = useState('');

  // Stock Adjust Modal States
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState(null);
  const [adjustProductName, setAdjustProductName] = useState('');
  const [adjustData, setAdjustData] = useState({
    quantity: '',
    movement_type: 'IN',
    reason: ''
  });
  const [adjustError, setAdjustError] = useState('');

  // Can this user modify inventory?
  const canModify = user.role === 'Admin' || user.role === 'Warehouse';

  // Load Products List
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page,
          search,
          category,
          lowStock: lowStock ? 'true' : 'false',
          limit: 6
        }).toString();

        const { ok, data } = await safeFetch(`/api/products?${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ok) {
          setProducts(data.products);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [token, page, search, category, lowStock]);

  // Load Product Details & Logs
  const handleViewDetail = async (id) => {
    setSelectedProductId(id);
    setDetailLoading(true);
    try {
      const { ok, data } = await safeFetch(`/api/products/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ok) {
        setProductDetail(data.product);
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Product Form for Add
  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({
      name: '',
      sku: '',
      category: '',
      unit_price: '',
      current_stock: '0',
      min_stock_alert: '5',
      location: ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Product Form for Edit
  const handleOpenEdit = (product) => {
    setEditId(product.id);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit_price: String(product.unit_price),
      current_stock: String(product.current_stock), // Read-only on edit, modified via adjustment
      min_stock_alert: String(product.min_stock_alert),
      location: product.location
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Submit Product Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const url = editId ? `/api/products/${editId}` : '/api/products';
      const method = editId ? 'PUT' : 'POST';

      // On Edit, backend ignores current_stock anyway to avoid audit issues
      const { ok, data } = await safeFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      setIsFormOpen(false);
      setPage(page);
      if (selectedProductId && selectedProductId === editId) {
        handleViewDetail(editId);
      }
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Open Stock Adjust Modal
  const handleOpenAdjust = (product) => {
    setAdjustProductId(product.id);
    setAdjustProductName(product.name);
    setAdjustData({
      quantity: '',
      movement_type: 'IN',
      reason: ''
    });
    setAdjustError('');
    setIsAdjustOpen(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');

    try {
      const { ok, data } = await safeFetch(`/api/products/${adjustProductId}/stock-movement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adjustData)
      });

      if (!ok) {
        throw new Error(data.error || 'Failed to adjust stock');
      }

      setIsAdjustOpen(false);
      setPage(page);
      if (selectedProductId && selectedProductId === adjustProductId) {
        handleViewDetail(adjustProductId);
      }
    } catch (err) {
      setAdjustError(err.message);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>Inventory Catalog</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage SKUs, warehouse bin locations, levels, and logs</p>
        </div>

        {canModify && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Product
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="glass-panel" style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '16px 20px'
      }}>
        <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            type="text"
            className="input-control"
            placeholder="Search SKU, product name, location..."
            style={{ paddingLeft: '38px' }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div style={{ minWidth: '150px' }}>
          <input
            type="text"
            className="input-control"
            placeholder="Category (e.g. Electronics)"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          />
        </div>

        <label style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--text-primary)',
          userSelect: 'none'
        }}>
          <input
            type="checkbox"
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
            checked={lowStock}
            onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
          />
          Show Low Stock Warnings
        </label>
      </div>

      {/* Products list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Retrieving inventory...
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No items found in stock database.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU / Code</th>
                  <th>Unit Price</th>
                  <th>Current Stock</th>
                  <th>Warehouse Bin</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLow = p.current_stock <= p.min_stock_alert;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Category: {p.category}
                        </div>
                      </td>
                      <td>
                        <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                          {p.sku}
                        </code>
                      </td>
                      <td>
                        ${Number(p.unit_price).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge ${isLow ? 'badge-rose' : 'badge-emerald'}`} style={{ display: 'inline-flex', gap: '4px' }}>
                          {isLow && <AlertTriangle size={10} />} {p.current_stock} pcs
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                          <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                          <span>{p.location}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            onClick={() => handleViewDetail(p.id)}
                            title="Stock Movement Logs"
                          >
                            <History size={14} /> History
                          </button>
                          
                          {canModify && (
                            <>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', color: 'var(--accent-cyan)', borderColor: 'rgba(6,182,212,0.2)' }}
                                onClick={() => handleOpenAdjust(p)}
                                title="Adjust Stock"
                              >
                                <TrendingUp size={14} /> Adjust
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px' }}
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Details"
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              marginTop: '24px'
            }}>
              <button
                className="btn btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Stock Logs / Details Modal */}
      {selectedProductId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} style={{ color: 'var(--primary)' }} /> Product Activity Sheet
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedProductId(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {detailLoading || !productDetail ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>Loading logs...</div>
              ) : (
                <div>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <h4 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>
                      {productDetail.name}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <strong>SKU:</strong> {productDetail.sku}
                      </p>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <strong>Category:</strong> {productDetail.category}
                      </p>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <strong>Unit Price:</strong> ${Number(productDetail.unit_price).toFixed(2)}
                      </p>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <strong>Current Level:</strong> {productDetail.current_stock} pcs
                      </p>
                      <p style={{ color: 'var(--text-secondary)', gridColumn: 'span 2' }}>
                        <strong>Location Bin:</strong> {productDetail.location}
                      </p>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={16} style={{ color: 'var(--primary)' }} /> Stock Movement audit
                  </h4>

                  {logs.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No stock movements recorded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {logs.map((log) => {
                        const isIn = log.movement_type === 'IN';
                        return (
                          <div key={log.id} style={{
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                background: isIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                                color: isIn ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                padding: '6px',
                                borderRadius: '4px'
                              }}>
                                {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '600' }}>
                                  {log.reason}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  Logged by {log.created_by_name} • {new Date(log.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <span className="badge badge-blue" style={{
                              background: isIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                              color: isIn ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                            }}>
                              {isIn ? '+' : '-'}{log.quantity_changed} pcs
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedProductId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-header">
                <h3>{editId ? 'Edit Product SKU' : 'Catalog New Product'}</h3>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsFormOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                {formError && (
                  <div style={{
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-rose)',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="input-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">SKU Code *</label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. Electronics"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Unit Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-control"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Min Stock Alert Level</label>
                    <input
                      type="number"
                      className="input-control"
                      value={formData.min_stock_alert}
                      onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Warehouse Bin Location *</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. WH-A-04"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      required
                    />
                  </div>

                  {!editId && (
                    <div className="form-group">
                      <label className="form-label">Starting Stock Quantity</label>
                      <input
                        type="number"
                        className="input-control"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save SKU</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-header">
                <h3>Adjust Inventory Levels</h3>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsAdjustOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Recording adjustment log for item: <strong>{adjustProductName}</strong>
                </p>

                {adjustError && (
                  <div style={{
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-rose)',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    {adjustError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Adjustment Type</label>
                    <select
                      className="input-control"
                      value={adjustData.movement_type}
                      onChange={(e) => setAdjustData({ ...adjustData, movement_type: e.target.value })}
                    >
                      <option value="IN">IN (Stock Addition)</option>
                      <option value="OUT">OUT (Stock Deduction)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Adjustment Quantity</label>
                    <input
                      type="number"
                      className="input-control"
                      placeholder="Qty pcs"
                      value={adjustData.quantity}
                      onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label">Reason / Audit Comment</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="e.g. Stock audit variance, supplier return, etc."
                    value={adjustData.reason}
                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
