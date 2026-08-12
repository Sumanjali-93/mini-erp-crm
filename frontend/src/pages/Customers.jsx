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
  MessageSquare, 
  Clock, 
  Calendar, 
  FileText, 
  X,
  Phone,
  Mail,
  Briefcase
} from 'lucide-react';

export default function Customers() {
  const { user, token } = useAuth();
  
  // Data States
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  // Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    business_name: '',
    gst_number: '',
    type: 'Retail',
    address: '',
    status: 'Lead',
    follow_up_date: '',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // Can this user modify CRM?
  const canModify = user.role === 'Admin' || user.role === 'Sales';

  // Load Customer List
  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page,
          search,
          status,
          type,
          limit: 6
        }).toString();

        const { ok, data } = await safeFetch(`/api/customers?${query}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (ok) {
          setCustomers(data.customers);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Failed to load customers', err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, [token, page, search, status, type]);

  // Load Customer Details
  const handleViewDetail = async (id) => {
    setSelectedCustomerId(id);
    setDetailLoading(true);
    try {
      const { ok, data } = await safeFetch(`/api/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ok) {
        setCustomerDetail(data.customer);
        setFollowups(data.followups);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddFollowup = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const { ok } = await safeFetch(`/api/customers/${selectedCustomerId}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNote })
      });

      if (ok) {
        setNewNote('');
        // Reload details
        handleViewDetail(selectedCustomerId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Form for Add
  const handleOpenAdd = () => {
    setEditId(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      business_name: '',
      gst_number: '',
      type: 'Retail',
      address: '',
      status: 'Lead',
      follow_up_date: '',
      notes: ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (customer) => {
    setEditId(customer.id);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      business_name: customer.business_name,
      gst_number: customer.gst_number || '',
      type: customer.type,
      address: customer.address,
      status: customer.status,
      follow_up_date: customer.follow_up_date ? customer.follow_up_date.split('T')[0] : '',
      notes: customer.notes || ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  // Form Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const url = editId ? `/api/customers/${editId}` : '/api/customers';
      const method = editId ? 'PUT' : 'POST';

      const { ok, data } = await safeFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      setIsFormOpen(false);
      // Reload current page
      setPage(page);
      // If we are looking at this detail, update detail
      if (selectedCustomerId && selectedCustomerId === editId) {
        handleViewDetail(editId);
      }
    } catch (err) {
      setFormError(err.message);
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
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>Customer CRM</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track accounts, leads, follow-up dates, and histories</p>
        </div>
        
        {canModify && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> Add Customer
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
            placeholder="Search name, business, mobile..."
            style={{ paddingLeft: '38px' }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            className="input-control"
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Distributor">Distributor</option>
          </select>
        </div>

        <div style={{ minWidth: '150px' }}>
          <select
            className="input-control"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="Lead">Lead</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Retrieving CRM data...
        </div>
      ) : customers.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No customers found matching the search criteria.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business / Name</th>
                  <th>Contact Info</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Next Follow-up</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  let statusBadge = 'badge-blue';
                  if (c.status === 'Active') statusBadge = 'badge-emerald';
                  if (c.status === 'Inactive') statusBadge = 'badge-rose';

                  let typeBadge = 'badge-blue';
                  if (c.type === 'Wholesale') typeBadge = 'badge-amber';
                  if (c.type === 'Distributor') typeBadge = 'badge-rose';

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{c.business_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{c.name}</div>
                      </td>
                      <td>
                        <div>{c.mobile}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{c.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${typeBadge}`}>{c.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadge}`}>{c.status}</span>
                      </td>
                      <td>
                        {c.follow_up_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <Clock size={14} style={{ color: 'var(--accent-amber)' }} />
                            <span>{new Date(c.follow_up_date).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            onClick={() => handleViewDetail(c.id)}
                            title="View Timeline"
                          >
                            <Eye size={14} /> View
                          </button>
                          
                          {canModify && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px' }}
                              onClick={() => handleOpenEdit(c)}
                              title="Edit Customer"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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

      {/* Customer Detail Timeline Modal */}
      {selectedCustomerId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={20} style={{ color: 'var(--primary)' }} /> Customer Account Sheet
              </h3>
              <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedCustomerId(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body">
              {detailLoading || !customerDetail ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>Loading timeline...</div>
              ) : (
                <div>
                  {/* Account Summary Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '24px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px'
                  }}>
                    <div>
                      <h4 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>
                        {customerDetail.business_name}
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} /> {customerDetail.mobile}
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <Mail size={12} /> {customerDetail.email}
                      </p>
                      {customerDetail.gst_number && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                          GSTIN: {customerDetail.gst_number}
                        </p>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <strong>Type:</strong> {customerDetail.type}
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <strong>Status:</strong> {customerDetail.status}
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <strong>Address:</strong> {customerDetail.address}
                      </p>
                    </div>
                  </div>

                  {/* Add Follow-up Note Form */}
                  {canModify && (
                    <form onSubmit={handleAddFollowup} style={{ marginBottom: '28px' }}>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="form-label">Add Follow-up / Client Log Note</label>
                        <textarea
                          rows="2"
                          className="input-control"
                          placeholder="Type follow-up details here..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                        <MessageSquare size={14} /> Save Log Entry
                      </button>
                    </form>
                  )}

                  {/* Follow-up Timeline */}
                  <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} style={{ color: 'var(--primary)' }} /> Activity & History Log
                  </h4>
                  
                  {followups.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No logs recorded yet.</p>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderLeft: '2px solid var(--border-glass)',
                      paddingLeft: '18px',
                      marginLeft: '8px'
                    }}>
                      {followups.map((f) => (
                        <div key={f.id} style={{ position: 'relative' }}>
                          {/* Timeline dot */}
                          <div style={{
                            position: 'absolute',
                            left: '-25px',
                            top: '4px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            border: '3px solid var(--bg-secondary)'
                          }} />
                          
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>Logged by: <strong>{f.created_by_name}</strong></span>
                            <span>{new Date(f.created_at).toLocaleString()}</span>
                          </div>
                          
                          <p style={{
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            marginTop: '4px',
                            background: 'rgba(255,255,255,0.01)',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-glass)'
                          }}>
                            {f.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCustomerId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Form Modal */}
      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-header">
                <h3>{editId ? 'Edit Customer Info' : 'Register New Customer'}</h3>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Name *</label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="+1234567890"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="input-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="15-character ID"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Customer Type *</label>
                    <select
                      className="input-control"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="Retail">Retail</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Distributor">Distributor</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Portal Status</label>
                    <select
                      className="input-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Lead">Lead</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Next Follow-up Date</label>
                    <input
                      type="date"
                      className="input-control"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Complete Address *</label>
                  <input
                    type="text"
                    className="input-control"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label">Internal Business Notes</label>
                  <textarea
                    rows="3"
                    className="input-control"
                    placeholder="Describe relationship details or billing terms..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
