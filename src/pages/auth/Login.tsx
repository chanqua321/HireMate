import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LogIn, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setError('');
    // Extract a display name from email prefix if no name exists
    const prefix = email.split('@')[0] || 'Người dùng';
    const name =
      prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();

    login(name);
    navigate('/dashboard');
  };

  const handleSocialLogin = (provider: string) => {
    login(`Người dùng ${provider}`);
    navigate('/dashboard');
  };

  return (
    <div className="section container" style={{ maxWidth: '480px', margin: '40px auto' }}>
      <div className="card" style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="icon-chip"
            style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}
          >
            <LogIn size={24} />
          </div>
          <h2>Chào mừng trở lại</h2>
          <p className="muted">
            Đăng nhập vào HireMate để tiếp tục luyện phỏng vấn AI.
          </p>
        </div>

        {error && (
          <div
            className="badge badge--warning"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              justifyContent: 'center',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Địa chỉ Email
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <label htmlFor="password" style={{ fontWeight: 600 }}>
                Mật khẩu
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ bộ phận hỗ trợ để đặt lại mật khẩu.');
                }}
                style={{ fontSize: '0.85rem', color: 'var(--primary)' }}
              >
                Quên mật khẩu?
              </a>
            </div>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div
            className="form-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            <input id="remember" type="checkbox" defaultChecked />
            <label htmlFor="remember" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
              Ghi nhớ đăng nhập
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Đăng nhập <ArrowRight size={18} />
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '28px 0',
            color: 'var(--muted)',
            fontSize: '0.85rem',
          }}
        >
          <hr style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
          <span style={{ padding: '0 12px' }}>hoặc tiếp tục với</span>
          <hr style={{ flex: 1, borderTop: '1px solid var(--border)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ justifyContent: 'center' }}
            onClick={() => handleSocialLogin('Google')}
          >
            Google
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ justifyContent: 'center' }}
            onClick={() => handleSocialLogin('LinkedIn')}
          >
            LinkedIn
          </button>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: '28px',
            fontSize: '0.95rem',
          }}
        >
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Đăng ký miễn phí
          </Link>
        </p>
      </div>
    </div>
  );
};
