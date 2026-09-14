import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  Quote,
  Lightbulb,
  ArrowRight,
  Target,
  Zap,
  Award,
  ChevronDown,
} from 'lucide-react';

interface StarStepData {
  letter: 'S' | 'T' | 'A' | 'R';
  name: string;
  viName: string;
  tagline: string;
  desc: string;
  exampleQuote: string;
  scoreTarget: string;
  color: string;
  lightBg: string;
  borderColor: string;
  gradient: string;
  insight: string;
  weight: string;
}

const STAR_STEPS: StarStepData[] = [
  {
    letter: 'S',
    name: 'Situation',
    viName: 'Bối Cảnh Dự Án',
    tagline: 'Quy mô bài toán & Tính cấp thiết',
    desc: 'Mô tả rõ ràng ngữ cảnh xuất phát: quy mô người dùng thực tế (DAU/MAU), áp lực tiến độ hoặc sự cố khẩn cấp doanh nghiệp đang đối mặt.',
    exampleQuote:
      '"Hệ thống E-commerce đạt 150.000 người dùng hoạt động/ngày khiến thời gian tải trang chạm ngưỡng 4.2s vào giờ cao điểm..."',
    scoreTarget: '92/100',
    color: '#0284c7',
    lightBg: '#f0f9ff',
    borderColor: '#bae6fd',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #03bfff 100%)',
    insight: 'Nhà tuyển dụng muốn thấy bạn hiểu bức tranh toàn cảnh (Big Picture) của doanh nghiệp.',
    weight: 'Trọng số 25%',
  },
  {
    letter: 'T',
    name: 'Task',
    viName: 'Nhiệm Vụ Cá Nhân',
    tagline: 'Mục tiêu định lượng & Trách nhiệm',
    desc: 'Xác định chính xác trọng trách của riêng bạn trong tập thể: KPI số liệu, deadline hạn định và các giới hạn tài nguyên được giao phó.',
    exampleQuote:
      '"Tôi nhận trách nhiệm độc lập tối ưu thời gian tải trang về dưới 1.5s trong vòng 4 tuần trước đợt Mega Sale quý 3..."',
    scoreTarget: '88/100',
    color: '#8b5cf6',
    lightBg: '#faf5ff',
    borderColor: '#e9d5ff',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    insight: 'Tránh nói chung chung "chúng tôi", làm nổi bật vai trò quyết định của cá nhân bạn.',
    weight: 'Trọng số 25%',
  },
  {
    letter: 'A',
    name: 'Action',
    viName: 'Hành Động & Kỹ Thuật',
    tagline: 'Giải pháp chuyên sâu & Quyết định',
    desc: 'Trọng tâm quyết định đậu hay rớt: Giải thích chi tiết các giải pháp kỹ thuật, công nghệ áp dụng và cách bạn vượt qua trở ngại kỹ thuật.',
    exampleQuote:
      '"Tôi áp dụng Vite route-based code-splitting, nén asset WebP tự động và cài đặt Service Worker cache dữ liệu..."',
    scoreTarget: '96/100',
    color: '#059669',
    lightBg: '#f0fdf4',
    borderColor: '#bbf7d0',
    gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    insight: 'Chiếm 50% thời lượng trả lời. Chứng minh năng lực chuyên môn và tư duy xử lý vấn đề.',
    weight: 'Trọng số 25%',
  },
  {
    letter: 'R',
    name: 'Result',
    viName: 'Kết Quả & Số Liệu %',
    tagline: 'Tác động kinh doanh & Giá trị thực',
    desc: 'Chốt hạ câu trả lời bằng số liệu chứng minh không thể chối cãi: % tăng tốc hiệu năng, % giảm giỏ hàng bỏ rơi, doanh thu quy đổi.',
    exampleQuote:
      '"Tốc độ tải trang đạt 1.1s (tăng 73%), tỷ lệ bỏ giỏ hàng giảm 18% và tiết kiệm 30% chi phí băng thông máy chủ."',
    scoreTarget: '95/100',
    color: '#d97706',
    lightBg: '#fffbeb',
    borderColor: '#fde68a',
    gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
    insight: 'Nhà tuyển dụng luôn ghi nhớ con số % và giá trị kinh doanh cuối cùng bạn mang lại.',
    weight: 'Trọng số 25%',
  },
];

export const PinnedStarScrollSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progressRatio, setProgressRatio] = useState(0);

  // Sync scroll position with the pinned 4-step sequence
  const updateScrollProgress = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const headerHeight = 68;
    const frameHeight = window.innerHeight - headerHeight;
    const totalScrollableDistance = rect.height - frameHeight;

    if (totalScrollableDistance <= 0) return;

    // The scroll offset relative to when the container hits the top (under the 68px header)
    const scrolledPastTop = headerHeight - rect.top;
    const ratio = Math.max(0, Math.min(1, scrolledPastTop / totalScrollableDistance));

    setProgressRatio(ratio);

    if (ratio < 0.25) {
      setActiveStepIndex(0);
    } else if (ratio >= 0.25 && ratio < 0.5) {
      setActiveStepIndex(1);
    } else if (ratio >= 0.5 && ratio < 0.75) {
      setActiveStepIndex(2);
    } else {
      setActiveStepIndex(3);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    window.addEventListener('resize', updateScrollProgress, { passive: true });
    updateScrollProgress();

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      window.removeEventListener('resize', updateScrollProgress);
    };
  }, [updateScrollProgress]);

  // Click to jump to a specific step
  const handleStepClick = (index: number) => {
    setActiveStepIndex(index);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const headerHeight = 68;
    const frameHeight = window.innerHeight - headerHeight;
    const totalScrollableDistance = rect.height - frameHeight;

    if (totalScrollableDistance > 0) {
      const stepTargetScroll =
        window.scrollY +
        rect.top -
        headerHeight +
        (index / 4) * totalScrollableDistance +
        20;
      window.scrollTo({ top: stepTargetScroll, behavior: 'smooth' });
    }
  };

  const activeStep = STAR_STEPS[activeStepIndex];

  return (
    <div ref={containerRef} className="hm-pinned-star-section-outer">
      {/* Sticky Viewport Frame - Pinned on screen during scroll */}
      <div className="hm-pinned-sticky-frame">
        <div className="hm-container hm-pinned-content-grid">
          {/* Left Column: Heading, Context & Interactive Step Nav */}
          <div className="hm-pinned-left-col">
            <div className="hm-pinned-badge">
              <Sparkles size={16} color="#0284c7" />
              <span>Khung Phương Pháp STAR Độc Quyền</span>
            </div>

            <h2 className="hm-pinned-title">
              Chinh phục <span className="hm-gradient-text">4 Trụ Cột</span> Phỏng Vấn
            </h2>

            <p className="hm-pinned-subtitle">
              Cuộn chuột để trải nghiệm từng bước bóc tách câu trả lời chuẩn quốc tế. Màn hình được giữ
              cố định giúp bạn tập trung nắm vững từng mắt xích quan trọng.
            </p>

            {/* Interactive Step Navigator (Also Clickable) */}
            <div className="hm-star-step-nav-list">
              {STAR_STEPS.map((step, idx) => {
                const isActive = idx === activeStepIndex;
                const isPassed = idx < activeStepIndex;

                return (
                  <div
                    key={step.letter}
                    className={`hm-star-nav-item ${isActive ? 'active' : ''} ${
                      isPassed ? 'passed' : ''
                    }`}
                    style={{
                      borderColor: isActive ? step.color : '#e2e8f0',
                      background: isActive ? step.lightBg : '#ffffff',
                    }}
                    onClick={() => handleStepClick(idx)}
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      className="hm-nav-letter-pill"
                      style={{
                        background: isActive || isPassed ? step.gradient : '#f1f5f9',
                        color: isActive || isPassed ? '#ffffff' : '#64748b',
                      }}
                    >
                      {step.letter}
                    </div>

                    <div className="hm-nav-text-block">
                      <div
                        className="hm-nav-step-name"
                        style={{ color: isActive ? step.color : '#0f172a' }}
                      >
                        {step.letter} - {step.name} ({step.viName})
                      </div>
                      <div className="hm-nav-step-tagline">{step.tagline}</div>
                    </div>

                    {isActive && (
                      <motion.div
                        className="hm-nav-active-indicator"
                        layoutId="activeStarNavIndicator"
                        style={{ background: step.color }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scroll Progress & Hint */}
            <div className="hm-pinned-scroll-hint">
              <div className="scroll-hint-bar-wrap">
                <div
                  className="scroll-hint-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
                    transition: 'width 0.15s ease-out',
                  }}
                />
              </div>
              <div className="scroll-hint-text-row">
                <span>
                  {activeStepIndex === 3
                    ? 'Đã xem hết 4 bước • Cuộn tiếp để vào Sandbox'
                    : `Cuộn tiếp để xem bước ${activeStepIndex + 2} (${activeStepIndex + 1}/4)`}
                </span>
                <ChevronDown size={16} color="#0284c7" />
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Active STAR Spotlight Showcase Card */}
          <div className="hm-pinned-right-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep.letter}
                className="hm-star-showcase-card"
                style={{
                  background: '#ffffff',
                  borderColor: activeStep.borderColor,
                }}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Card Top Header */}
                <div className="showcase-card-header">
                  <div className="showcase-badge-wrap">
                    <div
                      className="showcase-letter-icon"
                      style={{ background: activeStep.gradient }}
                    >
                      {activeStep.letter}
                    </div>
                    <div>
                      <h3 className="showcase-title">{activeStep.name}</h3>
                      <span className="showcase-vi-subtitle">{activeStep.viName}</span>
                    </div>
                  </div>

                  <div
                    className="showcase-score-chip"
                    style={{
                      color: activeStep.color,
                      background: activeStep.lightBg,
                      borderColor: activeStep.borderColor,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Mục tiêu: {activeStep.scoreTarget}</span>
                  </div>
                </div>

                {/* Tagline & Description */}
                <div className="showcase-tagline" style={{ color: activeStep.color }}>
                  {activeStep.tagline}
                </div>

                <p className="showcase-desc">{activeStep.desc}</p>

                {/* Real-world Example Box */}
                <div
                  className="showcase-example-box"
                  style={{
                    background: activeStep.lightBg,
                    borderLeftColor: activeStep.color,
                  }}
                >
                  <div className="showcase-example-label" style={{ color: activeStep.color }}>
                    <Quote size={14} />
                    <span>Ví dụ câu trả lời đạt chuẩn 10/10:</span>
                  </div>
                  <p className="showcase-example-text">{activeStep.exampleQuote}</p>
                </div>

                {/* Recruiter Insight Box */}
                <div className="showcase-insight-row">
                  <div
                    className="insight-icon-wrap"
                    style={{ background: activeStep.lightBg, color: activeStep.color }}
                  >
                    <Lightbulb size={18} />
                  </div>
                  <div className="insight-text-wrap">
                    <strong style={{ color: '#0f172a' }}>Góc nhìn Nhà Tuyển Dụng:</strong>
                    <span>{activeStep.insight}</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="showcase-footer">
                  <span
                    className="showcase-weight-tag"
                    style={{ color: activeStep.color, background: activeStep.lightBg }}
                  >
                    {activeStep.weight}
                  </span>
                  <span className="showcase-progress-indicator">
                    Bước {activeStepIndex + 1} / 4
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
