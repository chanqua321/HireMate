import React from 'react';
import { motion } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import './RoomSidebar.css';

interface RoomSidebarProps {
  hint?: string;
  showStar: boolean;
  language: 'vi' | 'en';
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({ hint, showStar, language }) => {
  const en = language === 'en';
  if (!showStar && !hint) return null;
  return (
    <motion.div
      className="room-sidebar-stack"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      {/* STAR Guide Card */}
      {showStar && <div className="sidebar-card dark">
        <div className="sidebar-title-row">
          <Star size={18} fill="#38bdf8" color="#38bdf8" />
          <span>{en ? 'STAR guide' : 'Khung phương pháp STAR'}</span>
        </div>
        <div className="star-rule-list">
          <div className="star-rule-item">
            <div className="star-letter-badge">S</div>
            <div className="star-rule-text">
              <strong>{en ? 'Situation' : 'Situation (Bối cảnh)'}</strong>
              <span>
                {en ? 'Briefly describe the context and the problem.' : 'Mô tả ngắn gọn bối cảnh dự án, thời điểm và vấn đề phát sinh.'}
              </span>
            </div>
          </div>
          <div className="star-rule-item">
            <div className="star-letter-badge">T</div>
            <div className="star-rule-text">
              <strong>{en ? 'Task' : 'Task (Nhiệm vụ)'}</strong>
              <span>
                {en ? 'Explain your responsibility or goal.' : 'Nêu rõ mục tiêu bạn cần giải quyết hoặc KPI được giao.'}
              </span>
            </div>
          </div>
          <div className="star-rule-item">
            <div className="star-letter-badge">A</div>
            <div className="star-rule-text">
              <strong>{en ? 'Action' : 'Action (Hành động)'}</strong>
              <span>
                {en ? 'Describe what you personally did.' : 'Trình bày cụ thể các giải pháp, công nghệ bạn trực tiếp áp dụng.'}
              </span>
            </div>
          </div>
          <div className="star-rule-item">
            <div className="star-letter-badge">R</div>
            <div className="star-rule-text">
              <strong>{en ? 'Result' : 'Result (Kết quả)'}</strong>
              <span>
                {en ? 'State the outcome and measurable impact when available.' : 'Nêu rõ kết quả đạt được bằng số liệu định lượng (%, thời gian, chất lượng) nếu có.'}
              </span>
            </div>
          </div>
        </div>
      </div>}

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
            <Sparkles size={16} /> {en ? 'AI Coach hint:' : 'Gợi ý trả lời từ Cố vấn AI:'}
          </div>
          <div>{hint}</div>
        </div>
      )}
    </motion.div>
  );
};
