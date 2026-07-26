import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, ArrowRight, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';

export const OnboardingSummary: React.FC = () => {
  const { profile } = useApp();
  const navigate = useNavigate();

  return (
    <div className="section container" style={{ maxWidth: '640px', margin: '30px auto' }}>
      <motion.div
        className="card"
        style={{ padding: '36px' }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span className="badge badge--success">Bước 3 / 3</span>
          <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Hoàn tất thiết lập
          </span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="icon-chip"
            style={{
              margin: '0 auto 16px',
              width: '56px',
              height: '56px',
              color: '#22C55E',
            }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h2>Hồ sơ của bạn đã sẵn sàng!</h2>
          <p className="muted">
            HireMate đã cấu hình trợ lý AI theo mục tiêu ứng tuyển chuyên sâu của bạn.
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-subtle, #F8FAFC)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h4 style={{ margin: 0 }}>Mục tiêu nghề nghiệp</h4>
            <Link
              to="/onboarding/goal"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              <Edit3 size={14} /> Chỉnh sửa
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Ngành nghề</span>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {profile.field || 'Công nghệ thông tin'}
              </div>
            </div>
            <div>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Vị trí ứng tuyển</span>
              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {profile.role || 'Lập trình viên Frontend'}
              </div>
            </div>
          </div>

          <hr style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <h4 style={{ margin: 0 }}>Thông tin cá nhân</h4>
            <Link
              to="/onboarding/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.85rem',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              <Edit3 size={14} /> Chỉnh sửa
            </Link>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Họ và tên</span>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
              {profile.name || 'Người dùng HireMate'}
            </div>
          </div>

          {profile.bio && (
            <div style={{ marginBottom: '12px' }}>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Giới thiệu ngắn</span>
              <div style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
                {profile.bio}
              </div>
            </div>
          )}

          {profile.hobbies && profile.hobbies.length > 0 && (
            <div>
              <span className="muted" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                Kỹ năng / Sở thích
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {profile.hobbies.map((t) => (
                  <span key={t} className="tag" style={{ fontSize: '0.8rem' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Bắt đầu sử dụng HireMate <ArrowRight size={18} />
        </button>
      </motion.div>
    </div>
  );
};
