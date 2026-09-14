import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { onboardingService } from '../../api/onboarding.service';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Loader2,
  Sparkles,
  LayoutDashboard,
  User,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import './css/OnboardingSummary.css';

export const OnboardingSummary: React.FC = () => {
  const { profile } = useApp();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const handleFinish = async () => {
    if (localStorage.getItem('hm_access_token')) {
      setConfirming(true);
      try {
        await onboardingService.confirm();
      } catch (err) {
        // Fallback gracefully
      } finally {
        setConfirming(false);
      }
    }
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F8FAFC', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #16A34A 0%, #22C55E 100%)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              Bước 3 / 3
            </span>
            <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
              Xác nhận & Kích hoạt lộ trình AI
            </span>
          </div>

          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.86rem',
              color: '#0284c7',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <LayoutDashboard size={15} /> Bảng điều khiển
          </Link>
        </div>

        {/* Card Body */}
        <motion.div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1.5px solid #E2E8F0',
            padding: '36px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                margin: '0 auto 16px',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(34, 197, 94, 0.2)',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#001B3F', margin: '0 0 8px' }}>
              Hồ sơ của bạn đã sẵn sàng! 🎉
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.95rem', margin: 0 }}>
              HireMate AI đã hoàn tất cấu hình theo đúng mục tiêu nghề nghiệp và kỹ năng của bạn.
            </p>
          </div>

          <div
            style={{
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '28px',
            }}
          >
            {/* Career Goal Section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 750, color: '#001B3F', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Briefcase size={16} color="#03BFFF" /> Mục tiêu nghề nghiệp
              </h3>
              <Link
                to="/onboarding/goal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.84rem',
                  color: '#0284C7',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Edit3 size={13} /> Sửa
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Ngành nghề</span>
                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                  {profile.field || 'Công nghệ thông tin'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Vị trí ứng tuyển</span>
                <div style={{ fontWeight: 700, color: '#0284C7', fontSize: '0.95rem' }}>
                  {profile.role || 'Frontend Developer'}
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: '#E2E8F0', margin: '14px 0' }} />

            {/* Personal Profile Section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 750, color: '#001B3F', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={16} color="#03BFFF" /> Thông tin cá nhân & Kỹ năng
              </h3>
              <Link
                to="/onboarding/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.84rem',
                  color: '#0284C7',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Edit3 size={13} /> Sửa
              </Link>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Họ và tên</span>
              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                {profile.name || 'Ứng viên HireMate'}
              </div>
            </div>

            {profile.education && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Học vấn / Trường học</span>
                <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                  {profile.education}
                </div>
              </div>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div>
                <span style={{ fontSize: '0.82rem', color: '#64748B', display: 'block', marginBottom: '6px' }}>
                  Kỹ năng chuyên môn
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.skills.map((t) => (
                    <span
                      key={t}
                      style={{
                        background: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/onboarding/goal')}
              className="promo-apply-btn"
              style={{ background: '#F1F5F9', color: '#475569', padding: '14px 20px', borderRadius: '14px' }}
            >
              <ArrowLeft size={16} /> Quay lại
            </button>

            <button
              type="button"
              onClick={handleFinish}
              disabled={confirming}
              className="checkout-submit-btn"
              style={{ flex: 1 }}
            >
              {confirming ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Đang lưu thiết lập...</span>
                </>
              ) : (
                <>
                  <span>Bắt đầu trải nghiệm Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
