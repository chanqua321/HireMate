import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { interviewService } from '../../api/interview.service';
import {
  Award,
  RotateCcw,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Star,
  TrendingUp,
  BookOpen,
  Check,
  Target,
  Zap,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../../../../shared/components';
import { useConfetti } from '../../../../shared/hooks';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import './css/Feedback.css';

export const Feedback: React.FC = () => {
  const { lastResult } = useApp();
  const { triggerConfetti } = useConfetti();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [loading, setLoading] = useState<boolean>(Boolean(sessionId));
  const [sessionDetail, setSessionDetail] = useState<any>(null);

  useEffect(() => {
    if (sessionId && localStorage.getItem('hm_access_token')) {
      interviewService
        .getDetail(sessionId)
        .then((res) => {
          if (res.ok && res.data) {
            setSessionDetail(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    }
  }, [sessionId]);

  const defaultResult = {
    overall: 86,
    role: 'Lập trình viên Frontend',
    clarity: 88,
    subs: { S: 90, T: 86, A: 80, R: 92 },
    date: new Date().toLocaleDateString('vi-VN'),
  };

  const r = sessionDetail
    ? {
        overall: sessionDetail.overallScore || 85,
        role: sessionDetail.position || 'Lập trình viên',
        clarity: sessionDetail.clarityScore || 88,
        subs: {
          S: sessionDetail.scoreS || 88,
          T: sessionDetail.scoreT || 85,
          A: sessionDetail.scoreA || 82,
          R: sessionDetail.scoreR || 90,
        },
        date: sessionDetail.completedAt
          ? new Date(sessionDetail.completedAt).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
        feedbackSummary: sessionDetail.feedbackSummary,
      }
    : lastResult || defaultResult;

  useEffect(() => {
    if (r.overall >= 80) {
      triggerConfetti();
    }
  }, [r.overall, triggerConfetti]);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (r.overall / 100) * circumference;

  // In-depth STAR breakdown with explicit mistakes and improvement suggestions
  const starAnalysis = [
    {
      letter: 'S',
      title: 'Bối cảnh (Situation)',
      score: r.subs.S,
      strength: 'Nêu bật được quy mô hệ thống, thách thức về trải nghiệm người dùng và tính cấp bách của dự án.',
      mistake: 'Chưa xác định rõ mốc thời gian cụ thể diễn ra dự án và giới hạn tài nguyên ban đầu của nhóm.',
      advice: 'Mở đầu ngắn gọn bằng công thức: "Vào quý 3 năm ngoái, khi hệ thống của công ty đạt mốc 100.000 người dùng hàng ngày..."',
    },
    {
      letter: 'T',
      title: 'Nhiệm vụ (Task)',
      score: r.subs.T,
      strength: 'Xác định mục tiêu rõ ràng: Phải giảm thời gian tải trang dưới 1.5s và đạt chuẩn Core Web Vitals.',
      mistake: 'Dùng nhiều đại từ chung "Nhóm chúng tôi" thay vì phân định rành mạch trách nhiệm cá nhân.',
      advice: 'Nhấn mạnh vai trò độc lập: "Với tư cách là lập trình viên chính, trách nhiệm của tôi là tái cấu trúc luồng render..."',
    },
    {
      letter: 'A',
      title: 'Hành động (Action)',
      score: r.subs.A,
      strength: 'Trình bày logic các bước kỹ thuật: Áp dụng code-splitting, tối ưu bundle và lưu cache hiệu quả.',
      mistake: 'Chưa đào sâu vào cách xử lý khi gặp sự cố ngoài dự kiến (edge-cases) và cách phối hợp cùng đội ngũ Backend.',
      advice: 'Trình bày theo tiến trình 3 bước: Phân tích Profile hiệu năng → Thử nghiệm A/B Testing → Triển khai an toàn với Feature Flag.',
    },
    {
      letter: 'R',
      title: 'Kết quả (Result)',
      score: r.subs.R,
      strength: 'Đưa ra con số định lượng ấn tượng và thuyết phục: Tốc độ tải trang tăng 42% và Core Web Vitals đạt chuẩn xanh.',
      mistake: 'Chưa liên kết kết quả kỹ thuật với giá trị kinh doanh (như tỷ lệ giữ chân khách hàng hoặc doanh thu).',
      advice: 'Bổ sung câu kết: "Nhờ tối ưu này, tỷ lệ thoát trang giảm 15% và đóng góp trực tiếp vào mức tăng trưởng 8% doanh thu quý."',
    },
  ];

  return (
    <div className="feedback-page-container">
      {/* 3-Step Educational Progress Bar */}
      <InterviewStepper currentStep={3} />

      {/* Top Hero Evaluation Card */}
      <motion.div
        className="feedback-hero-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="hero-left-content">
          <div className="feedback-eyebrow">
            <Sparkles size={14} /> BÁO CÁO ĐÁNH GIÁ NĂNG LỰC STAR
          </div>
          <h1 className="feedback-hero-title">
            Phản hồi phỏng vấn — <span>{r.role}</span>
          </h1>
          <p className="feedback-hero-desc">
            Kết quả xuất sắc! Bạn thuộc <strong>Top 12%</strong> ứng viên thể hiện tốt nhất cấu trúc STAR chuẩn tuyển dụng quốc tế.
          </p>

          <div className="feedback-hero-actions">
            <Link to="/interview-setup" className="btn-report-primary">
              <RotateCcw size={17} /> Luyện tập lại
            </Link>
            <Link to="/dashboard" className="btn-report-ghost">
              <LayoutDashboard size={17} /> Bảng điều khiển
            </Link>
          </div>
        </div>

        {/* Circular Donut Ring Gauge */}
        <div className="hero-gauge-wrapper">
          <svg width="170" height="170" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth="12"
              fill="none"
            />
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#00c2ff"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>

          <div className="gauge-center-content">
            <span className="gauge-score-val">
              <AnimatedCounter value={r.overall} />
            </span>
            <span className="gauge-score-label">ĐIỂM STAR</span>
          </div>
        </div>
      </motion.div>

      {/* 1. In-depth STAR Mistakes & Breakdown */}
      <div className="report-section-heading">
        <h3>1. Phân tích chi tiết Điểm mạnh & Lỗi mắc phải theo thang STAR</h3>
        <span className="report-section-badge">Đánh giá chuyên sâu</span>
      </div>

      <div className="star-mistakes-grid">
        {starAnalysis.map((item, idx) => (
          <motion.div
            key={item.letter}
            className="star-analysis-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
          >
            <div className="star-analysis-header">
              <div className="star-letter-tag">
                <div className="star-badge-icon">{item.letter}</div>
                <h4 className="star-component-title">{item.title}</h4>
              </div>
              <span className={`star-score-pill ${item.score >= 85 ? 'good' : 'warn'}`}>
                {item.score}/100
              </span>
            </div>

            <div className="star-feedback-blocks">
              {/* Block 1: Strength */}
              <div className="feedback-sub-block strength">
                <div className="block-title-row">
                  <CheckCircle2 size={16} />
                  <span>Điểm mạnh ghi nhận</span>
                </div>
                <p className="block-desc">{item.strength}</p>
              </div>

              {/* Block 2: Mistake */}
              <div className="feedback-sub-block mistake">
                <div className="block-title-row">
                  <AlertTriangle size={16} />
                  <span>Lỗi / Điểm hạn chế</span>
                </div>
                <p className="block-desc">{item.mistake}</p>
              </div>

              {/* Block 3: Actionable Advice */}
              <div className="feedback-sub-block advice">
                <div className="block-title-row">
                  <Lightbulb size={16} />
                  <span>Cách khắc phục chuẩn STAR</span>
                </div>
                <p className="block-desc">{item.advice}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 2. Model High-Scoring STAR Answer Template */}
      <motion.div
        className="model-answer-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <div className="model-answer-header">
          <BookOpen size={20} />
          <span>Mẫu câu trả lời STAR điểm 10/10 để tham khảo</span>
        </div>
        <p className="model-answer-quote">
          "<strong>[Bối cảnh]</strong>: Trong quý 3/2025, ứng dụng thương mại điện tử của công ty đạt 150.000 DAU khiến thời gian tải trang tăng vọt lên 4.2s. 
          <strong> [Nhiệm vụ]</strong>: Tôi trực tiếp phụ trách việc tối ưu hoá kiến trúc Frontend và giảm thời gian tải xuống dưới 1.5s trong 4 tuần. 
          <strong> [Hành động]</strong>: Tôi đã cấu hình Vite code-splitting theo từng route, chuyển đổi tài sản sang định dạng WebP với lazy-loading, và thiết lập Service Worker caching chiến lược. 
          <strong> [Kết quả]</strong>: Thời gian tải trang giảm còn 1.1s (tăng 73% tốc độ), tỷ lệ rớt giỏ hàng giảm 18% và điểm Google Lighthouse đạt 98/100."
        </p>
      </motion.div>

      {/* 3. Component Score Breakdown Bars */}
      <div className="report-section-heading">
        <h3>3. Bảng điểm thành phần & Kỹ năng bổ trợ</h3>
        <span className="report-section-badge">Phân bổ chi tiết</span>
      </div>

      <motion.div
        className="breakdown-bars-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
      >
        {[
          { name: 'Bối cảnh (Situation - S)', val: r.subs.S, color: '#03bfff' },
          { name: 'Nhiệm vụ (Task - T)', val: r.subs.T, color: '#5b6bff' },
          { name: 'Hành động (Action - A)', val: r.subs.A, color: '#10b981' },
          { name: 'Kết quả (Result - R)', val: r.subs.R, color: '#f59e0b' },
          { name: 'Sự rõ ràng & Mạch lạc (Clarity)', val: r.clarity, color: '#ec4899' },
          { name: 'Độ sâu kỹ thuật & Số liệu định lượng', val: 92, color: '#06b6d4' },
        ].map((bar, idx) => (
          <div key={idx} className="score-bar-row">
            <span className="score-bar-label">{bar.name}</span>
            <div className="score-bar-track">
              <motion.div
                className="score-bar-fill"
                style={{ background: bar.color }}
                initial={{ width: 0 }}
                animate={{ width: `${bar.val}%` }}
                transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.08 }}
              />
            </div>
            <span className="score-bar-value">{bar.val}/100</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
