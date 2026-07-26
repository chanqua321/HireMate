import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuthContainerProps {
  initialMode: 'login' | 'register';
}

export const AuthContainer: React.FC<AuthContainerProps> = ({ initialMode }) => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  // Sync mode with route prop
  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  // Login form state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const handleModeChange = (targetMode: 'login' | 'register') => {
    setIsLogin(targetMode === 'login');
    setLoginError('');
    setRegisterError('');
    navigate(targetMode === 'login' ? '/login' : '/register', { replace: true });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setLoginError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setLoginError('');
    const prefix = loginForm.email.split('@')[0] || 'Người dùng';
    const displayName =
      prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();

    login(displayName);
    navigate('/dashboard');
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !registerForm.name.trim() ||
      !registerForm.email.trim() ||
      !registerForm.password.trim() ||
      !registerForm.confirm.trim()
    ) {
      setRegisterError('Vui lòng nhập đầy đủ thông tin yêu cầu.');
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      setRegisterError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    setRegisterError('');
    login(registerForm.name.trim());
    navigate('/onboarding/profile');
  };

  const handleSocialLogin = (provider: string) => {
    login(`Người dùng ${provider}`);
    navigate('/dashboard');
  };

  return (
    <div
      className="auth-page-container"
      style={{
        minHeight: 'calc(100vh - var(--header-h, 72px))',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        background: 'var(--bg-app, #F7F9FC)',
        overflow: 'hidden',
      }}
    >
      {/* Subtle Ice Blue decorative background glow blobs */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '15%',
          width: '420px',
          height: '420px',
          background: 'radial-gradient(circle, rgba(161, 203, 229, 0.45), transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '15%',
          width: '460px',
          height: '460px',
          background: 'radial-gradient(circle, rgba(3, 191, 255, 0.25), transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Split Box */}
      <div className="auth-split-box">
        {/* ==================== LOGIN FORM PANEL ==================== */}
        <motion.div
          className="auth-panel auth-panel--login"
          style={{
            zIndex: isLogin ? 20 : 10,
            pointerEvents: isLogin ? 'auto' : 'none',
          }}
          initial={false}
          animate={{
            opacity: isLogin ? 1 : 0,
            x: isLogin ? '0%' : '-15%',
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div style={{ maxWidth: '340px', width: '100%', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'rgba(161, 203, 229, 0.25)',
                  color: 'var(--secondary, #001B3F)',
                  marginBottom: '12px',
                }}
              >
                <LogIn size={22} />
              </div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#001B3F', marginBottom: '6px' }}>
                Chào mừng trở lại
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>
                Đăng nhập để luyện tập phỏng vấn AI ngay
              </p>
            </div>

            {loginError && (
              <div
                style={{
                  background: '#FDECEC',
                  color: '#EF4444',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="auth-input-wrap">
                <span className="auth-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="Địa chỉ Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="auth-input"
                />
              </div>

              <div className="auth-input-wrap">
                <span className="auth-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Mật khẩu"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="auth-icon-right"
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#4B5563' }}>
                  <input type="checkbox" defaultChecked />
                  Ghi nhớ tôi
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Vui lòng liên hệ bộ phận hỗ trợ HireMate để đặt lại mật khẩu.');
                  }}
                  style={{ color: '#03BFFF', fontWeight: 600, textDecoration: 'none' }}
                >
                  Quên mật khẩu?
                </a>
              </div>

              <button type="submit" className="auth-submit-btn">
                Đăng nhập <ArrowRight size={18} />
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '22px 0 16px',
                color: '#93A1BD',
                fontSize: '0.78rem',
              }}
            >
              <hr style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
              <span style={{ padding: '0 12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                hoặc dùng mạng xã hội
              </span>
              <hr style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                style={{
                  padding: '10px',
                  background: '#ffffff',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#1B1D21',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('LinkedIn')}
                style={{
                  padding: '10px',
                  background: '#ffffff',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#1B1D21',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                LinkedIn
              </button>
            </div>

            <div className="auth-mobile-toggle">
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#03BFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Đăng ký ngay
              </button>
            </div>
          </div>
        </motion.div>

        {/* ==================== REGISTER FORM PANEL ==================== */}
        <motion.div
          className="auth-panel auth-panel--register"
          style={{
            zIndex: isLogin ? 10 : 20,
            pointerEvents: isLogin ? 'none' : 'auto',
          }}
          initial={false}
          animate={{
            opacity: isLogin ? 0 : 1,
            x: isLogin ? '15%' : '0%',
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div style={{ maxWidth: '340px', width: '100%', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'rgba(161, 203, 229, 0.25)',
                  color: 'var(--secondary, #001B3F)',
                  marginBottom: '10px',
                }}
              >
                <UserPlus size={22} />
              </div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#001B3F', marginBottom: '4px' }}>
                Tạo tài khoản mới
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>
                Trải nghiệm phỏng vấn AI ngay hôm nay
              </p>
            </div>

            {registerError && (
              <div
                style={{
                  background: '#FDECEC',
                  color: '#EF4444',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '14px',
                  textAlign: 'center',
                }}
              >
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="auth-input-wrap">
                <span className="auth-icon-left">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Họ và tên"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="auth-input"
                />
              </div>

              <div className="auth-input-wrap">
                <span className="auth-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="Địa chỉ Email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="auth-input"
                />
              </div>

              <div className="auth-input-wrap">
                <span className="auth-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="Mật khẩu (ít nhất 8 ký tự)"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="auth-icon-right"
                >
                  {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="auth-input-wrap">
                <span className="auth-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Xác nhận mật khẩu"
                  value={registerForm.confirm}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirm: e.target.value })}
                  className="auth-input"
                />
              </div>

              <button type="submit" className="auth-submit-btn">
                Tạo tài khoản <ArrowRight size={18} />
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '18px 0 14px',
                color: '#93A1BD',
                fontSize: '0.78rem',
              }}
            >
              <hr style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
              <span style={{ padding: '0 12px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                hoặc đăng ký với
              </span>
              <hr style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                style={{
                  padding: '10px',
                  background: '#ffffff',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#1B1D21',
                  cursor: 'pointer',
                }}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('LinkedIn')}
                style={{
                  padding: '10px',
                  background: '#ffffff',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#1B1D21',
                  cursor: 'pointer',
                }}
              >
                LinkedIn
              </button>
            </div>

            <div className="auth-mobile-toggle">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#03BFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </motion.div>

        {/* ==================== SLIDING OVERLAY PANEL (AI-Study-Hub Style) ==================== */}
        <motion.div
          className="auth-overlay"
          style={{ display: 'block' }}
          initial={false}
          animate={{
            x: isLogin ? '0%' : '-100%',
            borderTopLeftRadius: isLogin ? '0px' : '32px',
            borderBottomLeftRadius: isLogin ? '0px' : '32px',
            borderTopRightRadius: isLogin ? '32px' : '0px',
            borderBottomRightRadius: isLogin ? '32px' : '0px',
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Decorative ice blue background glows inside overlay */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(161, 203, 229, 0.35), transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-80px',
              left: '-60px',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(3, 191, 255, 0.28), transparent 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }}
          />

          <motion.div
            className="auth-overlay-track"
            style={{
              width: '200%',
              height: '100%',
              display: 'flex',
              flexWrap: 'nowrap',
            }}
            initial={false}
            animate={{ x: isLogin ? '-50%' : '0%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            {/* Overlay Left Side (Shown when user is looking at Register form) */}
            <div
              className="auth-overlay-side"
              style={{
                width: '50%',
                flex: '0 0 50%',
                maxWidth: '50%',
                overflow: 'hidden',
                boxSizing: 'border-box',
                padding: '40px 24px',
              }}
            >
              <h2
                style={{
                  fontSize: '1.6rem',
                  whiteSpace: 'normal',
                  lineHeight: '1.3',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  textAlign: 'center',
                }}
              >
                Xin chào bạn mới!
              </h2>
              <p>
                Bạn đã có tài khoản HireMate? Hãy đăng nhập để tiếp tục hành trình rèn luyện kỹ năng phỏng vấn.
              </p>
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className="auth-overlay-btn auth-overlay-btn--filled"
              >
                ĐĂNG NHẬP NGAY
              </button>
            </div>

            {/* Overlay Right Side (Shown when user is looking at Login form) */}
            <div
              className="auth-overlay-side"
              style={{
                width: '50%',
                flex: '0 0 50%',
                maxWidth: '50%',
                overflow: 'hidden',
                boxSizing: 'border-box',
                padding: '40px 24px',
              }}
            >
              <h2
                style={{
                  fontSize: '1.6rem',
                  whiteSpace: 'normal',
                  lineHeight: '1.3',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  textAlign: 'center',
                }}
              >
                Chào mừng bạn đã trở lại!
              </h2>
              <p>
                Chưa có tài khoản? Hãy đăng ký để trải nghiệm cố vấn AI phỏng vấn chuẩn STAR chuyên nghiệp.
              </p>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className="auth-overlay-btn auth-overlay-btn--outline"
              >
                ĐĂNG KÝ MIỄN PHÍ
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthContainer;
