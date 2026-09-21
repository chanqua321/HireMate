import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, TrendingUp, MessageSquare,
  FileText, HelpCircle, BookOpen, CreditCard, Tag,
  ListOrdered, GitBranch, Award, ChevronRight,
  LogOut, Briefcase, X, Sliders
} from 'lucide-react';
import { useApp } from '../../app/context/AppContext';
import './admin.css';

interface NavItemDef {
  type: 'item';
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface FolderDef {
  type: 'folder';
  name: string;
  icon: React.ReactNode;
  items: NavItemDef[];
}

type MenuEntry = NavItemDef | FolderDef;

const menuStructure: MenuEntry[] = [
  {
    type: 'item',
    name: 'Tổng quan',
    path: '/admin',
    icon: <LayoutDashboard size={18} />,
  },
  {
    type: 'folder',
    name: 'Người dùng',
    icon: <Users size={18} />,
    items: [
      { type: 'item', name: 'Quản lý Users', path: '/admin/users', icon: <Users size={16} /> },
    ],
  },
  {
    type: 'folder',
    name: 'AI & Phỏng vấn',
    icon: <Briefcase size={18} />,
    items: [
      { type: 'item', name: 'Thống kê phỏng vấn', path: '/admin/interviews', icon: <Briefcase size={16} /> },
    ],
  },
  {
    type: 'folder',
    name: 'Tài chính',
    icon: <TrendingUp size={18} />,
    items: [
      { type: 'item', name: 'Doanh thu', path: '/admin/revenue', icon: <TrendingUp size={16} /> },
      { type: 'item', name: 'Gói dịch vụ', path: '/admin/plans', icon: <CreditCard size={16} /> },
      { type: 'item', name: 'Mã khuyến mãi', path: '/admin/promos', icon: <Tag size={16} /> },
    ],
  },
  {
    type: 'folder',
    name: 'Hỗ trợ & Nội dung',
    icon: <MessageSquare size={18} />,
    items: [
      { type: 'item', name: 'Phiếu hỗ trợ', path: '/admin/tickets', icon: <MessageSquare size={16} /> },
      { type: 'item', name: 'Blog', path: '/admin/blog', icon: <FileText size={16} /> },
      { type: 'item', name: 'FAQ', path: '/admin/faq', icon: <HelpCircle size={16} /> },
      { type: 'item', name: 'Tài nguyên', path: '/admin/resources', icon: <BookOpen size={16} /> },
    ],
  },
  {
    type: 'folder',
    name: 'Gamification',
    icon: <Award size={18} />,
    items: [
      { type: 'item', name: 'Badges & BXH', path: '/admin/gamification', icon: <Award size={16} /> },
    ],
  },
  {
    type: 'item',
    name: 'Cấu hình hệ thống',
    path: '/admin/config',
    icon: <Sliders size={18} />,
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    'Người dùng': true,
    'Tài chính': true,
  });

  const toggleFolder = (name: string) => {
    setOpenFolders(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    window.location.href = '/login';
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-container" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img src="/logo.png" alt="HireMate" style={{ height: '36px' }} />
        </div>
        <button className="admin-mobile-close" onClick={onClose}><X size={20} /></button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-items">
          {menuStructure.map((entry, i) => {
            if (entry.type === 'item') {
              return (
                <NavLink
                  key={entry.path}
                  to={entry.path}
                  end={entry.path === '/admin'}
                  className={({ isActive }) =>
                    `sidebar-nav-item${isActive ? ' active' : ''}`
                  }
                >
                  <span className="nav-icon">{entry.icon}</span>
                  <span>{entry.name}</span>
                </NavLink>
              );
            }

            const isOpen = openFolders[entry.name] ?? false;
            return (
              <div key={i} className="sidebar-folder">
                <div
                  className="sidebar-folder-header"
                  onClick={() => toggleFolder(entry.name)}
                >
                  <div className="sidebar-folder-left">
                    <span className="nav-icon">{entry.icon}</span>
                    <span>{entry.name}</span>
                  </div>
                  <div className={`sidebar-folder-arrow${isOpen ? ' open' : ''}`}>
                    <ChevronRight size={15} />
                  </div>
                </div>

                {isOpen && (
                  <div className="sidebar-folder-items">
                    {entry.items.map(sub => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive }) =>
                          `sidebar-nav-item sub${isActive ? ' active' : ''}`
                        }
                      >
                        <span className="nav-icon">{sub.icon}</span>
                        <span>{sub.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">A</div>
          <div>
            <div className="sidebar-user-name">Admin HireMate</div>
            {/* <div className="sidebar-user-role">Super Administrator</div> */}
          </div>
        </div>
        <button type="button" className="sidebar-logout-btn" onClick={handleLogout} title="Đăng xuất khỏi hệ thống Quản trị">
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
