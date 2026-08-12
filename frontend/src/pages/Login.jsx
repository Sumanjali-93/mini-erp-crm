import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, Key, UserCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, error: authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleUser, rolePass) => {
    setUsername(roleUser);
    setPassword(rolePass);
  };

  const quickRoles = [
    { label: 'Admin', user: 'admin', pass: 'admin123', color: 'badge-blue' },
    { label: 'Sales CRM', user: 'sales', pass: 'sales123', color: 'badge-emerald' },
    { label: 'Warehouse', user: 'warehouse', pass: 'warehouse123', color: 'badge-amber' },
    { label: 'Accounts', user: 'accounts', pass: 'accounts123', color: 'badge-rose' }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            background: 'var(--primary-glow)',
            borderRadius: '50%',
            color: 'var(--primary)',
            marginBottom: '16px'
          }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: '700', marginBottom: '8px' }}>ERP Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Log in to access your portal</p>
        </div>

        {(error || authError) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            color: 'var(--accent-rose)',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} />
            <span>{error || authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--border-glass)' }}>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <UserCheck size={14} /> Quick Demo Access
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {quickRoles.map((qr) => (
              <button
                key={qr.label}
                type="button"
                className={`btn btn-secondary ${qr.color}`}
                style={{ fontSize: '12px', padding: '8px' }}
                onClick={() => handleQuickLogin(qr.user, qr.pass)}
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
