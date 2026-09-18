import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { authService } from '../../api/auth.service';
import { isSoleAdminEmail } from '../../../../shared/config/constants';
import '../../styles/auth-forms.css';

export const VerifyOtp: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const emailFromQuery = (params.get('email') || '').trim();
  const [email, setEmail] = useState(emailFromQuery);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery);
  }, [emailFromQuery]);

  useEffect(() => {
    if (isSoleAdminEmail(emailFromQuery) || isSoleAdminEmail(email)) {
      navigate('/login', { replace: true });
    }
  }, [emailFromQuery, email, navigate]);

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
    if (v && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = text.padEnd(6, ' ').split('').map((c) => (c === ' ' ? '' : c));
    setDigits(next);
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập email đã đăng ký.');
      return;
    }
    if (otpValue.length !== 6) {
      setError('Vui lòng nhập đủ 6 số OTP.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authService.verifyEmailOtp(email.trim(), otpValue);
      if (res.ok) {
        setSuccess(res.message || 'Xác nhận email thành công!');
        window.setTimeout(() => navigate('/login', { replace: true, state: { email: email.trim() } }), 900);
      } else {
        setError(res.message || 'Mã OTP không hợp lệ.');
      }
    } catch (err: any) {
      setError(err?.message || 'Không xác nhận được OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email để gửi lại OTP.');
      return;
    }
    if (cooldown > 0) return;
    setResendLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authService.resendConfirmEmail(email.trim());
      if (res.ok) {
        setSuccess(res.message || 'Đã gửi lại mã OTP.');
        setCooldown(60);
        setDigits(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      } else {
        setError(res.message || 'Không gửi lại được OTP.');
      }
    } catch (err: any) {
      setError(err?.message || 'Không gửi lại được OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="section container" style={{ maxWidth: 480, margin: '48px auto' }}>
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ShieldCheck size={22} color="#03BFFF" />
          <h1 style={{ margin: 0, fontSize: '1.45rem' }}>Xác nhận OTP</h1>
        </div>
        <p className="muted" style={{ marginBottom: 20 }}>
          Nhập mã 6 số đã gửi tới email đăng ký. Mã có hiệu lực 10 phút.
        </p>

        <form onSubmit={handleVerify}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.9rem' }}>
            <Mail size={14} style={{ marginRight: 6 }} />
            Email
          </label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            readOnly={Boolean(emailFromQuery)}
            style={{
              width: '100%',
              marginBottom: 18,
              background: emailFromQuery ? '#F8FAFC' : undefined,
            }}
          />

          <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>
            Mã OTP
          </label>
          <div
            onPaste={handlePaste}
            style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 16 }}
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="form-control"
                style={{
                  width: 48,
                  height: 52,
                  textAlign: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  letterSpacing: 0,
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: '#EF4444', fontSize: '0.9rem', marginBottom: 12 }}>{error}</p>
          )}
          {success && (
            <p style={{ color: '#16A34A', fontSize: '0.9rem', marginBottom: 12 }}>{success}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            {loading ? 'Đang xác nhận...' : 'Xác nhận OTP'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={handleResend}
          disabled={resendLoading || cooldown > 0}
          style={{
            width: '100%',
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {resendLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
        </button>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '0.9rem' }}>
          <Link to="/login">Quay lại đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
};
