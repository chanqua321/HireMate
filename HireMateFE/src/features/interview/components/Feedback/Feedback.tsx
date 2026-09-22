import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { interviewService } from '../../api/interview.service';
import type {
  InterviewAnswerDetail,
  InterviewSessionDetail,
  StructuredFeedback,
} from '../../types';
import {
  Award,
  RotateCcw,
  LayoutDashboard,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Target,
  Loader2,
  TrendingUp,
  ListChecks,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../../../../shared/components';
import { useConfetti } from '../../../../shared/hooks';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import './css/Feedback.css';

function scoreLabel(v: number | null | undefined): string {
  return v == null ? '—' : `${v}/100`;
}

function evidenceStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  switch (status) {
    case 'Verified':
      return 'Verified';
    case 'StrongEvidence':
      return 'Strong Evidence';
    case 'WeakEvidence':
      return 'Weak Evidence';
    case 'MissingEvidence':
      return 'Missing Evidence';
    case 'NeedsValidation':
      return 'Needs Validation';
    case 'CvInconsistency':
      return 'CV Inconsistency';
    default:
      return status;
  }
}

export const Feedback: React.FC = () => {
  const { lastResult } = useApp();
  const { triggerConfetti } = useConfetti();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [loading, setLoading] = useState<boolean>(Boolean(sessionId));
  const [sessionDetail, setSessionDetail] = useState<InterviewSessionDetail | null>(null);
  const [structured, setStructured] = useState<StructuredFeedback | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (sessionId && localStorage.getItem('hm_access_token')) {
      setLoadError('');
      Promise.all([
        interviewService.getDetail(sessionId),
        interviewService.getFeedback(sessionId),
      ])
        .then(([detailRes, feedbackRes]) => {
          if (detailRes.ok && detailRes.data) {
            setSessionDetail(detailRes.data);
          } else {
            setLoadError(detailRes.message || 'Không tải được báo cáo phiên phỏng vấn.');
          }
          if (feedbackRes.ok && feedbackRes.data) {
            setStructured(feedbackRes.data);
          } else if (detailRes.data?.structuredFeedback) {
            setStructured(detailRes.data.structuredFeedback);
          }
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Lỗi tải báo cáo.';
          setLoadError(msg);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!sessionId) {
      setLoading(false);
    }
  }, [sessionId]);

  const overall =
    structured?.coachReport?.summary.overallScore ??
    structured?.overallScore ??
    sessionDetail?.overallScore ??
    lastResult?.overall ??
    null;

  const role = sessionDetail?.position || lastResult?.role || 'Ứng viên';
  const clarity = structured?.coachReport?.scores.clarity ?? sessionDetail?.clarityScore ?? lastResult?.clarity ?? null;
  const subs = {
    S: structured?.coachReport?.scores.situation ?? sessionDetail?.scoreS ?? lastResult?.subs?.S ?? null,
    T: structured?.coachReport?.scores.task ?? sessionDetail?.scoreT ?? lastResult?.subs?.T ?? null,
    A: structured?.coachReport?.scores.action ?? sessionDetail?.scoreA ?? lastResult?.subs?.A ?? null,
    R: structured?.coachReport?.scores.result ?? sessionDetail?.scoreR ?? lastResult?.subs?.R ?? null,
  };
  const date = structured?.coachReport?.summary.date || (sessionDetail?.completedAt
    ? new Date(sessionDetail.completedAt).toLocaleDateString('vi-VN')
    : lastResult?.date || new Date().toLocaleDateString('vi-VN'));
  const feedbackSummary =
    structured?.coachReport?.summary.headline || structured?.summary || sessionDetail?.feedbackSummary || '';
  const answers: InterviewAnswerDetail[] = sessionDetail?.answers ?? [];
  const aiUnavailable =
    structured != null && structured.aiSummaryAvailable === false && Boolean(structured.overallScore != null || answers.length > 0);

  const hasSession = Boolean(sessionDetail || lastResult || structured);

  useEffect(() => {
    if (overall != null && overall >= 75) {
      triggerConfetti();
    }
  }, [overall, triggerConfetti]);

  if (loading) {
    return (
      <div className="feedback-page-container" style={{ textAlign: 'center', padding: 48 }}>
        <Loader2 className="animate-spin" size={28} />
        <p style={{ marginTop: 12, color: '#64748B' }}>Đang tải báo cáo phỏng vấn…</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="feedback-page-container" style={{ maxWidth: 520, margin: '48px auto', textAlign: 'center' }}>
        <AlertTriangle size={28} color="#B45309" style={{ marginBottom: 12 }} />
        <h2>Chưa có báo cáo phỏng vấn</h2>
        <p style={{ color: '#64748B' }}>
          {loadError || 'Hoàn thành một buổi phỏng vấn để xem điểm STAR, điểm mạnh/yếu và gợi ý cải thiện.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <Link to="/interview-setup" className="btn-report-primary">
            Luyện phỏng vấn
          </Link>
          <Link to="/dashboard" className="btn-report-ghost">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const displayOverall = overall ?? 0;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    overall == null ? circumference : circumference - (displayOverall / 100) * circumference;

  const getAnalysis = (dim: 'S' | 'T' | 'A' | 'R', score: number | null) => {
    if (score == null) {
      return {
        title:
          dim === 'S'
            ? 'Bối cảnh (Situation)'
            : dim === 'T'
              ? 'Nhiệm vụ (Task)'
              : dim === 'A'
                ? 'Hành động (Action)'
                : 'Kết quả (Result)',
        strength: 'Chưa đủ dữ liệu phân tích cho chiều này.',
        mistake: 'Không có điểm STAR từ phân tích câu trả lời.',
        advice: 'Hoàn thành thêm câu trả lời có analysis để xem chi tiết.',
      };
    }
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
    switch (dim) {
      case 'S':
        return {
          title: 'Bối cảnh (Situation)',
          strength: 'Nêu bật được quy mô hệ thống, thách thức và tính cấp bách của dự án.',
          mistake: 'Có thể xác định rõ hơn mốc thời gian và giới hạn tài nguyên.',
          advice: 'Mở đầu ngắn gọn bằng công thức: "Vào quý 3 năm ngoái, khi hệ thống..."',
        };
      case 'T':
        return {
          title: 'Nhiệm vụ (Task)',
          strength: 'Xác định mục tiêu rõ ràng và phân định trách nhiệm cá nhân.',
          mistake: 'Đôi khi dùng đại từ chung thay vì nhấn mạnh phần bạn phụ trách.',
          advice: 'Nhấn mạnh vai trò: "Với tư cách người chịu trách nhiệm chính..."',
        };
      case 'A':
        return {
          title: 'Hành động (Action)',
          strength: 'Trình bày logic các bước và giải pháp xử lý vấn đề.',
          mistake: 'Cần đào sâu thêm edge-cases.',
          advice: 'Phân tích nguyên nhân → Thử nghiệm → Triển khai an toàn.',
        };
      case 'R':
        return {
          title: 'Kết quả (Result)',
          strength: 'Đưa ra số liệu định lượng thuyết phục.',
          mistake: 'Có thể liên kết kết quả kỹ thuật với giá trị kinh doanh hơn.',
          advice: 'Bổ sung câu kết với % cải thiện hoặc tác động người dùng.',
        };
    }
  };

  const coachStar = structured?.coachReport?.starAnalysis;
  const starAnalysis = ([
    { letter: 'S', key: 'situation', score: subs.S, ...getAnalysis('S', subs.S) },
    { letter: 'T', key: 'task', score: subs.T, ...getAnalysis('T', subs.T) },
    { letter: 'A', key: 'action', score: subs.A, ...getAnalysis('A', subs.A) },
    { letter: 'R', key: 'result', score: subs.R, ...getAnalysis('R', subs.R) },
  ] as const).map((item) => {
    const ai = coachStar?.[item.key];
    return { ...item, score: ai?.score ?? item.score, issue: ai?.issue ?? item.mistake, advice: ai?.advice ?? item.advice };
  });

  const strengths = structured?.strengths ?? [];
  const weaknesses = structured?.weaknesses ?? [];
  const skillGaps = structured?.skillGaps ?? [];
  const evidenceGaps = structured?.evidenceGaps ?? [];
  const improvements = structured?.improvements ?? [];
  const highlights = structured?.answerHighlights;
  const cat = structured?.categoryScores;
  const insufficientData =
    overall == null &&
    answers.every((a) => !a.analysisAvailable) &&
    strengths.length === 0;

  return (
    <div className="feedback-page-container">
      <InterviewStepper currentStep={3} />

      <motion.div
        className="feedback-hero-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="hero-left-content">
          <div className="feedback-eyebrow">
            <Sparkles size={14} /> INTERVIEW RESULT
          </div>
          <h1 className="feedback-hero-title">
            Phản hồi phỏng vấn — <span>{role}</span>
          </h1>
          <p className="feedback-hero-desc">
            {insufficientData
              ? 'Chưa đủ dữ liệu để tạo feedback đầy đủ.'
              : feedbackSummary ||
                (overall != null && overall >= 80
                  ? 'Kết quả xuất sắc theo thang đánh giá. Tiếp tục luyện các điểm yếu còn lại.'
                  : overall != null && overall >= 60
                    ? 'Kết quả khá tốt. Bổ sung số liệu và evidence cụ thể để nâng điểm.'
                    : 'Điểm còn thấp hoặc câu trả lời chưa đủ sâu. Luyện lại theo STAR và bám sát CV + vị trí mục tiêu.')}
          </p>
          {aiUnavailable && (
            <p style={{ fontSize: '0.9rem', color: '#B45309', marginTop: -8, marginBottom: 16 }}>
              Phần nhận xét chi tiết của AI hiện chưa khả dụng. Điểm số và phân tích deterministic vẫn hiển thị bên dưới.
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: 16 }}>Ngày: {date}</p>

          <div className="feedback-hero-actions">
            <Link to="/interview-setup" className="btn-report-primary">
              <RotateCcw size={17} /> Luyện tập lại
            </Link>
            <Link to="/dashboard" className="btn-report-ghost">
              <LayoutDashboard size={17} /> Bảng điều khiển
            </Link>
          </div>
        </div>

        <div className="hero-gauge-wrapper">
          <svg width="170" height="170" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="80" cy="80" r={radius} stroke="#f1f5f9" strokeWidth="12" fill="none" />
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
              {overall == null ? '—' : <AnimatedCounter value={displayOverall} />}
            </span>
            <span className="gauge-score-label">OVERALL</span>
          </div>
        </div>
      </motion.div>

      {!structured?.coachReport && cat && (
        <motion.div
          className="breakdown-bars-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24 }}
        >
          <div className="model-answer-header" style={{ marginBottom: 12 }}>
            <TrendingUp size={18} />
            <span>Category scores (từ phân tích câu trả lời)</span>
          </div>
          {[
            { name: 'Communication', val: cat.communication },
            { name: 'STAR', val: cat.star },
            { name: 'Technical', val: cat.technical },
            { name: 'Problem Solving', val: cat.problemSolving },
            { name: 'Relevance', val: cat.relevance },
            { name: 'Completeness', val: cat.completeness },
          ].map((bar, idx) => (
            <div key={bar.name} className="score-bar-row">
              <span className="score-bar-label">{bar.name}</span>
              <div className="score-bar-track">
                {bar.val != null ? (
                  <motion.div
                    className="score-bar-fill"
                    style={{ background: '#03bfff' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.val}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.05 }}
                  />
                ) : null}
              </div>
              <span className="score-bar-value">{scoreLabel(bar.val)}</span>
            </div>
          ))}
        </motion.div>
      )}

      {!structured?.coachReport && (strengths.length > 0 || weaknesses.length > 0) && (
        <>
          <div className="report-section-heading">
            <h3>Strengths & Areas to Improve</h3>
            <span className="report-section-badge">Structured</span>
          </div>
          <div className="star-mistakes-grid">
            <div className="star-analysis-card">
              <div className="star-analysis-header">
                <h4 className="star-component-title">
                  <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
                  Strengths
                </h4>
              </div>
              {strengths.length === 0 ? (
                <p className="block-desc">Không đủ dữ liệu để xác định.</p>
              ) : (
                strengths.map((s, i) => (
                  <div key={i} className="feedback-sub-block strength" style={{ marginBottom: 8 }}>
                    <div className="block-title-row">
                      <Award size={14} />
                      <span>{s.area}</span>
                    </div>
                    <p className="block-desc">{s.description}</p>
                    {s.evidence ? (
                      <p className="block-desc" style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        {s.evidence}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className="star-analysis-card">
              <div className="star-analysis-header">
                <h4 className="star-component-title">
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
                  Areas to Improve
                </h4>
              </div>
              {weaknesses.length === 0 ? (
                <p className="block-desc">Chưa ghi nhận điểm yếu rõ từ dữ liệu phân tích.</p>
              ) : (
                weaknesses.map((w, i) => (
                  <div key={i} className="feedback-sub-block mistake" style={{ marginBottom: 8 }}>
                    <div className="block-title-row">
                      <AlertTriangle size={14} />
                      <span>{w.area}</span>
                    </div>
                    <p className="block-desc">{w.description}</p>
                    {w.relatedAnswerIds && w.relatedAnswerIds.length > 0 ? (
                      <p className="block-desc" style={{ fontSize: '0.8rem', color: '#64748B' }}>
                        Liên quan {w.relatedAnswerIds.length} câu trả lời
                        {w.evidence ? ` · ${w.evidence}` : ''}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {!structured?.coachReport && skillGaps.length > 0 && (
        <motion.div className="model-answer-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="model-answer-header">
            <Target size={20} />
            <span>Skill Gaps</span>
          </div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#334155', fontSize: '0.9rem' }}>
            {skillGaps.map((g, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <strong>{g.area}</strong>
                {g.score != null ? ` (${g.score})` : ''}: {g.description}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {!structured?.coachReport && evidenceGaps.length > 0 && (
        <motion.div
          className="model-answer-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 16 }}
        >
          <div className="model-answer-header">
            <ListChecks size={20} />
            <span>Evidence Gaps</span>
          </div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#334155', fontSize: '0.9rem' }}>
            {evidenceGaps.map((g) => (
              <li key={g.answerId} style={{ marginBottom: 10 }}>
                <strong>
                  Câu {g.orderIndex + 1}: {g.question}
                </strong>
                <div>
                  {evidenceStatusLabel(g.status)} — {g.gap}
                </div>
                {g.suggestion ? (
                  <div style={{ color: '#64748B', fontSize: '0.85rem' }}>{g.suggestion}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {!structured?.coachReport && structured?.cvConsistencySummary && (
        <motion.div
          className="model-answer-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 16 }}
        >
          <div className="model-answer-header">
            <BookOpen size={20} />
            <span>CV Consistency</span>
          </div>
          <p className="model-answer-quote" style={{ whiteSpace: 'pre-wrap' }}>
            {structured.cvConsistencySummary}
          </p>
        </motion.div>
      )}

      {!structured?.coachReport && highlights &&
        (highlights.strong.length > 0 ||
          highlights.weak.length > 0 ||
          highlights.needsImprovement.length > 0) && (
          <motion.div
            className="model-answer-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 16 }}
          >
            <div className="model-answer-header">
              <Award size={20} />
              <span>Answer Highlights</span>
            </div>
            {[
              { title: 'Strong', items: highlights.strong },
              { title: 'Weak', items: highlights.weak },
              { title: 'Needs improvement', items: highlights.needsImprovement },
            ].map((group) =>
              group.items.length === 0 ? null : (
                <div key={group.title} style={{ marginTop: 10 }}>
                  <strong>{group.title}</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.88rem', color: '#475569' }}>
                    {group.items.map((h) => (
                      <li key={h.answerId}>
                        Câu {h.orderIndex + 1}
                        {h.compositeScore != null ? ` (${h.compositeScore})` : ''}: {h.question}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </motion.div>
        )}

      {!structured?.coachReport && improvements.length > 0 && (
        <motion.div
          className="model-answer-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 16 }}
        >
          <div className="model-answer-header">
            <Lightbulb size={20} />
            <span>Next Steps</span>
          </div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#334155', fontSize: '0.9rem' }}>
            {improvements.map((t, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {t}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {structured?.coachReport && (
        <div className="breakdown-bars-card" style={{ marginBottom: 20 }}>
          <div className="model-answer-header"><TrendingUp size={18} /><span>Điểm phỏng vấn</span></div>
          {[
            { name: 'Bối cảnh', val: subs.S },
            { name: 'Nhiệm vụ', val: subs.T },
            { name: 'Hành động', val: subs.A },
            { name: 'Kết quả', val: subs.R },
            { name: 'Rõ ràng & mạch lạc', val: clarity },
          ].map((bar) => (
            <div key={bar.name} className="score-bar-row">
              <span className="score-bar-label">{bar.name}</span>
              <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${bar.val ?? 0}%`, background: '#03bfff' }} /></div>
              <span className="score-bar-value">{scoreLabel(bar.val)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="report-section-heading">
        <h3>Phân tích STAR (S / T / A / R)</h3>
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
              <span className={`star-score-pill ${(item.score ?? 0) >= 85 ? 'good' : 'warn'}`}>
                {scoreLabel(item.score)}
              </span>
            </div>
            <div className="star-feedback-blocks">
              <div className={`feedback-sub-block ${(item.score ?? 0) > 70 ? 'strength' : 'mistake'}`}>
                <div className="block-title-row">
                  {(item.score ?? 0) > 70 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{(item.score ?? 0) > 70 ? 'Bạn làm tốt' : 'Điểm cần cải thiện'}</span>
                </div>
                <p className="block-desc">{item.issue}</p>
              </div>
              {(item.score ?? 0) <= 70 && item.advice && <div className="feedback-sub-block advice">
                <div className="block-title-row">
                  <Lightbulb size={16} />
                  <span>Cách cải thiện</span>
                </div>
                <p className="block-desc">{item.advice}</p>
              </div>}
            </div>
          </motion.div>
        ))}
      </div>

      {!structured?.coachReport && answers.length > 0 && (
        <motion.div
          className="model-answer-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 16 }}
        >
          <div className="model-answer-header">
            <Target size={20} />
            <span>Answer Detail</span>
          </div>
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: '#334155', fontSize: '0.9rem', lineHeight: 1.55 }}>
            {answers.map((a, i) => {
              const evidenceLabel = evidenceStatusLabel(a.evidenceStatus ?? null);
              return (
                <li key={a.id || i} style={{ marginBottom: 16 }}>
                  <strong>
                    Câu {(a.orderIndex ?? i) + 1}
                    {a.isFollowUp ? ' (Follow-up)' : ''}: {a.questionText || '—'}
                  </strong>
                  <div style={{ marginTop: 4, color: '#64748B' }}>
                    {a.skipped ? '(Đã bỏ qua)' : a.answerText || '—'}
                  </div>
                  {!a.skipped && (
                    <div style={{ marginTop: 6, fontSize: '0.85rem', color: '#475569' }}>
                      {!a.analysisAvailable ? (
                        <em>Analysis unavailable</em>
                      ) : (
                        <>
                          {a.relevanceScore != null && <span>Relevance: {a.relevanceScore} · </span>}
                          {a.completenessScore != null && (
                            <span>Completeness: {a.completenessScore} · </span>
                          )}
                          {a.communicationScore != null && (
                            <span>Communication: {a.communicationScore}</span>
                          )}
                          {a.technicalKnowledgeScore != null && (
                            <div>Technical: {a.technicalKnowledgeScore}</div>
                          )}
                          {a.problemSolvingScore != null && (
                            <div>Problem solving: {a.problemSolvingScore}</div>
                          )}
                          {a.starScore != null && <div>STAR: {a.starScore}</div>}
                          {evidenceLabel && (
                            <div style={{ marginTop: 2 }}>
                              Evidence: <strong>{evidenceLabel}</strong>
                              {a.evidenceStatus === 'MissingEvidence' ||
                              a.evidenceStatus === 'WeakEvidence'
                                ? ' — thiếu bằng chứng cụ thể (không đồng nghĩa CV giả)'
                                : ''}
                            </div>
                          )}
                          {a.followUpReason ? (
                            <div style={{ marginTop: 2, color: '#64748B' }}>
                              Improvement: {a.followUpReason}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}

      {!structured?.coachReport && <><div className="report-section-heading">
        <h3>Bảng điểm thành phần STAR & Clarity</h3>
        <span className="report-section-badge">Session</span>
      </div>

      <motion.div
        className="breakdown-bars-card"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
      >
        {[
          { name: 'Bối cảnh (Situation - S)', val: subs.S, color: '#03bfff' },
          { name: 'Nhiệm vụ (Task - T)', val: subs.T, color: '#5b6bff' },
          { name: 'Hành động (Action - A)', val: subs.A, color: '#10b981' },
          { name: 'Kết quả (Result - R)', val: subs.R, color: '#f59e0b' },
          { name: 'Sự rõ ràng & Mạch lạc (Clarity)', val: clarity, color: '#ec4899' },
        ].map((bar, idx) => (
          <div key={idx} className="score-bar-row">
            <span className="score-bar-label">{bar.name}</span>
            <div className="score-bar-track">
              {bar.val != null ? (
                <motion.div
                  className="score-bar-fill"
                  style={{ background: bar.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.val}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: idx * 0.08 }}
                />
              ) : null}
            </div>
            <span className="score-bar-value">{scoreLabel(bar.val)}</span>
          </div>
        ))}
      </motion.div></>}
    </div>
  );
};
