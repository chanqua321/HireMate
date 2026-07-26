import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Mail,
  Check,
  Home,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfetti } from '../../hooks/useConfetti';
import { apiClient } from '../../services';

export const EmailConfirmed: React.FC = () => {
  const { triggerConfetti } = useConfetti();
  const [searchParams] = useSearchParams();

  const statusParam = searchParams.get('status');
  const messageParam = searchParams.get('message');
  const userIdParam = searchParams.get('userId');
  const tokenParam = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() => {
    if (statusParam === 'success') return 'success';
    if (statusParam === 'error') return 'error';
    if (userIdParam && tokenParam) return 'loading';
    return 'success'; // Default fallback preview
  });

  const [message, setMessage] = useState<string>(() => {
    if (messageParam) return messageParam;
    if (statusParam === 'error')
      return 'Mã xác nhận không hợp lệ, đã được sử dụng hoặc đã hết hạn.';
    return 'Xác nhận email thành công! Bạn có thể đăng nhập ngay.';
  });

  // State cho tính năng gửi lại email khi thất bại
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  // Nếu trong URL có userId và token mà chưa có status -> tự động gọi API xác thực
  useEffect(() => {
    if (userIdParam && tokenParam && !statusParam) {
      const verifyToken = async () => {
        try {
          const res = await apiClient.post(
            `/Auth/confirm-email?userId=${encodeURIComponent(userIdParam)}&token=${encodeURIComponent(tokenParam)}`
          );
          setStatus('success');
          setMessage(
            res.message ||
              'Xác nhận email thành công. Bạn có thể đăng nhập ngay!'
          );
          triggerConfetti();
        } catch (err: any) {
          setStatus('error');
          setMessage(
            err.message ||
              'Mã xác nhận không hợp lệ, đã được sử dụng hoặc đã hết hạn.'
          );
        }
      };
      verifyToken();
    } else if (status === 'success') {
      triggerConfetti();
    }
  }, [userIdParam, tokenParam, statusParam, triggerConfetti, status]);

  const handleResendConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      setResendError('Vui lòng nhập địa chỉ email đã đăng ký.');
      return;
    }
    setResendLoading(true);
    setResendError('');
    setResendSuccess(false);

    try {
      await apiClient.post('/Auth/resend-confirm-email', {
        email: resendEmail.trim(),
      });
      setResendSuccess(true);
    } catch (err: any) {
      setResendError(
        err.message || 'Không thể gửi lại email xác nhận. Vui lòng thử lại sau.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className="section container"
      style={{
        maxWidth: '620px',
        margin: '50px auto',
        minHeight: 'calc(100vh - 280px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            className="card"
            style={{
              padding: '48px 36px',
              textAlign: 'center',
              width: '100%',
              borderRadius: '24px',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              style={{
                width: '76px',
                height: '76px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'rgba(3, 191, 255, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <Loader2 size={40} />
            </motion.div>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>
              Đang xác thực email...
            </h2>
            <p className="muted">
              Vui lòng đợi giây lát trong khi chúng tôi kiểm tra liên kết của bạn.
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            key="success"
            className="card"
            style={{
              padding: '48px 40px',
              textAlign: 'center',
              width: '100%',
              borderRadius: '24px',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              boxShadow: '0 20px 48px rgba(34, 197, 94, 0.12)',
              position: 'relative',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Background ambient glow */}
            <div
              style={{
                position: 'absolute',
                top: '-80px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '280px',
                height: '280px',
                background:
                  'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* Animated Success Check Icon */}
            <motion.div
              style={{
                width: '88px',
                height: '88px',
                margin: '0 auto 28px',
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.08))',
                color: '#22C55E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                boxShadow: '0 10px 25px rgba(34, 197, 94, 0.25)',
              }}
              initial={{ scale: 0.4, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 18,
                delay: 0.1,
              }}
            >
              <CheckCircle2 size={48} strokeWidth={2.2} />
            </motion.div>

            <span
              className="badge badge--success"
              style={{
                marginBottom: '14px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={14} style={{ marginRight: '6px' }} /> Xác Thực Thành Công
            </span>

            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                marginBottom: '16px',
                color: 'var(--navy)',
                letterSpacing: '-0.02em',
              }}
            >
              Email Đã Được Xác Nhận!
            </h1>

            <p
              style={{
                color: 'var(--muted)',
                fontSize: '1.05rem',
                lineHeight: 1.6,
                marginBottom: '36px',
                maxWidth: '460px',
                margin: '0 auto 36px',
              }}
            >
              {message}
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              <Link
                to="/login"
                className="btn btn-primary btn-lg btn-block"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  padding: '15px 24px',
                }}
              >
                <span>Đăng nhập ngay</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/"
                className="btn btn-ghost btn-block"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--muted)',
                }}
              >
                <Home size={16} />
                <span>Về trang chủ</span>
              </Link>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            className="card"
            style={{
              padding: '48px 40px',
              textAlign: 'center',
              width: '100%',
              borderRadius: '24px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              boxShadow: '0 20px 48px rgba(239, 68, 68, 0.08)',
              position: 'relative',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Background ambient red glow */}
            <div
              style={{
                position: 'absolute',
                top: '-80px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '280px',
                height: '280px',
                background:
                  'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* Animated Failure Icon (Shake effect) */}
            <motion.div
              style={{
                width: '88px',
                height: '88px',
                margin: '0 auto 28px',
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.08))',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 10px 25px rgba(239, 68, 68, 0.22)',
              }}
              initial={{ scale: 0.4 }}
              animate={{
                scale: 1,
                x: [0, -10, 10, -8, 8, -4, 4, 0],
              }}
              transition={{
                duration: 0.65,
                ease: 'easeInOut',
              }}
            >
              <XCircle size={48} strokeWidth={2.2} />
            </motion.div>

            <span
              className="badge"
              style={{
                marginBottom: '14px',
                padding: '6px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <AlertTriangle size={14} style={{ marginRight: '6px' }} /> Xác Thực Thất Bại
            </span>

            <h1
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                marginBottom: '16px',
                color: 'var(--navy)',
                letterSpacing: '-0.02em',
              }}
            >
              Không Thể Xác Nhận Email
            </h1>

            <p
              style={{
                color: 'var(--muted)',
                fontSize: '1rem',
                lineHeight: 1.6,
                marginBottom: '32px',
                maxWidth: '460px',
                margin: '0 auto 32px',
              }}
            >
              {message}
            </p>

            {/* Box gửi lại email xác nhận */}
            <div
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px',
                textAlign: 'left',
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={18} className="text-primary" /> Bạn chưa nhận được hoặc mã đã hết hạn?
              </h3>
              <p className="muted" style={{ fontSize: '0.88rem', marginBottom: '16px' }}>
                Nhập lại email đã đăng ký của bạn bên dưới để nhận liên kết xác thực mới:
              </p>

              <form onSubmit={handleResendConfirm} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Ví dụ: name@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resendLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {resendLoading ? (
                    <RefreshCw size={16} className="spin" />
                  ) : (
                    <Mail size={16} />
                  )}
                  <span>{resendLoading ? 'Đang gửi...' : 'Gửi lại email'}</span>
                </button>
              </form>

              {resendError && (
                <p
                  style={{
                    color: 'var(--error)',
                    fontSize: '0.85rem',
                    marginTop: '10px',
                    marginBottom: 0,
                  }}
                >
                  {resendError}
                </p>
              )}

              {resendSuccess && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--success)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    marginTop: '12px',
                  }}
                >
                  <Check size={16} /> Đã gửi lại liên kết xác nhận. Vui lòng kiểm tra hộp thư của bạn!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Link
                to="/login"
                className="btn btn-secondary btn-lg"
                style={{
                  padding: '12px 28px',
                  fontWeight: 600,
                }}
              >
                Quay lại đăng nhập
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmailConfirmed;
