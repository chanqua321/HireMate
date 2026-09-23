import React, { useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertTriangle, Zap, RefreshCw, ArrowRight } from 'lucide-react';
import { useCvAnalysisPoller } from '../../hooks/useCvAnalysisPoller';
import type { CvItemDto } from '../../services/cv.service';
import './PostCvSuccessModal.css';

interface PostCvSuccessModalProps {
  /** ID của CV vừa tạo/upload. Truyền null/'' để đóng modal. */
  cvId: string | null;
  /** Title hiển thị — thường là displayName */
  cvDisplayName?: string;
  /** CV ban đầu trả về từ create/upload */
  initialCv?: CvItemDto | null;
  onClose: () => void;
  /** Sau khi user bấm "Kích hoạt & Vào phỏng vấn" */
  onActivateAndInterview: (cv: CvItemDto) => Promise<void>;
  /** Xem chi tiết / gợi ý CV */
  onViewDetail?: (cv: CvItemDto) => void;
}

function scoreColor(score?: number) {
  if (score == null) return '';
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

function scoreLabel(score?: number) {
  if (score == null) return '—';
  if (score >= 75) return `${score}/100 🟢`;
  if (score >= 50) return `${score}/100 🟡`;
  return `${score}/100 🔴`;
}

export const PostCvSuccessModal: React.FC<PostCvSuccessModalProps> = ({
  cvId,
  cvDisplayName,
  onClose,
  onActivateAndInterview,
  onViewDetail,
}) => {
  const [activating, setActivating] = React.useState(false);

  const handleReady = useCallback(() => {
    // nothing — just re-render with ready state
  }, []);

  const { status, cv, progress, errorMessage, retryAnalyze } = useCvAnalysisPoller(
    cvId,
    handleReady
  );

  const isOpen = !!cvId;

  const handleActivate = async () => {
    if (!cv || activating) return;
    setActivating(true);
    try {
      await onActivateAndInterview(cv);
    } finally {
      setActivating(false);
    }
  };

  const handleRetry = () => {
    if (cvId) retryAnalyze(cvId);
  };

  // Steps display
  const step1Done = status === 'ready' || status === 'timeout' || status === 'failed';
  const step2Active = status === 'polling';
  const step2Done = status === 'ready';
  const step3Pending = status !== 'ready';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pcv-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="pcv-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Trạng thái tạo CV"
          >
            {/* Close */}
            <button className="pcv-close-btn" onClick={onClose} aria-label="Đóng">
              <X size={15} />
            </button>

            {/* ─── HEADER ─── */}
            <div className="pcv-header">
              {status === 'ready' ? (
                <div className="pcv-icon success">✅</div>
              ) : status === 'timeout' || status === 'failed' ? (
                <div className="pcv-icon failed">⚠️</div>
              ) : (
                <div className="pcv-icon analyzing">🤖</div>
              )}

              <h2 className="pcv-title">
                {status === 'ready'
                  ? 'CV đã phân tích xong!'
                  : status === 'timeout' || status === 'failed'
                  ? 'Phân tích mất nhiều thời gian'
                  : 'CV đã lưu thành công!'}
              </h2>
              <p className="pcv-subtitle">
                {status === 'ready'
                  ? `"${cv?.displayName || cvDisplayName || 'CV của bạn'}" — Xem điểm ATS và kích hoạt để luyện phỏng vấn.`
                  : status === 'timeout' || status === 'failed'
                  ? 'AI chưa trả kết quả trong 30s. Bạn có thể thử lại hoặc bỏ qua và phân tích sau.'
                  : `"${cvDisplayName || 'CV của bạn'}" đã được lưu. AI đang trích xuất kỹ năng và chấm điểm ATS…`}
              </p>
            </div>

            {/* ─── ANALYZING STATE ─── */}
            {(status === 'polling' || status === 'idle') && (
              <>
                <div className="pcv-progress-wrap">
                  <div className="pcv-progress-label">
                    <span className="pcv-progress-text">
                      <Loader2 size={12} className="pcv-spin" style={{ display: 'inline', marginRight: 5 }} />
                      AI đang phân tích CV…
                    </span>
                    <span className="pcv-progress-pct">{progress}%</span>
                  </div>
                  <div className="pcv-progress-track">
                    <div
                      className="pcv-progress-bar shimmer"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="pcv-steps">
                  <div className="pcv-step">
                    <div className="pcv-step-dot done">✓</div>
                    <span className="pcv-step-text">Lưu CV &amp; tạo PDF thành công</span>
                  </div>
                  <div className="pcv-step">
                    <div className="pcv-step-dot active">
                      <Loader2 size={11} className="pcv-spin" />
                    </div>
                    <span className="pcv-step-text active-text">
                      AI đang trích xuất kỹ năng, kinh nghiệm &amp; chấm ATS…
                    </span>
                  </div>
                  <div className="pcv-step">
                    <div className="pcv-step-dot pending">3</div>
                    <span className="pcv-step-text muted">Kích hoạt CV &amp; vào phỏng vấn</span>
                  </div>
                </div>

                <div className="pcv-actions">
                  <button className="pcv-btn-secondary" onClick={onClose}>
                    Để sau, tôi sẽ quay lại
                  </button>
                </div>
              </>
            )}

            {/* ─── TIMEOUT / FAILED STATE ─── */}
            {(status === 'timeout' || status === 'failed') && (
              <>
                <div className="pcv-warning-box">
                  {errorMessage || 'Dịch vụ AI chưa trả kết quả. CV đã lưu an toàn — bạn có thể thử phân tích lại bất kỳ lúc nào từ Kho CV.'}
                </div>

                <div className="pcv-steps">
                  <div className="pcv-step">
                    <div className="pcv-step-dot done">✓</div>
                    <span className="pcv-step-text">Lưu CV &amp; tạo PDF thành công</span>
                  </div>
                  <div className="pcv-step">
                    <div className="pcv-step-dot failed" style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171' }}>!</div>
                    <span className="pcv-step-text" style={{ color: '#fca5a5' }}>AI chưa trả kết quả phân tích</span>
                  </div>
                  <div className="pcv-step">
                    <div className="pcv-step-dot pending">3</div>
                    <span className="pcv-step-text muted">Kích hoạt CV &amp; vào phỏng vấn</span>
                  </div>
                </div>

                <div className="pcv-actions">
                  <button className="pcv-btn-primary" onClick={handleRetry}>
                    <RefreshCw size={16} /> Thử phân tích lại
                  </button>
                  <button className="pcv-btn-secondary" onClick={onClose}>
                    Bỏ qua, xem Kho CV
                  </button>
                </div>
              </>
            )}

            {/* ─── READY STATE ─── */}
            {status === 'ready' && cv && (
              <>
                {/* ATS Score grid */}
                <div className="pcv-score-grid">
                  <div className="pcv-score-card">
                    <span className="pcv-score-label">ATS Score</span>
                    <span className={`pcv-score-value ${scoreColor(cv.overallScore)}`}>
                      {scoreLabel(cv.overallScore)}
                    </span>
                  </div>
                  <div className="pcv-score-card">
                    <span className="pcv-score-label">Định dạng</span>
                    <span className={`pcv-score-value ${scoreColor(cv.formatScore)}`}>
                      {cv.formatScore != null ? `${cv.formatScore}/100` : '—'}
                    </span>
                  </div>
                  {cv.parsedProfile?.desiredPosition && (
                    <div className="pcv-score-card full-width">
                      <span className="pcv-score-label">Vị trí phát hiện</span>
                      <span className="pcv-score-value" style={{ fontSize: '0.9rem' }}>
                        {cv.parsedProfile.desiredPosition}
                      </span>
                    </div>
                  )}
                  {cv.parsedProfile?.skills && cv.parsedProfile.skills.length > 0 && (
                    <div className="pcv-score-card full-width">
                      <span className="pcv-score-label">Kỹ năng phát hiện ({cv.parsedProfile.skills.length})</span>
                      <div className="pcv-skills-wrap">
                        {cv.parsedProfile.skills.slice(0, 8).map((sk) => (
                          <span key={sk} className="pcv-skill-chip">{sk}</span>
                        ))}
                        {cv.parsedProfile.skills.length > 8 && (
                          <span className="pcv-skill-chip" style={{ background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}>
                            +{cv.parsedProfile.skills.length - 8}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Warning if not parseSucceeded */}
                {!cv.parseSucceeded && (
                  <div className="pcv-parse-warn">
                    ⚠️ CV chưa đạt ngưỡng phân tích tốt. Bạn vẫn có thể kích hoạt nhưng hãy xem gợi ý cải thiện để phỏng vấn hiệu quả hơn.
                  </div>
                )}

                {/* Steps done */}
                <div className="pcv-steps">
                  <div className="pcv-step">
                    <div className="pcv-step-dot done">✓</div>
                    <span className="pcv-step-text">Lưu CV &amp; tạo PDF</span>
                  </div>
                  <div className="pcv-step">
                    <div className="pcv-step-dot done">✓</div>
                    <span className="pcv-step-text">AI phân tích &amp; chấm điểm ATS</span>
                  </div>
                  <div className="pcv-step">
                    <div className="pcv-step-dot active">3</div>
                    <span className="pcv-step-text active-text">Kích hoạt làm CV phỏng vấn</span>
                  </div>
                </div>

                <div className="pcv-actions">
                  <button
                    className="pcv-btn-primary green-btn"
                    onClick={handleActivate}
                    disabled={activating}
                    id="pcv-activate-btn"
                  >
                    {activating ? (
                      <><Loader2 size={16} className="pcv-spin" /> Đang kích hoạt…</>
                    ) : (
                      <><Zap size={16} /> Kích hoạt &amp; Bắt đầu phỏng vấn <ArrowRight size={14} /></>
                    )}
                  </button>
                  {onViewDetail && (
                    <button
                      className="pcv-btn-secondary"
                      onClick={() => onViewDetail(cv)}
                    >
                      Xem chi tiết gợi ý cải thiện
                    </button>
                  )}
                  <button className="pcv-btn-secondary" onClick={onClose}>
                    Để sau, xem Kho CV
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
