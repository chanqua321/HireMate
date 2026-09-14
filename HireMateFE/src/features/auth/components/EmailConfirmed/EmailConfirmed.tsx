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
import { useConfetti } from '../../../../shared/hooks';
import { apiClient } from '../../../../shared/api/apiClient';
import './css/EmailConfirmed.css';

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
      className="email-confirmed-container section container"
    >
      <AnimatePresence mode="wait">
        {status === 'loading' && (
          <motion.div
            key="loading"
            className="email-confirmed-card card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="email-confirmed-icon-wrap"
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
            className="email-confirmed-card email-confirmed-card--success card"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Background ambient glow */}
            <div className="email-confirmed-ambient email-confirmed-ambient--success" />

            {/* Animated Success Check Icon */}
            <motion.div
              className="email-confirmed-icon-wrap email-confirmed-icon-wrap--success"
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

            <span className="badge badge--success" style={{ marginBottom: '14px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600 }}>
              <Sparkles size={14} style={{ marginRight: '6px' }} /> Xác Thực Thành Công
            </span>

            <h1 className="email-confirmed-title">
              Email Đã Được Xác Nhận!
            </h1>

            <p className="email-confirmed-desc">
              {message}
            </p>

            <div className="email-confirmed-actions">
              <Link to="/login" className="btn btn-primary btn-lg btn-block email-confirmed-btn">
                <span>Đăng nhập ngay</span>
                <ArrowRight size={18} />
              </Link>

              <Link to="/" className="btn btn-ghost btn-block email-confirmed-btn email-confirmed-btn--ghost">
                <Home size={16} />
                <span>Về trang chủ</span>
              </Link>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            key="error"
            className="email-confirmed-card email-confirmed-card--error card"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
          >
            {/* Background ambient red glow */}
            <div className="email-confirmed-ambient email-confirmed-ambient--error" />

            {/* Animated Failure Icon (Shake effect) */}
            <motion.div
              className="email-confirmed-icon-wrap email-confirmed-icon-wrap--error"
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

            <span className="badge badge--error" style={{ marginBottom: '14px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <AlertTriangle size={14} style={{ marginRight: '6px' }} /> Xác Thực Thất Bại
            </span>

            <h1 className="email-confirmed-title">
              Không Thể Xác Nhận Email
            </h1>

            <p className="email-confirmed-desc">
              {message}
            </p>

            {/* Box gửi lại email xác nhận */}
            <div className="email-confirmed-resend-box">
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
                <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '10px', marginBottom: 0 }}>
                  {resendError}
                </p>
              )}

              {resendSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600, marginTop: '12px' }}>
                  <Check size={16} /> Đã gửi lại liên kết xác nhận. Vui lòng kiểm tra hộp thư của bạn!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <Link to="/login" className="btn btn-secondary btn-lg" style={{ padding: '12px 28px', fontWeight: 600 }}>
                Quay lại đăng nhập
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
