import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  LogIn,
  UserPlus,
  ShieldCheck,
  Bot,
  BrainCircuit,
  ArrowRight,
} from 'lucide-react';
import './css/AuthRequiredModal.css';

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  featureName = 'tính năng này',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      <div className="auth-modal-backdrop" onClick={onClose}>
        <motion.div
          className="auth-modal-card"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Close Button */}
          <button
            type="button"
            className="auth-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng modal"
          >
            <X size={18} />
          </button>

          {/* Icon Header */}
          <div className="auth-modal-icon-ring">
            <div className="auth-modal-inner-icon">
              <Lock size={28} />
            </div>
            <span className="auth-modal-sparkle-dot">
              <Sparkles size={14} />
            </span>
          </div>

          {/* Title & Subtitle */}
          <div className="auth-modal-heading">
            <h3 className="auth-modal-title">Đăng nhập để mở khóa {featureName}</h3>
            <p className="auth-modal-desc">
              Bạn cần có tài khoản HireMate để lưu trữ hồ sơ, luyện tập phỏng vấn thực chiến cùng AI và nhận báo cáo đánh giá năng lực chuẩn STAR.
            </p>
          </div>

          {/* Key Benefits Checklist */}
          <div className="auth-modal-benefits">
            <div className="benefit-item">
              <CheckCircle2 size={16} className="benefit-icon" />
              <span>Phỏng vấn mô phỏng 1-1 không giới hạn với Cố vấn AI</span>
            </div>
            <div className="benefit-item">
              <CheckCircle2 size={16} className="benefit-icon" />
              <span>Phân tích câu trả lời theo 4 yếu tố STAR chuẩn JD</span>
            </div>
            <div className="benefit-item">
              <CheckCircle2 size={16} className="benefit-icon" />
              <span>Truy cập 500+ câu hỏi tuyển dụng độc quyền các ngành nghề</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="auth-modal-actions">
            <button
              type="button"
              className="btn-auth-primary"
              onClick={() => handleNavigate('/login')}
            >
              <LogIn size={18} />
              <span>Đăng nhập ngay</span>
            </button>

            <button
              type="button"
              className="btn-auth-secondary"
              onClick={() => handleNavigate('/register')}
            >
              <UserPlus size={18} />
              <span>Tạo tài khoản miễn phí</span>
            </button>
          </div>

          <div className="auth-modal-footer">
            <span>✨ Miễn phí trải nghiệm • Không yêu cầu thẻ tín dụng</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
