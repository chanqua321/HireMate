import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import './admin.css';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Mobile header */}
      <div className="admin-mobile-header">
        <div className="admin-mobile-logo">
           <span className="sidebar-logo-icon" style={{width: '2rem', height: '2rem', fontSize: '1rem', borderRadius: 8}}>🤝</span>
           <span style={{fontWeight: 700}}>HireMate Admin</span>
        </div>
        <button className="admin-mobile-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
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
