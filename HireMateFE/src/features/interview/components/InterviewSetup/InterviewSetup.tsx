import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { interviewService } from '../../api/interview.service';
import { INDUSTRY_ROLES, normalizeRole } from '../../../../shared/data/questionBank';
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
  BookOpen,
  Layers,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Compass,
  Play,
  PlayCircle,
  Pause,
  Volume2,
  Maximize2,
  X,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
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

  const industries = Object.keys(INDUSTRY_ROLES);
  const initialField =
    interviewConfig.field || profile.field || 'Công nghệ thông tin';

  const [field, setField] = useState<string>(initialField);
  const [role, setRole] = useState<string>(() => {
    return normalizeRole(interviewConfig.role || profile.role, initialField);
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
  const [isPlayingMockVideo, setIsPlayingMockVideo] = useState(true);

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
            <AnimatePresence>
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
            </AnimatePresence>

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
        <div className="setup-sidebar-stack">
          {/* 1. TUTORIAL VIDEO PREVIEW CARD */}
          <motion.div
            className="setup-tutorial-video-card"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="tutorial-badge-row">
              <span className="video-duration-pill">
                <PlayCircle size={14} /> Video Hướng Dẫn • 01:15
              </span>
              <span className="candidate-level-pill">Người mới</span>
            </div>

            <h3 className="tutorial-title">Xem video mô phỏng buổi phỏng vấn AI thực tế</h3>
            <p className="tutorial-desc">
              Khám phá cách AI lắng nghe giọng nói, đặt câu hỏi tình huống và chấm điểm 4 tiêu chí STAR theo thời gian thực để bạn không bị bỡ ngỡ!
            </p>

            {/* Simulated Interactive Video Screen Mockup */}
            <div
              className="tutorial-screen-mockup"
              onClick={() => setVideoModalOpen(true)}
              title="Nhấn để xem video hướng dẫn chi tiết"
            >
              {TUTORIAL_VIDEO_CONFIG.videoSrc && (
                <video
                  src={TUTORIAL_VIDEO_CONFIG.videoSrc}
                  className="mockup-bg-video"
                  muted
                  playsInline
                  autoPlay
                  loop
                />
              )}

              {/* Animated AI Waveform & Avatar */}
              <div className="mockup-ai-avatar-wrap">
                <div className="mockup-avatar-circle">
                  <Bot size={28} />
                </div>
                <div className="mockup-waveform">
                  <span className="wave-bar bar-1"></span>
                  <span className="wave-bar bar-2"></span>
                  <span className="wave-bar bar-3"></span>
                  <span className="wave-bar bar-4"></span>
                  <span className="wave-bar bar-5"></span>
                </div>
              </div>

              {/* Sample Subtitle Bubble */}
              <div className="mockup-subtitle-box">
                <span className="subtitle-speaker">🤖 AI Interviewer:</span>
                <span className="subtitle-text">
                  "Hãy mô tả một dự án khó khăn nhất bạn từng tối ưu hiệu năng?"
                </span>
              </div>

              {/* Glowing Glassmorphism Play Button */}
              <div className="mockup-play-overlay">
                <div className="mockup-play-btn">
                  <Play size={24} fill="#ffffff" />
                </div>
                <span className="mockup-play-text">Xem video hướng dẫn thực tế (▶)</span>
              </div>
            </div>

            <button
              type="button"
              className="tutorial-open-btn"
              onClick={() => setVideoModalOpen(true)}
            >
              <Play size={16} fill="currentColor" />
              <span>Xem video hướng dẫn tương tác</span>
            </button>
          </motion.div>

          {/* 2. STAR EVALUATION STANDARDS CARD */}
          <motion.div
            className="setup-star-rules-card"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="rules-header">
              <BookOpen size={18} color="#0284c7" />
              <h4>4 Tiêu chuẩn vàng đánh giá STAR</h4>
            </div>

            <div className="rules-grid">
              <div className="rule-item">
                <div className="rule-tag tag-st">S & T • Bối cảnh & Nhiệm vụ (30%)</div>
                <p>Nêu rõ quy mô dự án, mục tiêu cần đạt và khó khăn ban đầu bạn được giao.</p>
              </div>

              <div className="rule-item">
                <div className="rule-tag tag-ar">A & R • Hành động & Kết quả (70%)</div>
                <p>Trình bày các giải pháp kỹ thuật bạn tự làm và con số kết quả đo lường được (%, ms, ROI).</p>
              </div>
            </div>
          </motion.div>

          {/* 3. AI INTERVIEW ADVANTAGES PILL */}
          <motion.div
            className="setup-ai-perks-card"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="perk-item">
              <ShieldCheck size={18} color="#10b981" />
              <span>100% Bảo mật & Không phán xét</span>
            </div>
            <div className="perk-item">
              <Zap size={18} color="#0284c7" />
              <span>Nhận xét chấm điểm real-time</span>
            </div>
            <div className="perk-item">
              <TrendingUp size={18} color="#f59e0b" />
              <span>Nâng 40% cơ hội pass phỏng vấn</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===================================================================
          INTERACTIVE TUTORIAL VIDEO / SIMULATION MODAL
          =================================================================== */}
      <AnimatePresence>
        {videoModalOpen && (
          <div className="video-modal-backdrop" onClick={() => setVideoModalOpen(false)}>
            <motion.div
              className="video-modal-dialog"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="video-modal-header">
                <div className="modal-title-left">
                  <PlayCircle size={22} color="#38bdf8" />
                  <div>
                    <h3>Video mô phỏng: Cách AI phỏng vấn chuẩn STAR</h3>
                    <span className="modal-header-sub">Thời lượng: 01:15 • Hướng dẫn trải nghiệm phòng phỏng vấn</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="video-modal-close"
                  onClick={() => setVideoModalOpen(false)}
                  title="Đóng modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Video Player Stage (Supports Real Video or Simulated Demo) */}
              <div className="video-player-stage">
                {TUTORIAL_VIDEO_CONFIG.videoSrc ? (
                  <div className="real-video-player-container">
                    {TUTORIAL_VIDEO_CONFIG.videoType === 'youtube' ? (
                      <iframe
                        src={TUTORIAL_VIDEO_CONFIG.videoSrc}
                        title="HireMate AI Interview Tutorial Video"
                        className="tutorial-iframe"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={TUTORIAL_VIDEO_CONFIG.videoSrc}
                        controls
                        autoPlay
                        className="tutorial-video-tag"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    {/* Simulated Screen Header */}
                    <div className="stage-top-meta">
                      <div className="stage-live-badge">
                        <span className="live-dot"></span> LIVE DEMO SIMULATION
                      </div>
                      <div className="stage-timer">00:45 / 01:15</div>
                    </div>

                {/* Simulated Dialogue Progression */}
                <div className="stage-dialogue-arena">
                  {/* AI Message */}
                  <div className="stage-ai-card">
                    <div className="stage-ai-avatar">
                      <Bot size={22} />
                    </div>
                    <div className="stage-ai-content">
                      <span className="stage-speaker-name">HireMate AI Interviewer</span>
                      <p>
                        "Chào bạn Minh Anh! Trong buổi hôm nay, bạn hãy chia sẻ về một tình huống dự án gặp vấn đề hiệu năng và cách bạn đã giải quyết nó?"
                      </p>
                    </div>
                  </div>

                  {/* Candidate Speech Message */}
                  <div className="stage-user-card">
                    <div className="stage-user-content">
                      <span className="stage-speaker-name">Ứng viên (Voice / Text)</span>
                      <p>
                        "<strong>(Situation & Task)</strong> Trong dự án E-commerce, trang Checkout bị chậm 4.5s khi có 10,000 CCU. <strong>(Action)</strong> Tôi đã tối ưu query DB với Indexing, kích hoạt Redis Caching và nén hình ảnh CDN. <strong>(Result)</strong> Nhờ đó tốc độ giảm xuống 0.8s và giảm 99% lỗi timeout!"
                      </p>
                    </div>
                    <div className="stage-user-avatar">
                      <User size={22} />
                    </div>
                  </div>

                  {/* Live STAR Score Overlay */}
                  <div className="stage-live-score-overlay">
                    <div className="score-header">
                      <Sparkles size={14} />
                      <span>AI Real-time Scoring:</span>
                      <strong>92 / 100 Điểm (Xuất sắc)</strong>
                    </div>
                    <div className="score-breakdown-row">
                      <div className="score-pill s-pill">Situation: 88%</div>
                      <div className="score-pill t-pill">Task: 90%</div>
                      <div className="score-pill a-pill">Action: 96%</div>
                      <div className="score-pill r-pill">Result: 94%</div>
                    </div>
                  </div>
                </div>

                {/* Video Player Control Bar */}
                <div className="stage-controls-bar">
                  <button
                    type="button"
                    className="control-play-pause"
                    onClick={() => setIsPlayingMockVideo((prev) => !prev)}
                  >
                    {isPlayingMockVideo ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                  </button>

                  <div className="control-progress-track">
                    <div className="control-progress-fill" style={{ width: '60%' }}></div>
                  </div>

                  <div className="control-right-tools">
                    <Volume2 size={18} color="#94a3b8" />
                    <Maximize2 size={18} color="#94a3b8" />
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* 3 Golden Key Takeaways */}
              <div className="video-modal-takeaways">
                <h4>🎯 3 Bí quyết ghi điểm cao nhất trong phòng phỏng vấn:</h4>
                <div className="takeaways-grid">
                  <div className="takeaway-card">
                    <div className="takeaway-num">1</div>
                    <div>
                      <strong>Cấu trúc STAR rõ ràng</strong>
                      <p>Nêu ngắn gọn Bối cảnh (S) & Nhiệm vụ (T), dành 60% thời lượng cho Hành động (A).</p>
                    </div>
                  </div>

                  <div className="takeaway-card">
                    <div className="takeaway-num">2</div>
                    <div>
                      <strong>Dẫn chứng số liệu định lượng (R)</strong>
                      <p>Thay vì nói "làm rất tốt", hãy nêu: "Tăng 30% tốc độ, giảm 40% chi phí".</p>
                    </div>
                  </div>

                  <div className="takeaway-card">
                    <div className="takeaway-num">3</div>
                    <div>
                      <strong>Tự tin sử dụng Voice Mode</strong>
                      <p>Nói tự nhiên vào Micro, AI sẽ tự động phiên âm và phân tích chuẩn xác.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Action */}
              <div className="video-modal-footer">
                <button
                  type="button"
                  className="modal-finish-btn"
                  onClick={() => setVideoModalOpen(false)}
                >
                  <CheckCircle2 size={18} />
                  <span>Tôi đã hiểu rõ • Bắt đầu phỏng vấn ngay</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
