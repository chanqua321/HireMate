import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { onboardingService } from '../../api/onboarding.service';
import { User, ArrowRight, X, Sparkles, LayoutDashboard, Plus, GraduationCap, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './css/OnboardingProfile.css';

export const OnboardingProfile: React.FC = () => {
  const { profile, updateProfile } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState(profile.name || '');
  const [education, setEducation] = useState(profile.education || 'Đại học Bách Khoa TP.HCM');
  const [bio, setBio] = useState(
    profile.bio ||
      'Kỹ sư phần mềm đam mê công nghệ, luôn chủ động học hỏi và hướng tới môi trường chuyên nghiệp.'
  );
  const [skills, setSkills] = useState<string[]>(
    profile.skills && profile.skills.length > 0
      ? profile.skills
      : ['React', 'TypeScript', 'JavaScript', 'Git', 'REST API']
  );
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile.name) {
      setName(profile.name);
    }
  }, [profile.name]);

  const handleAddSkill = (e?: React.KeyboardEvent<HTMLInputElement>) => {
    if (e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const val = skillInput.trim();
    if (val && !skills.includes(val)) {
      setSkills([...skills, val]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (tagToRemove: string) => {
    setSkills(skills.filter((tag) => tag !== tagToRemove));
  };

  const handleQuickAdd = (tag: string) => {
    if (!skills.includes(tag)) {
      setSkills([...skills, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || profile.name;
    updateProfile({
      name: finalName || '',
      education: education.trim(),
      bio: bio.trim(),
      skills,
      hobbies: skills,
    });

    if (localStorage.getItem('hm_access_token')) {
      setSaving(true);
      try {
        await onboardingService.savePersonal({
          fullName: finalName,
          bio: bio.trim(),
          hobbies: skills,
        });
      } catch (e) {
        // Fallback gracefully
      } finally {
        setSaving(false);
      }
    }

    navigate('/onboarding/goal');
  };

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
              Bước 1 / 3
            </span>
            <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
              Hồ sơ & Kỹ năng cá nhân
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
            <LayoutDashboard size={15} /> Mở Dashboard ngay
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
              Chào bạn! Hãy giới thiệu về bản thân 👋
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.95rem', margin: 0 }}>
              Thông tin này giúp AI hiểu rõ hồ sơ để tối ưu hóa bộ câu hỏi phỏng vấn chuẩn xác nhất.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Họ và tên của bạn <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                className="promo-input"
                style={{ width: '100%', textTransform: 'none' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Trường học / Học vấn cao nhất
              </label>
              <input
                type="text"
                className="promo-input"
                style={{ width: '100%', textTransform: 'none' }}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="VD: Đại học Bách Khoa TP.HCM"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Giới thiệu ngắn gọn (Bio)
              </label>
              <textarea
                rows={3}
                className="promo-input"
                style={{ width: '100%', textTransform: 'none', resize: 'vertical' }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Chia sẻ định hướng nghề nghiệp, thế mạnh cá nhân..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1E293B', marginBottom: '6px' }}>
                Kỹ năng chuyên môn (Nhập và nhấn Enter để thêm)
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="text"
                  className="promo-input"
                  style={{ flex: 1, textTransform: 'none' }}
                  placeholder="VD: React, Node.js, SQL, Problem Solving..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  className="promo-apply-btn"
                  style={{ padding: '0 16px' }}
                >
                  <Plus size={16} /> Thêm
                </button>
              </div>

              {/* Added Skills Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <AnimatePresence>
                  {skills.map((tag) => (
                    <motion.span
                      key={tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#F0F9FF',
                        color: '#0284C7',
                        border: '1px solid #BAE6FD',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(tag)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#0284C7',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0,
                        }}
                      >
                        <X size={13} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>

              {/* Quick Suggestion Chips */}
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Gợi ý nhanh:{' '}
                {['TypeScript', 'Docker', 'REST API', 'Figma', 'STAR Method'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleQuickAdd(s)}
                    style={{
                      border: 'none',
                      background: '#F1F5F9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      margin: '0 4px 4px 0',
                      cursor: 'pointer',
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="checkout-submit-btn"
              disabled={saving}
              style={{ marginTop: '10px' }}
            >
              <span>Tiếp tục sang Bước 2</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
