import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { safeFetch } from '../utils/api.js';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  FileText, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Layers 
} from 'lucide-react';

export default function Challans() {
  const { user, token } = useAuth();

  // Data States
  const [challans, setChallans] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Detail Modal States
  const [selectedChallanId, setSelectedChallanId] = useState(null);
  const [challanDetail, setChallanDetail] = useState(null);
  const [challanItems, setChallanItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create wizard states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [wizardCustomerId, setWizardCustomerId] = useState('');
  const [wizardItems, setWizardItems] = useState([]); // Array of { product_id, quantity }
  const [wizardStatus, setWizardStatus] = useState('Draft');
  const [wizardError, setWizardError] = useState('');

  // Can this user create challans?
  const canCreate = user.role === 'Admin' || user.role === 'Sales';
  // Can this user change status?
  const canManageStatus = user.role === 'Admin' || user.role === 'Sales' || user.role === 'Accounts';

  // Load Challan List
  const loadChallans = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page,
        search,
        status,
        limit: 8
      }).toString();

      const { ok, data } = await safeFetch(`/api/challans?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (ok) {
        setChallans(data.challans);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load challans', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, [token, page, search, status]);

  // Load active customers and products for creation wizard
  const handleOpenWizard = async () => {
    setIsWizardOpen(true);
    setWizardCustomerId('');
    setWizardItems([]);
    setWizardStatus('Draft');
    setWizardError('');
    
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Fetch customers (unpaginated/bulk for selector)
      const { data: custData } = await safeFetch('/api/customers?limit=100&status=Active', { headers });
      setCustomersList(custData.customers || []);

      // Fetch products (bulk for selector)
      const { data: prodData } = await safeFetch('/api/products?limit=100', { headers });
      setProductsList(prodData.products || []);
    } catch (err) {
      console.error('Failed to load wizard sources', err);
    }
  };

  // Add item row in wizard
  const handleAddWizardItem = () => {
    setWizardItems([...wizardItems, { product_id: '', quantity: 1 }]);
  };

  // Remove item row in wizard
  const handleRemoveWizardItem = (index) => {
    const list = [...wizardItems];
    list.splice(index, 1);
    setWizardItems(list);
  };

  // Update item row in wizard
  const handleUpdateWizardItem = (index, field, value) => {
    const list = [...wizardItems];
    list[index][field] = value;
    setWizardItems(list);
  };

  // Submit Challan Wizard
  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    setWizardError('');

    if (!wizardCustomerId) {
      setWizardError('Please select a customer.');
      return;
    }

    if (wizardItems.length === 0) {
      setWizardError('Please add at least one product.');
      return;
    }

    // Filter invalid item fields
    for (const item of wizardItems) {
      if (!item.product_id) {
        setWizardError('Please select a product for all items.');
        return;
      }
      if (!item.quantity || Number(item.quantity) <= 0) {
        setWizardError('Quantity must be a positive number.');
        return;
      }
    }

    try {
      const { ok, data } = await safeFetch('/api/challans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: Number(wizardCustomerId),
          products: wizardItems.map(wi => ({
            product_id: Number(wi.product_id),
            quantity: Number(wi.quantity)
          })),
          status: wizardStatus
        })
      });

      if (!ok) {
        throw new Error(data.error || 'Failed to create challan');
      }

      // If confirmed, shoot confetti!
      if (wizardStatus === 'Confirmed') {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }

      setIsWizardOpen(false);
      loadChallans();
    } catch (err) {
      setWizardError(err.message);
    }
  };

  // Load details for single view
  const handleViewDetail = async (id) => {
    setSelectedChallanId(id);
    setDetailLoading(true);
    try {
      const { ok, data } = await safeFetch(`/api/challans/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ok) {
        setChallanDetail(data.challan);
        setChallanItems(data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Update Challan Status (Confirm / Cancel)
  const handleUpdateStatus = async (id, targetStatus) => {
    try {
      const { ok, data } = await safeFetch(`/api/challans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      if (!ok) {
        alert(data.error || 'Failed to update status');
        return;
      }

      if (targetStatus === 'Confirmed') {
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      // Reload lists and details
      loadChallans();
      if (selectedChallanId === id) {
        handleViewDetail(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // PDF Export logic
  const handleDownloadPDF = (challan, items) => {
    const doc = new jsPDF();
    
    // Parse snapshots
    let cust = {};
    try { cust = typeof challan.customer_snapshot === 'string' ? JSON.parse(challan.customer_snapshot) : challan.customer_snapshot; } catch(e) {}

    // Title / Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(33, 43, 54);
    doc.text('APEX WHOLESALE DEPOT', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text('Industrial Logistic Hub, Gate A-1, Mumbai, IN', 14, 25);
    doc.text('Email: billing@apexwholesale.com | Web: www.apexwholesale.com', 14, 30);
    
    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 34, 196, 34);
    
    // Invoice / Challan metadata
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(33, 43, 54);
    doc.text('SALES CHALLAN / INVOICE', 14, 45);
    
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Challan No: ${challan.challan_number}`, 14, 52);
    doc.text(`Date Created: ${new Date(challan.created_at).toLocaleDateString()}`, 14, 57);
    doc.text(`Billing Status: ${challan.status.toUpperCase()}`, 14, 62);
    
    // Customer Info box
    doc.setFont('Helvetica', 'bold');
    doc.text('BILLED TO:', 120, 45);
    doc.setFont('Helvetica', 'normal');
    doc.text(`${cust.business_name || 'N/A'}`, 120, 52);
    doc.text(`Attn: ${cust.name || 'N/A'}`, 120, 57);
    doc.text(`Contact: ${cust.mobile || 'N/A'}`, 120, 62);
    doc.text(`Address: ${cust.address || 'N/A'}`, 120, 67, { maxWidth: 76 });
    if (cust.gst_number) {
      doc.text(`GSTIN: ${cust.gst_number}`, 120, 77);
    }
    
    // Build Items Table
    const tableBody = items.map((item, index) => {
      let prod = {};
      try { prod = typeof item.product_snapshot === 'string' ? JSON.parse(item.product_snapshot) : item.product_snapshot; } catch(e) {}
      
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      const total = qty * price;
      
      return [
        index + 1,
        prod.name || 'Item Name',
        prod.sku || 'N/A',
        qty,
        `$${price.toFixed(2)}`,
        `$${total.toFixed(2)}`
      ];
    });

    // Calculate invoice totals
    const grandTotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

    doc.autoTable({
      startY: 85,
      head: [['#', 'Description', 'SKU', 'Qty', 'Unit Price', 'Amount']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241], halign: 'left' },
      columnStyles: {
        5: { halign: 'right' }
      },
      foot: [[
        '', '', '', '', 
        { content: 'Grand Total:', styles: { fontStyle: 'bold', halign: 'right' } }, 
        { content: `$${grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right' } }
      ]]
    });
    
    // Footer notes
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Thank you for your business. Terms: COD. Subject to Mumbai Jurisdiction.', 14, finalY);
    
    // Save
    doc.save(`${challan.challan_number}_invoice.pdf`);
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
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>Sales Invoices</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Log shipments, track Draft/Confirmed statuses, and download PDFs</p>
        </div>

        {canCreate && (
          <button className="btn btn-primary" onClick={handleOpenWizard}>
            <Plus size={18} /> New Challan
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
            placeholder="Search Challan reference number..."
            style={{ paddingLeft: '38px' }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            className="input-control"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Challans List Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Retrieving bills...
        </div>
      ) : challans.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No challan receipts found.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan Number</th>
                  <th>Customer Account</th>
                  <th>Total Units</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Date Issued</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => {
                  let badgeClass = 'badge-blue';
                  if (c.status === 'Confirmed') badgeClass = 'badge-emerald';
                  if (c.status === 'Cancelled') badgeClass = 'badge-rose';

                  let cust = {};
                  try { cust = typeof c.customer_snapshot === 'string' ? JSON.parse(c.customer_snapshot) : c.customer_snapshot; } catch(e) {}

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: '700', fontFamily: 'var(--font-heading)' }}>
                          {c.challan_number}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{cust.business_name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{cust.name}</div>
                      </td>
                      <td>{c.total_quantity} pcs</td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{c.status}</span>
                      </td>
                      <td>{c.created_by_name}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px' }}
                          onClick={() => handleViewDetail(c.id)}
                        >
                          <Eye size={14} /> Open
                        </button>
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

      {/* Challan Detail View Modal */}
      {selectedChallanId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} /> Challan sheet details
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedChallanId(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {detailLoading || !challanDetail ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>Retrieving bill records...</div>
              ) : (
                <div>
                  {/* Account detail columns */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    marginBottom: '24px'
                  }}>
                    <div>
                      <h4 style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Customer / Client info
                      </h4>
                      {(() => {
                        let cust = {};
                        try { cust = typeof challanDetail.customer_snapshot === 'string' ? JSON.parse(challanDetail.customer_snapshot) : challanDetail.customer_snapshot; } catch(e) {}
                        return (
                          <div style={{ marginTop: '8px' }}>
                            <strong style={{ fontSize: '15px' }}>{cust.business_name}</strong>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Contact: {cust.name} ({cust.mobile})
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Address: {cust.address}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <h4 style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Reference particulars
                      </h4>
                      <div style={{ marginTop: '8px', fontSize: '13px' }}>
                        <p><strong>Challan No:</strong> {challanDetail.challan_number}</p>
                        <p style={{ marginTop: '4px' }}>
                          <strong>Status:</strong>{' '}
                          <span className={`badge ${
                            challanDetail.status === 'Confirmed' ? 'badge-emerald' : 
                            challanDetail.status === 'Cancelled' ? 'badge-rose' : 'badge-blue'
                          }`}>
                            {challanDetail.status}
                          </span>
                        </p>
                        <p style={{ marginTop: '4px' }}>
                          <strong>Created By:</strong> {challanDetail.created_by_name}
                        </p>
                        <p style={{ marginTop: '4px' }}>
                          <strong>Date:</strong> {new Date(challanDetail.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items list */}
                  <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} style={{ color: 'var(--primary)' }} /> Product Snapshots Grid
                  </h4>
                  
                  <div className="table-container" style={{ margin: '0 0 24px 0' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>SKU</th>
                          <th>Price</th>
                          <th>Quantity</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {challanItems.map((item) => {
                          let prod = {};
                          try { prod = typeof item.product_snapshot === 'string' ? JSON.parse(item.product_snapshot) : item.product_snapshot; } catch(e) {}
                          
                          const price = Number(item.unit_price);
                          const qty = Number(item.quantity);
                          
                          return (
                            <tr key={item.id}>
                              <td>{prod.name}</td>
                              <td>
                                <code style={{ fontSize: '11px' }}>{prod.sku}</code>
                              </td>
                              <td>${price.toFixed(2)}</td>
                              <td>{qty} pcs</td>
                              <td style={{ textAlign: 'right' }}>${(price * qty).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: 'bold' }}>
                          <td colSpan="3" style={{ textAlign: 'right' }}>Summary Amount:</td>
                          <td>
                            {challanItems.reduce((acc, item) => acc + Number(item.quantity), 0)} pcs
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>
                            ${challanItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Workflow Operations Action Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    borderTop: '1px solid var(--border-glass)',
                    paddingTop: '20px'
                  }}>
                    <button className="btn btn-secondary" onClick={() => handleDownloadPDF(challanDetail, challanItems)}>
                      <Download size={14} /> Download PDF invoice
                    </button>

                    {canManageStatus && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {challanDetail.status === 'Draft' && (
                          <button 
                            className="btn btn-primary badge-emerald" 
                            style={{ background: 'var(--accent-emerald)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                            onClick={() => handleUpdateStatus(challanDetail.id, 'Confirmed')}
                          >
                            <CheckCircle2 size={14} /> Confirm Challan
                          </button>
                        )}
                        
                        {challanDetail.status === 'Confirmed' && (
                          <button 
                            className="btn btn-danger" 
                            onClick={() => handleUpdateStatus(challanDetail.id, 'Cancelled')}
                          >
                            <XCircle size={14} /> Cancel Shipment
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedChallanId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Creation Wizard Form Modal */}
      {isWizardOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <form onSubmit={handleWizardSubmit}>
              <div className="modal-header">
                <h3>Draft New Sales Challan</h3>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setIsWizardOpen(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ maxHeight: '65vh' }}>
                {wizardError && (
                  <div style={{
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--accent-rose)',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    {wizardError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Billed Customer Account *</label>
                  <select
                    className="input-control"
                    value={wizardCustomerId}
                    onChange={(e) => setWizardCustomerId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Active Account --</option>
                    {customersList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.business_name} (contact: {c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700' }}>Item Checklist Grid</h4>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleAddWizardItem}>
                    <Plus size={12} /> Add Item SKU
                  </button>
                </div>

                {wizardItems.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px', border: '1px dashed var(--border-glass)', borderRadius: '6px' }}>
                    Click "Add Item SKU" to start compiling items list.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {wizardItems.map((item, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-glass)',
                        padding: '12px',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div style={{ flex: '2' }}>
                          <select
                            className="input-control"
                            value={item.product_id}
                            onChange={(e) => handleUpdateWizardItem(index, 'product_id', e.target.value)}
                            required
                          >
                            <option value="">-- Select Product --</option>
                            {productsList.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} (SKU: {p.sku} | Stock: {p.current_stock}) - ${Number(p.unit_price).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div style={{ flex: '1', maxWidth: '100px' }}>
                          <input
                            type="number"
                            className="input-control"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleUpdateWizardItem(index, 'quantity', e.target.value)}
                            required
                          />
                        </div>

                        <button type="button" className="btn btn-secondary" style={{ padding: '8px', color: 'var(--accent-rose)' }} onClick={() => handleRemoveWizardItem(index)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Workflow Execution Status</label>
                  <select
                    className="input-control"
                    value={wizardStatus}
                    onChange={(e) => setWizardStatus(e.target.value)}
                  >
                    <option value="Draft">Draft (Save receipt outline without allocating stock)</option>
                    <option value="Confirmed">Confirmed (Execute transaction, deduct stock, lock items)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsWizardOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Challan Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
