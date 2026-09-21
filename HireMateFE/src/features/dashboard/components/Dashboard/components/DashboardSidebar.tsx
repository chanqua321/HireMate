import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Lightbulb } from 'lucide-react';
import './DashboardSidebar.css';

interface DashboardSidebarProps {
  readinessScore: number;
  totalInterviews: number;
  skillsCount: number;
  onNavigateInterview?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  readinessScore,
  totalInterviews,
  skillsCount,
  onNavigateInterview,
}) => {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const validScore = Math.max(0, Math.min(100, Math.round(readinessScore || 0)));
  const strokeDashoffset = circumference - (validScore / 100) * circumference;

  const renderReadinessSummary = () => {
    if (validScore >= 85) {
      return (
        <>
          Bạn đang nằm trong <strong>Top 10%</strong> ứng viên sẵn sàng phỏng vấn xuất sắc tuần này.
        </>
      );
    }
    if (validScore >= 70) {
      return (
        <>
          Bạn đang nằm trong <strong>Top 25%</strong> ứng viên có hồ sơ và kỹ năng tốt.
        </>
      );
    }
    if (validScore >= 50) {
      return (
        <>
          Bạn đang nằm trong <strong>Top 45%</strong> ứng viên có tiềm năng phát triển.
        </>
      );
    }
    if (validScore > 0) {
      return (
        <>
          Hồ sơ của bạn đã được ghi nhận. Luyện phỏng vấn cùng AI để nâng cao thứ hạng!
        </>
      );
    }
    return (
      <>
        Chưa có đánh giá điểm. Hãy tải CV và bắt đầu buổi phỏng vấn đầu tiên nhé!
      </>
    );
  };

  return (
    <div className="right-column-stack">
      {/* 1. Career Readiness Card */}
      <motion.div
        className="career-readiness-card"
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <div className="readiness-label">Career Readiness</div>

        {/* Donut Progress Gauge */}
        <div className="donut-gauge-wrapper">
          <svg className="donut-gauge-svg" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#03bfff" />
              </linearGradient>
            </defs>
            <circle
              className="donut-gauge-track"
              cx="70"
              cy="70"
              r={radius}
            />
            <circle
              className="donut-gauge-progress"
              cx="70"
              cy="70"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="donut-gauge-center">
            <span className="donut-score-number">{validScore}</span>
            <span className="donut-score-max">of 100</span>
          </div>
        </div>

        <p className="readiness-summary-text">
          {renderReadinessSummary()}
        </p>

        {onNavigateInterview ? (
          <button type="button" className="improve-score-btn" onClick={onNavigateInterview}>
            Luyện phỏng vấn nâng điểm
          </button>
        ) : (
          <Link to="/interview-setup" className="improve-score-btn">
            Luyện phỏng vấn nâng điểm
          </Link>
        )}
      </motion.div>

      {/* 2. HireMate AI Coach Card */}
      <motion.div
        className="ai-coach-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.26 }}
      >
        <div className="coach-top-row">
          <div className="coach-badge">
            <Bot size={18} />
            <span>HireMate AI Coach</span>
          </div>
          <div className="coach-lightbulb">
            <Lightbulb size={20} />
          </div>
        </div>

        <h3 className="coach-heading">Làm chủ phương pháp STAR</h3>
        <p className="coach-quote">
          "Khi trả lời câu hỏi tình huống, hãy áp dụng Situation, Task, Action, và Result. Cố gắng dành 60% thời lượng cho phần Action cụ thể của bản thân."
        </p>
      </motion.div>

      {/* 3. Metric Tiles Row */}
      <motion.div
        className="metric-tiles-row"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.32 }}
      >
        <div className="metric-tile">
          <span className="metric-tile-label">Buổi phỏng vấn</span>
          <span className="metric-tile-value">{totalInterviews}</span>
        </div>
        <div className="metric-tile">
          <span className="metric-tile-label">Kỹ năng mục tiêu</span>
          <span className="metric-tile-value">{skillsCount}</span>
        </div>
      </motion.div>
    </div>
  );
};
