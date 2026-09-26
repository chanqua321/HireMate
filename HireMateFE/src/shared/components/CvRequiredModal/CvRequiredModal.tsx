import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  UploadCloud,
  CheckCircle2,
  X,
  ArrowRight,
  Bot,
} from 'lucide-react';
import './CvRequiredModal.css';

interface CvRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUpload?: () => void;
  onSelectCreate?: () => void;
  onContinueAnyway?: () => void;
}

export const CvRequiredModal: React.FC<CvRequiredModalProps> = ({
  isOpen,
  onClose,
  onSelectUpload,
  onSelectCreate,
  onContinueAnyway,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpload = () => {
    onClose();
    if (onSelectUpload) {
      onSelectUpload();
    } else {
      navigate('/dashboard?tab=scan&action=upload');
    }
  };

  const handleCreate = () => {
    onClose();
    if (onSelectCreate) {
      onSelectCreate();
    } else {
      navigate('/dashboard?tab=manual');
    }
  };

  return (
    <AnimatePresence>
      <div className="cv-req-backdrop" onClick={onClose}>
        <motion.div
          className="cv-req-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.93, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 18 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* Close Button */}
          <button
            type="button"
            className="cv-req-close-btn"
            onClick={onClose}
            aria-label="Đóng thông báo"
          >
            <X size={18} />
          </button>

          {/* Icon Header */}
          <div className="cv-req-icon-ring">
            <div className="cv-req-inner-icon">
              <Bot size={28} />
            </div>
            <span className="cv-req-sparkle-dot">
              <Sparkles size={14} />
            </span>
          </div>

          {/* Heading */}
          <div className="cv-req-heading">
            <h3 className="cv-req-title">Bạn cần có CV để bước vào phòng phỏng vấn AI</h3>
            <p className="cv-req-desc">
              AI Coach của HireMate cần phân tích hồ sơ CV của bạn (kỹ năng, học vấn, kinh nghiệm và vị trí ứng tuyển) để tự động cá nhân hóa bộ câu hỏi phỏng vấn chuẩn theo năng lực thực tế.
            </p>
          </div>

          {/* Why CV is needed bullets */}
          <div className="cv-req-benefits">
            <div className="cv-req-benefit-item">
              <CheckCircle2 size={16} className="cv-req-benefit-icon" />
              <span>Câu hỏi chuyên môn & tình huống chuẩn STAR sát với năng lực của bạn</span>
            </div>
            <div className="cv-req-benefit-item">
              <CheckCircle2 size={16} className="cv-req-benefit-icon" />
              <span>Chấm điểm ATS và đo lường chỉ số sẵn sàng nghề nghiệp (Career Readiness)</span>
            </div>
          </div>

          {/* 3-Step visual guide */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', background: 'rgba(139,92,246,0.07)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.15)' }}>
            <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700, whiteSpace: 'nowrap' }}>Luồng:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>① Tạo / Tải CV</span>
              <span>→</span>
              <span style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>② Kích hoạt CV</span>
              <span>→</span>
              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>③ Phỏng vấn ✓</span>
            </div>
          </div>

          {/* 2 Primary Choices */}
          <div className="cv-req-actions-grid">
            <button
              type="button"
              className="cv-req-action-card primary"
              onClick={handleUpload}
            >
              <div className="cv-req-action-icon upload">
                <UploadCloud size={20} />
              </div>
              <div className="cv-req-action-text">
                <div className="cv-req-action-title">
                  <span>Tải lên CV có sẵn</span>
                  <span className="cv-req-rec-tag">Nhanh nhất</span>
                </div>
                <p className="cv-req-action-sub">
                  File .PDF, .DOCX — AI tự động trích xuất, chấm điểm ATS và hướng dẫn kích hoạt ngay.
                </p>
              </div>
              <ArrowRight size={16} className="cv-req-action-arrow" />
            </button>

            <button
              type="button"
              className="cv-req-action-card secondary"
              onClick={handleCreate}
            >
              <div className="cv-req-action-icon ai">
                <Sparkles size={20} />
              </div>
              <div className="cv-req-action-text">
                <div className="cv-req-action-title">
                  <span>Tạo CV mới với AI</span>
                </div>
                <p className="cv-req-action-sub">
                  Điền thông tin cơ bản → AI tạo PDF chuẩn ATS → kích hoạt → vào phỏng vấn.
                </p>
              </div>
              <ArrowRight size={16} className="cv-req-action-arrow" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
