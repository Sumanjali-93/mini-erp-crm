import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import Products from './pages/Products.jsx';
import Challans from './pages/Challans.jsx';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileSpreadsheet, 
  LogOut, 
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';

function NavigationPortal() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'customers', label: 'Customers CRM', icon: Users, component: Customers },
    { id: 'products', label: 'Inventory Catalog', icon: Package, component: Products },
    { id: 'challans', label: 'Sales Invoices', icon: FileSpreadsheet, component: Challans }
  ];

  const CurrentComponent = tabs.find(t => t.id === activeTab)?.component || Dashboard;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      
      {/* Mobile Header */}
      <header style={{
        display: 'none',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '16px 20px',
        zIndex: '100'
      }} className="mobile-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert style={{ color: 'var(--primary)' }} size={24} />
          <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
            Apex Portal
          </span>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '8px' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <div style={{ display: 'flex', flex: '1' }} className="layout-body-wrapper">
        
        {/* Sidebar Nav */}
        <aside style={{
          width: '260px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '30px 20px',
          position: 'sticky',
          top: '0',
          height: '100vh'
        }} className={`sidebar-navigation ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          
          <div>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }} className="sidebar-logo">
              <ShieldAlert style={{ color: 'var(--primary)' }} size={28} />
              <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
                Apex Operations
              </span>
            </div>

            {/* Menu List */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      justifyContent: 'flex-start',
                      width: '100%',
                      padding: '12px 16px',
                      background: isActive ? 'var(--primary)' : 'transparent',
                      border: isActive ? 'none' : '1px solid transparent',
                      boxShadow: isActive ? '0 4px 14px var(--primary-glow)' : 'none'
                    }}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile / Logout */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-glass)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700' }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="badge badge-blue" style={{ fontSize: '9px', padding: '2px 6px' }}>{user.role}</span>
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', padding: '8px', fontSize: '12px', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.15)' }}
              onClick={logout}
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>

        </aside>

        {/* Main Content Area */}
        <main style={{
          flex: '1',
          padding: '40px',
          overflowY: 'auto',
          height: '100vh'
        }} className="main-content-scroll">
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <CurrentComponent />
          </div>
        </main>
      </div>

      {/* Embedded CSS for responsive side bar styling */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-header-bar {
            display: flex !important;
          }
          .layout-body-wrapper {
            flex-direction: column !important;
          }
          .sidebar-navigation {
            position: fixed !important;
            top: 68px !important;
            left: -100% !important;
            width: 100% !important;
            height: calc(100vh - 68px) !important;
            z-index: 99 !important;
            transition: all 0.3s ease !important;
            background: var(--bg-primary) !important;
          }
          .sidebar-navigation.mobile-open {
            left: 0 !important;
          }
          .main-content-scroll {
            padding: 24px !important;
            height: calc(100vh - 68px) !important;
          }
          .sidebar-logo {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}

function InnerApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: 'var(--text-secondary)'
      }}>
        Initializing Apex Security Layers...
      </div>
    );
  }

  return user ? <NavigationPortal /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
