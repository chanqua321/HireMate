import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileCheck, Check, Video, Lightbulb, RefreshCw, AlertTriangle, Save } from 'lucide-react';
import { UserCvCard } from '../Dashboard';
import { AiTextAssistBar } from './AiTextAssistBar';
import './CvDetailModal.css';

interface CvDetailModalProps {
  isOpen: boolean;
  cv: UserCvCard | null;
  activeCvId: string;
  onClose: () => void;
  onSelectActiveCv: (cv: UserCvCard) => void | Promise<void>;
  onNavigateInterview: () => void;
  onReAnalyze?: (cv: UserCvCard) => void | Promise<void>;
  onSaveBio?: (cvId: string, bio: string) => void | Promise<void>;
}

export const CvDetailModal: React.FC<CvDetailModalProps> = ({
  isOpen,
  cv,
  activeCvId,
  onClose,
  onSelectActiveCv,
  onNavigateInterview,
  onReAnalyze,
  onSaveBio,
}) => {
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const [draftBio, setDraftBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioMsg, setBioMsg] = useState('');
  const tips = cv?.suggestions?.filter(Boolean) || [];
  const ready = !!cv?.parseSucceeded;

  useEffect(() => {
    if (cv) {
      setDraftBio(cv.bio || '');
      setBioMsg('');
    }
  }, [cv?.id, cv?.bio, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && cv && (
        <div className="cv-detail-modal-overlay" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.25 }}
            className="cv-detail-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={onClose} className="modal-close-circle-btn">
              <X size={18} />
            </button>

            <div className="cv-detail-top-info">
              <div className="cv-detail-icon-box">
                <FileCheck size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {cv.title}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#64748B' }}>
                  {cv.role} • {cv.field}
                </p>
                <p
                  style={{
                    margin: '8px 0 0',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: ready ? '#15803D' : '#B45309',
                  }}
                >
                  {ready
                    ? 'Đã phân tích — có thể luyện phỏng vấn sau khi xem gợi ý.'
                    : 'CV chưa được chấm điểm. Bạn có thể thử phân tích lại.'}
                </p>
              </div>
            </div>

            <div className="cv-detail-scores-grid">
              <div className="ats-score-box">
                <span>Điểm ATS</span>
                <strong style={{ color: cv.atsScore < 50 ? '#B45309' : '#0284C7' }}>{ready ? `${cv.atsScore}/100` : 'Chưa chấm'}</strong>
              </div>
              <div className="ats-score-box">
                <span>Định dạng</span>
                <strong style={{ color: '#16A34A' }}>{ready ? `${cv.formatScore || 0}/100` : '—'}</strong>
              </div>
              <div className="ats-score-box">
                <span>Từ khóa</span>
                <strong style={{ color: '#D97706' }}>{ready ? `${cv.keywordsScore || 0}/100` : '—'}</strong>
              </div>
              <div className="ats-score-box">
                <span>Độ dễ đọc</span>
                <strong style={{ color: '#7C3AED' }}>{ready ? `${cv.readabilityScore || 0}/100` : '—'}</strong>
              </div>
            </div>

            {ready && cv.atsScore < 50 ? (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                }}
              >
                <div style={{ fontWeight: 750, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="#B45309" />
                  ⚠️ CV nên được cải thiện
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.84rem', color: '#78350F' }}>
                  Điểm CV: {cv.atsScore}/100. Hệ thống không tự sửa database — dùng AI diễn đạt bên dưới để xem preview, rồi chọn Giữ bản cũ / Dùng bản AI.
                </p>
              </div>
            ) : ready ? (
              <p style={{ margin: '12px 0 0', fontSize: '0.84rem', color: '#15803D', fontWeight: 650 }}>
                ✓ CV có thể sử dụng
              </p>
            ) : null}

            {tips.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: ready ? '#F0FDF4' : '#FFFBEB',
                  border: `1px solid ${ready ? '#BBF7D0' : '#FDE68A'}`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    fontWeight: 750,
                    color: '#0F172A',
                    fontSize: '0.9rem',
                  }}
                >
                  {ready ? <Lightbulb size={16} color="#15803D" /> : <AlertTriangle size={16} color="#B45309" />}
                  Gợi ý cải thiện CV
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#334155', fontSize: '0.86rem', lineHeight: 1.5 }}>
                  {tips.map((t) => (
                    <li key={t} style={{ marginBottom: 4 }}>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="cv-detail-meta-two-col">
              <div className="cv-detail-meta-card">
                <span>Kinh nghiệm:</span>
                <strong style={{ color: '#0F172A' }}>{cv.exp}</strong>
              </div>
              <div className="cv-detail-meta-card">
                <span>Trình độ học vấn:</span>
                <strong style={{ color: '#0F172A' }}>{cv.education || '—'}</strong>
              </div>
            </div>

            <div className="cv-detail-skills-wrap">
              <span className="cv-detail-skills-label">
                Kỹ năng chuyên môn trích xuất ({cv.skills.length}):
              </span>
              <div className="cv-detail-skills-chips">
                {cv.skills.map((s) => (
                  <span key={s} className="cv-detail-skill-chip">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="cv-detail-bio-box" style={{ marginTop: 12 }}>
              <span className="cv-detail-bio-label">Giới thiệu / Bio (sửa trực tiếp)</span>
              <textarea
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                rows={4}
                placeholder="Nhập ý của bạn… dùng AI diễn đạt hoặc dịch Anh/Việt bên dưới."
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <AiTextAssistBar
                value={draftBio}
                onChange={setDraftBio}
                field="bio"
                context={[cv.role, cv.field].filter(Boolean).join(' · ')}
                disabled={savingBio}
              />
              {onSaveBio && (
                <button
                  type="button"
                  disabled={savingBio || draftBio.trim() === (cv.bio || '').trim()}
                  onClick={async () => {
                    setSavingBio(true);
                    setBioMsg('');
                    try {
                      await onSaveBio(cv.id, draftBio.trim());
                      setBioMsg('Đã lưu bio vào hồ sơ.');
                    } catch (e: any) {
                      setBioMsg(e?.message || 'Không lưu được bio.');
                    } finally {
                      setSavingBio(false);
                    }
                  }}
                  style={{
                    marginTop: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284C7',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    opacity: savingBio ? 0.7 : 1,
                  }}
                >
                  <Save size={14} />
                  {savingBio ? 'Đang lưu…' : 'Lưu bio đã chỉnh'}
                </button>
              )}
              {bioMsg ? (
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#15803D' }}>{bioMsg}</p>
              ) : null}
            </div>

            <div className="cv-detail-actions-footer">
              {onReAnalyze && (
                <button
                  type="button"
                  disabled={reAnalyzing}
                  onClick={async () => {
                    setReAnalyzing(true);
                    try {
                      await onReAnalyze(cv);
                    } finally {
                      setReAnalyzing(false);
                    }
                  }}
                  className="cv-detail-set-active-btn"
                  style={{ background: '#F1F5F9', color: '#0F172A' }}
                >
                  <RefreshCw size={16} className={reAnalyzing ? 'animate-spin' : undefined} />
                  <span>{reAnalyzing ? 'Đang phân tích…' : ready ? 'Phân tích lại sau khi sửa' : 'Chấm điểm CV'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onSelectActiveCv(cv);
                  onClose();
                }}
                className="cv-detail-set-active-btn"
                style={{
                  background:
                    cv.id === activeCvId ? '#E2E8F0' : 'linear-gradient(135deg, #0284C7 0%, #03BFFF 100%)',
                  color: cv.id === activeCvId ? '#475569' : '#FFFFFF',
                }}
              >
                <Check size={16} />
                <span>{cv.id === activeCvId ? 'CV này đang được kích hoạt' : 'Chọn làm CV phỏng vấn chính'}</span>
              </button>

              <button
                type="button"
                disabled={!ready}
                title={ready ? 'Bắt đầu phỏng vấn' : 'Cần phân tích CV thành công trước'}
                onClick={() => {
                  if (!ready) return;
                  onSelectActiveCv(cv);
                  onClose();
                  onNavigateInterview();
                }}
                className="cv-detail-interview-btn"
                style={{ opacity: ready ? 1 : 0.45, cursor: ready ? 'pointer' : 'not-allowed' }}
              >
                <Video size={16} />
                <span>{ready ? 'Phỏng vấn ngay' : 'Chưa thể phỏng vấn'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
