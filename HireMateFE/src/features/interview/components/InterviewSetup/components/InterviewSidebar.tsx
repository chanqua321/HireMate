import React from 'react';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  Play,
  Bot,
  BookOpen,
  ShieldCheck,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { TutorialVideoConfig } from './InterviewTutorialModal';

interface InterviewSidebarProps {
  videoConfig: TutorialVideoConfig;
  onOpenVideoModal: () => void;
}

export const InterviewSidebar: React.FC<InterviewSidebarProps> = ({
  videoConfig,
  onOpenVideoModal,
}) => {
  return (
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
          onClick={onOpenVideoModal}
          title="Nhấn để xem video hướng dẫn chi tiết"
        >
          {videoConfig.videoSrc && (
            <video
              src={videoConfig.videoSrc}
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
          onClick={onOpenVideoModal}
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
  );
};
