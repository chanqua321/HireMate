import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { useApp } from '../../app/context/AppContext';
import './admin.css';

export interface AdminThemeConfig {
  preset: 'cyber-dark';
  mode: 'dark';
  primaryColor?: string;
  accentColor?: string;
}

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useApp();
  const navigate = useNavigate();

  const handleMobileLogout = () => {
    logout();
    navigate('/login');
    window.location.href = '/login';
  };

  return (
    <div className="admin-layout">
      {/* Mobile header */}
      <div className="admin-mobile-header">
        <div className="admin-mobile-logo">
          <span className="sidebar-logo-icon" style={{ width: '2rem', height: '2rem', fontSize: '1rem', borderRadius: 8 }}>🤝</span>
          <span style={{ fontWeight: 700 }}>HireMate Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleMobileLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#EF4444',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Đăng xuất khỏi hệ thống Quản trị"
          >
            <LogOut size={14} />
          </button>
          <button className="admin-mobile-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Overlay */}
      <div className={`admin-sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="admin-main" style={{ padding: '1.75rem' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
