import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileCheck, Check, Video } from 'lucide-react';
import { UserCvCard } from '../Dashboard';
import './CvDetailModal.css';

interface CvDetailModalProps {
  isOpen: boolean;
  cv: UserCvCard | null;
  activeCvId: string;
  onClose: () => void;
  onSelectActiveCv: (cv: UserCvCard) => void;
  onNavigateInterview: () => void;
}

export const CvDetailModal: React.FC<CvDetailModalProps> = ({
  isOpen,
  cv,
  activeCvId,
  onClose,
  onSelectActiveCv,
  onNavigateInterview,
}) => {
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
            <button
              type="button"
              onClick={onClose}
              className="modal-close-circle-btn"
            >
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
              </div>
            </div>

            {/* ATS Scores Breakdown Grid */}
            <div className="cv-detail-scores-grid">
              <div className="ats-score-box">
                <span>Điểm ATS</span>
                <strong style={{ color: '#0284C7' }}>{cv.atsScore}/100</strong>
              </div>
              <div className="ats-score-box">
                <span>Định dạng</span>
                <strong style={{ color: '#16A34A' }}>{cv.formatScore || 92}/100</strong>
              </div>
              <div className="ats-score-box">
                <span>Từ khóa</span>
                <strong style={{ color: '#D97706' }}>{cv.keywordsScore || 88}/100</strong>
              </div>
              <div className="ats-score-box">
                <span>Độ dễ đọc</span>
                <strong style={{ color: '#7C3AED' }}>{cv.readabilityScore || 90}/100</strong>
              </div>
            </div>

            {/* Details sections */}
            <div className="cv-detail-meta-two-col">
              <div className="cv-detail-meta-card">
                <span>Kinh nghiệm:</span>
                <strong style={{ color: '#0F172A' }}>{cv.exp}</strong>
              </div>
              <div className="cv-detail-meta-card">
                <span>Trình độ học vấn:</span>
                <strong style={{ color: '#0F172A' }}>{cv.education}</strong>
              </div>
            </div>

            {/* Skills */}
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

            {/* Bio summary */}
            {cv.bio && (
              <div className="cv-detail-bio-box">
                <span className="cv-detail-bio-label">
                  Tóm tắt hồ sơ & Điểm mạnh:
                </span>
                <p className="cv-detail-bio-content">{cv.bio}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="cv-detail-actions-footer">
              <button
                type="button"
                onClick={() => {
                  onSelectActiveCv(cv);
                  onClose();
                }}
                className="cv-detail-set-active-btn"
                style={{
                  background: cv.id === activeCvId ? '#E2E8F0' : 'linear-gradient(135deg, #0284C7 0%, #03BFFF 100%)',
                  color: cv.id === activeCvId ? '#475569' : '#FFFFFF',
                }}
              >
                <Check size={16} />
                <span>{cv.id === activeCvId ? 'CV này đang được kích hoạt' : 'Chọn làm CV phỏng vấn chính'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectActiveCv(cv);
                  onClose();
                  onNavigateInterview();
                }}
                className="cv-detail-interview-btn"
              >
                <Video size={16} />
                <span>Phỏng vấn ngay</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
