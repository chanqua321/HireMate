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
        overall: sessionDetail.overallScore ?? (lastResult?.overall ?? 25),
        role: sessionDetail.position || lastResult?.role || 'Lập trình viên',
        clarity: sessionDetail.clarityScore ?? 30,
        subs: {
          S: sessionDetail.scoreS ?? 25,
          T: sessionDetail.scoreT ?? 25,
          A: sessionDetail.scoreA ?? 25,
          R: sessionDetail.scoreR ?? 25,
        },
        date: sessionDetail.completedAt
          ? new Date(sessionDetail.completedAt).toLocaleDateString('vi-VN')
          : new Date().toLocaleDateString('vi-VN'),
        feedbackSummary: sessionDetail.feedbackSummary,
      }
    : lastResult || defaultResult;

  useEffect(() => {
    if (r.overall >= 75) {
      triggerConfetti();
    }
  }, [r.overall, triggerConfetti]);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (r.overall / 100) * circumference;

  // In-depth STAR breakdown with dynamic feedback adapting to user's real scores
  const getAnalysis = (dim: 'S' | 'T' | 'A' | 'R', score: number) => {
    if (score < 50) {
      switch (dim) {
        case 'S':
          return {
            title: 'Bối cảnh (Situation)',
            strength: 'Đã nhận biết được câu hỏi phỏng vấn.',
            mistake: 'Chưa mô tả được bối cảnh thực tế hoặc câu trả lời bị bỏ qua.',
            advice: 'Nêu rõ dự án hoặc công việc cụ thể: thời gian, quy mô công ty, công nghệ sử dụng.',
          };
        case 'T':
          return {
            title: 'Nhiệm vụ (Task)',
            strength: 'Cần xác định rõ trọng tâm nhiệm vụ.',
            mistake: 'Chưa nêu được mục tiêu hoặc KPI cá nhân cần giải quyết.',
            advice: 'Nêu rõ trách nhiệm cá nhân: Bạn được giao bài toán gì, thời hạn bao lâu.',
          };
        case 'A':
          return {
            title: 'Hành động (Action)',
            strength: 'Cần đào sâu vào hành động thực thi.',
            mistake: 'Thiếu các bước kỹ thuật hoặc hành động cụ thể bạn trực tiếp làm.',
            advice: 'Liệt kê 3 hành động cụ thể bạn đã triển khai theo thứ tự ưu tiên.',
          };
        case 'R':
          return {
            title: 'Kết quả (Result)',
            strength: 'Cần có số liệu đo lường đầu ra.',
            mistake: 'Chưa có kết quả hoặc bài học kinh nghiệm sau tình huống.',
            advice: 'Đưa ra con số cụ thể: % cải thiện, thời gian tiết kiệm, phản hồi của khách hàng.',
          };
      }
    }
    // Good scores >= 50
    switch (dim) {
      case 'S':
        return {
          title: 'Bối cảnh (Situation)',
          strength: 'Nêu bật được quy mô hệ thống, thách thức về trải nghiệm người dùng và tính cấp bách của dự án.',
          mistake: 'Có thể xác định rõ hơn mốc thời gian cụ thể diễn ra dự án và giới hạn tài nguyên ban đầu.',
          advice: 'Mở đầu ngắn gọn bằng công thức: "Vào quý 3 năm ngoái, khi hệ thống của công ty đạt mốc..."',
        };
      case 'T':
        return {
          title: 'Nhiệm vụ (Task)',
          strength: 'Xác định mục tiêu rõ ràng và phân định rành mạch trách nhiệm cá nhân.',
          mistake: 'Đôi khi dùng đại từ chung "Nhóm chúng tôi" thay vì nhấn mạnh phần bạn độc lập phụ trách.',
          advice: 'Nhấn mạnh vai trò độc lập: "Với tư cách là người chịu trách nhiệm chính, nhiệm vụ của tôi là..."',
        };
      case 'A':
        return {
          title: 'Hành động (Action)',
          strength: 'Trình bày logic các bước kỹ thuật và giải pháp xử lý vấn đề hiệu quả.',
          mistake: 'Cần đào sâu thêm cách xử lý các trường hợp ngoại lệ (edge-cases).',
          advice: 'Trình bày theo tiến trình 3 bước: Phân tích nguyên nhân → Thử nghiệm giải pháp → Triển khai an toàn.',
        };
      case 'R':
        return {
          title: 'Kết quả (Result)',
          strength: 'Đưa ra con số định lượng thuyết phục và minh chứng rõ ràng cho hiệu quả công việc.',
          mistake: 'Có thể liên kết kết quả kỹ thuật chặt chẽ hơn với giá trị kinh doanh của tổ chức.',
          advice: 'Bổ sung câu kết: "Nhờ giải pháp này, hiệu năng tăng 30% và cải thiện trực tiếp trải nghiệm người dùng."',
        };
    }
  };

  const starAnalysis = [
    { letter: 'S', score: r.subs.S, ...getAnalysis('S', r.subs.S) },
    { letter: 'T', score: r.subs.T, ...getAnalysis('T', r.subs.T) },
    { letter: 'A', score: r.subs.A, ...getAnalysis('A', r.subs.A) },
    { letter: 'R', score: r.subs.R, ...getAnalysis('R', r.subs.R) },
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
            {r.overall >= 80
              ? 'Kết quả xuất sắc! Bạn thuộc Top 15% ứng viên thể hiện tốt nhất cấu trúc STAR chuẩn tuyển dụng quốc tế.'
              : r.overall >= 60
              ? 'Kết quả khá tốt! Bạn đã nắm được cấu trúc phỏng vấn, hãy bổ sung thêm các số liệu định lượng để đạt điểm cao hơn.'
              : 'Điểm đánh giá còn thấp hoặc bạn chưa hoàn thành đầy đủ câu trả lời. Hãy luyện tập lại và nhập câu trả lời chi tiết theo phương pháp STAR!'}
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
