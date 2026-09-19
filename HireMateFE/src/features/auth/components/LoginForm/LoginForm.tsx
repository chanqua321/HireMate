import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { authService, isSoleAdminSession } from '../../api/auth.service';
import { isSoleAdminEmail } from '../../../../shared/config/constants';
import { resolveAuthDisplayName } from '../../utils/displayName';
import { useConfetti } from '../../../../shared/hooks';
import '../../styles/auth-forms.css';

interface LoginFormProps {
  onSwitchMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchMode }) => {
  const { login, refreshProfile } = useApp();
  const navigate = useNavigate();
  const { triggerConfetti } = useConfetti();
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Vui lòng nhập email.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await authService.forgotPassword(forgotEmail.trim());
      if (res.ok || res.status === 200) {
        setForgotSuccess(true);
      } else {
        setForgotError(res.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Lỗi khi gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setError('');

    try {
      const res = await authService.login({
        email: form.email.trim(),
        password: form.password.trim(),
      });
      if (res.ok && res.data) {
        const fallbackName = resolveAuthDisplayName(res.data) || form.email.split('@')[0] || 'Người dùng';
        login(fallbackName);
        await refreshProfile();
        navigate(isSoleAdminSession(res.data) ? '/admin' : '/dashboard');
        return;
      }

      // Cần OTP → nhảy thẳng trang nhập OTP (không ở lại login)
      const payload: any = res.data;
      const needsOtp =
        !isSoleAdminEmail(form.email) &&
        (payload?.requireOtp === true ||
          /otp|xác nhận email|chua duoc xac nhan|chưa được xác nhận/i.test(res.message || ''));
      if (needsOtp) {
        navigate(`/verify-otp?email=${encodeURIComponent(form.email.trim())}`, { replace: true });
        return;
      }

      if (res.message) {
        setError(res.message);
        return;
      }
    } catch (err: any) {
      if (err?.message) {
        setError(err.message);
        return;
      }
    }

    setError('Đăng nhập thất bại. Vui lòng thử lại.');
  };

  const handleGoogleSuccess = async (credRes: CredentialResponse) => {
    const idToken = credRes.credential;
    if (!idToken) {
      setError('Không lấy được token xác thực từ Google.');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      const res = await authService.loginWithGoogle(idToken);
      if (res.ok && res.data) {
        const fallbackName = resolveAuthDisplayName(res.data, idToken);
        login(fallbackName);
        await refreshProfile();
        triggerConfetti();
        navigate(isSoleAdminSession(res.data) ? '/admin' : '/dashboard');
        return;
      }
      setError(res.message || 'Đăng nhập Google thất bại.');
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối khi đăng nhập với Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleLoading(false);
    const origin = window.location.origin;
    setError(
      `Google từ chối origin ${origin} (lỗi origin_mismatch). Thêm đúng origin này vào Authorized JavaScript origins của Client ID Google, rồi mở lại http://localhost:3000.`
    );
  };

  return (
    <div style={{ maxWidth: '340px', width: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <img
            src="/logo.png"
            alt="HireMate Logo"
            style={{
              height: '46px',
              width: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 10px rgba(3, 191, 255, 0.18))',
            }}
          />
        </div>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#001B3F', marginBottom: '6px' }}>
          Chào mừng trở lại
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>
          Đăng nhập để luyện tập phỏng vấn AI ngay
        </p>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="auth-input-wrap">
          <span className="auth-icon-left">
            <Mail size={18} />
          </span>
          <input
            type="email"
            required
            placeholder="Địa chỉ Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="auth-input"
          />
        </div>

        <div className="auth-input-wrap">
          <span className="auth-icon-left">
            <Lock size={18} />
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Mật khẩu"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="auth-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="auth-icon-right"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              setShowForgotModal(true);
              setForgotEmail(form.email);
              setForgotSuccess(false);
              setForgotError('');
            }}
            style={{ color: '#03BFFF', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}
          >
            Quên mật khẩu?
          </a>
        </div>

        <button type="submit" className="auth-submit-btn">
          Đăng nhập <ArrowRight size={18} />
        </button>
      </form>

      {/* Forgot Password Modal (Portal to body to prevent transform/overflow clipping) */}
      {showForgotModal &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 15, 40, 0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999999,
              padding: '20px',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowForgotModal(false);
              }
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                maxWidth: '420px',
                width: '100%',
                padding: '30px',
                boxShadow: '0 25px 60px rgba(0, 27, 63, 0.25)',
                position: 'relative',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                animation: 'scaleIn 0.2s ease-out forwards',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#001B3F', margin: 0 }}>
                  Quên mật khẩu?
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  style={{
                    border: 'none',
                    background: '#F1F5F9',
                    color: '#64748B',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, marginBottom: '18px' }}>
                Nhập email của bạn để nhận mã và hướng dẫn đặt lại mật khẩu mới từ HireMate.
              </p>

              {forgotError && (
                <div
                  style={{
                    background: '#FEF2F2',
                    color: '#DC2626',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    marginBottom: '14px',
                    fontWeight: 600,
                    border: '1px solid #FEE2E2',
                  }}
                >
                  {forgotError}
                </div>
              )}

              {forgotSuccess ? (
                <div>
                  <div
                    style={{
                      background: '#F0FDF4',
                      color: '#166534',
                      padding: '14px',
                      borderRadius: '12px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      marginBottom: '18px',
                      border: '1px solid #BBF7D0',
                      lineHeight: 1.5,
                    }}
                  >
                    ✅ Hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn!
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="auth-submit-btn"
                    style={{ width: '100%' }}
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="auth-input-wrap">
                    <span className="auth-icon-left">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="Email của bạn"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="auth-input"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: '10px',
                        border: '1px solid #D1D5DB',
                        background: '#F9FAFB',
                        color: '#4B5563',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="auth-submit-btn"
                      style={{ flex: 1.5, margin: 0 }}
                    >
                      {forgotLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

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
            shape="rectangular"
            width="340"
          />
        </div>
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
          onClick={onSwitchMode}
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
  );
};

