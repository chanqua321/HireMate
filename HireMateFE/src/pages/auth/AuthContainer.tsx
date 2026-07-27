import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus, ArrowRight, CheckCircle2, Sparkles, Check } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services';
import { useConfetti } from '../../hooks/useConfetti';

interface AuthContainerProps {
  initialMode: 'login' | 'register';
}

export const AuthContainer: React.FC<AuthContainerProps> = ({ initialMode }) => {
  const { login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerConfetti } = useConfetti();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  // Register success animation state
  const [registerSuccessData, setRegisterSuccessData] = useState<{
    show: boolean;
    email: string;
    confirmLinkDev?: string;
  }>({ show: false, email: '' });

  // Sync mode with URL pathname or initialMode without unmounting
  useEffect(() => {
    if (location.pathname.includes('register')) {
      setIsLogin(false);
    } else if (location.pathname.includes('login')) {
      setIsLogin(true);
    } else {
      setIsLogin(initialMode === 'login');
    }
  }, [location.pathname, initialMode]);

  // Handle browser Back / Forward buttons smoothly
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setIsLogin(!path.includes('register'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    const targetUrl = targetMode === 'login' ? '/login' : '/register';
    window.history.pushState(null, '', targetUrl);
    document.title = targetMode === 'login' ? 'HireMate - Đăng nhập' : 'HireMate - Đăng ký';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      setLoginError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setLoginError('');

    try {
      const res = await authService.login({
        email: loginForm.email.trim(),
        password: loginForm.password.trim(),
      });
      if (res.ok && res.data) {
        const fullNameFromDb = res.data.user?.fullName;
        const fallbackName = fullNameFromDb || loginForm.email.split('@')[0] || 'Người dùng';
        login(fallbackName);
        navigate('/dashboard');
        return;
      } else if (res.status !== 0 && res.message) {
        setLoginError(res.message);
        return;
      }
    } catch (err: any) {
      if (err?.message) {
        setLoginError(err.message);
        return;
      }
    }

    // Fallback khi network offline
    const prefix = loginForm.email.split('@')[0] || 'Người dùng';
    const displayName =
      prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();

    login(displayName);
    navigate('/dashboard');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
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

    try {
      const res = await authService.register({
        email: registerForm.email.trim(),
        password: registerForm.password.trim(),
        fullName: registerForm.name.trim(),
      });
      if (res.ok || (res as any).status > 0) {
        const rawDevLink = res.data?.confirmLinkDev || (res as any).data?.confirmLinkDev || (res as any).confirmLinkDev;
        const devLink = rawDevLink
          ? rawDevLink.replace('http://localhost:5080', 'https://localhost:7080')
          : undefined;
        setRegisterSuccessData({
          show: true,
          email: registerForm.email.trim(),
          confirmLinkDev: devLink,
        });
        triggerConfetti();
        return;
      } else if (res.status !== 0 && res.message) {
        setRegisterError(res.message);
        return;
      }
    } catch (err: any) {
      if (err?.message) {
        setRegisterError(err.message);
        return;
      }
    }

    // Fallback khi offline
    setRegisterSuccessData({
      show: true,
      email: registerForm.email.trim(),
    });
    triggerConfetti();
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSuccess = async (credRes: CredentialResponse) => {
    const idToken = credRes.credential;
    if (!idToken) {
      const err = 'Không lấy được token xác thực từ Google.';
      if (isLogin) setLoginError(err);
      else setRegisterError(err);
      return;
    }

    setGoogleLoading(true);
    setLoginError('');
    setRegisterError('');

    try {
      const res = await authService.loginWithGoogle(idToken);
      if (res.ok && res.data) {
        const fullNameFromDb = res.data.user?.fullName;
        const fallbackName = fullNameFromDb || 'Người dùng Google';
        login(fallbackName);
        triggerConfetti();
        navigate('/dashboard');
        return;
      } else {
        const msg = res.message || 'Đăng nhập Google thất bại.';
        if (isLogin) setLoginError(msg);
        else setRegisterError(msg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Lỗi kết nối khi đăng nhập với Google.';
      if (isLogin) setLoginError(msg);
      else setRegisterError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    const msg = 'Đăng nhập Google bị hủy hoặc thất bại.';
    if (isLogin) setLoginError(msg);
    else setRegisterError(msg);
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
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="pill"
                  width="340"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSocialLogin('LinkedIn')}
                style={{
                  padding: '9px 16px',
                  background: '#ffffff',
                  border: '1px solid #747775',
                  borderRadius: '24px',
                  fontWeight: 500,
                  fontSize: '0.88rem',
                  color: '#1f1f1f',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#0A66C2', fontWeight: 700, fontSize: '1rem' }}>in</span> Đăng nhập với LinkedIn
              </button>
              {googleLoading && (
                <div style={{ textAlign: 'center', color: '#03BFFF', fontSize: '0.8rem', fontWeight: 600 }}>
                  Đang xác thực với tài khoản Google...
                </div>
              )}
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
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
            {registerSuccessData.show ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 280, damping: 20 }}
                style={{ textAlign: 'center', padding: '10px 0' }}
              >
                <motion.div
                  style={{
                    width: '82px',
                    height: '82px',
                    margin: '0 auto 20px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.08))',
                    color: '#22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(34, 197, 94, 0.35)',
                    boxShadow: '0 12px 28px rgba(34, 197, 94, 0.22)',
                  }}
                  initial={{ scale: 0.4, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                >
                  <Mail size={42} strokeWidth={2.2} />
                </motion.div>

                <span
                  className="badge badge--success"
                  style={{
                    marginBottom: '12px',
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#16A34A',
                    borderRadius: '20px',
                  }}
                >
                  <Sparkles size={14} style={{ marginRight: '6px' }} /> ĐĂNG KÝ THÀNH CÔNG
                </span>

                <h2
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: 'var(--navy, #001B3F)',
                    marginBottom: '12px',
                  }}
                >
                  Kiểm Tra Email Của Bạn!
                </h2>

                <p
                  style={{
                    color: '#6B7280',
                    fontSize: '0.94rem',
                    lineHeight: 1.6,
                    marginBottom: '22px',
                  }}
                >
                  Chúng tôi đã gửi một email xác thực tài khoản tới{' '}
                  <strong style={{ color: 'var(--navy, #001B3F)' }}>
                    {registerSuccessData.email}
                  </strong>
                  . Vui lòng kiểm tra hộp thư (hoặc thư rác/Spam) để xác thực tài khoản và tiếp tục sử dụng.
                </p>

                {registerSuccessData.confirmLinkDev && (
                  <div
                    style={{
                      background: 'rgba(3, 191, 255, 0.08)',
                      border: '1px dashed rgba(3, 191, 255, 0.5)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '20px',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#03BFFF',
                        marginBottom: '8px',
                      }}
                    >
                      ⚡ Chế độ kiểm thử (Dev Mode) - Không cần mở Gmail:
                    </div>
                    <a
                      href={registerSuccessData.confirmLinkDev}
                      className="btn btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        width: '100%',
                      }}
                    >
                      <Check size={18} />
                      <span>Xác thực tài khoản ngay (Test Confirm)</span>
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginForm({ ...loginForm, email: registerSuccessData.email });
                      handleModeChange('login');
                    }}
                    className="btn btn-secondary"
                    style={{ fontWeight: 600, padding: '12px', width: '100%' }}
                  >
                    Đã xác thực? Đăng nhập ngay
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signup_with"
                  shape="pill"
                  width="360"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSocialLogin('LinkedIn')}
                style={{
                  padding: '9px 16px',
                  background: '#ffffff',
                  border: '1px solid #747775',
                  borderRadius: '24px',
                  fontWeight: 500,
                  fontSize: '0.88rem',
                  color: '#1f1f1f',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#0A66C2', fontWeight: 700, fontSize: '1rem' }}>in</span> Đăng ký với LinkedIn
              </button>
              {googleLoading && (
                <div style={{ textAlign: 'center', color: '#03BFFF', fontSize: '0.8rem', fontWeight: 600 }}>
                  Đang xác thực với tài khoản Google...
                </div>
              )}
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
              </>
            )}
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
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
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
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
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
