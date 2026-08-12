import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { safeFetch } from '../utils/api.js';
import { 
  Users, 
  Package, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  UserCheck 
} from 'lucide-react';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    customersCount: 0,
    productsCount: 0,
    lowStockCount: 0,
    challansCount: 0
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentFollowups, setRecentFollowups] = useState([]);
  const [recentChallans, setRecentChallans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Fetch Customers
        const { data: custData } = await safeFetch('/api/customers?limit=100', { headers });
        
        // 2. Fetch Products
        const { data: prodData } = await safeFetch('/api/products?limit=100', { headers });
        
        // 3. Fetch Low Stock
        const { data: lowData } = await safeFetch('/api/products?lowStock=true&limit=100', { headers });
        
        // 4. Fetch Challans
        const { data: chalData } = await safeFetch('/api/challans?limit=5', { headers });

        // Count totals
        const totalCustomers = custData.pagination?.total || 0;
        const totalProducts = prodData.pagination?.total || 0;
        const totalLowStock = lowData.pagination?.total || 0;
        const totalChallans = chalData.pagination?.total || 0;

        setStats({
          customersCount: totalCustomers,
          productsCount: totalProducts,
          lowStockCount: totalLowStock,
          challansCount: totalChallans
        });

        setLowStockProducts(lowData.products || []);
        setRecentChallans(chalData.challans || []);

        // Aggregate follow-up actions from customer notes
        const followups = (custData.customers || [])
          .filter(c => c.follow_up_date && c.status === 'Active')
          .slice(0, 5);
        setRecentFollowups(followups);

      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '6px' }}>
          Welcome back, {user.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Here is your operation overview for the role: <span className="badge badge-blue">{user.role}</span>
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: 'var(--accent-emerald)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <Users size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Customers</p>
            <h3 style={{ fontSize: '24px', fontWeight: '700' }}>{stats.customersCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--primary)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total SKUs</p>
            <h3 style={{ fontSize: '24px', fontWeight: '700' }}>{stats.productsCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          border: stats.lowStockCount > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-glass)'
        }}>
          <div style={{
            background: stats.lowStockCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: stats.lowStockCount > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Stock Alerts</p>
            <h3 style={{ fontSize: '24px', fontWeight: '700' }}>{stats.lowStockCount}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(6, 182, 212, 0.12)',
            color: 'var(--accent-cyan)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <FileText size={24} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Invoices/Challans</p>
            <h3 style={{ fontSize: '24px', fontWeight: '700' }}>{stats.challansCount}</h3>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '24px'
      }}>
        {/* Dynamic section depending on Role */}
        
        {/* CRM Alerts Section (For Admin, Sales) */}
        {(user.role === 'Admin' || user.role === 'Sales') && (
          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Calendar style={{ color: 'var(--accent-emerald)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Upcoming CRM Follow-ups</h3>
            </div>
            
            {recentFollowups.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No active follow-ups scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentFollowups.map(c => (
                  <div key={c.id} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{c.business_name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Contact: {c.name} ({c.mobile})
                      </p>
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                      {new Date(c.follow_up_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Warehouse Stock Alerts Section (For Admin, Warehouse) */}
        {(user.role === 'Admin' || user.role === 'Warehouse') && (
          <div className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <AlertTriangle style={{ color: 'var(--accent-amber)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Low Stock Warning levels</h3>
            </div>

            {lowStockProducts.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>All product stocks are healthy.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lowStockProducts.map(p => (
                  <div key={p.id} style={{
                    background: 'rgba(245, 158, 11, 0.04)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{p.name}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                        <span>SKU: {p.sku}</span>
                        <span><MapPin size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />{p.location}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-rose" style={{ fontSize: '10px' }}>
                        Stock: {p.current_stock}
                      </span>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Min: {p.min_stock_alert}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Accounts / Recent Challans (For Admin, Accounts) */}
        {(user.role === 'Admin' || user.role === 'Accounts' || user.role === 'Sales') && (
          <div className="glass-panel" style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <TrendingUp style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Recent Sales Challans</h3>
            </div>

            {recentChallans.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No challans generated yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentChallans.map(c => {
                  let badgeColor = 'badge-blue';
                  if (c.status === 'Confirmed') badgeColor = 'badge-emerald';
                  if (c.status === 'Cancelled') badgeColor = 'badge-rose';

                  let cust = {};
                  try { cust = typeof c.customer_snapshot === 'string' ? JSON.parse(c.customer_snapshot) : c.customer_snapshot; } catch(e) {}
                  
                  return (
                    <div key={c.id} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600' }}>{c.challan_number}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Client: {cust.business_name || 'N/A'} (Qty: {c.total_quantity})
                        </p>
                      </div>
                      <span className={`badge ${badgeColor}`} style={{ fontSize: '10px' }}>
                        {c.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
