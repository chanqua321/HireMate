import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Header: React.FC = () => {
  const { isLoggedIn, profile, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
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
      return (
        location.pathname === '/' ||
        location.pathname === '/index.html' ||
        location.pathname === ''
      );
    }
    return (
      location.pathname.startsWith(path) ||
      location.pathname.startsWith(`${path}.html`)
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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
      : 'HM';

  return (
    <>
      <header
        className={`site-header ${scrolled ? 'scrolled' : ''}`}
        style={{
          transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
        }}
      >
        <nav className="nav container">
          <Link className="brand" to="/">
            <img src="/logo.png" alt="HireMate" />
          </Link>

          <div className="nav-links">
            <Link to="/" className={isActive('/') ? 'active' : ''}>
              Trang chủ
            </Link>
            <Link to="/pricing" className={isActive('/pricing') ? 'active' : ''}>
              Bảng giá
            </Link>
            <Link
              to="/interview-setup"
              className={isActive('/interview-setup') ? 'active' : ''}
            >
              Phỏng vấn
            </Link>
            <Link
              to="/questions"
              className={isActive('/questions') ? 'active' : ''}
            >
              Ngân hàng câu hỏi
            </Link>
          </div>

          <div className="nav-right" style={{ position: 'relative' }}>
            {!isLoggedIn ? (
              <>
                <Link className="btn btn-ghost desktop-only" to="/login">
                  Đăng nhập
                </Link>
                <Link className="btn btn-primary desktop-only" to="/register">
                  Đăng ký
                </Link>
              </>
            ) : (
              <div
                style={{ position: 'relative', display: 'inline-block' }}
              >
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="desktop-only"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                  aria-label="Tài khoản cá nhân"
                >
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    {initials}
                  </span>
                  <span>{profile.name || 'Hồ sơ'}</span>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 12px 28px -6px rgba(16,24,40,0.16)',
                        width: '200px',
                        padding: '8px',
                        zIndex: 1000,
                      }}
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          color: 'var(--ink)',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        <LayoutDashboard size={16} /> Bảng điều khiển
                      </Link>
                      <Link
                        to="/onboarding/profile"
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          color: 'var(--ink)',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        <User size={16} /> Hồ sơ & Mục tiêu
                      </Link>
                      <hr
                        style={{
                          border: 'none',
                          borderTop: '1px solid var(--border)',
                          margin: '6px 0',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          color: '#EF4444',
                          background: 'transparent',
                          border: 'none',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <LogOut size={16} /> Đăng xuất
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              className="hamburger"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Mở menu"
            >
              {mobileOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu open"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            style={{ display: 'block' }}
          >
            <div className="panel">
              <Link to="/" className={isActive('/') ? 'active' : ''}>
                Trang chủ
              </Link>
              <Link
                to="/pricing"
                className={isActive('/pricing') ? 'active' : ''}
              >
                Bảng giá
              </Link>
              <Link
                to="/interview-setup"
                className={isActive('/interview-setup') ? 'active' : ''}
              >
                Phỏng vấn
              </Link>
              <Link
                to="/questions"
                className={isActive('/questions') ? 'active' : ''}
              >
                Ngân hàng câu hỏi
              </Link>

              <div className="mm-actions">
                {!isLoggedIn ? (
                  <>
                    <Link className="btn btn-ghost" to="/login">
                      Đăng nhập
                    </Link>
                    <Link className="btn btn-primary" to="/register">
                      Đăng ký
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="btn btn-primary" to="/dashboard">
                      Bảng điều khiển
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn btn-ghost"
                    >
                      Đăng xuất
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
