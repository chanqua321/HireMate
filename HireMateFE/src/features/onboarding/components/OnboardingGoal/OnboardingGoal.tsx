import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { onboardingService } from '../../api/onboarding.service';
import { INDUSTRY_ROLES } from '../../../../shared/data/questionBank';
import { Target, ArrowRight, ArrowLeft, LayoutDashboard, Briefcase, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import './css/OnboardingGoal.css';

export const OnboardingGoal: React.FC = () => {
  const { profile, updateProfile, updateInterviewConfig } = useApp();
  const navigate = useNavigate();

  const industries = Object.keys(INDUSTRY_ROLES);
  const initialField =
    profile.field && INDUSTRY_ROLES[profile.field]
      ? profile.field
      : 'Công nghệ thông tin';

  const [field, setField] = useState<string>(initialField);
  const [role, setRole] = useState<string>(() => {
    const validRoles = INDUSTRY_ROLES[initialField] || [];
    if (profile.role && validRoles.includes(profile.role)) {
      return profile.role;
    }
    return validRoles[0] || 'Frontend Developer';
  });
  const [exp, setExp] = useState<string>(profile.exp || '1 - 3 năm (Mid-level)');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const roles = INDUSTRY_ROLES[field] || [];
    if (!roles.includes(role)) {
      setRole(roles[0] || '');
    }
  }, [field, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      field,
      role,
      exp,
    });
    updateInterviewConfig({
      field,
      role,
    });

    if (localStorage.getItem('hm_access_token')) {
      setSaving(true);
      try {
        await onboardingService.saveGoal({
          desiredIndustry: field,
          desiredPosition: role,
          experienceLevel: exp,
        });
      } catch (err) {
        // Fallback gracefully
      } finally {
        setSaving(false);
      }
    }

    navigate('/onboarding/summary');
  };

  const currentRoles = INDUSTRY_ROLES[field] || [];

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: '#F8FAFC', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #03bfff 100%)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              Bước 2 / 3
            </span>
            <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
              Mục tiêu nghề nghiệp & Ứng tuyển
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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#001B3F', margin: '0 0 8px' }}>
              Mục tiêu nghề nghiệp của bạn 🎯
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.95rem', margin: 0 }}>
              Chọn ngành nghề và vị trí công việc mục tiêu để AI thiết lập bộ câu hỏi phỏng vấn chuẩn JD.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Ngành nghề mục tiêu <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                className="promo-input"
                style={{ width: '100%', textTransform: 'none', background: '#FFFFFF' }}
                value={field}
                onChange={(e) => setField(e.target.value)}
                required
              >
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Vị trí công việc cụ thể <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                className="promo-input"
                style={{ width: '100%', textTransform: 'none', background: '#FFFFFF' }}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {currentRoles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Mức độ kinh nghiệm hiện tại
              </label>
              <select
                className="promo-input"
                style={{ width: '100%', textTransform: 'none', background: '#FFFFFF' }}
                value={exp}
                onChange={(e) => setExp(e.target.value)}
                required
              >
                <option value="Chưa có KN (Intern / Fresher)">Chưa có kinh nghiệm (Intern / Fresher)</option>
                <option value="Dưới 1 năm (Junior)">Dưới 1 năm (Junior)</option>
                <option value="1 - 3 năm (Mid-level)">1 - 3 năm (Mid-level)</option>
                <option value="3 - 5 năm (Senior)">3 - 5 năm (Senior)</option>
                <option value="5+ năm (Lead / Manager)">5+ năm (Lead / Manager)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/onboarding/profile')}
                className="promo-apply-btn"
                style={{ background: '#F1F5F9', color: '#475569', padding: '14px 20px', borderRadius: '14px' }}
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={saving}
                style={{ flex: 1 }}
              >
                <span>Tiếp tục sang Bước 3</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
