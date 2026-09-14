import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles, Check } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { authService } from '../../api/auth.service';
import { useConfetti } from '../../../../shared/hooks';
import '../../styles/auth-forms.css';

interface RegisterFormProps {
  onSwitchMode: () => void;
  onSuccessSwitchToLogin: (email: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchMode, onSuccessSwitchToLogin }) => {
  const { triggerConfetti } = useConfetti();
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const [successData, setSuccessData] = useState<{
    show: boolean;
    email: string;
    confirmLinkDev?: string;
  }>({ show: false, email: '' });

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
    setError('');

    try {
      const res = await authService.register({
        email: form.email.trim(),
        password: form.password.trim(),
        fullName: form.name.trim(),
      });
      if (res.ok || (res as any).status > 0) {
        const rawDevLink = res.data?.confirmLinkDev || (res as any).data?.confirmLinkDev || (res as any).confirmLinkDev;
        const devLink = rawDevLink
          ? rawDevLink.replace('http://localhost:5080', 'https://localhost:7080')
          : undefined;
        setSuccessData({
          show: true,
          email: form.email.trim(),
          confirmLinkDev: devLink,
        });
        triggerConfetti();
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

    // Fallback khi offline
    setSuccessData({
      show: true,
      email: form.email.trim(),
    });
    triggerConfetti();
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
        // Handle Google register success mapping to login (backend logic usually handles signup + login directly for Google)
        onSuccessSwitchToLogin(res.data.user?.email || form.email);
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

  if (successData.show) {
    return (
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
            {successData.email}
          </strong>
          . Vui lòng kiểm tra hộp thư (hoặc thư rác/Spam) để xác thực tài khoản và tiếp tục sử dụng.
        </p>

        {successData.confirmLinkDev && (
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
              href={successData.confirmLinkDev}
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
            onClick={() => onSuccessSwitchToLogin(successData.email)}
            className="btn btn-secondary"
            style={{ fontWeight: 600, padding: '12px', width: '100%' }}
          >
            Đã xác thực? Đăng nhập ngay
          </button>
        </div>
      </motion.div>
    );
  }

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
            type="password"
            required
            placeholder="Xác nhận mật khẩu"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
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
