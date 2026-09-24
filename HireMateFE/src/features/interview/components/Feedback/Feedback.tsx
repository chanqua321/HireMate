import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lightbulb, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { useApp } from '../../../../app/context/AppContext';
import { interviewService } from '../../api/interview.service';
import type { InterviewAnswerDetail, InterviewSessionDetail, StructuredFeedback } from '../../types';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import './css/Feedback.css';

type Language = 'vi' | 'en';
type Dimension = { name: string; score: number; confidence: number | null; status: string; evidence: string[]; reason: string };
type AnalysisDetails = { dimensions: Dimension[]; comment: string; starTip: string };

const labels: Record<Language, Record<string, string>> = {
  vi: {
    title: 'Phản hồi phỏng vấn', overview: 'Tổng quan', score: 'Điểm theo tiêu chí',
    strengths: 'Điểm mạnh', evidence: 'Bằng chứng', improve: 'Cần cải thiện',
    advice: 'Gợi ý cải thiện', followUp: 'Câu hỏi tiếp theo', answers: 'Phân tích từng câu trả lời',
    question: 'Câu', answer: 'Câu trả lời', unavailable: 'Chưa thể phân tích câu trả lời.',
    noStrength: 'Chưa có điểm mạnh nổi bật được xác định.',
    noEvidence: 'Chưa có bằng chứng đủ mạnh được ghi nhận.',
    noWeakness: 'Chưa xác định được điểm cần cải thiện cụ thể.',
    noAdvice: 'Chưa có gợi ý cụ thể từ kết quả phân tích.',
    noSummary: 'Chưa có nhận xét tổng quan từ kết quả phân tích.',
    confidence: 'Độ tin cậy', retry: 'Luyện tập lại', dashboard: 'Bảng điều khiển',
    loading: 'Đang tải báo cáo phỏng vấn…', noReport: 'Chưa có báo cáo phỏng vấn',
    noReportDetail: 'Hoàn thành một buổi phỏng vấn để xem phản hồi.',
    languageError: 'Không tải được ngôn ngữ phiên phỏng vấn.',
    skipped: 'Đã bỏ qua', status: 'Mức bằng chứng', needsExample: 'Được đề cập, nhưng chưa có ví dụ thực tế chứng minh việc áp dụng.',
    verified: 'Trích dẫn đã được đối chiếu với câu trả lời; chưa xác minh năng lực thực tế.',
    strong: 'Bằng chứng cụ thể trong câu trả lời.', weak: 'Chưa có ví dụ đủ cụ thể để chứng minh việc áp dụng.',
    missing: 'Chưa có bằng chứng trong câu trả lời.', validation: 'Thông tin này cần được xác minh thêm.',
    inconsistent: 'Có điểm chưa nhất quán với CV; cần làm rõ.',
    excellent: 'Rất tốt', good: 'Khá tốt', developing: 'Cần cải thiện',
    star: 'Phân tích STAR', related: 'Liên quan đến câu', quote: 'Trích dẫn từ câu trả lời',
    gap: 'Khoảng trống bằng chứng', questionFollowUp: 'Câu hỏi làm rõ',
    mention: 'Được đề cập trong câu trả lời',
  },
  en: {
    title: 'Interview feedback', overview: 'Overview', score: 'Scores by criterion',
    strengths: 'Strengths', evidence: 'Evidence', improve: 'Areas to improve',
    advice: 'How to improve', followUp: 'Follow-up question', answers: 'Answer-by-answer analysis',
    question: 'Question', answer: 'Answer', unavailable: 'This answer could not be analyzed.',
    noStrength: 'No clear strength has been identified.',
    noEvidence: 'No strong evidence has been recorded.',
    noWeakness: 'No specific improvement area has been identified.',
    noAdvice: 'No specific advice is available from the analysis.',
    noSummary: 'No overall comment is available from the analysis.',
    confidence: 'Confidence', retry: 'Practice again', dashboard: 'Dashboard',
    loading: 'Loading interview report…', noReport: 'No interview report yet',
    noReportDetail: 'Complete an interview to see feedback.',
    languageError: 'Could not load the interview language.',
    skipped: 'Skipped', status: 'Evidence status', needsExample: 'Mentioned, but no practical example demonstrates its use.',
    verified: 'Quote checked against the answer; practical ability has not been verified.',
    strong: 'Concrete evidence in the answer.', weak: 'No sufficiently concrete example demonstrates its use.',
    missing: 'No evidence in the answer.', validation: 'This information needs further validation.',
    inconsistent: 'Potential inconsistency with the CV; clarification is needed.',
    excellent: 'Very good', good: 'Good', developing: 'Needs improvement',
    star: 'STAR analysis', related: 'Related to question', quote: 'Quote from answer',
    gap: 'Evidence gap', questionFollowUp: 'Clarifying question',
    mention: 'Mentioned in the answer',
  },
};

const dimensionLabels: Record<string, [string, string]> = {
  relevance: ['Đúng trọng tâm', 'Relevance'],
  completeness: ['Độ đầy đủ', 'Completeness'],
  technicalKnowledge: ['Kiến thức kỹ thuật', 'Technical knowledge'],
  problemSolving: ['Giải quyết vấn đề', 'Problem solving'],
  communication: ['Giao tiếp', 'Communication'],
  star: ['STAR', 'STAR'],
  evidence: ['Bằng chứng', 'Evidence'],
  cvConsistency: ['Khớp với CV', 'CV consistency'],
};

function localizedDimension(name: string, language: Language): string {
  return dimensionLabels[name]?.[language === 'vi' ? 0 : 1] ?? name;
}

function statusText(status: string, language: Language): string {
  const values: Record<string, [string, string]> = {
    Verified: ['Trích dẫn đã đối chiếu', 'Quote verified'],
    StrongEvidence: ['Bằng chứng rõ', 'Strong evidence'],
    WeakEvidence: ['Bằng chứng yếu', 'Weak evidence'],
    MissingEvidence: ['Thiếu bằng chứng', 'Missing evidence'],
    NeedsValidation: ['Cần xác minh', 'Needs validation'],
    CvInconsistency: ['Chưa khớp CV', 'CV inconsistency'],
  };
  return values[status]?.[language === 'vi' ? 0 : 1] ?? status;
}

function statusExplanation(status: string, language: Language): string {
  const key: Record<string, string> = {
    Verified: 'verified', StrongEvidence: 'strong', WeakEvidence: 'weak',
    MissingEvidence: 'missing', NeedsValidation: 'validation', CvInconsistency: 'inconsistent',
  };
  return labels[language][key[status] ?? 'mention'];
}

function parseAnalysis(value: string | null | undefined): AnalysisDetails {
  const empty: AnalysisDetails = { dimensions: [], comment: '', starTip: '' };
  if (!value) return empty;
  try {
    const raw = JSON.parse(value) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') return empty;
    const source = raw.Dimensions ?? raw.dimensions;
    const dimensions = source && typeof source === 'object' && !Array.isArray(source)
      ? Object.entries(source).flatMap(([name, item]) => {
        if (!item || typeof item !== 'object') return [];
        const data = item as Record<string, unknown>;
        const score = data.Score ?? data.score;
        if (typeof score !== 'number' || !Number.isFinite(score)) return [];
        const evidence = data.Evidence ?? data.evidence;
        const confidence = data.Confidence ?? data.confidence;
        return [{
          name, score, confidence: typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : null,
          status: String(data.Status ?? data.status ?? ''),
          evidence: Array.isArray(evidence) ? evidence.filter((q): q is string => typeof q === 'string' && Boolean(q.trim())) : [],
          reason: typeof (data.Reason ?? data.reason) === 'string' ? String(data.Reason ?? data.reason) : '',
        }];
      }) : [];
    return {
      dimensions,
      comment: typeof raw.FeedbackComment === 'string' ? raw.FeedbackComment : '',
      starTip: typeof raw.StarTip === 'string' ? raw.StarTip : '',
    };
  } catch {
    return empty;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="feedback-explain-card"><h2>{title}</h2>{children}</section>;
}

export const Feedback: React.FC = () => {
  const { lastResult } = useApp();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [session, setSession] = useState<InterviewSessionDetail | null>(null);
  const [feedback, setFeedback] = useState<StructuredFeedback | null>(null);
  const [language, setLanguage] = useState<Language | null>(sessionId ? null : 'vi');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    if (!localStorage.getItem('hm_access_token')) { setLoading(false); setLanguage('vi'); return; }
    let active = true;
    Promise.all([
      interviewService.getDetail(sessionId),
      interviewService.getFeedback(sessionId),
      interviewService.getLanguage(sessionId),
    ]).then(([detail, result, lang]) => {
      if (!active) return;
      if (detail.ok && detail.data) setSession(detail.data);
      else setError(detail.message || '');
      if (result.ok && result.data) setFeedback(result.data);
      else if (detail.data?.structuredFeedback) setFeedback(detail.data.structuredFeedback);
      if (lang.ok && lang.data?.language) setLanguage(lang.data.language);
      else setError(lang.message || labels.vi.languageError);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : labels.vi.noReportDetail);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sessionId]);

  const l = labels[language ?? 'vi'];
  if (loading) return <div className="feedback-page-container feedback-state"><Loader2 className="animate-spin" />{l.loading}</div>;
  if (sessionId && language === null) return <div className="feedback-page-container feedback-state" role="alert">{error || labels.vi.languageError}</div>;
  if (!session && !feedback && !(sessionId ? null : lastResult)) return (
    <div className="feedback-page-container feedback-state">
      <AlertTriangle size={28} /><h1>{l.noReport}</h1><p>{error || l.noReportDetail}</p>
      <Link to="/interview-setup" className="btn-report-primary">{l.retry}</Link>
    </div>
  );

  const answers = session?.answers ?? [];
  const local = sessionId ? null : lastResult;
  const overall = feedback?.coachReport?.summary.overallScore ?? feedback?.overallScore ?? session?.overallScore ?? local?.overall ?? null;
  const summary = feedback?.coachReport?.summary.headline || feedback?.summary || session?.feedbackSummary || '';
  const strengths = feedback?.strengths ?? [];
  const weaknesses = feedback?.weaknesses ?? [];
  const improvements = feedback?.improvements ?? [];
  const evidenceGaps = feedback?.evidenceGaps ?? [];
  const starAnalysis = feedback?.coachReport?.starAnalysis;
  const starItems = starAnalysis ? (['situation', 'task', 'action', 'result'] as const)
    .flatMap(key => starAnalysis[key]?.score == null ? [] : [{ key, ...starAnalysis[key] }]) : [];
  const scoreRows = [
    ['relevance', feedback?.categoryScores?.relevance],
    ['completeness', feedback?.categoryScores?.completeness],
    ['technicalKnowledge', feedback?.categoryScores?.technical],
    ['problemSolving', feedback?.categoryScores?.problemSolving],
    ['communication', feedback?.categoryScores?.communication],
    ['star', feedback?.categoryScores?.star],
    ['cvConsistency', feedback?.categoryScores?.cvConsistency],
  ] as const;
  const applicableScores = scoreRows.flatMap(([name, score]) => score == null ? [] : [{ name, score }]);
  const validAnswers = answers.filter(a => a.analysisAvailable && !a.skipped);
  const hasEvidence = validAnswers.some(a => parseAnalysis(a.analysisJson).dimensions.some(d => d.evidence.length)) || evidenceGaps.length > 0;
  const band = overall == null ? '' : overall >= 85 ? l.excellent : overall >= 60 ? l.good : l.developing;

  return (
    <div className="feedback-page-container feedback-explain-page">
      <InterviewStepper currentStep={3} />
      <header className="feedback-explain-hero">
        <div>
          <span className="feedback-eyebrow"><Sparkles size={15} /> {l.overview}</span>
          <h1>{l.title}{session?.position ? ` · ${session.position}` : ''}</h1>
          <p>{summary || (overall == null && !answers.some(a => a.analysisAvailable) ? l.unavailable : l.noSummary)}</p>
          <div className="feedback-hero-actions">
            <Link to="/interview-setup" className="btn-report-primary"><RotateCcw size={16} />{l.retry}</Link>
            <Link to="/dashboard" className="btn-report-ghost">{l.dashboard}</Link>
          </div>
        </div>
        <div className="feedback-explain-score">
          <strong>{overall == null ? '—' : overall}</strong><span>{overall == null ? '' : '/ 100'}</span>
          {band && <small>{band}</small>}
        </div>
      </header>

      {applicableScores.length > 0 && <Section title={l.score}>
        <div className="feedback-dimension-grid">
          {applicableScores.map(({ name, score }) => <div className="feedback-dimension" key={name}>
            <span>{localizedDimension(name, language ?? 'vi')}</span><strong>{score}</strong>
          </div>)}
        </div>
      </Section>}

      <div className={`feedback-explain-columns ${weaknesses.length ? '' : 'single'}`}>
        <Section title={l.strengths}>
          {strengths.length ? <ul className="feedback-explain-list">{strengths.map((item, i) =>
            <li key={i}><CheckCircle2 size={17} /><div><strong>{item.area}</strong><p>{item.description}</p>{item.evidence && <small>{item.evidence}</small>}</div></li>)}</ul>
            : <p className="feedback-empty">{l.noStrength}</p>}
        </Section>
        {weaknesses.length > 0 && <Section title={l.improve}>
          <ul className="feedback-explain-list">{weaknesses.map((item, i) =>
            <li key={i}><AlertTriangle size={17} /><div><strong>{item.area}</strong><p>{item.description}</p>{item.evidence && <small>{item.evidence}</small>}</div></li>)}</ul>
        </Section>}
      </div>

      <Section title={l.evidence}>
        {!hasEvidence ? <p className="feedback-empty">{validAnswers.length ? l.noEvidence : l.unavailable}</p> : <>
          {validAnswers.map(a => {
            const dimensions = parseAnalysis(a.analysisJson).dimensions.filter(d => d.evidence.length > 0);
            return dimensions.length ? <div className="feedback-evidence-group" key={a.id ?? a.orderIndex}>
              <h3>{l.question} {a.orderIndex + 1}: {a.questionText}</h3>
              {dimensions.map(d => <div className="feedback-evidence-item" key={d.name}>
                <div><strong>{localizedDimension(d.name, language ?? 'vi')}</strong>
                  <span className="feedback-status">{statusText(d.status, language ?? 'vi')}</span></div>
                {d.evidence.map((quote, index) => <blockquote key={index}>“{quote}”</blockquote>)}
                <p>{statusExplanation(d.status, language ?? 'vi')}</p>
              </div>)}
            </div> : null;
          })}
          {evidenceGaps.map((gap, i) => <div className="feedback-evidence-item" key={gap.answerId || i}>
            <strong>{l.question} {gap.orderIndex + 1}: {gap.question}</strong>
            <span className="feedback-status">{statusText(gap.status, language ?? 'vi')}</span>
            <p>{gap.gap}</p>
          </div>)}
        </>}
      </Section>

      <Section title={l.advice}>
        {improvements.length || evidenceGaps.some(g => g.suggestion) || starItems.some(item => item.score != null && item.score <= 70 && item.advice) ? <ul className="feedback-explain-list">
          {improvements.map((item, i) => <li key={i}><Lightbulb size={17} /><span>{item}</span></li>)}
          {evidenceGaps.filter(g => g.suggestion).map((gap, i) => <li key={`gap-${i}`}><Lightbulb size={17} /><span>{gap.suggestion}</span></li>)}
          {starItems.filter(item => item.score != null && item.score <= 70 && item.advice).map(item =>
            <li key={item.key}><Lightbulb size={17} /><span>{item.advice}</span></li>)}
        </ul> : <p className="feedback-empty">{l.noAdvice}</p>}
      </Section>

      {starItems.length > 0 && <Section title={l.star}>
        <div className="feedback-dimension-grid">{starItems.map(item =>
          <div className="feedback-star-item" key={item.key}>
            <div><strong>{item.key === 'situation' ? 'S' : item.key === 'task' ? 'T' : item.key === 'action' ? 'A' : 'R'}</strong><b>{item.score}/100</b></div>
            {item.issue && <p>{item.issue}</p>}
            {item.score != null && item.score <= 70 && item.advice && <small>{item.advice}</small>}
          </div>)}</div>
      </Section>}

      {answers.length > 0 && <Section title={l.answers}>
        <div className="feedback-answer-list">{answers.map((a, i) => {
          const analysis = parseAnalysis(a.analysisJson);
          const linkedFollowUp = answers.find(next => next.isFollowUp && next.orderIndex === a.orderIndex + 1)?.questionText;
          return <article className="feedback-answer-card" key={a.id ?? i}>
            <h3>{l.question} {a.orderIndex + 1}: {a.questionText}</h3>
            <p className="feedback-answer-text"><strong>{l.answer}: </strong>{a.skipped ? l.skipped : a.answerText || '—'}</p>
            {!a.skipped && (!a.analysisAvailable ? <p className="feedback-empty">{l.unavailable}</p> : <>
              {analysis.comment && <p className="feedback-answer-comment">{analysis.comment}</p>}
              {analysis.dimensions.length > 0 && <div className="feedback-answer-dimensions">
                <h4>{l.score}</h4>
                {analysis.dimensions.map(d => <div className="feedback-answer-dimension" key={d.name}>
                  <div><strong>{localizedDimension(d.name, language ?? 'vi')}</strong><b>{d.score}/100</b></div>
                  {d.confidence != null && <small>{l.confidence}: {Math.round(d.confidence * 100)}%</small>}
                  {d.reason && <p>{d.reason}</p>}
                  {d.status && <span className="feedback-status">{statusText(d.status, language ?? 'vi')}</span>}
                </div>)}
              </div>}
              {!analysis.dimensions.length && !analysis.comment && <p className="feedback-empty">{l.unavailable}</p>}
              {analysis.starTip && <p className="feedback-answer-tip"><Lightbulb size={16} />{analysis.starTip}</p>}
              {a.followUpReason && <p className="feedback-answer-tip">{l.gap}: {a.followUpReason}</p>}
              {linkedFollowUp && <div className="feedback-follow-up"><h4>🔄 {l.followUp}</h4><p>{linkedFollowUp}</p></div>}
            </>)}
          </article>;
        })}</div>
      </Section>}
    </div>
  );
};
