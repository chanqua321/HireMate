import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import './admin.css';

export interface AdminThemeConfig {
  preset: 'ice-blue' | 'cyber-dark' | 'sapphire' | 'emerald' | 'sunset' | 'custom';
  mode: 'light' | 'dark';
  primaryColor?: string;
  accentColor?: string;
}

const DEFAULT_THEME: AdminThemeConfig = {
  preset: 'ice-blue',
  mode: 'light',
  primaryColor: '#0085FF',
  accentColor: '#03BFFF',
};

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<AdminThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('hm_admin_theme_config');
      return saved ? JSON.parse(saved) : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<AdminThemeConfig>;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      } else {
        try {
          const saved = localStorage.getItem('hm_admin_theme_config');
          if (saved) setTheme(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('hm-admin-theme-changed', handleThemeChange);
    return () => window.removeEventListener('hm-admin-theme-changed', handleThemeChange);
  }, []);

  // Determine theme class & custom styles
  const themeClass = `admin-layout theme-${theme.preset}`;
  const customStyles: Record<string, string> = {};
  if (theme.preset === 'custom') {
    if (theme.primaryColor) customStyles['--admin-primary'] = theme.primaryColor;
    if (theme.accentColor) customStyles['--admin-accent'] = theme.accentColor;
    if (theme.mode === 'dark') {
      customStyles['--admin-bg'] = '#0B1120';
      customStyles['--admin-card-bg'] = '#111827';
      customStyles['--admin-sidebar-bg'] = '#0F172A';
      customStyles['--admin-text-primary'] = '#F8FAFC';
      customStyles['--admin-text-muted'] = '#94A3B8';
      customStyles['--admin-table-th-bg'] = '#1E293B';
    }
  }

  return (
    <div className={themeClass} style={customStyles as React.CSSProperties}>
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
