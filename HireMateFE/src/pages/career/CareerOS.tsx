import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Award,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  BrainCircuit,
  Sparkles,
  Target,
  ExternalLink,
  ChevronRight,
  Layers,
  Zap,
} from 'lucide-react';
import { careerService } from '../../shared/services/career.service';
import { useApp } from '../../app/context/AppContext';
import { Link } from 'react-router-dom';
import './css/CareerOS.css';

// Fallback Mock Data if user is brand new
const fallbackProgress = {
  readinessScore: 78,
  breakdown: {
    interviewScore: 82, // 50%
    cvScore: 75,        // 25%
    roleMatchScore: 72, // 25%
  },
  targetRole: 'Senior Frontend Engineer',
  completedMilestones: 8,
  totalMilestones: 12,
};

const fallbackPath = [
  {
    phase: 'Giai đoạn 1: Nền tảng vững chắc',
    status: 'completed',
    items: [
      { title: 'Tối ưu CV chuẩn ATS với AI Score > 80', done: true },
      { title: 'Hoàn thành 3 buổi phỏng vấn AI Javascript Core & React', done: true },
      { title: 'Đạt điểm STAR trung bình >= 7.5', done: true },
    ],
  },
  {
    phase: 'Giai đoạn 2: Tăng tốc chuyên môn',
    status: 'in_progress',
    items: [
      { title: 'Luyện tập trả lời Behavioral STAR về giải quyết xung đột', done: true },
      { title: 'Phỏng vấn System Design & State Management quy mô lớn', done: false },
      { title: 'Tối ưu hiệu năng Web Vitals & Micro-frontend', done: false },
    ],
  },
  {
    phase: 'Giai đoạn 3: Chinh phục vị trí Lead / Staff',
    status: 'upcoming',
    items: [
      { title: 'Mock interview với Giám khảo AI Senior Bar Raiser', done: false },
      { title: 'Thiết kế kiến trúc hệ thống chịu tải 100K RPS', done: false },
      { title: 'Đàm phán đãi ngộ và Offer Benchmark', done: false },
    ],
  },
];

const fallbackMemory = {
  strengths: [
    'Nắm rất chắc tư duy Component lifecycle & Hooks nâng cao trong React',
    'Cấu trúc câu trả lời STAR rõ ràng, mạch lạc, nêu bật được vai trò cá nhân',
    'Khả năng tối ưu Bundle size và xử lý Memoization hiệu quả',
  ],
  improvements: [
    'Cần bổ sung thêm số liệu định lượng (metrics) cụ thể cho phần Result (R)',
    'Cần tự tin hơn khi giải thích các chiến lược Caching cấp hạ tầng CDN/Redis',
    'Cần đào sâu thêm về Accessibility (a11y) và Security (XSS/CSRF)',
  ],
};

const fallbackLearning = [
  {
    id: '1',
    title: 'React 19 & Next.js 15 Deep Dive',
    category: 'Frontend Core',
    duration: '6 giờ học',
    level: 'Advanced',
    url: 'https://react.dev',
    matchPct: 96,
  },
  {
    id: '2',
    title: 'System Design for Frontend Engineers',
    category: 'Architecture',
    duration: '8 giờ học',
    level: 'Intermediate',
    url: 'https://github.com/donnemartin/system-design-primer',
    matchPct: 91,
  },
  {
    id: '3',
    title: 'Nghệ thuật đàm phán Offer Tech 2026',
    category: 'Soft Skill',
    duration: '2.5 giờ học',
    level: 'All levels',
    url: '/blog/dam-phan-luong-it',
    matchPct: 88,
  },
];

export const CareerOS: React.FC = () => {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'path' | 'memory' | 'learning'>('overview');
  const [progress, setProgress] = useState(fallbackProgress);
  const [path, setPath] = useState(fallbackPath);
  const [memory, setMemory] = useState(fallbackMemory);
  const [learning, setLearning] = useState(fallbackLearning);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCareerData = async () => {
      setLoading(true);
      try {
        const [progRes, pathRes, memRes, learnRes] = await Promise.allSettled([
          careerService.getProgress(),
          careerService.getPath(),
          careerService.getMemory(),
          careerService.getLearning(),
        ]);

        if (progRes.status === 'fulfilled' && progRes.value?.ok && progRes.value.data) {
          const d = progRes.value.data;
          setProgress({
            readinessScore: d.readinessScore || d.score || fallbackProgress.readinessScore,
            breakdown: {
              interviewScore: d.interviewScore || fallbackProgress.breakdown.interviewScore,
              cvScore: d.cvScore || fallbackProgress.breakdown.cvScore,
              roleMatchScore: d.roleMatchScore || fallbackProgress.breakdown.roleMatchScore,
            },
            targetRole: d.targetRole || profile.role || fallbackProgress.targetRole,
            completedMilestones: d.completedMilestones || fallbackProgress.completedMilestones,
            totalMilestones: d.totalMilestones || fallbackProgress.totalMilestones,
          });
        }

        if (pathRes.status === 'fulfilled' && pathRes.value?.ok && pathRes.value.data?.length) {
          setPath(pathRes.value.data);
        }

        if (memRes.status === 'fulfilled' && memRes.value?.ok && memRes.value.data) {
          const m = memRes.value.data;
          if (m.strengths?.length || m.improvements?.length) {
            setMemory({
              strengths: m.strengths || fallbackMemory.strengths,
              improvements: m.improvements || fallbackMemory.improvements,
            });
          }
        }

        if (learnRes.status === 'fulfilled' && learnRes.value?.ok && learnRes.value.data?.length) {
          setLearning(learnRes.value.data);
        }
      } catch (err) {
        console.warn('Career OS API data fallback applied:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCareerData();
  }, [profile.role]);

  return (
    <div className="career-os-container">
      {/* Hero Header */}
      <div className="career-hero">
        <div className="career-hero-badge">
          <Sparkles size={15} color="#03bffd" />
          <span>Hệ Điều Hành Sự Nghiệp Cá Nhân Hóa (Career OS)</span>
        </div>
        <h1 className="career-hero-title">
          Định hướng lộ trình, phát triển kỹ năng và tăng tốc sự nghiệp cùng <span className="highlight-ai">HireMate AI</span>
        </h1>
        <p className="career-hero-desc">
          Career OS tích hợp toàn bộ dữ liệu từ các phiên phỏng vấn, hồ sơ CV và mục tiêu nghề nghiệp của bạn để vẽ nên bức tranh năng lực chuẩn xác nhất.
        </p>

        {/* Top KPI Card */}
        <div className="career-kpi-banner">
          <div className="career-score-circle-wrap">
            <svg className="career-score-svg" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" className="career-score-bg-circle" />
              <circle
                cx="60"
                cy="60"
                r="50"
                className="career-score-fill-circle"
                strokeDasharray={`${(progress.readinessScore / 100) * 314} 314`}
              />
            </svg>
            <div className="career-score-number">
              <span className="score-val">{progress.readinessScore}</span>
              <span className="score-lbl">/ 100</span>
            </div>
          </div>

          <div className="career-kpi-info">
            <div className="career-kpi-badge-role">
              <Target size={14} /> Mục tiêu: {progress.targetRole}
            </div>
            <h3 className="career-kpi-title">Chỉ số Sẵn Sàng Nghề Nghiệp (Career Readiness Score)</h3>
            <p className="career-kpi-sub">
              Bạn đã hoàn thành <strong>{progress.completedMilestones}/{progress.totalMilestones}</strong> chặng phát triển quan trọng để sẵn sàng nhận offer mơ ước.
            </p>

            {/* Sub metrics */}
            <div className="career-submetrics-grid">
              <div className="submetric-item">
                <span className="submetric-label">Phỏng vấn STAR (50%)</span>
                <div className="submetric-bar-wrap">
                  <div className="submetric-bar" style={{ width: `${progress.breakdown.interviewScore}%` }} />
                </div>
                <span className="submetric-val">{progress.breakdown.interviewScore}%</span>
              </div>
              <div className="submetric-item">
                <span className="submetric-label">Hồ sơ & CV ATS (25%)</span>
                <div className="submetric-bar-wrap">
                  <div className="submetric-bar cyan" style={{ width: `${progress.breakdown.cvScore}%` }} />
                </div>
                <span className="submetric-val">{progress.breakdown.cvScore}%</span>
              </div>
              <div className="submetric-item">
                <span className="submetric-label">Độ tương thích JD (25%)</span>
                <div className="submetric-bar-wrap">
                  <div className="submetric-bar purple" style={{ width: `${progress.breakdown.roleMatchScore}%` }} />
                </div>
                <span className="submetric-val">{progress.breakdown.roleMatchScore}%</span>
              </div>
            </div>
          </div>

          <div className="career-kpi-action">
            <Link to="/interview-setup" className="career-btn-cta">
              <Zap size={16} /> Luyện phỏng vấn ngay
            </Link>
            <Link to="/dashboard?tab=scan" className="career-btn-sec">
              Tối ưu CV lại
            </Link>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="career-tabs-bar">
        <button
          className={`career-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Compass size={16} /> Tổng quan lộ trình
        </button>
        <button
          className={`career-tab-btn ${activeTab === 'path' ? 'active' : ''}`}
          onClick={() => setActiveTab('path')}
        >
          <TrendingUp size={16} /> Chi tiết chặng phát triển
        </button>
        <button
          className={`career-tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
        >
          <BrainCircuit size={16} /> Bộ nhớ AI Memory
        </button>
        <button
          className={`career-tab-btn ${activeTab === 'learning' ? 'active' : ''}`}
          onClick={() => setActiveTab('learning')}
        >
          <BookOpen size={16} /> Khóa học & Tài nguyên ({learning.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="career-tab-body">
        {activeTab === 'overview' && (
          <div className="career-overview-grid">
            {/* Left: Next Milestones */}
            <div className="career-card-glass">
              <div className="card-glass-header">
                <h3 className="card-glass-title">
                  <Layers size={18} color="#03bffd" /> Các bước tiếp theo cần thực hiện
                </h3>
                <span className="badge-pill">Ưu tiên cao</span>
              </div>
              <div className="milestones-timeline">
                {path.map((phase, idx) => (
                  <div key={idx} className={`timeline-phase-block ${phase.status}`}>
                    <div className="phase-marker">
                      <span className="phase-number">{idx + 1}</span>
                    </div>
                    <div className="phase-details">
                      <h4 className="phase-title">{phase.phase}</h4>
                      <div className="phase-tasks-list">
                        {phase.items.map((item, itemIdx) => (
                          <div key={itemIdx} className={`task-row ${item.done ? 'done' : ''}`}>
                            <div className="task-checkbox">
                              {item.done ? <CheckCircle2 size={16} color="#10b981" /> : <Clock size={16} color="#94a3b8" />}
                            </div>
                            <span className="task-text">{item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Memory Snapshot */}
            <div className="career-card-glass">
              <div className="card-glass-header">
                <h3 className="card-glass-title">
                  <BrainCircuit size={18} color="#6366f1" /> Bộ nhớ AI Memory (Insights)
                </h3>
                <span className="badge-pill purple">Cập nhật tự động</span>
              </div>
              <p className="card-glass-desc">
                AI tự động học hỏi phong cách nói, cấu trúc trả lời và các kỹ năng bạn thể hiện qua từng buổi phỏng vấn.
              </p>

              <div className="memory-box strength">
                <h5 className="memory-box-title">💪 Thế mạnh nổi bật của bạn:</h5>
                <ul>
                  {memory.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="memory-box improvement">
                <h5 className="memory-box-title">🎯 Cần bứt phá & cải thiện:</h5>
                <ul>
                  {memory.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>

              <div className="career-memory-footer">
                <Link to="/interview-setup" className="link-inline">
                  Tạo buổi phỏng vấn mới để AI cập nhật thêm <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'path' && (
          <div className="career-card-glass">
            <div className="card-glass-header">
              <h3 className="card-glass-title">
                <TrendingUp size={18} color="#03bffd" /> Lộ Trình AI Cá Nhân Hóa (Career Roadmap)
              </h3>
            </div>
            <div className="roadmap-full-cards">
              {path.map((phase, idx) => (
                <div key={idx} className={`roadmap-phase-card ${phase.status}`}>
                  <div className="phase-card-top">
                    <span className="phase-tag">Chặng {idx + 1}</span>
                    <span className={`status-pill ${phase.status}`}>
                      {phase.status === 'completed' ? 'Đã hoàn thành' : (phase.status === 'in_progress' ? 'Đang thực hiện' : 'Chưa bắt đầu')}
                    </span>
                  </div>
                  <h4 className="roadmap-phase-name">{phase.phase}</h4>
                  <div className="roadmap-tasks-grid">
                    {phase.items.map((item, itemIdx) => (
                      <div key={itemIdx} className={`roadmap-task-card ${item.done ? 'finished' : ''}`}>
                        <div className="task-card-icon">
                          {item.done ? <CheckCircle2 size={18} color="#10b981" /> : <Clock size={18} color="#0284c7" />}
                        </div>
                        <div className="task-card-content">
                          <p>{item.title}</p>
                          <span className="task-card-state">{item.done ? 'Xác thực bởi HireMate' : 'Đang chờ thực hành'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="career-card-glass">
            <div className="card-glass-header">
              <h3 className="card-glass-title">
                <BrainCircuit size={18} color="#8b5cf6" /> Trí Tuệ Nhân Tạo Ghi Nhớ Năng Lực (AI Memory Engine)
              </h3>
            </div>
            <p className="card-glass-desc">
              Mỗi câu trả lời, sự ngập ngừng hay từ vựng chuyên môn bạn sử dụng trong phòng phỏng vấn đều được lưu trữ an toàn để AI đóng vai trò người cố vấn (Mentor) đồng hành xuyên suốt.
            </p>
            <div className="memory-deep-dive-grid">
              <div className="deep-dive-col strengths">
                <h4>⭐ Điểm mạnh đã được chứng thực</h4>
                {memory.strengths.map((s, i) => (
                  <div key={i} className="deep-dive-card">
                    <div className="card-dot" />
                    <p>{s}</p>
                  </div>
                ))}
              </div>
              <div className="deep-dive-col improvements">
                <h4>🚀 Lĩnh vực trọng tâm cần tôi luyện</h4>
                {memory.improvements.map((imp, i) => (
                  <div key={i} className="deep-dive-card imp">
                    <div className="card-dot imp" />
                    <p>{imp}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="career-card-glass">
            <div className="card-glass-header">
              <h3 className="card-glass-title">
                <BookOpen size={18} color="#03bffd" /> Khóa Học & Nguồn Học Được AI Đề Xuất
              </h3>
            </div>
            <p className="card-glass-desc">
              Dựa trên những kỹ năng còn thiếu sót được phát hiện từ buổi phỏng vấn gần nhất của bạn.
            </p>
            <div className="learning-recommendations-grid">
              {learning.map((item: any) => (
                <div key={item.id} className="learning-course-card">
                  <div className="course-card-top">
                    <span className="course-cat">{item.category}</span>
                    <span className="course-match">Phù hợp {item.matchPct || 90}%</span>
                  </div>
                  <h4 className="course-title">{item.title}</h4>
                  <div className="course-meta">
                    <span>⏱️ {item.duration}</span>
                    <span>📈 {item.level}</span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="course-link-btn"
                  >
                    Bắt đầu học ngay <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CareerOS;
