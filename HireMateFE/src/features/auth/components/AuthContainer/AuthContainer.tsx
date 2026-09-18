import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LoginForm } from '../LoginForm/LoginForm';
import { RegisterForm } from '../RegisterForm/RegisterForm';
import './css/AuthContainer.css';

interface AuthContainerProps {
  initialMode: 'login' | 'register';
}

export const AuthContainer: React.FC<AuthContainerProps> = ({ initialMode }) => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(initialMode === 'login');

  useEffect(() => {
    if (location.pathname.includes('register')) {
      setIsLogin(false);
    } else if (location.pathname.includes('login')) {
      setIsLogin(true);
    } else {
      setIsLogin(initialMode === 'login');
    }
  }, [location.pathname, initialMode]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setIsLogin(!path.includes('register'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleModeChange = (targetMode: 'login' | 'register') => {
    setIsLogin(targetMode === 'login');
    const targetUrl = targetMode === 'login' ? '/login' : '/register';
    window.history.pushState(null, '', targetUrl);
    document.title = targetMode === 'login' ? 'HireMate - Đăng nhập' : 'HireMate - Đăng ký';
  };

  const handleSuccessSwitchToLogin = () => {
    handleModeChange('login');
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
          {/* Chỉ mount form đang active để tránh GSI initialize() 2 lần */}
          {isLogin && <LoginForm onSwitchMode={() => handleModeChange('register')} />}
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
          {!isLogin && (
            <RegisterForm
              onSwitchMode={() => handleModeChange('login')}
              onSuccessSwitchToLogin={handleSuccessSwitchToLogin}
            />
          )}
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
              background: 'radial-gradient(circle, rgba(161, 203, 229, 0.25), transparent 70%)',
              filter: 'blur(50px)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-40px',
              left: '-40px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(3, 191, 255, 0.35), transparent 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          <motion.div
            className="auth-overlay-track"
            initial={false}
            animate={{ x: isLogin ? '-50%' : '0%' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            style={{ zIndex: 10, position: 'relative' }}
          >
            {/* Left Side: Visible when Register is active -> Suggests Login */}
            <div className="auth-overlay-side">
              <img
                src="/logo.png"
                alt="HireMate Logo"
                style={{ height: '48px', marginBottom: '24px', filter: 'brightness(0) invert(1) drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
              />
              <h2>Đã có tài khoản?</h2>
              <p>
                Tiếp tục hành trình chinh phục nhà tuyển dụng bằng cách đăng nhập vào HireMate ngay hôm nay.
              </p>
              <button
                type="button"
                className="auth-overlay-btn auth-overlay-btn--outline"
                onClick={() => handleModeChange('login')}
              >
                Đăng nhập
              </button>
            </div>

            {/* Right Side: Visible when Login is active -> Suggests Register */}
            <div className="auth-overlay-side">
              <img
                src="/logo.png"
                alt="HireMate Logo"
                style={{ height: '48px', marginBottom: '24px', filter: 'brightness(0) invert(1) drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
              />
              <h2>Chào bạn mới!</h2>
              <p>
                Tạo tài khoản miễn phí để mở khóa lộ trình luyện tập phỏng vấn AI được cá nhân hóa dành riêng cho bạn.
              </p>
              <button
                type="button"
                className="auth-overlay-btn auth-overlay-btn--filled"
                onClick={() => handleModeChange('register')}
              >
                Đăng ký tài khoản
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
