import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Star } from 'lucide-react';
import './DashboardHero.css';

interface DashboardHeroProps {
  greetingName: string;
  isProUser: boolean;
  onOpenGuideModal: () => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  greetingName,
  isProUser,
  onOpenGuideModal,
}) => {
  return (
    <motion.div
      className="dashboard-hero-row"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="dashboard-hero-text">
        <h1>Welcome back{greetingName}! 👋</h1>
        <p className="dashboard-hero-subtitle">
          Điền form Tạo CV một lần, xem trước rồi xác nhận để lưu vào Kho CV. Kích hoạt CV đã chấm điểm để luyện phỏng vấn AI.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!isProUser && (
          <button
            type="button"
            className="dashboard-guide-trigger-btn"
            onClick={onOpenGuideModal}
            title="Xem hướng dẫn tạo CV"
          >
            <BookOpen size={15} color="#0284c7" />
            <span>Hướng dẫn (Tutorial)</span>
          </button>
        )}

        {isProUser ? (
          <div className="pro-member-pill">
            <Star size={15} fill="#0284c7" color="#0284c7" />
            <span>Pro Member</span>
          </div>
        ) : (
          <div className="free-member-badge" title="Gói dịch vụ Miễn phí">
            <span>Tài khoản Free</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
