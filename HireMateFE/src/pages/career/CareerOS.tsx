import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  Zap,
  Loader2,
  Calendar,
  Star,
  RefreshCw,
} from 'lucide-react';
import { careerService } from '../../shared/services/career.service';
import { publicService } from '../../shared/services/public.service';
import { authService } from '../../features/auth';
import { useApp } from '../../app/context/AppContext';
import { Link } from 'react-router-dom';
import './css/CareerOS.css';

interface CareerProgressState {
  readinessScore: number;
  breakdown: {
    interviewScore: number;
    cvScore: number | null;
    roleMatchScore: number;
  };
  targetRole: string;
  completedMilestones: number;
  totalMilestones: number;
}

interface RoadmapItem {
  title: string;
  done: boolean;
}

interface RoadmapPhase {
  phase: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  items: RoadmapItem[];
}

interface MemoryInsightState {
  strengths: string[];
  improvements: string[];
  recentEvents: Array<{
    id: string;
    date: string;
    position: string;
    overallScore: number;
    S: number;
    T: number;
    A: number;
    R: number;
  }>;
}

interface LearningResourceItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: string;
  url: string;
  matchPct: number;
}

const isPaidPlan = (code?: string | null, isPrem?: boolean | null): boolean => {
  if (isPrem) return true;
  if (!code) return false;
  const c = code.trim().toLowerCase();
  return c !== 'free' && c !== '' && c !== 'none';
};

export const CareerOS: React.FC = () => {
  const { profile, updateProfile } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'path' | 'memory' | 'learning'>('overview');
  const [loading, setLoading] = useState(true);

  // Chỉ gói Tiêu chuẩn và Cao cấp (Rank >= 1) mới được mở khóa tính năng AI Path & Learning
  const [isPaidTier, setIsPaidTier] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('hm_profile');
      if (stored) {
        const p = JSON.parse(stored);
        if (p.isPremium !== undefined || p.currentPlanCode !== undefined) {
          return isPaidPlan(p.currentPlanCode, p.isPremium);
        }
      }
    } catch {}
    return isPaidPlan(profile.currentPlanCode, profile.isPremium);
  });

  useEffect(() => {
    if (!isPaidTier && (activeTab === 'path' || activeTab === 'learning')) {
      setActiveTab('overview');
    }
  }, [isPaidTier, activeTab]);

  // Real data states initialized with clean empty/neutral values
  const [progress, setProgress] = useState<CareerProgressState>({
    readinessScore: 0,
    breakdown: {
      interviewScore: 0,
      cvScore: null,
      roleMatchScore: 0,
    },
    targetRole: profile.role || 'Chuyên viên',
    completedMilestones: 0,
    totalMilestones: 3,
  });

  const [path, setPath] = useState<RoadmapPhase[]>([]);
  const [memory, setMemory] = useState<MemoryInsightState>({
    strengths: [],
    improvements: [],
    recentEvents: [],
  });
  const [learning, setLearning] = useState<LearningResourceItem[]>([]);

  const fetchCareerData = async () => {
    setLoading(true);
    try {
      // 1. Đồng bộ và xác thực quyền hạn gói cước từ Auth Service (Backend DB)
      let currentPaid = isPaidPlan(profile.currentPlanCode, profile.isPremium);
      try {
        const meRes = await authService.getMe();
        if (meRes.ok && meRes.data) {
          const pCode = meRes.data.currentPlanCode;
          const pPrem = Boolean(meRes.data.isPremium);
          currentPaid = isPaidPlan(pCode, pPrem);
          setIsPaidTier(currentPaid);
          if (updateProfile) {
            updateProfile({
              currentPlanCode: pCode || 'free',
              isPremium: pPrem,
            });
          }
        }
      } catch {}

      const baseRequests: Promise<any>[] = [
        careerService.getDevelopment(),
        careerService.getProfileHub(),
        careerService.getProgress(),
        careerService.getMemory(),
        publicService.getResources(),
      ];

      // Chỉ gọi API path và learning khi user thuộc gói Tiêu chuẩn hoặc Cao cấp (tránh lỗi 403 Forbidden)
      if (currentPaid) {
        baseRequests.push(careerService.getPath());
        baseRequests.push(careerService.getLearning());
      }

      const results = await Promise.allSettled(baseRequests);

      const devRes = results[0];
      const hubRes = results[1];
      const progRes = results[2];
      const memRes = results[3];
      const resRes = results[4];
      const pathRes = currentPaid ? results[5] : null;
      const learnRes = currentPaid ? results[6] : null;

      const dev = devRes.status === 'fulfilled' && devRes.value?.ok ? devRes.value.data : null;
      const hub = hubRes.status === 'fulfilled' && hubRes.value?.ok ? hubRes.value.data : null;
      const prog = progRes.status === 'fulfilled' && progRes.value?.ok ? progRes.value.data : null;
      const mem = memRes.status === 'fulfilled' && memRes.value?.ok ? memRes.value.data : null;
      const pathData = currentPaid && pathRes && pathRes.status === 'fulfilled' && pathRes.value?.ok ? pathRes.value.data : null;
      const learnData = currentPaid && learnRes && learnRes.status === 'fulfilled' && learnRes.value?.ok ? learnRes.value.data : null;
      const realResources = resRes.status === 'fulfilled' && resRes.value?.ok && Array.isArray(resRes.value.data) ? resRes.value.data : [];

      // 1. Tính toán chỉ số Readiness & Breakdown thực tế từ Backend
      const currentRole = hub?.profile?.desiredPosition || profile.role || 'Lập trình viên';
      const realInterview = Math.round(dev?.interviewScore ?? (hub?.averageScore ? hub.averageScore : 0));
      const realCv = typeof dev?.cvScore === 'number' ? Math.round(dev.cvScore) : null;
      const realMatch = Math.round(dev?.matchScore ?? 0);
      const calculatedCareerScore = dev?.careerScore 
        ? Math.round(dev.careerScore)
        : Math.round((realInterview * 0.5) + ((realCv ?? 0) * 0.25) + (realMatch * 0.25));

      const sessionsCount = hub?.sessionsCount ?? 0;
      const milestonesList = prog?.milestones ?? [];
      const completedMilestonesCount = Array.isArray(milestonesList)
        ? milestonesList.filter((m: any) => m.unlocked).length
        : (sessionsCount >= 1 ? 1 : 0);

      setProgress({
        readinessScore: Math.min(100, calculatedCareerScore),
        breakdown: {
          interviewScore: realInterview,
          cvScore: realCv,
          roleMatchScore: realMatch,
        },
        targetRole: currentRole,
        completedMilestones: completedMilestonesCount,
        totalMilestones: Math.max(3, milestonesList.length || 3),
      });

      // 2. Parse Memory Events thực tế từ Database
      const parsedEvents: MemoryInsightState['recentEvents'] = [];
      const derivedStrengths: string[] = [];
      const derivedImprovements: string[] = [];

      if (Array.isArray(mem)) {
        mem.forEach((ev: any) => {
          if (ev.eventType === 'InterviewCompleted' && ev.payloadJson) {
            try {
              const p = JSON.parse(ev.payloadJson);
              const evPosition = p.Position || p.position || currentRole;
              const overall = p.OverallScore || p.overallScore || 0;
              const s = p.ScoreS || p.scoreS || 0;
              const t = p.ScoreT || p.scoreT || 0;
              const a = p.ScoreA || p.scoreA || 0;
              const r = p.ScoreR || p.scoreR || 0;

              parsedEvents.push({
                id: ev.id,
                date: new Date(ev.createdAt).toLocaleDateString('vi-VN'),
                position: evPosition,
                overallScore: overall,
                S: s,
                T: t,
                A: a,
                R: r,
              });

              if (s >= 75) {
                derivedStrengths.push(`Xây dựng bối cảnh Situation mạch lạc (${s}/100) vị trí ${evPosition}`);
              } else if (s > 0 && s < 70) {
                derivedImprovements.push(`Cần xác định mốc thời gian và quy mô dự án chi tiết hơn (S: ${s}/100)`);
              }

              if (t >= 75) {
                derivedStrengths.push(`Nêu rõ mục tiêu và trọng trách cá nhân trong dự án (${t}/100)`);
              } else if (t > 0 && t < 70) {
                derivedImprovements.push(`Cần phân định rành mạch vai trò cá nhân so với tập thể (T: ${t}/100)`);
              }

              if (a >= 75) {
                derivedStrengths.push(`Trình bày hành động kỹ thuật thực thi thuyết phục (${a}/100)`);
              } else if (a > 0 && a < 70) {
                derivedImprovements.push(`Cần đào sâu hơn vào các giải pháp kỹ thuật cụ thể đã triển khai (A: ${a}/100)`);
              }

              if (r >= 75) {
                derivedStrengths.push(`Minh chứng kết quả định lượng rõ ràng với số liệu cụ thể (${r}/100)`);
              } else if (r > 0 && r < 70) {
                derivedImprovements.push(`Cần bổ sung thêm số liệu % đo lường cụ thể cho phần Kết quả (R: ${r}/100)`);
              }
            } catch {}
          }
        });
      }

      setMemory({
        strengths: derivedStrengths.slice(0, 5),
        improvements: derivedImprovements.slice(0, 5),
        recentEvents: parsedEvents,
      });

      // 3. Xây dựng Roadmap thực tế từ API / AI Path
      let rawStages: any[] | null = null;
      if (pathData?.path) {
        try {
          const raw = typeof pathData.path === 'string' ? JSON.parse(pathData.path) : pathData.path;
          if (Array.isArray(raw) && raw.length > 0) {
            rawStages = raw;
          } else if (raw?.stages && Array.isArray(raw.stages)) {
            rawStages = raw.stages;
          } else if (raw?.phases && Array.isArray(raw.phases)) {
            rawStages = raw.phases;
          }
        } catch {}
      }

      // Tạo chặng phát triển thực tế dựa trên dữ liệu hiện tại của user
      const dynamicPhases: RoadmapPhase[] = [
        {
          phase: `Chặng 1: Nền tảng & Tối ưu hồ sơ ${currentRole}`,
          status: sessionsCount >= 1 && (realCv ?? 0) >= 60 ? 'completed' : 'in_progress',
          items: [
            { title: `Hoàn thiện thông tin mục tiêu nghề nghiệp: ${currentRole}`, done: Boolean(profile.name && currentRole) },
            { title: 'Tối ưu CV đạt điểm ATS chuẩn tuyển dụng (>= 60)', done: (realCv ?? 0) >= 60 },
            { title: 'Thực hiện buổi phỏng vấn AI khởi động đầu tiên', done: sessionsCount >= 1 },
          ],
        },
        {
          phase: `Chặng 2: Rèn luyện cấu trúc STAR chuyên sâu vị trí ${currentRole}`,
          status: sessionsCount >= 3 && realInterview >= 75 ? 'completed' : (sessionsCount >= 1 ? 'in_progress' : 'upcoming'),
          items: [
            { title: 'Thực hiện tối thiểu 3 phiên phỏng vấn AI thực chiến', done: sessionsCount >= 3 },
            { title: 'Đạt điểm STAR trung bình >= 75 điểm', done: realInterview >= 75 },
            { title: 'So khớp hồ sơ với ít nhất 1 bản mô tả công việc (JD)', done: realMatch > 0 },
          ],
        },
        {
          phase: `Chặng 3: Chinh phục Senior Bar Raiser & Đàm phán Offer`,
          status: calculatedCareerScore >= 80 ? 'completed' : (sessionsCount >= 3 ? 'in_progress' : 'upcoming'),
          items: [
            { title: 'Đạt điểm năng lực tổng thể Career Readiness >= 75', done: calculatedCareerScore >= 75 },
            { title: 'Sử dụng AI Generator tạo thư ứng tuyển (Cover Letter) chuẩn', done: true },
            { title: 'Sẵn sàng nhận offer phỏng vấn từ các công ty hàng đầu', done: calculatedCareerScore >= 80 },
          ],
        },
      ];

      const sourceStages = rawStages && rawStages.length > 0 ? rawStages : dynamicPhases;

      const normalizedPhases: RoadmapPhase[] = sourceStages.map((stage: any, sIdx: number) => {
        const phaseName = stage.phase || stage.name || stage.title || `Chặng ${sIdx + 1}: Phát triển chuyên môn`;
        const rawItems = Array.isArray(stage.items)
          ? stage.items
          : Array.isArray(stage.tasks)
          ? stage.tasks
          : Array.isArray(stage.steps)
          ? stage.steps
          : [];

        const normalizedItems = rawItems.map((it: any, itIdx: number) => {
          if (typeof it === 'string') {
            return { title: it, done: itIdx === 0 && sessionsCount >= 1 };
          }
          return {
            title: it.title || it.name || it.task || `Mục tiêu ${itIdx + 1}`,
            done: Boolean(it.done || it.completed || it.isDone),
          };
        });

        return {
          phase: phaseName,
          status: stage.status || (sIdx === 0 ? 'in_progress' : 'upcoming'),
          items: normalizedItems.length > 0 ? normalizedItems : [
            { title: `Hoàn thiện các kỹ năng cho ${phaseName}`, done: sIdx === 0 && sessionsCount >= 1 }
          ],
        };
      });

      setPath(normalizedPhases);

      // 4. Lấy danh sách Khóa học & Tài nguyên thực tế từ Backend API
      const parsedLearningList: LearningResourceItem[] = [];

      // Từ API /Resources (Database thực tế)
      if (realResources && realResources.length > 0) {
        realResources.forEach((resItem: any) => {
          parsedLearningList.push({
            id: resItem.id || String(Math.random()),
            title: resItem.title || 'Tài liệu phát triển sự nghiệp',
            category: resItem.category || 'Tài nguyên phỏng vấn',
            duration: resItem.readingTime || '15 phút đọc',
            level: resItem.level || 'Mọi cấp độ',
            url: resItem.url || `/resources/${resItem.id}`,
            matchPct: 95,
          });
        });
      }

      // Từ AI Learning Recommendation (nếu có)
      if (learnData?.learning) {
        try {
          const rawLearn = typeof learnData.learning === 'string' ? JSON.parse(learnData.learning) : learnData.learning;
          const list = Array.isArray(rawLearn) ? rawLearn : rawLearn?.items || rawLearn?.courses || [];
          list.forEach((c: any, i: number) => {
            parsedLearningList.push({
              id: `ai-${i}`,
              title: c.title || c.name || `Khóa học nâng cao năng lực: ${currentRole}`,
              category: c.category || 'Khóa học đề xuất AI',
              duration: c.duration || '4 giờ học',
              level: c.level || 'Intermediate',
              url: c.url || 'https://github.com',
              matchPct: c.matchPct || 92,
            });
          });
        } catch {}
      }

      // Fallback nếu database chưa có bài tài nguyên nào
      if (parsedLearningList.length === 0) {
        parsedLearningList.push(
          {
            id: 'res-default-1',
            title: `Lộ trình phát triển & Kỹ năng cốt lõi cho ${currentRole}`,
            category: 'Kỹ năng chuyên môn',
            duration: '30 phút đọc',
            level: 'Tất cả cấp độ',
            url: '/resources',
            matchPct: 96,
          },
          {
            id: 'res-default-2',
            title: 'Làm chủ phương pháp STAR trong phỏng vấn tuyển dụng quốc tế',
            category: 'Phỏng vấn AI',
            duration: '20 phút đọc',
            level: 'Thực chiến',
            url: '/resources',
            matchPct: 94,
          },
          {
            id: 'res-default-3',
            title: 'Chiến lược đàm phán đãi ngộ và Offer Benchmark 2026',
            category: 'Kỹ năng mềm',
            duration: '15 phút đọc',
            level: 'Mọi cấp độ',
            url: '/resources',
            matchPct: 88,
          }
        );
      }

      setLearning(parsedLearningList);
    } catch (err) {
      console.warn('Career OS API data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchCareerData();
    }
  }, []);

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
          Career OS tích hợp toàn bộ dữ liệu từ các phiên phỏng vấn, hồ sơ CV và mục tiêu nghề nghiệp thực tế của bạn để vẽ nên bức tranh năng lực chuẩn xác nhất.
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
              {progress.completedMilestones > 0
                ? <>Bạn đã hoàn thành <strong>{progress.completedMilestones}/{progress.totalMilestones}</strong> chặng phát triển quan trọng để sẵn sàng nhận offer mơ ước.</>
                : 'Bạn đang ở chặng khởi đầu. Hãy hoàn thiện hồ sơ và thực hiện buổi phỏng vấn đầu tiên để mở khóa các mốc phát triển tiếp theo.'}
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
                <div className="submetric-bar cyan" style={{ width: `${progress.breakdown.cvScore ?? 0}%` }} />
                </div>
                <span className="submetric-val">{progress.breakdown.cvScore === null ? 'Chưa có dữ liệu' : `${progress.breakdown.cvScore}%`}</span>
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
            <Link to="/dashboard" className="career-btn-sec">
              Cập nhật hồ sơ
            </Link>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="career-tabs-bar">
        <button
          type="button"
          className={`career-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Compass size={16} /> Tổng quan lộ trình
        </button>
        {isPaidTier && (
          <button
            type="button"
            className={`career-tab-btn ${activeTab === 'path' ? 'active' : ''}`}
            onClick={() => setActiveTab('path')}
          >
            <TrendingUp size={16} /> Chi tiết chặng phát triển ({path.length})
          </button>
        )}
        <button
          type="button"
          className={`career-tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
        >
          <BrainCircuit size={16} /> Bộ nhớ AI Memory ({memory.recentEvents.length})
        </button>
        {isPaidTier && (
          <button
            type="button"
            className={`career-tab-btn ${activeTab === 'learning' ? 'active' : ''}`}
            onClick={() => setActiveTab('learning')}
          >
            <BookOpen size={16} /> Khóa học & Tài nguyên ({learning.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="career-tab-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748B' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px', color: '#0085FF' }} />
            <p style={{ fontWeight: 600 }}>Đang tải dữ liệu lộ trình sự nghiệp từ hệ thống...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="career-overview-grid">
                {/* Left: Next Milestones */}
                <div className="career-card-glass">
                  <div className="card-glass-header">
                    <h3 className="card-glass-title">
                      <Layers size={18} color="#03bffd" /> Các bước tiếp theo cần thực hiện
                    </h3>
                    <span className="badge-pill">Dựa trên dữ liệu thực tế</span>
                  </div>
                  <div className="milestones-timeline">
                    {(path || []).map((phase, idx) => (
                      <div key={idx} className={`timeline-phase-block ${phase?.status || 'upcoming'}`}>
                        <div className="phase-marker">
                          <span className="phase-number">{idx + 1}</span>
                        </div>
                        <div className="phase-details">
                          <h4 className="phase-title">{phase?.phase || `Chặng ${idx + 1}`}</h4>
                          <div className="phase-tasks-list">
                            {(phase?.items || []).map((item, itemIdx) => (
                              <div key={itemIdx} className={`task-row ${item?.done ? 'done' : ''}`}>
                                <div className="task-checkbox">
                                  {item?.done ? <CheckCircle2 size={16} color="#10b981" /> : <Clock size={16} color="#94a3b8" />}
                                </div>
                                <span className="task-text">{item?.title || ''}</span>
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
                    AI tự động lưu trữ và phân tích các chỉ số STAR bạn thể hiện qua từng phiên phỏng vấn thực tế.
                  </p>

                  {memory.strengths.length > 0 ? (
                    <div className="memory-box strength">
                      <h5 className="memory-box-title">💪 Thế mạnh ghi nhận từ các phiên phỏng vấn:</h5>
                      <ul>
                        {memory.strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="memory-box strength">
                      <h5 className="memory-box-title">💪 Thế mạnh ghi nhận:</h5>
                      <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                        Chưa có dữ liệu phỏng vấn. Hoàn thành phiên phỏng vấn AI đầu tiên để hệ thống phân tích và trích xuất điểm mạnh của bạn.
                      </p>
                    </div>
                  )}

                  {memory.improvements.length > 0 ? (
                    <div className="memory-box improvement">
                      <h5 className="memory-box-title">🎯 Điểm cần tôi luyện thêm:</h5>
                      <ul>
                        {memory.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="memory-box improvement">
                      <h5 className="memory-box-title">🎯 Điểm cần cải thiện:</h5>
                      <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0 }}>
                        Chưa ghi nhận điểm yếu lớn. Hãy duy trì luyện tập đều đặn để nhận đánh giá chi tiết cho từng cấu phần STAR.
                      </p>
                    </div>
                  )}

                  <div className="career-memory-footer">
                    <Link to="/interview-setup" className="link-inline">
                      Bắt đầu phỏng vấn để AI cập nhật thêm dữ liệu <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {isPaidTier && activeTab === 'path' && (
              <div className="career-card-glass">
                <div className="card-glass-header">
                  <h3 className="card-glass-title">
                    <TrendingUp size={18} color="#03bffd" /> Lộ Trình AI Cá Nhân Hóa (Career Roadmap)
                  </h3>
                  <button
                    type="button"
                    onClick={fetchCareerData}
                    className="btn-refresh-sm"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#0085FF', fontSize: '0.813rem', fontWeight: 600 }}
                  >
                    <RefreshCw size={13} /> Cập nhật lại
                  </button>
                </div>
                <div className="roadmap-full-cards">
                  {(path || []).map((phase, idx) => (
                    <div key={idx} className={`roadmap-phase-card ${phase?.status || 'upcoming'}`}>
                      <div className="phase-card-top">
                        <span className="phase-tag">Chặng {idx + 1}</span>
                        <span className={`status-pill ${phase?.status || 'upcoming'}`}>
                          {phase?.status === 'completed' ? 'Đã hoàn thành' : (phase?.status === 'in_progress' ? 'Đang thực hiện' : 'Chưa bắt đầu')}
                        </span>
                      </div>
                      <h4 className="roadmap-phase-name">{phase?.phase || `Chặng ${idx + 1}`}</h4>
                      <div className="roadmap-tasks-grid">
                        {(phase?.items || []).map((item, itemIdx) => (
                          <div key={itemIdx} className={`roadmap-task-card ${item?.done ? 'finished' : ''}`}>
                            <div className="task-card-icon">
                              {item?.done ? <CheckCircle2 size={18} color="#10b981" /> : <Clock size={18} color="#0284c7" />}
                            </div>
                            <div className="task-card-content">
                              <p>{item?.title || ''}</p>
                              <span className="task-card-state">{item?.done ? 'Xác thực bởi HireMate' : 'Đang chờ thực hành'}</span>
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
                  <span className="badge-pill purple">{memory.recentEvents.length} phiên đã lưu</span>
                </div>
                <p className="card-glass-desc">
                  Mỗi câu trả lời, sự ngập ngừng hay từ vựng chuyên môn bạn sử dụng trong phòng phỏng vấn đều được lưu trữ an toàn để AI đóng vai trò người cố vấn (Mentor) đồng hành xuyên suốt.
                </p>

                {memory.recentEvents.length > 0 ? (
                  <>
                    <div className="memory-deep-dive-grid">
                      <div className="deep-dive-col strengths">
                        <h4>⭐ Điểm mạnh đã được chứng thực</h4>
                        {memory.strengths.length > 0 ? (
                          memory.strengths.map((s, i) => (
                            <div key={i} className="deep-dive-card">
                              <div className="card-dot" />
                              <p>{s}</p>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: '#64748B', padding: '8px' }}>Chưa có dữ liệu điểm mạnh.</p>
                        )}
                      </div>

                      <div className="deep-dive-col improvements">
                        <h4>🚀 Lĩnh vực trọng tâm cần tôi luyện</h4>
                        {memory.improvements.length > 0 ? (
                          memory.improvements.map((imp, i) => (
                            <div key={i} className="deep-dive-card imp">
                              <div className="card-dot imp" />
                              <p>{imp}</p>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: '#64748B', padding: '8px' }}>Chưa ghi nhận điểm cần cải thiện.</p>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#0F172A' }}>
                        📋 Lịch sử các phiên phỏng vấn ghi nhận trong bộ nhớ AI
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {memory.recentEvents.map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '12px',
                              fontSize: '0.875rem',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Calendar size={16} color="#64748B" />
                              <span style={{ fontWeight: 650, color: '#0F172A' }}>{ev.position}</span>
                              <span style={{ color: '#64748B', fontSize: '0.8rem' }}>({ev.date})</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', background: '#E0F2FE', color: '#0284C7', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>S: {ev.S}</span>
                              <span style={{ fontSize: '0.75rem', background: '#E0F2FE', color: '#0284C7', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>T: {ev.T}</span>
                              <span style={{ fontSize: '0.75rem', background: '#E0F2FE', color: '#0284C7', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>A: {ev.A}</span>
                              <span style={{ fontSize: '0.75rem', background: '#E0F2FE', color: '#0284C7', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>R: {ev.R}</span>
                              <span style={{ fontWeight: 800, color: ev.overallScore >= 75 ? '#10B981' : '#F59E0B', marginLeft: '6px' }}>
                                ⭐ {ev.overallScore}/100
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#F8FAFC', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
                    <BrainCircuit size={40} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      Chưa có dữ liệu phỏng vấn trong bộ nhớ AI
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', maxWidth: 450, margin: '0 auto 18px' }}>
                      Hãy thực hiện buổi phỏng vấn AI đầu tiên. Toàn bộ câu trả lời và số điểm STAR của bạn sẽ được AI phân tích và hiển thị tại đây.
                    </p>
                    <Link to="/interview-setup" className="career-btn-cta" style={{ display: 'inline-flex' }}>
                      <Zap size={16} /> Bắt đầu buổi phỏng vấn ngay
                    </Link>
                  </div>
                )}
              </div>
            )}

            {isPaidTier && activeTab === 'learning' && (
              <div className="career-card-glass">
                <div className="card-glass-header">
                  <h3 className="card-glass-title">
                    <BookOpen size={18} color="#03bffd" /> Khóa Học & Nguồn Học Được Đề Xuất
                  </h3>
                  <span className="badge-pill">Đồng bộ từ Database & AI</span>
                </div>
                <p className="card-glass-desc">
                  Tài nguyên và bài học được gợi ý dựa trên hồ sơ mục tiêu {progress.targetRole} của bạn.
                </p>
                <div className="learning-recommendations-grid">
                  {learning.map((item: LearningResourceItem) => (
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
                      {item.url.startsWith('/') ? (
                        <Link to={item.url} className="course-link-btn">
                          Bắt đầu học ngay <ExternalLink size={14} />
                        </Link>
                      ) : (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="course-link-btn"
                        >
                          Bắt đầu học ngay <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CareerOS;
