import React from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import './RoomSidebar.css';

interface RoomSidebarProps {
  hint?: string;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({ hint }) => {
  return (
    <motion.div
      className="room-sidebar-stack"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      {/* STAR Guide Card */}
      <div className="sidebar-card dark">
        <div className="sidebar-title-row">
          <Star size={18} fill="#38bdf8" color="#38bdf8" />
          <span>Khung phương pháp STAR</span>
        </div>
        <div className="star-rule-list">
          <div className="star-rule-item">
            <div className="star-letter-badge">S</div>
            <div className="star-rule-text">
              <strong>Situation (Bối cảnh)</strong>
              <span>
                Mô tả ngắn gọn bối cảnh dự án, thời điểm và vấn đề phát sinh.
              </span>
            </div>
          </div>
          <div className="star-rule-item">
            <div className="star-letter-badge">T</div>
            <div className="star-rule-text">
              <strong>Task (Nhiệm vụ)</strong>
              <span>
                Nêu rõ mục tiêu bạn cần giải quyết hoặc KPI được giao.
              </span>
            </div>
          </div>
          <div className="star-rule-item">
            <div className="star-letter-badge">A</div>
            <div className="star-rule-text">
              <strong>Action (Hành động)</strong>
              <span>
                Trình bày cụ thể các giải pháp, công nghệ bạn trực tiếp áp
                dụng.
              </span>
            </div>
          </div>
          <div className="star-rule-item">
            <div className="star-letter-badge">R</div>
            <div className="star-rule-text">
              <strong>Result (Kết quả)</strong>
              <span>
                Nêu rõ kết quả đạt được bằng số liệu định lượng (%, thời
                gian, chất lượng).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Question Live Hint */}
      {hint && (
        <div className="question-hint-box">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              marginBottom: '4px',
            }}
          >
            <Sparkles size={16} /> Gợi ý trả lời từ Cố vấn AI:
          </div>
          <div>{hint}</div>
        </div>
      )}
    </motion.div>
  );
};
