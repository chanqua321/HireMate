import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserPlus, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ các trường yêu cầu.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    setError('');
    login(name.trim());
    navigate('/onboarding/profile');
  };

  return (
    <div className="section container" style={{ maxWidth: '480px', margin: '30px auto' }}>
      <div className="card" style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="icon-chip"
            style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}
          >
            <UserPlus size={24} />
          </div>
          <h2>Tạo tài khoản miễn phí</h2>
          <p className="muted">
            Bắt đầu hành trình luyện phỏng vấn cùng cố vấn AI HireMate.
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
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label htmlFor="name" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
              Họ và tên
            </label>
            <input
              id="name"
              type="text"
              className="form-control"
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label htmlFor="email" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
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

          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label htmlFor="password" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Ít nhất 8 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="confirm" style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
              Xác nhận Mật khẩu
            </label>
            <input
              id="confirm"
              type="password"
              className="form-control"
              placeholder="Nhập lại mật khẩu"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Tiếp tục <ArrowRight size={18} />
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '0.95rem',
          }}
        >
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
