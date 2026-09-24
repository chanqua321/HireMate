import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Check, ArrowRight } from 'lucide-react';
import './RoomEntranceOverlay.css';

interface RoomEntranceOverlayProps {
  isEntering: boolean;
  entranceStep: number;
  currentRole: string;
  canStart: boolean;
  errorMessage?: string | null;
  onStartInterview: () => void;
}

export const RoomEntranceOverlay: React.FC<RoomEntranceOverlayProps> = ({
  isEntering,
  entranceStep,
  currentRole,
  canStart,
  errorMessage,
  onStartInterview,
}) => {
  return (
    <AnimatePresence>
      {isEntering && (
        <motion.div
          className="room-entrance-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.35 }}
        >
          <div className="entrance-card">
            <div className="entrance-scanner-ring">
              <div className="entrance-inner-icon">
                <Bot size={28} />
              </div>
            </div>
            <h2 className="entrance-title">Phòng phỏng vấn AI HireMate</h2>
            <p className="entrance-subtitle">
              Đang thiết lập môi trường phỏng vấn ảo cho vị trí{' '}
              <strong style={{ color: '#38bdf8' }}>{currentRole}</strong>
            </p>

            <div className="entrance-checklist">
              <div className="entrance-check-item">
                <Check
                  size={16}
                  color={entranceStep >= 1 ? '#22c55e' : '#64748b'}
                />
                <span>Kiểm tra Micro & Thiết bị tương tác</span>
              </div>
              <div className="entrance-check-item">
                <Check
                  size={16}
                  color={entranceStep >= 2 ? '#22c55e' : '#64748b'}
                />
                <span>Khởi tạo Cố vấn AI HireMate (Hệ thống giọng nói AI)</span>
              </div>
              <div className="entrance-check-item">
                <Check
                  size={16}
                  color={entranceStep >= 3 ? '#22c55e' : '#64748b'}
                />
                <span>Chuẩn bị gợi ý trả lời phù hợp từng câu hỏi</span>
              </div>
            </div>

            {errorMessage && <p role="alert" style={{ color: '#FCA5A5', marginBottom: 12 }}>{errorMessage}</p>}
            <button
              type="button"
              className="entrance-start-btn"
              disabled={!canStart}
              onClick={onStartInterview}
            >
              <span>Sẵn sàng & Bắt đầu phỏng vấn</span>
              <ArrowRight size={19} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
