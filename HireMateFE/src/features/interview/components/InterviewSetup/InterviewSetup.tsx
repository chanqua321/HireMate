import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { interviewService } from '../../api/interview.service';
import { careerService } from '../../../../shared/services/career.service';
import { cvService } from '../../../../shared/services/cv.service';
import { jdService } from '../../../../shared/services/jd.service';
import { authService } from '../../../auth';
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
  Target,
  Layers,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Compass,
  FileText,
  UploadCloud,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import { InterviewSidebar } from './components/InterviewSidebar';
import { InterviewTutorialModal } from './components/InterviewTutorialModal';
import { CvRequiredModal } from '../../../../shared/components/CvRequiredModal/CvRequiredModal';
import './css/InterviewSetup.css';

interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  icon: React.ReactNode;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
  disabled = false,
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
        disabled={disabled}
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => { if (!disabled) setIsOpen((prev) => !prev); }}
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

  // Resolve Active CV from server hydrate; fromCv = operation selection only (≠ Active).
  const [activeCvInfo, setActiveCvInfo] = useState<any>(null);
  const [backendActiveCvId, setBackendActiveCvId] = useState<string | null>(null);
  const [cvOptions, setCvOptions] = useState<
    { id: string; title: string; role?: string; field?: string; major?: string; parseSucceeded?: boolean }[]
  >([]);
  // Operation CV: fromCv or user pick. Empty string = use Active (send null to API).
  const [selectedOpCvId, setSelectedOpCvId] = useState<string>(() =>
    cvFromState?.id ? String(cvFromState.id) : ''
  );
  const interviewCv = cvOptions.find(c => c.id === (selectedOpCvId || cvFromState?.id)) || activeCvInfo;
  const [cvRequiredModalOpen, setCvRequiredModalOpen] = useState(false);

  // Career Profile extra info from GET /api/Career/profile
  const [careerSkills, setCareerSkills] = useState<string[]>([]);
  const [careerExp, setCareerExp] = useState<string>('');
  const [careerUniversity, setCareerUniversity] = useState<string>('');
  const [careerSessionsCount, setCareerSessionsCount] = useState<number>(0);
  const [runtimePlanCode, setRuntimePlanCode] = useState<string>(() =>
    String(profile.currentPlanCode || 'free').toLowerCase()
  );

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
  const [jobDescription, setJobDescription] = useState('');
  const [jobDescriptionId, setJobDescriptionId] = useState('');
  const [savedJds, setSavedJds] = useState<{ id: string; title: string; companyName?: string | null }[]>([]);
  const [contextPreview, setContextPreview] = useState<string | null>(null);

  const [mode, setMode] = useState<'Text' | 'Voice'>(
    interviewConfig.mode === 'Voice' || interviewConfig.mode === 'Giọng nói'
      ? 'Voice'
      : 'Text'
  );

  const planCode = String(runtimePlanCode || profile.currentPlanCode || 'free').toLowerCase();
  /** Free is a valid plan for Text; Voice requires paid entitlement from backend plan code. */
  const voiceAllowed = planCode === 'premium' || planCode === 'combo';

  // If Free and Voice was persisted, force Text until paid.
  useEffect(() => {
    if (!voiceAllowed && mode === 'Voice') setMode('Text');
  }, [voiceAllowed, mode]);

  // Load saved JDs for interview context (optional)
  useEffect(() => {
    if (!localStorage.getItem('hm_access_token')) return;
    jdService
      .list(false)
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setSavedJds(
            res.data.map((j) => ({
              id: j.id,
              title: j.title,
              companyName: j.companyName,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const mapCvOption = (c: any, fallbackRole?: string, fallbackField?: string) => {
    const display =
      c.displayName ||
      c.DisplayName ||
      c.fileName ||
      c.parsedProfile?.desiredPosition ||
      'CV';
    return {
      id: String(c.id),
      title: display,
      fileName: c.fileName || '',
      role: c.targetRole || c.parsedProfile?.desiredPosition || fallbackRole || '',
      field: c.targetField || fallbackField || '',
      major: c.targetMajor || c.parsedProfile?.major || '',
      parseSucceeded: c.parseSucceeded,
    };
  };

  // Hydrate plan + Active CV from backend (SoT). fromCv is operation selection only — never Active.
  useEffect(() => {
    if (cvFromState) {
      const f = normalizeIndustry(cvFromState.field);
      const r = normalizeRole(cvFromState.role, f);
      setField(f);
      setRole(r);
      updateInterviewConfig({ field: f, role: r });
    }

    if (!localStorage.getItem('hm_access_token')) return;

    let cancelled = false;

    (async () => {
      try {
        const me = await authService.getMe();
        if (!cancelled && me.ok && me.data) {
          const code = String(
            (me.data as any).currentPlanCode || (me.data as any).CurrentPlanCode || 'free'
          ).toLowerCase();
          setRuntimePlanCode(code || 'free');
        }
      } catch {
        /* ignore — keep cached plan */
      }

      try {
        const [hubRes, cvRes] = await Promise.all([
          careerService.getProfileHub(),
          cvService.listCvs(),
        ]);
        if (cancelled) return;

        const hub: any = hubRes.ok ? hubRes.data : null;
        const cp = hub?.profile;
        const confirmedId = String(
          cp?.confirmedCvDocumentId || cp?.ConfirmedCvDocumentId || ''
        ).trim();

        if (cp) {
          const pos = cp.desiredPosition || cp.DesiredPosition || '';
          const ind = cp.desiredIndustry || cp.DesiredIndustry || '';
          if (pos || ind) {
            const f = normalizeIndustry(ind || field);
            const r = normalizeRole(pos || role, f);
            setField(f);
            setRole(r);
            updateInterviewConfig({ field: f, role: r });
          }
          try {
            const rawSkills = cp.skillsJson || cp.skills || cp.SkillsJson;
            if (typeof rawSkills === 'string') setCareerSkills(JSON.parse(rawSkills));
            else if (Array.isArray(rawSkills)) setCareerSkills(rawSkills);
          } catch {}
          if (cp.experienceLevel || cp.ExperienceLevel) {
            setCareerExp(cp.experienceLevel || cp.ExperienceLevel);
          }
          if (cp.university || cp.University) {
            setCareerUniversity(cp.university || cp.University);
          }
        }
        if (typeof hub?.sessionsCount === 'number') setCareerSessionsCount(hub.sessionsCount);

        const cvs = cvRes.ok && Array.isArray(cvRes.data) ? cvRes.data : [];
        const options = cvs.map((c) =>
          mapCvOption(c, cp?.desiredPosition, cp?.desiredIndustry)
        );
        setCvOptions(options);

        // Active = ConfirmedCvDocumentId only. Never latest / first / isActive-without-confirmed.
        const activeDto =
          confirmedId ? cvs.find((c) => String(c.id) === confirmedId) : undefined;

        if (activeDto) {
          const mapped = mapCvOption(activeDto, cp?.desiredPosition, cp?.desiredIndustry);
          setBackendActiveCvId(String(activeDto.id));
          setActiveCvInfo(mapped);
          try {
            localStorage.setItem('hm_active_cv_id', String(activeDto.id));
            localStorage.setItem('hm_active_cv', JSON.stringify(mapped));
          } catch {}
        } else {
          setBackendActiveCvId(confirmedId || null);
          setActiveCvInfo(null);
          try {
            localStorage.removeItem('hm_active_cv_id');
            localStorage.removeItem('hm_active_cv');
          } catch {}
        }

        if (selectedOpCvId && !options.some((o) => o.id === selectedOpCvId)) {
          setSelectedOpCvId('');
        }
        const chosenForInterview = options.find(o => o.id === (selectedOpCvId || cvFromState?.id))
          || (activeDto ? options.find(o => o.id === String(activeDto.id)) : undefined);
        if (chosenForInterview && (chosenForInterview.role || chosenForInterview.field)) {
          const f = chosenForInterview.field || field;
          const r = chosenForInterview.role || role;
          setField(f);
          setRole(r);
          updateInterviewConfig({ field: f, role: r });
        }
      } catch {
        /* keep local cache banner */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cvFromState]);

  useEffect(() => {
    if (interviewCv?.role) return;
    const validRoles = INDUSTRY_ROLES[field] || [];
    if (!validRoles.includes(role)) {
      const normalized = normalizeRole(role, field);
      if (validRoles.includes(normalized)) {
        setRole(normalized);
      } else {
        setRole(validRoles[0] || 'Lập trình viên Backend');
      }
    }
  }, [field, role, interviewCv?.role]);

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
      mode,
    });

    let targetSessionId = '';
    // Local flag — React state `errorMsg` is stale inside this async function after setErrorMsg.
    let submitError = '';

    const token = localStorage.getItem('hm_access_token');
    if (!token) {
      setErrorMsg('Cần đăng nhập và hoàn tất hồ sơ (CV + chọn gói + Confirm) trước khi phỏng vấn.');
      return;
    }

    // Explicit non-Active → send id. Active / empty → null (backend resolves Confirmed).
    // Never send stale localStorage as Active. Never activate for this operation.
    const opId = selectedOpCvId || (cvFromState?.id ? String(cvFromState.id) : '');
    const cvDocumentId =
      opId && backendActiveCvId && opId === backendActiveCvId
        ? undefined
        : opId && opId !== backendActiveCvId
          ? opId
          : undefined;

    if (!cvDocumentId && !backendActiveCvId) {
      setCvRequiredModalOpen(true);
      return;
    }

    setCreating(true);
    try {
      let contextJson: string | undefined;
      const ctxRes = await interviewService.buildContext({
        position: role,
        industry: field,
        jobDescription: jobDescriptionId ? undefined : jobDescription.trim() || undefined,
        jobDescriptionId: jobDescriptionId || undefined,
        cvDocumentId,
      });
      if (ctxRes.ok && ctxRes.data) {
        contextJson = JSON.stringify(ctxRes.data);
        const matched = ctxRes.data.matchedSkills || ctxRes.data.MatchedSkills || [];
        const gaps = ctxRes.data.skillGaps || ctxRes.data.SkillGaps || [];
        setContextPreview(
          `Khớp: ${(matched as string[]).slice(0, 4).join(', ') || '—'} · Cần đào sâu: ${(gaps as string[]).slice(0, 3).join(', ') || '—'}`
        );
      }

      const res = await interviewService.createSession({
        industry: field,
        position: role,
        mode,
        jobDescription: jobDescriptionId ? undefined : jobDescription.trim() || undefined,
        jobDescriptionId: jobDescriptionId || undefined,
        cvDocumentId,
        contextJson,
      });

      const sessionId = res.data?.id || (res.data as any)?.Id;
      if (res.ok && sessionId) {
        targetSessionId = String(sessionId);
      } else {
        submitError =
          res.message ||
          'Không tạo được phiên phỏng vấn. Kiểm tra CV đã phân tích và gói đã chọn.';
        setErrorMsg(submitError);
      }
    } catch (err: any) {
      submitError = err?.message || 'Không tạo được phiên phỏng vấn.';
      setErrorMsg(submitError);
    } finally {
      setCreating(false);
    }

    if (targetSessionId) {
      navigate(`/interview-room?sessionId=${targetSessionId}`);
    }
  };

  const currentRoles = INDUSTRY_ROLES[field] || [];

  const modeItems = [
    {
      id: 'Text' as const,
      label: 'Văn bản (Text Mode)',
      subtitle: 'Gõ câu trả lời, nhận gợi ý thời gian thực chuẩn cấu trúc STAR',
      icon: <MessageSquare size={22} />,
      locked: false,
      hint: '',
    },
    {
      id: 'Voice' as const,
      label: voiceAllowed ? 'Giọng nói (Voice Mode)' : 'Voice Interview 🔒',
      subtitle: voiceAllowed
        ? 'Thời lượng tối đa 15 phút · Chi phí: 1 lượt Interview'
        : 'Chỉ dành cho gói trả phí (Tiêu chuẩn / Cao cấp)',
      icon: <Mic size={22} />,
      locked: !voiceAllowed,
      hint: voiceAllowed
        ? 'Quota tính theo phiên (không theo phút)'
        : 'Nâng cấp Tiêu chuẩn hoặc Cao cấp để mở Voice',
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
              Tùy chỉnh ngành, vị trí mục tiêu, JD (tuỳ chọn) và hình thức Text / Voice — câu hỏi cá nhân hóa theo CV
              trước khi bắt đầu buổi tập luyện mô phỏng chuẩn STAR quốc tế.
            </p>
          </div>

          {/* Setup Form Body */}
          <div className="setup-body">
            {/* Active CV Guidance Warning Banner */}
            {!backendActiveCvId && !selectedOpCvId && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                  border: '1.5px solid #FDE68A',
                  borderRadius: '16px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ color: '#D97706', marginTop: 2, flexShrink: 0 }}>
                  <AlertTriangle size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 800, color: '#92400E' }}>
                    Chưa có CV nào được kích hoạt cho phiên phỏng vấn này
                  </h4>
                  <p style={{ margin: '0 0 12px', fontSize: '0.86rem', color: '#B45309', lineHeight: 1.55 }}>
                    HireMate AI Coach cần đọc hồ sơ CV để tạo bộ câu hỏi phỏng vấn mô phỏng chuẩn xác nhất theo năng lực của bạn. Bạn hãy nạp hoặc kích hoạt một CV trước khi bắt đầu.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Link
                      to="/dashboard?tab=scan&action=upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#D97706',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        textDecoration: 'none',
                        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                      }}
                    >
                      <UploadCloud size={15} />
                      <span>Tải lên CV có sẵn</span>
                    </Link>
                    <Link
                      to="/dashboard?tab=manual"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: '#FFFFFF',
                        border: '1px solid #D97706',
                        color: '#92400E',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        textDecoration: 'none',
                      }}
                    >
                      <Sparkles size={15} />
                      <span>Tạo CV mới với AI</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}
            {/* Active CV & Career Profile indicator banner */}
            <div
              style={{
                marginBottom: '20px',
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)',
                border: '1.5px solid #BAE6FD',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.86rem',
              }}
            >
              {/* Row 1: Role & CV title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369A1' }}>
                  <Target size={17} color="#0284C7" />
                  <span>
                    Hồ sơ phỏng vấn:{' '}
                    <strong style={{ color: '#0F172A' }}>
                      {interviewCv?.title || role}
                    </strong>
                    {!interviewCv?.title && role ? ` (${field})` : null}
                    {interviewCv?.title && role ? (
                      <span style={{ color: '#64748B', marginLeft: 6, fontWeight: 500 }}>
                        · {role}
                        {field ? ` (${field})` : ''}
                        {interviewCv?.major ? ` · ${interviewCv.major}` : ''}
                      </span>
                    ) : null}
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
              {((interviewCv?.fileName || interviewCv?.filename) &&
                (interviewCv.fileName || interviewCv.filename) !== interviewCv.title) && (
                <div style={{ color: '#94A3B8', fontSize: '0.75rem', paddingLeft: 25 }}>
                  File: {interviewCv.fileName || interviewCv.filename}
                </div>
              )}

              {/* Row 2: Career Profile details (skills, exp, sessions) */}
              {(careerSkills.length > 0 || careerExp || careerSessionsCount > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid #E0F2FE' }}>
                  {careerExp && (
                    <span style={{
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Layers size={12} /> {careerExp}
                    </span>
                  )}
                  {careerSkills.slice(0, 5).map((sk) => (
                    <span
                      key={sk}
                      style={{
                        background: '#F0F9FF',
                        color: '#0369A1',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 500,
                        border: '1px solid #BAE6FD',
                      }}
                    >
                      {sk}
                    </span>
                  ))}
                  {careerSkills.length > 5 && (
                    <span style={{ color: '#64748B', fontSize: '0.76rem' }}>+{careerSkills.length - 5} skills</span>
                  )}
                  {careerSessionsCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      color: '#64748B',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                    }}>
                      📊 {careerSessionsCount} buổi phỏng vấn
                    </span>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* 1. Industry / Field Select */}
              <div style={{ marginBottom: '24px' }}>
                <div className="setup-section-label">
                  <span className="setup-label-text">1. Chọn ngành nghề</span>
                  <span className="setup-label-hint">{interviewCv?.field ? 'Lấy từ CV dùng để phỏng vấn' : 'Lĩnh vực hoạt động chuyên môn'}</span>
                </div>
                <CustomSelect
                  label="Lĩnh vực chuyên môn"
                  value={field}
                  options={industries}
                  onChange={(val) => setField(val)}
                  icon={<Briefcase size={20} />}
                  disabled={!!interviewCv?.field}
                />
              </div>

              {/* 2. Target Role Select */}
              <div style={{ marginBottom: '28px' }}>
                <div className="setup-section-label">
                  <span className="setup-label-text">2. Vị trí ứng tuyển</span>
                  <span className="setup-label-hint">{interviewCv?.role ? 'Lấy từ CV dùng để phỏng vấn' : 'Vai trò công việc mục tiêu'}</span>
                </div>
                <CustomSelect
                  label="Vị trí mục tiêu"
                  value={role}
                  options={currentRoles}
                  onChange={(val) => setRole(val)}
                  icon={<Award size={20} />}
                  disabled={!!interviewCv?.role}
                />
              </div>

              {/* 3. Optional JD — personalized interview (no Easy/Medium/Hard) */}
              <div style={{ marginBottom: '28px' }}>
                <div className="setup-section-label">
                  <span className="setup-label-text">3. Mô tả công việc (tuỳ chọn)</span>
                  <span className="setup-label-hint">Chọn JD đã lưu hoặc dán JD để câu hỏi bám yêu cầu vị trí</span>
                </div>
                {savedJds.length > 0 && (
                  <select
                    value={jobDescriptionId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setJobDescriptionId(id);
                      if (!id) return;
                      try {
                        const res = await jdService.get(id);
                        if (res.ok && res.data) setJobDescription(res.data.content);
                      } catch {
                        /* ignore */
                      }
                    }}
                    style={{
                      width: '100%',
                      marginBottom: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1.5px solid #E2E8F0',
                      fontSize: '0.92rem',
                    }}
                  >
                    <option value="">— Dán JD thủ công / không dùng JD đã lưu —</option>
                    {savedJds.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                        {j.companyName ? ` · ${j.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <div style={{ position: 'relative' }}>
                  <FileText
                    size={18}
                    style={{ position: 'absolute', left: 14, top: 14, color: '#0284C7', opacity: 0.7 }}
                  />
                  <textarea
                    value={jobDescription}
                    onChange={(e) => {
                      setJobDescription(e.target.value);
                      if (jobDescriptionId) setJobDescriptionId('');
                    }}
                    placeholder="Paste JD tại đây (skills, responsibilities...). Để trống nếu chỉ luyện theo CV + vị trí."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: 12,
                      border: '1.5px solid #E2E8F0',
                      fontSize: '0.92rem',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                    }}
                  />
                </div>
                <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  HireMate sẽ dựng hồ sơ phỏng vấn cá nhân hóa từ CV đã Confirm + vị trí + JD — không chọn độ khó thủ công.
                  {contextPreview ? ` ${contextPreview}` : ''}
                </p>
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
                        className={`setup-mode-card ${active ? 'is-active' : ''} ${item.locked ? 'is-locked' : ''}`}
                        onClick={() => {
                          if (item.locked) return;
                          setMode(item.id);
                        }}
                        style={item.locked ? { opacity: 0.72, cursor: 'not-allowed' } : undefined}
                        title={item.hint || undefined}
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
                          {item.locked && (
                            <div style={{ marginTop: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                              <Link to="/pricing" style={{ color: '#0284C7' }}>
                                Xem bảng giá Tiêu chuẩn / Cao cấp →
                              </Link>
                            </div>
                          )}
                          {!item.locked && item.id === 'Voice' && (
                            <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                              🎙 Start Voice Interview · tối đa 15 phút / 1 lượt
                            </div>
                          )}
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
                    flexDirection: 'column',
                    gap: '10px',
                    background: '#FDECEC',
                    color: '#B91C1C',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={18} />
                    <span>{errorMsg}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {/phân tích|CV|Kho CV/i.test(errorMsg) && (
                      <Link to="/dashboard?tab=scan" style={{ color: '#0284C7', fontWeight: 750 }}>
                        Xem CV / Phân tích lại →
                      </Link>
                    )}
                    {/hạn mức|quota|nâng cấp|gói/i.test(errorMsg) && (
                      <Link to="/pricing" style={{ color: '#0284C7', fontWeight: 750 }}>
                        Xem bảng giá →
                      </Link>
                    )}
                  </div>
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

      {/* CV Required Guidance Modal */}
      <CvRequiredModal
        isOpen={cvRequiredModalOpen}
        onClose={() => setCvRequiredModalOpen(false)}
      />
    </div>
  );
};
