import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService, isSoleAdminSession } from '../../api/auth.service';
import { isSoleAdminEmail } from '../../../../shared/config/constants';
import { useApp } from '../../../../app/context/AppContext';
import { useConfetti } from '../../../../shared/hooks';
import { resolveAuthDisplayName } from '../../utils/displayName';
import '../../styles/auth-forms.css';

interface RegisterFormProps {
  onSwitchMode: () => void;
  onSuccessSwitchToLogin: (email: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchMode, onSuccessSwitchToLogin }) => {
  const { triggerConfetti } = useConfetti();
  const { login, refreshProfile } = useApp();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim() || !form.confirm.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin yêu cầu.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    if (isSoleAdminEmail(form.email)) {
      setError('Không thể đăng ký bằng email quản trị. Vui lòng đăng nhập Admin.');
      return;
    }
    setError('');

    try {
      const res = await authService.register({
        email: form.email.trim(),
        password: form.password.trim(),
        fullName: form.name.trim(),
      });
      if (res.ok) {
        const data: any = res.data ?? {};
        const needsOtp =
          data?.verifyOtp === true ||
          data?.requireEmailConfirmation === true ||
          data?.emailConfirmed === false ||
          /otp|xác nhận email/i.test(res.message || '');
        if (needsOtp) {
          navigate(
            `/verify-otp?email=${encodeURIComponent(form.email.trim())}`,
            { replace: true }
          );
          return;
        }
        onSuccessSwitchToLogin(form.email.trim());
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

    setError('Đăng ký thất bại. Vui lòng thử lại.');
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
        const googleName = resolveAuthDisplayName(res.data, idToken);
        login(googleName);
        triggerConfetti();
        await refreshProfile();
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
      `Google từ chối origin ${origin} (lỗi origin_mismatch). Thêm đúng origin này vào Authorized JavaScript origins của Client ID Google, rồi tải lại trang.`
    );
  };

  return (
    <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
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
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#001B3F', marginBottom: '4px' }}>
          Tạo tài khoản mới
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>
          Trải nghiệm phỏng vấn AI ngay hôm nay
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
            marginBottom: '14px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="auth-input-wrap">
          <span className="auth-icon-left">
            <User size={18} />
          </span>
          <input
            type="text"
            required
            placeholder="Họ và tên"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            placeholder="Mật khẩu (ít nhất 8 ký tự)"
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

        <div className="auth-input-wrap">
          <span className="auth-icon-left">
            <Lock size={18} />
          </span>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            required
            placeholder="Xác nhận mật khẩu"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="auth-input"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="auth-icon-right"
            tabIndex={-1}
            title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
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
            shape="rectangular"
            width="360"
          />
        </div>
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
          Đăng nhập ngay
        </button>
      </div>
    </div>
  );
};
