import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../../app/context/AppContext';
import {
  Menu,
  X,
  Bell,
  LogOut,
  User,
  LayoutDashboard,
  Sparkles,
  LogIn,
  UserPlus,
  BookOpen,
  Video,
  FileSearch,
  Mail,
  CreditCard,
  Receipt,
  CheckCircle2,
  Compass,
  Lock,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthRequiredModal } from '../AuthRequiredModal/AuthRequiredModal';
import { SupportTicketModal } from '../SupportTicketModal/SupportTicketModal';
import './css/Header.css';

export const Header: React.FC = () => {
  const { isLoggedIn, profile, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalFeature, setAuthModalFeature] = useState('Tính năng');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

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

  const handleProtectedClick = (e: React.MouseEvent, path: string, featureName: string) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setAuthModalFeature(featureName);
      setAuthModalOpen(true);
      if (mobileOpen) setMobileOpen(false);
    }
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
      : 'HM';

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <nav className="nav">
          {/* Brand Logo */}
          <Link className="brand" to="/">
            <img src="/logo.png" alt="HireMate" />
          </Link>

          {/* Full Navigation Links */}
          <div className="nav-links desktop-only">
            <Link to="/" className={isActive('/') ? 'active' : ''}>
              Tính năng
            </Link>
            <Link
              to="/interview-setup"
              className={isActive('/interview-setup') || isActive('/interview-room') ? 'active' : ''}
              onClick={(e) => handleProtectedClick(e, '/interview-setup', 'Phỏng vấn AI thông minh')}
            >
              Phỏng vấn AI
              {!isLoggedIn && <Lock size={12} className="nav-lock-badge" />}
            </Link>
            <Link
              to="/questions"
              className={isActive('/questions') ? 'active' : ''}
              onClick={(e) => handleProtectedClick(e, '/questions', 'Ngân hàng câu hỏi')}
            >
              Ngân hàng câu hỏi
              {!isLoggedIn && <Lock size={12} className="nav-lock-badge" />}
            </Link>
            <Link
              to="/career"
              className={isActive('/career') ? 'active' : ''}
              onClick={(e) => handleProtectedClick(e, '/career', 'Hệ điều hành sự nghiệp Career OS')}
            >
              Career OS
              {!isLoggedIn && <Lock size={12} className="nav-lock-badge" />}
            </Link>
            <Link
              to="/leaderboard"
              className={isActive('/leaderboard') ? 'active' : ''}
            >
              Bảng vàng
            </Link>
            <Link
              to="/blog"
              className={isActive('/blog') ? 'active' : ''}
            >
              Cẩm nang
            </Link>
            <Link
              to="/resources"
              className={isActive('/resources') ? 'active' : ''}
            >
              Tài nguyên
            </Link>
            <Link
              to="/pricing"
              className={isActive('/pricing') || isActive('/checkout') ? 'active' : ''}
            >
              Bảng giá
            </Link>
          </div>

          {/* Right Area: Auth & Profile Controls */}
          <div className="nav-right">
            {isLoggedIn ? (
              <>
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
                          borderRadius: '16px',
                          boxShadow: '0 16px 36px -6px rgba(16,24,40,0.16)',
                          width: '260px',
                          padding: '10px',
                          zIndex: 1000,
                        }}
                      >
                        <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '6px' }}>
                          <div style={{ fontWeight: 750, fontSize: '0.92rem', color: '#0f172a' }}>
                            {profile.name || 'Ứng viên HireMate'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {profile.role || 'Lập trình viên'}
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
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <LayoutDashboard size={16} color="#03BFFF" /> Bảng điều khiển chính
                        </Link>

                        <Link
                          to="/dashboard?tab=manual"
                          onClick={() => setDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          <User size={16} color="#64748b" /> Hồ sơ & Kỹ năng
                        </Link>

                        <Link
                          to="/dashboard?view=onboarding"
                          onClick={() => setDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          <Compass size={16} color="#0284c7" /> Lộ trình Onboarding (3 Bước)
                        </Link>

                        <Link
                          to="/dashboard?tab=scan"
                          onClick={() => setDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          <FileSearch size={16} color="#64748b" /> Quét CV bằng AI
                        </Link>

                        <Link
                          to="/dashboard?tab=email"
                          onClick={() => setDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          <Mail size={16} color="#64748b" /> Trợ lý Thư ứng tuyển
                        </Link>

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0' }} />

                        <Link
                          to="/career"
                          onClick={() => setDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <Compass size={16} color="#03BFFF" /> Hệ điều hành Career OS
                        </Link>

                        <Link
                          to="/leaderboard"
                          onClick={() => setDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          <Award size={16} color="#eab308" /> Bảng vàng & Huy hiệu
                        </Link>

                        <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0' }} />

                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            setTicketModalOpen(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#0284c7',
                            fontSize: '0.86rem',
                            fontWeight: 600,
                            background: '#f0f9ff',
                            border: '1px solid #e0f2fe',
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginBottom: '4px',
                          }}
                        >
                          <BookOpen size={16} color="#03BFFF" /> Gửi Ticket Hỗ Trợ
                        </button>

                        <Link
                          to="/invoice"
                          onClick={() => setDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 12px',
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '0.86rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                          }}
                        >
                          <Receipt size={16} color="#64748b" /> Lịch sử hóa đơn
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
                            borderRadius: '10px',
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
                          <LogOut size={16} /> Đăng xuất
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
                  Đăng xuất
                </button>
              </>
            ) : (
              /* When not logged in: Show Login & Register buttons */
              <div className="nav-auth-buttons desktop-only">
                <Link to="/login" className="nav-login-link">
                  <LogIn size={15} />
                  <span>Đăng nhập</span>
                </Link>
                <Link to="/register" className="nav-register-btn">
                  <Sparkles size={15} />
                  <span>Đăng ký miễn phí</span>
                </Link>
              </div>
            )}

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
                Tính năng
              </Link>
              <Link
                to="/interview-setup"
                className={isActive('/interview-setup') ? 'active' : ''}
                onClick={(e) => handleProtectedClick(e, '/interview-setup', 'Phỏng vấn AI thông minh')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Phỏng vấn AI</span>
                  {!isLoggedIn && <Lock size={14} color="#94a3b8" />}
                </div>
              </Link>
              <Link
                to="/questions"
                className={isActive('/questions') ? 'active' : ''}
                onClick={(e) => handleProtectedClick(e, '/questions', 'Ngân hàng câu hỏi')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Ngân hàng câu hỏi</span>
                  {!isLoggedIn && <Lock size={14} color="#94a3b8" />}
                </div>
              </Link>
              <Link
                to="/dashboard"
                className={isActive('/dashboard') ? 'active' : ''}
                onClick={(e) => handleProtectedClick(e, '/dashboard', 'Bảng điều khiển & Hồ sơ')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Bảng điều khiển</span>
                  {!isLoggedIn && <Lock size={14} color="#94a3b8" />}
                </div>
              </Link>
              <Link to="/pricing" className={isActive('/pricing') ? 'active' : ''}>
                Bảng giá
              </Link>

              {isLoggedIn ? (
                <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ padding: '0 14px 8px 14px', fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                    Xin chào, {profile.name || 'Ứng viên'}!
                  </div>
                  <Link
                    to="/dashboard?tab=scan"
                    style={{ padding: '10px 14px', color: '#1e293b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}
                  >
                    <FileSearch size={16} /> Quét CV bằng AI
                  </Link>
                  <Link
                    to="/dashboard?tab=email"
                    style={{ padding: '10px 14px', color: '#1e293b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}
                  >
                    <Mail size={16} /> Trợ lý Thư AI
                  </Link>
                  <Link
                    to="/invoice"
                    style={{ padding: '10px 14px', color: '#1e293b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}
                  >
                    <Receipt size={16} /> Hóa đơn điện tử
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      color: '#ef4444',
                      background: '#fef2f2',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      marginTop: '8px',
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="mobile-auth-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  <Link
                    to="/login"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#f1f5f9',
                      color: '#0f172a',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <LogIn size={16} /> Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #03bfff 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <Sparkles size={16} /> Đăng ký miễn phí
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Authentication Required Modal */}
      <AuthRequiredModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        featureName={authModalFeature}
      />

      {/* Support Ticket Modal */}
      <SupportTicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
      />
    </>
  );
};

export default Header;
