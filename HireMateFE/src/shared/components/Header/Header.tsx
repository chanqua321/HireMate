import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../../app/context/AppContext';
import { Menu, X, Bell, LogOut, User, LayoutDashboard, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './css/Header.css';

export const Header: React.FC = () => {
  const { isLoggedIn, profile, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/index.html';
    }
    return (
      location.pathname.startsWith(path) ||
      location.pathname.startsWith(`${path}.html`)
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    profile.name && profile.name.trim().length > 0
      ? profile.name
          .trim()
          .split(' ')
          .map((word) => word[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'MA';

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <nav className="nav">
          {/* Brand Logo */}
          <Link className="brand" to="/">
            <img src="/logo.png" alt="HireMate" />
          </Link>

          {/* Nav Links Matching Mockup */}
          <div className="nav-links desktop-only">
            <Link to="/" className={isActive('/') ? 'active' : ''}>
              Features
            </Link>
            <Link to="/pricing" className={isActive('/pricing') ? 'active' : ''}>
              Pricing
            </Link>
            <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
              Dashboard
            </Link>
            <Link
              to="/interview-setup"
              className={isActive('/interview-setup') ? 'active' : ''}
            >
              Interviews
            </Link>
            <Link
              to="/onboarding/profile"
              className={isActive('/onboarding') ? 'active' : ''}
            >
              Resume Optimizer
            </Link>
            <Link
              to="/feedback"
              className={isActive('/feedback') ? 'active' : ''}
            >
              Progress
            </Link>
          </div>

          {/* Right Area: Bell, Avatar, Logout */}
          <div className="nav-right">
            {/* Notification Bell */}
            <button
              type="button"
              className="nav-icon-btn desktop-only"
              aria-label="Thông báo"
              title="Thông báo mới"
            >
              <Bell size={18} />
              <span className="nav-icon-dot" />
            </button>

            {/* Profile Avatar / Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="user-profile-btn desktop-only"
                onClick={() => setDropdownOpen((v) => !v)}
                aria-label="Tài khoản cá nhân"
              >
                <div className="user-avatar-circle">
                  {initials}
                </div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 12px 28px -6px rgba(16,24,40,0.12)',
                      width: '210px',
                      padding: '8px',
                      zIndex: 1000,
                    }}
                  >
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        {profile.name || 'Minh Anh'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {profile.role || 'Data Analyst'}
                      </div>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        color: '#1e293b',
                        fontSize: '0.86rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      <LayoutDashboard size={15} /> Bảng điều khiển
                    </Link>

                    <Link
                      to="/onboarding/profile"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        color: '#1e293b',
                        fontSize: '0.86rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      <User size={15} /> Cài đặt tài khoản
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        color: '#ef4444',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '4px',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <LogOut size={15} /> Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Direct Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="nav-logout-btn desktop-only"
            >
              Logout
            </button>

            {/* Mobile Hamburger */}
            <button
              className="hamburger"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Mở menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="panel">
              <Link to="/" className={isActive('/') ? 'active' : ''}>
                Features
              </Link>
              <Link to="/pricing" className={isActive('/pricing') ? 'active' : ''}>
                Pricing
              </Link>
              <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                Dashboard
              </Link>
              <Link
                to="/interview-setup"
                className={isActive('/interview-setup') ? 'active' : ''}
              >
                Mock Interviews
              </Link>
              <Link
                to="/onboarding/profile"
                className={isActive('/onboarding') ? 'active' : ''}
              >
                Resume Optimizer
              </Link>
              <Link
                to="/feedback"
                className={isActive('/feedback') ? 'active' : ''}
              >
                Progress
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: '8px',
                  color: '#ef4444',
                  background: '#fef2f2',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
