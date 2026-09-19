import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../api/auth.service';
import { isSoleAdminEmail } from '../../../../shared/config/constants';
import './VerifyOtp.css';

export const VerifyOtp: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const emailFromQuery = (params.get('email') || '').trim();

  const [email, setEmail] = useState(emailFromQuery);
  const [isEditingEmail, setIsEditingEmail] = useState(!emailFromQuery);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setIsEditingEmail(false);
    }
  }, [emailFromQuery]);

  useEffect(() => {
    if (isSoleAdminEmail(emailFromQuery) || isSoleAdminEmail(email)) {
      navigate('/login', { replace: true });
    }
  }, [emailFromQuery, email, navigate]);

  // Focus the first digit slot on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (!cooldown) return;
    const t = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const otpValue = digits.join('');

  const handleDigitChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    setError('');

    // Advance to next slot
    if (v && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto submit if all 6 slots are populated
    if (v && index === 5 && next.every((d) => d !== '')) {
      const fullCode = next.join('');
      triggerVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      } else {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = text.padEnd(6, ' ').split('').map((c) => (c === ' ' ? '' : c));
    setDigits(next);

    const focusIdx = Math.min(text.length, 5);
    inputsRef.current[focusIdx]?.focus();

    if (text.length === 6) {
      triggerVerification(text);
    }
  };

  const triggerVerification = async (code: string) => {
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email đã đăng ký.');
      return;
    }
    if (code.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await authService.verifyEmailOtp(email.trim(), code);
      if (res.ok) {
        setSuccess(res.message || 'Xác thực tài khoản thành công! Đang chuyển hướng...');
        window.setTimeout(() => {
          navigate('/login', { replace: true, state: { email: email.trim(), verified: true } });
        }, 1200);
      } else {
        setError(res.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể xác thực mã OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerVerification(otpValue);
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Vui lòng cung cấp email để nhận lại mã OTP.');
      return;
    }
    if (cooldown > 0) return;

    setResendLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await authService.resendConfirmEmail(email.trim());
      if (res.ok) {
        setSuccess(res.message || 'Mã OTP mới đã được gửi tới email của bạn.');
        setCooldown(60);
        setDigits(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      } else {
        setError(res.message || 'Gửi lại mã OTP thất bại. Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi yêu cầu gửi lại mã OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-otp-page">
      {/* Decorative Glow Blobs */}
      <div className="auth-otp-glow-1" />
      <div className="auth-otp-glow-2" />

      {/* Main OTP Card with Motion Entrance */}
      <motion.div
        className="auth-otp-card"
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* Brand Logo */}
        <div className="auth-otp-logo-wrap">
          <img
            src="/logo.png"
            alt="HireMate Logo"
            className="auth-otp-logo"
          />
        </div>

        {/* Animated Floating Shield Badge */}
        <motion.div
          className="auth-otp-icon-badge"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        >
          <ShieldCheck size={32} />
        </motion.div>

        {/* Heading */}
        <h1 className="auth-otp-title">Xác thực mã bảo mật (OTP)</h1>
        <p className="auth-otp-desc">
          Vui lòng nhập 6 chữ số được gửi tới hòm thư của bạn để kích hoạt tài khoản HireMate.
        </p>

        {/* Target Email Chip */}
        <div className="auth-otp-email-chip">
          <Mail size={14} color="#0284c7" />
          <span>Gửi tới: <strong>{email || 'Chưa cung cấp email'}</strong></span>
          <button
            type="button"
            className="auth-otp-change-btn"
            onClick={() => setIsEditingEmail((prev) => !prev)}
            title="Đổi email nhận mã"
          >
            {isEditingEmail ? 'Thu gọn' : 'Đổi email'}
          </button>
        </div>

        {/* Animated Expandable Edit Email Box */}
        <AnimatePresence>
          {isEditingEmail && (
            <motion.div
              className="auth-otp-edit-email-box"
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <label htmlFor="otp-email-input">Địa chỉ email xác thực:</label>
              <input
                id="otp-email-input"
                type="email"
                className="auth-otp-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tennguoidung@example.com"
                required
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* 6-Digit Grid Slots */}
          <div className="auth-otp-digits-container">
            <span className="auth-otp-digits-label">Mã xác thực 6 chữ số:</span>
            <div className="auth-otp-digits-row" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <motion.input
                  key={idx}
                  ref={(el) => {
                    inputsRef.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`auth-otp-digit-slot ${digit ? 'has-value' : ''}`}
                  whileFocus={{ scale: 1.05 }}
                  transition={{ duration: 0.12 }}
                />
              ))}
            </div>
          </div>

          {/* Feedback Messages with Animation */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="otp-err"
                className="auth-otp-alert error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                key="otp-ok"
                className="auth-otp-alert success"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="auth-otp-submit-btn"
            disabled={loading || otpValue.length !== 6}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang kiểm tra mã...</span>
              </>
            ) : (
              <>
                <span>Xác nhận & Kích hoạt</span>
                <ArrowRight size={17} />
              </>
            )}
          </motion.button>
        </form>

        {/* Resend OTP Row */}
        <div className="auth-otp-resend-row">
          <span>Chưa nhận được mã?</span>
          {cooldown > 0 ? (
            <div className="auth-otp-cooldown-badge">
              <Clock size={13} />
              <span>Gửi lại sau 00:{cooldown < 10 ? `0${cooldown}` : cooldown}</span>
            </div>
          ) : (
            <button
              type="button"
              className="auth-otp-resend-btn"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>Gửi lại mã OTP</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Back Link */}
        <Link to="/login" className="auth-otp-footer-link">
          <ArrowLeft size={15} />
          <span>Quay lại trang Đăng nhập</span>
        </Link>
      </motion.div>
    </div>
  );
};
