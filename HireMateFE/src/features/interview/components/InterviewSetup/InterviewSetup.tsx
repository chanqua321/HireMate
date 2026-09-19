import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { interviewService } from '../../api/interview.service';
import { cvService } from '../../../../shared/services/cv.service';
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
  Zap,
  Target,
  Layers,
  Loader2,
  AlertCircle,
  FileCheck,
  FileText,
  Plus,
  Lock,
  Compass,
  CheckCircle2,
  Star,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import { InterviewSidebar } from './components/InterviewSidebar';
import { InterviewTutorialModal, TutorialVideoConfig } from './components/InterviewTutorialModal';
import { CvWizardModal } from '../../../../shared/components/CvWizard/CvWizardModal';
import './css/InterviewSetup.css';

const TUTORIAL_VIDEO_CONFIG: TutorialVideoConfig = {
  videoSrc: '/Recording 2026-09-15 010224.mp4',
  videoType: 'mp4',
};


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
          style={{ color: isOpen ? '#0284c7' : '#64748b', display: 'flex' }}
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

// 6 Phân hạng Số năm kinh nghiệm chuẩn từ Intern đến Senior
export interface ExpCategory {
  id: string;
  label: string;
  badge: string;
  level: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  questionCount: number;
  timePerQuestion: number;
  desc: string;
}

export const EXPERIENCE_CATEGORIES: ExpCategory[] = [
  {
    id: 'Chưa có KN (Intern / Fresher)',
    label: 'Chưa có KN (Intern / Fresher)',
    badge: 'Intern / Fresher',
    level: 'Khởi đầu',
    difficulty: 'Dễ',
    questionCount: 3,
    timePerQuestion: 180,
    desc: 'Tư duy nền tảng, bài toán giải quyết vấn đề cơ bản (3 câu • 180s/câu)',
  },
  {
    id: 'Dưới 1 năm (Junior)',
    label: 'Dưới 1 năm (Junior)',
    badge: 'Junior',
    level: 'Cơ bản',
    difficulty: 'Trung bình',
    questionCount: 5,
    timePerQuestion: 120,
    desc: 'Kỹ năng thực tế & tư duy phối hợp nhóm dự án (5 câu • 120s/câu)',
  },
  {
    id: '1 - 2 năm kinh nghiệm',
    label: '1 - 2 năm kinh nghiệm (Junior+)',
    badge: 'Junior+',
    level: 'Nâng cao',
    difficulty: 'Trung bình',
    questionCount: 5,
    timePerQuestion: 120,
    desc: 'Thực chiến tính năng độc lập, xử lý bài toán chuyên môn (5 câu • 120s/câu)',
  },
  {
    id: '2 - 3 năm (Mid-level)',
    label: '2 - 3 năm (Mid-level)',
    badge: 'Mid-level',
    level: 'Chuyên sâu',
    difficulty: 'Khó',
    questionCount: 5,
    timePerQuestion: 90,
    desc: 'Kiến trúc module, tối ưu hiệu năng & giải quyết kỹ thuật (5 câu • 90s/câu)',
  },
  {
    id: '3 - 5 năm (Senior)',
    label: '3 - 5 năm (Senior)',
    badge: 'Senior',
    level: 'Chuyên gia',
    difficulty: 'Khó',
    questionCount: 5,
    timePerQuestion: 90,
    desc: 'Thiết kế hệ thống, giải pháp tải cao & bao quát dự án (5 câu • 90s/câu)',
  },
  {
    id: '5+ năm (Lead / Manager)',
    label: '5+ năm (Lead / Manager)',
    badge: 'Lead / Manager',
    level: 'Quản trị',
    difficulty: 'Khó',
    questionCount: 5,
    timePerQuestion: 90,
    desc: 'Chiến lược công nghệ, quản trị rủi ro & dẫn dắt đội ngũ (5 câu • 90s/câu)',
  },
];

const matchExpCategory = (expText: string): string => {
  if (!expText) return EXPERIENCE_CATEGORIES[0].id;
  const lower = expText.toLowerCase();
  if (lower.includes('chưa có') || lower.includes('intern') || lower.includes('fresher')) {
    return EXPERIENCE_CATEGORIES[0].id;
  }
  if (lower.includes('dưới 1 năm') || lower.includes('< 1') || lower.includes('junior')) {
    return EXPERIENCE_CATEGORIES[1].id;
  }
  if (lower.includes('1 - 2') || lower.includes('1-2') || lower.includes('1 đến 2')) {
    return EXPERIENCE_CATEGORIES[2].id;
  }
  if (lower.includes('2 - 3') || lower.includes('2-3') || lower.includes('mid')) {
    return EXPERIENCE_CATEGORIES[3].id;
  }
  if (lower.includes('3 - 5') || lower.includes('3-5') || lower.includes('senior')) {
    return EXPERIENCE_CATEGORIES[4].id;
  }
  if (lower.includes('5+') || lower.includes('lead') || lower.includes('manager')) {
    return EXPERIENCE_CATEGORIES[5].id;
  }
  const found = EXPERIENCE_CATEGORIES.find((c) => c.id === expText || expText.includes(c.id));
  return found ? found.id : EXPERIENCE_CATEGORIES[0].id;
};

// Helper trích xuất thông tin chuẩn từ CV Document
const extractCvData = (cv: any) => {
  if (!cv) return { role: '', field: '', exp: '', skills: [] as string[], title: '' };

  let parsed: any = null;
  if (cv.analysis) {
    try {
      const raw = typeof cv.analysis === 'string' ? JSON.parse(cv.analysis) : cv.analysis;
      parsed = raw?.extract || raw?.parsedProfile || raw;
    } catch {}
  } else if (cv.parsedProfile) {
    parsed = cv.parsedProfile;
  }

  const role = parsed?.desiredPosition || cv.targetRole || cv.role || '';
  const field = parsed?.desiredIndustry || cv.targetField || cv.field || 'Công nghệ thông tin';
  const exp = parsed?.experienceLevel || cv.parsedExp || cv.exp || '';
  const skills = Array.isArray(parsed?.skills) ? parsed.skills : Array.isArray(cv.skills) ? cv.skills : [];
  const title = cv.fileName || cv.filename || cv.title || 'CV Document';

  return { role, field, exp, skills, title };
};

export const InterviewSetup: React.FC = () => {
  const { interviewConfig, updateInterviewConfig, profile } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const cvFromState = (location.state as any)?.fromCv;

  // CV Collection & Selected CV State
  const [userCvs, setUserCvs] = useState<any[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<string>('');
  const [selectedCv, setSelectedCv] = useState<any>(null);
  const [loadingCvs, setLoadingCvs] = useState<boolean>(true);

  // User Plan / Tier State (đồng bộ từ AppContext và Auth)
  const [userPlanCode, setUserPlanCode] = useState<string>(() => {
    return profile?.currentPlanCode || 'free';
  });
  const [isUserPremium, setIsUserPremium] = useState<boolean>(() => {
    return Boolean(
      profile?.isPremium ||
      (profile?.currentPlanCode && profile.currentPlanCode.toLowerCase() !== 'free')
    );
  });

  const activePlanCode = (userPlanCode || profile?.currentPlanCode || 'free').toLowerCase();
  const activeIsPremium = Boolean(
    isUserPremium ||
    profile?.isPremium ||
    (activePlanCode && activePlanCode !== 'free')
  );

  // Hard validate: Gói Miễn phí (Free Tier) dứt khoát không được vào phỏng vấn
  const isFreeTier = !activeIsPremium || activePlanCode === 'free' || activePlanCode === '';

  // Các gói cao hơn (Tiêu chuẩn / Cao cấp): BE bóp và kiểm tra theo nghiệp vụ
  const isComboTier = Boolean(
    activeIsPremium && ['combo', 'pro', 'cao-cap'].includes(activePlanCode)
  );

  const industries = Object.keys(INDUSTRY_ROLES);

  const [field, setField] = useState<string>('Công nghệ thông tin');
  const [role, setRole] = useState<string>('Lập trình viên Backend');
  const [selectedExp, setSelectedExp] = useState<string>(EXPERIENCE_CATEGORIES[0].id);

  const [mode, setMode] = useState<'Text' | 'Voice'>(
    interviewConfig.mode === 'Voice' || interviewConfig.mode === 'Giọng nói' ? 'Voice' : 'Text'
  );

  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [wizardModalOpen, setWizardModalOpen] = useState(false);

  // Sổ list CV dạng dropdown
  const [cvDropdownOpen, setCvDropdownOpen] = useState(false);
  const cvDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cvDropdownRef.current && !cvDropdownRef.current.contains(e.target as Node)) {
        setCvDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Danh sách Role cho ngành đang chọn
  const currentRoles = useMemo(() => {
    const base = INDUSTRY_ROLES[field] || [];
    const list = [...base];
    if (role && !list.includes(role)) {
      list.unshift(role);
    }
    return list;
  }, [field, role]);

  // Kiểm tra xem CV hiện tại đã có số năm kinh nghiệm chưa
  const hasCvExperience = Boolean(
    selectedCv &&
      extractCvData(selectedCv).exp &&
      extractCvData(selectedCv).exp.trim() !== '' &&
      extractCvData(selectedCv).exp !== 'Chưa xác định' &&
      extractCvData(selectedCv).exp !== 'Chưa phân tích'
  );

  // Tải danh sách CV và xác minh Tier (BỎ gọi API Profile chung)
  useEffect(() => {
    const loadInitData = async () => {
      setLoadingCvs(true);

      // 1. Đồng bộ gói cước từ Auth Me
      if (localStorage.getItem('hm_access_token')) {
        try {
          const meRes = await authService.getMe();
          if (meRes.ok && meRes.data) {
            const me = meRes.data;
            setUserPlanCode(me.currentPlanCode || 'free');
            setIsUserPremium(Boolean(me.isPremium));
          }
        } catch {}
      }

      // 2. Tải toàn bộ CV trực tiếp từ GET /api/Cv
      if (localStorage.getItem('hm_access_token')) {
        try {
          const cvsRes = await cvService.listCvs();
          if (cvsRes.ok && Array.isArray(cvsRes.data)) {
            const list = cvsRes.data;
            setUserCvs(list);

            // Tìm CV ưu tiên: từ state -> confirmed -> active saved -> CV đầu tiên
            let targetCv: any = null;
            if (cvFromState) {
              targetCv = list.find((c) => c.id === cvFromState.id) || cvFromState;
            } else {
              const savedId = localStorage.getItem('hm_active_cv_id');
              targetCv =
                (savedId ? list.find((c) => c.id === savedId) : null) ||
                list.find((c) => c.isConfirmed || (c as any).IsConfirmed) ||
                list[0] ||
                null;
            }

            if (targetCv) {
              applyCvToSetup(targetCv);
            }
          }
        } catch (err) {
          console.warn('Lỗi tải danh sách CV:', err);
        } finally {
          setLoadingCvs(false);
        }
      } else {
        setLoadingCvs(false);
      }
    };

    loadInitData();
  }, [cvFromState]);

  // Áp dụng dữ liệu từ CV được chọn vào Form Interview
  const applyCvToSetup = (cv: any) => {
    setSelectedCvId(cv.id);
    setSelectedCv(cv);
    localStorage.setItem('hm_active_cv_id', cv.id);
    localStorage.setItem('hm_active_cv', JSON.stringify(cv));

    const extracted = extractCvData(cv);

    if (extracted.field) {
      const normF = normalizeIndustry(extracted.field);
      setField(normF);
    }
    if (extracted.role) {
      const normR = normalizeRole(extracted.role, extracted.field || field);
      setRole(normR);
      updateInterviewConfig({ field: normalizeIndustry(extracted.field || field), role: normR });
    }
    if (extracted.exp) {
      const matchedCat = matchExpCategory(extracted.exp);
      setSelectedExp(matchedCat);
    }
  };

  // Giữ vững vị trí ứng tuyển khi đổi ngành nghề
  useEffect(() => {
    const validRoles = INDUSTRY_ROLES[field] || [];
    if (!validRoles.includes(role)) {
      const normalized = normalizeRole(role, field);
      if (validRoles.includes(normalized)) {
        setRole(normalized);
      } else if (!role || role.trim() === '') {
        setRole(validRoles[0] || 'Lập trình viên Backend');
      }
    }
  }, [field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Xác minh Tier: Free tuyệt đối không vào phòng phỏng vấn
    if (isFreeTier) {
      setErrorMsg(
        'Chào bạn! Gói Miễn phí (Free) hiện được cung cấp 1 lượt phân tích CV trong tháng. Để bước vào phòng phỏng vấn AI, bạn vui lòng nâng cấp gói Tiêu chuẩn hoặc Cao cấp.'
      );
      return;
    }

    // 2. Xác minh CV: Bắt buộc phải có CV và phải được chọn
    if (!selectedCv) {
      setErrorMsg('Vui lòng chọn hoặc tạo 1 CV trước khi bắt đầu phỏng vấn!');
      return;
    }

    // 3. Kiểm tra thông tin số năm kinh nghiệm
    if (!hasCvExperience) {
      setErrorMsg(
        'CV của bạn chưa có thông tin số năm kinh nghiệm rõ ràng. Hãy chọn cấp độ kinh nghiệm bên dưới hoặc cập nhật lại CV để AI chuẩn bị bộ câu hỏi phù hợp nhất!'
      );
      return;
    }

    // 4. Kiểm tra Mode Voice: chỉ dành riêng cho gói Cao cấp (Combo)
    if (mode === 'Voice' && !isComboTier) {
      setErrorMsg(
        'Hình thức phỏng vấn Giọng nói (Voice Mode) chỉ dành riêng cho gói Cao cấp (Combo). Vui lòng chuyển sang Chế độ Văn bản (Text Mode) hoặc nâng cấp gói!'
      );
      return;
    }

    const currentCat =
      EXPERIENCE_CATEGORIES.find((c) => c.id === selectedExp) || EXPERIENCE_CATEGORIES[0];

    updateInterviewConfig({
      field,
      role,
      difficulty: currentCat.difficulty,
      mode,
    });

    let targetSessionId = '';

    if (localStorage.getItem('hm_access_token')) {
      setCreating(true);
      try {
        const res = await interviewService.createSession({
          industry: field,
          position: role,
          difficulty: currentCat.difficulty,
          mode,
          questionCount: currentCat.questionCount,
        });

        if (res.ok && res.data?.id) {
          targetSessionId = res.data.id;
        } else if (!res.ok && res.message) {
          setErrorMsg(res.message);
          return;
        }
      } catch {
        setErrorMsg('Không thể kết nối đến máy chủ để tạo phiên phỏng vấn. Vui lòng thử lại!');
        return;
      } finally {
        setCreating(false);
      }
    }

    if (targetSessionId) {
      navigate(`/interview-room?sessionId=${targetSessionId}`);
    } else {
      setErrorMsg('Không tạo được phiên phỏng vấn. Vui lòng kiểm tra lại quyền truy cập tài khoản.');
    }
  };

  const selectedCatObj =
    EXPERIENCE_CATEGORIES.find((c) => c.id === selectedExp) || EXPERIENCE_CATEGORIES[0];

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
              Phỏng vấn mô phỏng chuẩn STAR quốc tế được cá nhân hóa 100% dựa trên CV bạn chọn.
            </p>
          </div>

          {/* Setup Form Body */}
          <div className="setup-body">
            {/* 1 dòng thông báo tier nhỏ gọn, không làm nở page */}
            {isFreeTier && (
              <div className="tier-compact-inline-badge">
                <div className="tier-inline-left">
                  <Lock size={13} className="tier-inline-lock-icon" />
                  <span>Gói tài khoản: <strong>Miễn phí (Free Tier)</strong> — Vui lòng nâng cấp gói để vào phòng phỏng vấn AI.</span>
                </div>
                <Link to="/pricing" className="tier-inline-link">
                  Nâng cấp gói <ArrowRight size={12} />
                </Link>
              </div>
            )}

            {/* PHẦN 1: BẮT BUỘC CHỌN CV ĐỂ PHỎNG VẤN (SỔ LIST DROPDOWN GỌN GÀNG) */}
            <div className="setup-section-block">
              <div className="section-block-header">
                <div className="section-title-wrap">
                  <div className="section-num-circle">1</div>
                  <div className="section-header-texts">
                    <h3 className="section-main-title">Chọn CV để phỏng vấn (Bắt buộc)</h3>
                    <p className="section-sub-desc">
                      AI sẽ đọc Vị trí mục tiêu, Ngành nghề và Kỹ năng trực tiếp từ CV được chọn để đặt câu hỏi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Khối Sổ list CV dạng Dropdown */}
              {loadingCvs ? (
                <div className="cv-loading-placeholder">
                  <Loader2 size={24} className="animate-spin" color="#0284c7" />
                  <span>Đang tải danh sách CV của bạn...</span>
                </div>
              ) : userCvs.length === 0 ? (
                <div className="no-cv-blocking-card">
                  <div className="no-cv-icon-box">
                    <FileText size={32} />
                  </div>
                  <h4 className="no-cv-title">Chưa có CV nào trong hồ sơ</h4>
                  <p className="no-cv-desc">
                    Hệ thống yêu cầu ứng viên phải có ít nhất 1 CV để AI xây dựng phòng phỏng vấn sát với thực tế.
                    Bạn có thể tạo mới bằng AI Wizard hoặc quản lý CV ở trang Hồ sơ.
                  </p>
                  <div className="no-cv-actions">
                    <Link
                      to="/dashboard?tab=manual"
                      className="primary-create-wizard-btn"
                    >
                      <Sparkles size={16} /> Tạo CV bằng AI Wizard tại Hồ sơ
                    </Link>
                    <Link
                      to="/dashboard?tab=scan"
                      className="secondary-upload-btn"
                    >
                      <FolderOpen size={16} /> Quản lý trong Kho CV
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="cv-dropdown-select-wrap" ref={cvDropdownRef}>
                  {(() => {
                    const activeCvObj = userCvs.find((c) => c.id === selectedCvId) || userCvs[0];
                    const activeMeta = extractCvData(activeCvObj);

                    return (
                      <>
                        <div
                          className={`cv-dropdown-select-trigger ${cvDropdownOpen ? 'is-active' : ''}`}
                          onClick={() => setCvDropdownOpen(!cvDropdownOpen)}
                        >
                          <div className="cv-trigger-main">
                            <FileCheck size={18} className="cv-trigger-file-icon" />
                            <div className="cv-trigger-info">
                              <span className="cv-trigger-name" title={activeMeta.title}>
                                {activeMeta.title || 'Chọn CV để phỏng vấn'}
                              </span>
                              <div className="cv-trigger-sub">
                                <span>{activeMeta.role || 'Chưa phân tích vị trí'}</span>
                                <span className="bullet-sep">•</span>
                                <span>{activeMeta.field || 'Công nghệ thông tin'}</span>
                                {activeMeta.exp && (
                                  <>
                                    <span className="bullet-sep">•</span>
                                    <span className="cv-trigger-exp-tag">{activeMeta.exp}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="cv-trigger-side">
                            {activeCvObj?.atsScore != null && (
                              <span className="cv-trigger-ats-badge">ATS {activeCvObj.atsScore}đ</span>
                            )}
                            <div className="cv-trigger-pill-wrap">
                              <span className="cv-count-tag">{userCvs.length} CV</span>
                              <ChevronDown size={16} className={`cv-chevron-arrow ${cvDropdownOpen ? 'open' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* Menu Sổ list khi bấm vào */}
                        {cvDropdownOpen && (
                          <div className="cv-dropdown-menu-list">
                            <div className="cv-dropdown-menu-header">
                              <span>Chọn CV để phỏng vấn ({userCvs.length} CV trong kho)</span>
                            </div>
                            <div className="cv-dropdown-items-scroll">
                              {userCvs.map((cvItem) => {
                                const isSelected = cvItem.id === selectedCvId;
                                const meta = extractCvData(cvItem);

                                return (
                                  <div
                                    key={cvItem.id}
                                    className={`cv-dropdown-item-row ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => {
                                      applyCvToSetup(cvItem);
                                      setCvDropdownOpen(false);
                                    }}
                                  >
                                    <div className="cv-item-row-left">
                                      <FileText size={16} className={isSelected ? 'text-primary' : 'text-slate'} />
                                      <div className="cv-item-row-texts">
                                        <span className="cv-item-row-title">{meta.title}</span>
                                        <span className="cv-item-row-meta">
                                          {meta.role || 'Chưa phân tích'} • {meta.field || 'CNTT'}
                                          {meta.exp ? ` • ${meta.exp}` : ''}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="cv-item-row-right">
                                      {cvItem.atsScore != null && (
                                        <span className="cv-item-ats-pill">ATS {cvItem.atsScore}đ</span>
                                      )}
                                      {isSelected ? (
                                        <div className="cv-item-selected-tag">
                                          <CheckCircle2 size={15} />
                                          <span>Đang chọn</span>
                                        </div>
                                      ) : (
                                        <span className="cv-item-choose-text">Chọn</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Error Feedback Message */}
            {errorMsg && (
              <div className="setup-error-banner">
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PHẦN 2: THIẾT LẬP CHI TIẾT PHÒNG PHỎNG VẤN */}
            <form onSubmit={handleSubmit} className="setup-form-fields">
              {/* Vị trí & Chuyên ngành (Đồng bộ từ CV) */}
              <div className="form-group-wrap">
                <label className="field-group-label">
                  <Briefcase size={16} color="#0284c7" />
                  <span>Vị trí ứng tuyển & Chuyên ngành phỏng vấn</span>
                </label>
                <div className="two-select-row">
                  <CustomSelect
                    label="Chuyên ngành"
                    value={field}
                    options={industries}
                    onChange={(newField) => setField(newField)}
                    icon={<Layers size={18} color="#0284c7" />}
                  />
                  <CustomSelect
                    label="Vị trí ứng tuyển"
                    value={role}
                    options={currentRoles}
                    onChange={(newRole) => setRole(newRole)}
                    icon={<Briefcase size={18} color="#0284c7" />}
                  />
                </div>
              </div>

              {/* PHẦN 3: TÙY CHỌN MỨC PHỎNG VẤN TỪ INTERN ĐẾN SENIOR (COMPACT 3x2 GRID) */}
              <div className="form-group-wrap">
                <div className="exp-section-header">
                  <label className="field-group-label" style={{ marginBottom: 0 }}>
                    <Award size={16} color="#0284c7" />
                    <span>Cấp độ phỏng vấn (Tùy chọn từ Intern đến Senior)</span>
                  </label>
                  <span className="exp-active-indicator">
                    Khớp với CV: <strong>{selectedCatObj.badge}</strong>
                  </span>
                </div>
                <p className="field-sub-note">
                  AI sẽ điều chỉnh độ khó, thời gian phản xạ và độ sâu câu hỏi dựa trên cấp độ bạn chọn.
                </p>

                {/* Compact 3x2 Grid thay thế 6 hàng dài lê thê */}
                <div className="exp-grid-compact">
                  {EXPERIENCE_CATEGORIES.map((cat) => {
                    const isSelected = selectedExp === cat.id;
                    return (
                      <div
                        key={cat.id}
                        className={`exp-compact-tile ${isSelected ? 'is-active' : ''}`}
                        onClick={() => setSelectedExp(cat.id)}
                      >
                        <div className="exp-tile-header">
                          <span className="exp-tile-title">{cat.badge}</span>
                          <span className={`exp-diff-tag diff-${cat.difficulty.toLowerCase()}`}>
                            {cat.difficulty}
                          </span>
                        </div>
                        <div className="exp-tile-footer">
                          <span className="exp-tile-time">{cat.questionCount} câu • {cat.timePerQuestion}s</span>
                          {isSelected && <CheckCircle2 size={15} className="exp-selected-icon" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Thanh tóm tắt tiêu chí của cấp độ đang chọn */}
                <div className="exp-active-summary-bar">
                  <CheckCircle2 size={16} className="exp-summary-sparkle" />
                  <span>
                    <strong>Cấp độ {selectedCatObj.label}</strong>: {selectedCatObj.desc}
                  </span>
                </div>
              </div>

              {/* PHẦN 4: HÌNH THỨC PHỎNG VẤN (TEXT / VOICE) */}
              <div className="form-group-wrap">
                <label className="field-group-label">
                  <MessageSquare size={16} color="#0284c7" />
                  <span>Hình thức phỏng vấn</span>
                </label>
                <div className="mode-selection-grid">
                  <div
                    className={`mode-card ${mode === 'Text' ? 'is-selected' : ''}`}
                    onClick={() => setMode('Text')}
                  >
                    <div className="mode-card-header">
                      <div className="mode-icon-circle">
                        <MessageSquare size={20} />
                      </div>
                      {mode === 'Text' && <CheckCircle2 size={18} color="#0284c7" />}
                    </div>
                    <h4 className="mode-title">Chế độ Văn bản (Text Mode)</h4>
                    <p className="mode-desc">
                      Gõ câu trả lời, nhận gợi ý theo thời gian thực và phân tích STAR chi tiết sau buổi phỏng vấn.
                    </p>
                    <span className="mode-tag-pill">Có trong gói Tiêu chuẩn & Cao cấp</span>
                  </div>

                  <div
                    className={`mode-card ${mode === 'Voice' ? 'is-selected' : ''} ${!isComboTier ? 'is-locked' : ''}`}
                    onClick={() => {
                      if (!isComboTier) {
                        setErrorMsg(
                          'Hình thức phỏng vấn Giọng nói (Voice Mode) chỉ dành riêng cho gói Cao cấp (Combo). Vui lòng nâng cấp gói để mở khóa!'
                        );
                        return;
                      }
                      setMode('Voice');
                    }}
                  >
                    <div className="mode-card-header">
                      <div className="mode-icon-circle">
                        <Mic size={20} />
                      </div>
                      {!isComboTier ? (
                        <div className="pro-lock-badge">
                          <Lock size={12} /> Cao cấp
                        </div>
                      ) : mode === 'Voice' ? (
                        <CheckCircle2 size={18} color="#0284c7" />
                      ) : null}
                    </div>
                    <h4 className="mode-title">Chế độ Giọng nói (Voice Mode)</h4>
                    <p className="mode-desc">
                      Đàm thoại trực tiếp bằng giọng nói tự nhiên với AI Coach, mô phỏng phòng phỏng vấn trực tiếp.
                    </p>
                    <span className="mode-tag-pill combo-only">Dành riêng cho gói Cao cấp (Combo)</span>
                  </div>
                </div>
              </div>

              {/* NÚT BẮT ĐẦU PHỎNG VẤN */}
              <div className="setup-submit-actions">
                <button
                  type="submit"
                  className="start-interview-main-btn"
                  disabled={creating || isFreeTier || userCvs.length === 0}
                >
                  {creating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Đang khởi tạo phòng phỏng vấn...</span>
                    </>
                  ) : isFreeTier ? (
                    <>
                      <Lock size={18} />
                      <span>Gói Miễn phí (Vui lòng nâng cấp để phỏng vấn)</span>
                    </>
                  ) : userCvs.length === 0 ? (
                    <>
                      <AlertCircle size={18} />
                      <span>Cần có ít nhất 1 CV để bắt đầu</span>
                    </>
                  ) : (
                    <>
                      <span>Bắt đầu phiên phỏng vấn</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* RIGHT COLUMN: Sidebar Mockup & Tutorial */}
        <div className="setup-sidebar-wrap">
          <InterviewSidebar
            videoConfig={TUTORIAL_VIDEO_CONFIG}
            onOpenVideoModal={() => setVideoModalOpen(true)}
          />
        </div>
      </div>

      {/* Video Tutorial Modal */}
      <InterviewTutorialModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoConfig={TUTORIAL_VIDEO_CONFIG}
      />


      {/* CV WIZARD MODAL: 10 câu hỏi chuẩn BR09 */}
      <CvWizardModal
        isOpen={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        defaultIndustry={field}
        defaultRole={role}
        onSuccess={(newCv) => {
          setUserCvs((prev) => [newCv, ...prev]);
          applyCvToSetup(newCv);
        }}
      />
    </div>
  );
};
