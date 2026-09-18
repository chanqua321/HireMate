import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { interviewService } from '../../api/interview.service';
import { profileService } from '../../../../shared/services/profile.service';
import { INDUSTRY_ROLES, normalizeRole, normalizeIndustry } from '../../../../shared/data/questionBank';
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
  Layers,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import { InterviewSidebar } from './components/InterviewSidebar';
import { InterviewTutorialModal } from './components/InterviewTutorialModal';
import './css/InterviewSetup.css';

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
          transition={{ duration: 0.2 }}
          style={{ color: isOpen ? '#03bfff' : '#64748b', display: 'flex' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-select-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
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
                    <Check size={18} style={{ color: '#0284c7', flexShrink: 0 }} />
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


// Video hướng dẫn thực tế từ thư mục public/
const TUTORIAL_VIDEO_CONFIG = {
  videoSrc: '/Recording 2026-09-15 010224.mp4', 
  videoType: 'mp4' as 'mp4' | 'youtube',
};

export const InterviewSetup: React.FC = () => {
  const { profile, interviewConfig, updateInterviewConfig } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const cvFromState = (location.state as any)?.fromCv;

  // Resolve active CV info
  const [activeCvInfo, setActiveCvInfo] = useState<any>(() => {
    if (cvFromState) return cvFromState;
    try {
      const saved = localStorage.getItem('hm_active_cv');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const industries = Object.keys(INDUSTRY_ROLES);

  // Priority order for field & role:
  // 1. cvFromState
  // 2. activeCvInfo (saved in localStorage when user clicked active CV in dashboard)
  // 3. (profile as any).desiredIndustry / desiredPosition or profile.field / profile.role
  // 4. interviewConfig.field / interviewConfig.role (if not blank)
  // 5. fallback 'Công nghệ thông tin' / 'Lập trình viên Frontend'
  const resolvedField = normalizeIndustry(
    cvFromState?.field ||
      activeCvInfo?.field ||
      (profile as any).desiredIndustry ||
      profile.field ||
      interviewConfig.field ||
      'Công nghệ thông tin'
  );

  const rawRole =
    cvFromState?.role ||
    activeCvInfo?.role ||
    (profile as any).desiredPosition ||
    profile.role ||
    interviewConfig.role ||
    '';

  const resolvedRole = normalizeRole(rawRole, resolvedField);

  const [field, setField] = useState<string>(resolvedField);
  const [role, setRole] = useState<string>(resolvedRole);

  const [difficulty, setDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>(
    interviewConfig.difficulty || 'Trung bình'
  );
  const [mode, setMode] = useState<'Text' | 'Voice'>(
    interviewConfig.mode === 'Voice' || interviewConfig.mode === 'Giọng nói'
      ? 'Voice'
      : 'Text'
  );

  // On mount: sync active CV from navigation state, localStorage, and real backend API
  useEffect(() => {
    // 1. If CV was passed from state
    if (cvFromState) {
      const f = normalizeIndustry(cvFromState.field);
      const r = normalizeRole(cvFromState.role, f);
      setField(f);
      setRole(r);
      setActiveCvInfo(cvFromState);
      updateInterviewConfig({ field: f, role: r });
      return;
    }

    // 2. If active CV is stored in localStorage
    try {
      const saved = localStorage.getItem('hm_active_cv');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role || parsed?.field) {
          const f = normalizeIndustry(parsed.field);
          const r = normalizeRole(parsed.role, f);
          setField(f);
          setRole(r);
          setActiveCvInfo(parsed);
          updateInterviewConfig({ field: f, role: r });
          return;
        }
      }
    } catch {}

    // 3. Real API call to fetch latest profile from backend database
    if (localStorage.getItem('hm_access_token')) {
      profileService
        .getProfile()
        .then((res) => {
          if (res.ok && res.data) {
            const beData: any = res.data;
            const pos = beData.desiredPosition || beData.role;
            const ind = beData.desiredIndustry || beData.field;
            if (pos || ind) {
              const f = normalizeIndustry(ind || field);
              const r = normalizeRole(pos || role, f);
              setField(f);
              setRole(r);
              updateInterviewConfig({ field: f, role: r });
            }
          }
        })
        .catch(() => {});
    }
  }, [cvFromState]);

  useEffect(() => {
    const validRoles = INDUSTRY_ROLES[field] || [];
    if (!validRoles.includes(role)) {
      const normalized = normalizeRole(role, field);
      if (validRoles.includes(normalized)) {
        setRole(normalized);
      } else {
        setRole(validRoles[0] || 'Lập trình viên Backend');
      }
    }
  }, [field, role]);

  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showOnboardingWarning, setShowOnboardingWarning] = useState(true);

  // Tutorial Video Modal State
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  const isOnboardingIncomplete =
    !profile.role ||
    !profile.field ||
    !profile.skills ||
    profile.skills.length === 0 ||
    !profile.graduationYear;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    updateInterviewConfig({
      field,
      role,
      difficulty,
      mode,
    });

    let targetSessionId = '';

    if (localStorage.getItem('hm_access_token')) {
      setCreating(true);
      try {
        const res = await interviewService.createSession({
          industry: field,
          position: role,
          difficulty,
          mode,
          questionCount: difficulty === 'Dễ' ? 3 : 5,
        });

        if (res.ok && res.data?.id) {
          targetSessionId = res.data.id;
        } else if (!res.ok && res.message) {
          setErrorMsg(res.message);
        }
      } catch (err: any) {
        // Continue with local room fallback
      } finally {
        setCreating(false);
      }
    }

    if (targetSessionId) {
      navigate(`/interview-room?sessionId=${targetSessionId}`);
    } else {
      navigate('/interview-room');
    }
  };

  const currentRoles = INDUSTRY_ROLES[field] || [];

  const difficultyItems = [
    {
      id: 'Dễ' as const,
      label: 'Dễ',
      subtitle: 'Khởi động • 3 câu hỏi (180s/câu)',
      icon: <Zap size={20} />,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    {
      id: 'Trung bình' as const,
      label: 'Trung bình',
      subtitle: 'Chuẩn thực tế • 5 câu hỏi (120s/câu)',
      icon: <Target size={20} />,
      color: '#0284c7',
      bgColor: '#e0f2fe',
    },
    {
      id: 'Khó' as const,
      label: 'Khó',
      subtitle: 'Chuyên sâu • 5 câu hỏi (90s/câu)',
      icon: <Flame size={20} />,
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
  ];

  const modeItems = [
    {
      id: 'Text' as const,
      label: 'Văn bản (Text Mode)',
      subtitle: 'Gõ câu trả lời, nhận gợi ý thời gian thực chuẩn cấu trúc STAR',
      icon: <MessageSquare size={22} />,
    },
    {
      id: 'Voice' as const,
      label: 'Giọng nói (Voice Mode)',
      subtitle: 'Phỏng vấn đàm thoại bằng giọng nói Micro AI tự nhiên',
      icon: <Mic size={22} />,
    },
  ];

  return (
    <div className="setup-page-container">
      {/* 3-Step Educational Progress Bar */}
      <InterviewStepper currentStep={1} />

      {/* 2-Column Wide Layout Workspace */}
      <div className="setup-workspace-grid">
        {/* LEFT COLUMN: The Main Setup Card & Form */}
        <motion.div
          className="setup-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Hero Header Banner */}
          <div className="setup-header-banner">
            <div className="setup-header-badge">
              <Sparkles size={14} /> HIREMATE AI INTERVIEW ROOM
            </div>
            <h1 className="setup-header-title">Thiết lập phòng phỏng vấn AI</h1>
            <p className="setup-header-desc">
              Tùy chỉnh chuyên ngành, vị trí ứng tuyển, mức độ thử thách và hình thức phỏng vấn
              trước khi bắt đầu buổi tập luyện mô phỏng chuẩn STAR quốc tế.
            </p>
          </div>

          {/* Setup Form Body */}
          <div className="setup-body">
            {/* Onboarding Notice Warning Banner */}
            {/* <AnimatePresence>
              {showOnboardingWarning && isOnboardingIncomplete && (
                <motion.div
                  className="interview-onboarding-alert"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <div className="alert-badge-icon">
                    <AlertTriangle size={22} />
                  </div>
                  <div className="alert-content">
                    <h4>💡 Bạn chưa hoàn thiện Lộ trình Onboarding?</h4>
                    <p>
                      AI của HireMate sẽ phỏng vấn sát thực tế hơn <strong>300%</strong> nếu bạn hoàn tất thông tin kỹ năng, trình độ học vấn & <strong>năm tốt nghiệp</strong> trong hồ sơ.
                    </p>
                    <div className="alert-actions">
                      <Link to="/dashboard?view=onboarding" className="alert-btn-primary">
                        <Compass size={15} />
                        <span>Hoàn tất Onboarding (3 Bước)</span>
                      </Link>
                      <button
                        type="button"
                        className="alert-btn-dismiss"
                        onClick={() => setShowOnboardingWarning(false)}
                      >
                        Tiếp tục phỏng vấn ngay
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            {/* Active CV indicator banner */}
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)',
                border: '1.5px solid #BAE6FD',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '0.86rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369A1' }}>
                <Target size={17} color="#0284C7" />
                <span>
                  Hồ sơ phỏng vấn: <strong style={{ color: '#0F172A' }}>{role}</strong> ({field})
                  {activeCvInfo?.title && (
                    <span style={{ color: '#0284C7', opacity: 0.85, marginLeft: '6px', fontSize: '0.8rem', fontWeight: 500 }}>
                      • từ CV: <em>{activeCvInfo.title}</em>
                    </span>
                  )}
                </span>
              </div>
              <Link
                to="/dashboard?tab=scan"
                style={{
                  color: '#0284C7',
                  fontWeight: 700,
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#E0F2FE',
                  padding: '4px 10px',
                  borderRadius: '8px',
                }}
                title="Chọn một CV khác trong kho CV của bạn"
              >
                <span>Đổi CV khác</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <form onSubmit={handleSubmit}>
              {/* 1. Industry / Field Select */}
              <div style={{ marginBottom: '24px' }}>
                <div className="setup-section-label">
                  <span className="setup-label-text">1. Chọn ngành nghề</span>
                  <span className="setup-label-hint">Lĩnh vực hoạt động chuyên môn</span>
                </div>
                <CustomSelect
                  label="Lĩnh vực chuyên môn"
                  value={field}
                  options={industries}
                  onChange={(val) => setField(val)}
                  icon={<Briefcase size={20} />}
                />
              </div>

              {/* 2. Target Role Select */}
              <div style={{ marginBottom: '28px' }}>
                <div className="setup-section-label">
                  <span className="setup-label-text">2. Vị trí ứng tuyển</span>
                  <span className="setup-label-hint">Vai trò công việc mục tiêu</span>
                </div>
                <CustomSelect
                  label="Vị trí mục tiêu"
                  value={role}
                  options={currentRoles}
                  onChange={(val) => setRole(val)}
                  icon={<Award size={20} />}
                />
              </div>

              {/* 3. Difficulty Options */}
              <div style={{ marginBottom: '28px' }}>
                <div className="setup-section-label">
                  <span className="setup-label-text">3. Mức độ câu hỏi phỏng vấn</span>
                  <span className="setup-label-hint">Điều chỉnh độ khó và áp lực thời gian</span>
                </div>
                <div className="options-grid-3">
                  {difficultyItems.map((item) => {
                    const active = difficulty === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`setup-option-card ${active ? 'is-active' : ''}`}
                        onClick={() => setDifficulty(item.id)}
                      >
                        <div
                          className="option-card-icon"
                          style={{
                            background: active ? '#03bfff' : item.bgColor,
                            color: active ? '#ffffff' : item.color,
                          }}
                        >
                          {item.icon}
                        </div>
                        <span className="option-card-title">{item.label}</span>
                        <span className="option-card-desc">{item.subtitle}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Interaction Mode Options */}
              <div style={{ marginBottom: '28px' }}>
                <div className="setup-section-label">
                  <span className="setup-label-text">4. Hình thức tương tác</span>
                  <span className="setup-label-hint">Chọn phương thức trả lời phỏng vấn</span>
                </div>
                <div className="options-grid-2">
                  {modeItems.map((item) => {
                    const active = mode === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`setup-mode-card ${active ? 'is-active' : ''}`}
                        onClick={() => setMode(item.id)}
                      >
                        <div
                          className="option-card-icon"
                          style={{
                            background: active ? '#03bfff' : '#f0f9ff',
                            color: active ? '#ffffff' : '#0284c7',
                          }}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <div className="option-card-title">{item.label}</div>
                          <div className="option-card-desc">{item.subtitle}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error feedback if any */}
              {errorMsg && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#FDECEC',
                    color: '#EF4444',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    marginBottom: '20px',
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button type="submit" disabled={creating} className="setup-submit-btn">
                {creating ? (
                  <>
                    <Loader2 size={20} className="spin" />
                    <span>Đang khởi tạo phòng phỏng vấn AI...</span>
                  </>
                ) : (
                  <>
                    <span>Vào phòng phỏng vấn AI ngay</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Video Tutorial Preview & STAR Framework Cards */}
        <InterviewSidebar
          videoConfig={TUTORIAL_VIDEO_CONFIG}
          onOpenVideoModal={() => setVideoModalOpen(true)}
        />
      </div>

      {/* INTERACTIVE TUTORIAL VIDEO / SIMULATION MODAL */}
      <InterviewTutorialModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoConfig={TUTORIAL_VIDEO_CONFIG}
      />
    </div>
  );
};
