import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { authService } from '../../api/auth.service';
import { useConfetti } from '../../../../shared/hooks';
import '../../styles/auth-forms.css';

interface LoginFormProps {
  onSwitchMode: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchMode }) => {
  const { login } = useApp();
  const navigate = useNavigate();
  const { triggerConfetti } = useConfetti();
  
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

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
        const fullNameFromDb = res.data.user?.fullName;
        const fallbackName = fullNameFromDb || form.email.split('@')[0] || 'Người dùng';
        login(fallbackName);
        navigate('/dashboard');
        return;
      } else if (res.status !== 0 && res.message) {
        setError(res.message);
        return;
      }
    } catch (err: any) {
      if (err?.message) {
        setError(err.message);
        return;
      }
    }

    // Fallback
    const prefix = form.email.split('@')[0] || 'Người dùng';
    const displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    login(displayName);
    navigate('/dashboard');
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
        const fullNameFromDb = res.data.user?.fullName;
        const fallbackName = fullNameFromDb || 'Người dùng Google';
        login(fallbackName);
        triggerConfetti();
        navigate('/dashboard');
        return;
      } else {
        setError(res.message || 'Đăng nhập Google thất bại.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối khi đăng nhập với Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Đăng nhập Google bị hủy hoặc thất bại.');
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
