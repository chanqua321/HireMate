import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { INDUSTRY_ROLES } from '../../data/questionBank';
import {
  Settings,
  Mic,
  MessageSquare,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Check,
  Briefcase,
  Award,
  Zap,
  Target,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interviewService, mapDifficultyToApi, SESSION_STORAGE_KEY } from '../../services/interview.service';
import { RequirePremium } from '../../components/common/RequirePremium';

interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  icon: React.ReactNode;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div className="custom-select-wrap" ref={containerRef}>
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="trigger-left">
          <div className="trigger-icon">{icon}</div>
          <div className="trigger-label">
            <span className="trigger-label-title">{label}</span>
            <span className="trigger-label-value">{value}</span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ color: isOpen ? '#03BFFF' : '#6B7280', display: 'flex' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-select-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {options.map((opt) => {
              const selected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`custom-select-item ${selected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                >
                  <span>{opt}</span>
                  {selected && (
                    <Check size={18} style={{ color: '#03BFFF', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InterviewSetupInner: React.FC = () => {
  const { profile, interviewConfig, updateInterviewConfig } = useApp();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const industries = Object.keys(INDUSTRY_ROLES);
  const initialField =
    interviewConfig.field || profile.field || 'Công nghệ thông tin';

  const [field, setField] = useState<string>(initialField);
  const [role, setRole] = useState<string>(() => {
    const validRoles = INDUSTRY_ROLES[initialField] || [];
    if (interviewConfig.role && validRoles.includes(interviewConfig.role)) {
      return interviewConfig.role;
    }
    if (profile.role && validRoles.includes(profile.role)) {
      return profile.role;
    }
    return validRoles[0] || 'Lập trình viên Frontend';
  });

  const [difficulty, setDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>(
    interviewConfig.difficulty || 'Trung bình'
  );
  const [mode, setMode] = useState<'Text' | 'Voice'>(
    interviewConfig.mode === 'Voice' || interviewConfig.mode === 'Giọng nói'
      ? 'Voice'
      : 'Text'
  );

  useEffect(() => {
    const validRoles = INDUSTRY_ROLES[field] || [];
    if (!validRoles.includes(role)) {
      setRole(validRoles[0] || '');
    }
  }, [field, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    updateInterviewConfig({
      field,
      role,
      difficulty,
      mode,
    });

    if (!sessionStorage.getItem('hm_access_token')) {
      navigate(`/login?redirect=${encodeURIComponent('/interview-setup')}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await interviewService.createSession({
        industry: field,
        position: role,
        difficulty: mapDifficultyToApi(difficulty),
        mode: mode === 'Voice' ? 'Voice' : 'Text',
        questionCount: 5,
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate(`/login?redirect=${encodeURIComponent('/interview-setup')}`);
          return;
        }
        const msg = (res.message || '').toLowerCase();
        if (msg.includes('onboarding')) {
          sessionStorage.setItem('hm_post_onboarding', '/interview-setup');
          navigate(`/onboarding/profile?redirect=${encodeURIComponent('/interview-setup')}`);
          return;
        }
        setError(res.message || 'Không tạo được phiên phỏng vấn');
        return;
      }

      const sessionId = res.data?.id;
      if (!sessionId) {
        setError('API không trả session id');
        return;
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      navigate(`/interview-room?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối API');
    } finally {
      setSubmitting(false);
    }
  };

  const currentRoles = INDUSTRY_ROLES[field] || [];

  const difficultyItems = [
    {
      id: 'Dễ' as const,
      label: 'Dễ',
      subtitle: 'Khởi động nhẹ nhàng',
      icon: <Zap size={18} />,
      color: '#10B981',
    },
    {
      id: 'Trung bình' as const,
      label: 'Trung bình',
      subtitle: 'Chuẩn thực tế',
      icon: <Target size={18} />,
      color: '#03BFFF',
    },
    {
      id: 'Khó' as const,
      label: 'Khó',
      subtitle: 'Chuyên sâu, hóc búa',
      icon: <Flame size={18} />,
      color: '#F59E0B',
    },
  ];

  const modeItems = [
    {
      id: 'Text' as const,
      label: 'Văn bản',
      subtitle: 'Gõ câu trả lời chuẩn STAR',
      icon: <MessageSquare size={20} />,
    },
    {
      id: 'Voice' as const,
      label: 'Giọng nói',
      subtitle: 'Phỏng vấn bằng Micro AI',
      icon: <Mic size={20} />,
    },
  ];

  return (
    <div className="section container" style={{ maxWidth: '780px', margin: '40px auto' }}>
      <motion.div
        className="setup-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* ==================== HERO HEADER BANNER ==================== */}
        <div className="setup-header-banner">
          {/* Subtle ice blue glow */}
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              right: '-60px',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(161, 203, 229, 0.35), transparent 70%)',
              filter: 'blur(35px)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '16px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'rgba(3, 191, 255, 0.18)',
                border: '1px solid rgba(161, 203, 229, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#03BFFF',
                flexShrink: 0,
              }}
            >
              <Settings size={26} />
            </div>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#A1CBE5',
                  marginBottom: '4px',
                }}
              >
                <Sparkles size={14} /> HIREMATE AI INTERVIEW ROOM
              </span>
              <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Thiết lập phòng phỏng vấn AI
              </h1>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '0.98rem',
              color: '#A1CBE5',
              lineHeight: 1.6,
              maxWidth: '580px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            Tùy chỉnh chuyên ngành, vị trí ứng tuyển, mức độ thử thách và hình thức phỏng vấn
            trước khi bắt đầu buổi tập luyện mô phỏng chuẩn STAR.
          </p>
        </div>

        {/* ==================== SETUP BODY ==================== */}
        <div className="setup-body">
          <form onSubmit={handleSubmit}>
            {/* 1. INDUSTRY / FIELD CUSTOM DROP BOX */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#001B3F',
                  marginBottom: '10px',
                }}
              >
                1. Chọn ngành nghề
              </label>
              <CustomSelect
                label="Lĩnh vực chuyên môn"
                value={field}
                options={industries}
                onChange={(val) => setField(val)}
                icon={<Briefcase size={22} />}
              />
            </div>

            {/* 2. ROLE CUSTOM DROP BOX */}
            <div style={{ marginBottom: '32px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#001B3F',
                  marginBottom: '10px',
                }}
              >
                2. Vị trí ứng tuyển
              </label>
              <CustomSelect
                label="Vị trí mục tiêu"
                value={role}
                options={currentRoles}
                onChange={(val) => setRole(val)}
                icon={<Award size={22} />}
              />
            </div>

            {/* 3. DIFFICULTY SELECTOR */}
            <div style={{ marginBottom: '32px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#001B3F',
                  marginBottom: '10px',
                }}
              >
                3. Mức độ câu hỏi phỏng vấn
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                {difficultyItems.map((item) => {
                  const active = difficulty === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDifficulty(item.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px 12px',
                        borderRadius: '16px',
                        border: active
                          ? '2px solid #03BFFF'
                          : '1.5px solid rgba(161, 203, 229, 0.4)',
                        background: active ? 'rgba(3, 191, 255, 0.08)' : '#ffffff',
                        color: active ? '#001B3F' : '#6B7280',
                        cursor: 'pointer',
                        transition: 'all 0.22s ease',
                        boxShadow: active
                          ? '0 8px 24px rgba(3, 191, 255, 0.16)'
                          : '0 2px 8px rgba(0, 27, 63, 0.02)',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: active ? '#03BFFF' : 'rgba(161, 203, 229, 0.2)',
                          color: active ? '#ffffff' : item.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {item.icon}
                      </div>
                      <span style={{ fontSize: '0.96rem', fontWeight: 700, marginBottom: '2px' }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500 }}>
                        {item.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. INTERVIEW MODE SELECTOR */}
            <div style={{ marginBottom: '38px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: '#001B3F',
                  marginBottom: '10px',
                }}
              >
                4. Hình thức tương tác
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '14px',
                }}
              >
                {modeItems.map((item) => {
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        border: active
                          ? '2px solid #03BFFF'
                          : '1.5px solid rgba(161, 203, 229, 0.4)',
                        background: active ? 'rgba(3, 191, 255, 0.08)' : '#ffffff',
                        color: active ? '#001B3F' : '#6B7280',
                        cursor: 'pointer',
                        transition: 'all 0.22s ease',
                        boxShadow: active
                          ? '0 8px 24px rgba(3, 191, 255, 0.16)'
                          : '0 2px 8px rgba(0, 27, 63, 0.02)',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: active ? '#03BFFF' : 'rgba(161, 203, 229, 0.2)',
                          color: active ? '#ffffff' : '#001B3F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s',
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#001B3F' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#6B7280', fontWeight: 500 }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p style={{ color: '#EF4444', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '16px',
                fontSize: '1.08rem',
                fontWeight: 700,
                borderRadius: '18px',
                boxShadow: '0 12px 32px rgba(3, 191, 255, 0.28)',
                background: 'linear-gradient(135deg, #03BFFF 0%, #0088CC 100%)',
              }}
            >
              {submitting ? 'Đang tạo phiên…' : 'Vào phòng phỏng vấn AI ngay'} <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export const InterviewSetup: React.FC = () => (
  <RequirePremium>
    <InterviewSetupInner />
  </RequirePremium>
);

