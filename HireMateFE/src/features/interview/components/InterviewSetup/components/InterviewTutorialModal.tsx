import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  X,
  Bot,
  User,
  Sparkles,
  Play,
  Pause,
  Volume2,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';

export interface TutorialVideoConfig {
  videoSrc: string;
  videoType: 'mp4' | 'youtube';
}

interface InterviewTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoConfig: TutorialVideoConfig;
}

export const InterviewTutorialModal: React.FC<InterviewTutorialModalProps> = ({
  isOpen,
  onClose,
  videoConfig,
}) => {
  const [isPlayingMockVideo, setIsPlayingMockVideo] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="video-modal-backdrop" onClick={onClose}>
          <motion.div
            className="video-modal-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="video-modal-header">
              <div className="modal-title-left">
                <PlayCircle size={22} color="#38bdf8" />
                <div>
                  <h3>Video mô phỏng: Cách AI phỏng vấn chuẩn STAR</h3>
                  <span className="modal-header-sub">
                    Thời lượng: 01:15 • Hướng dẫn trải nghiệm phòng phỏng vấn
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="video-modal-close"
                onClick={onClose}
                title="Đóng modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Player Stage */}
            <div className="video-player-stage">
              {videoConfig.videoSrc ? (
                <div className="real-video-player-container">
                  {videoConfig.videoType === 'youtube' ? (
                    <iframe
                      src={videoConfig.videoSrc}
                      title="HireMate AI Interview Tutorial Video"
                      className="tutorial-iframe"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={videoConfig.videoSrc}
                      controls
                      autoPlay
                      className="tutorial-video-tag"
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="stage-top-meta">
                    <div className="stage-live-badge">
                      <span className="live-dot"></span> LIVE DEMO SIMULATION
                    </div>
                    <div className="stage-timer">00:45 / 01:15</div>
                  </div>

                  <div className="stage-dialogue-arena">
                    <div className="stage-ai-card">
                      <div className="stage-ai-avatar">
                        <Bot size={22} />
                      </div>
                      <div className="stage-ai-content">
                        <span className="stage-speaker-name">HireMate AI Interviewer</span>
                        <p>
                          "Chào bạn Minh Anh! Trong buổi hôm nay, bạn hãy chia sẻ về một tình huống dự án gặp vấn đề hiệu năng và cách bạn đã giải quyết nó?"
                        </p>
                      </div>
                    </div>

                    <div className="stage-user-card">
                      <div className="stage-user-content">
                        <span className="stage-speaker-name">Ứng viên (Voice / Text)</span>
                        <p>
                          "<strong>(Situation & Task)</strong> Trong dự án E-commerce, trang Checkout bị chậm 4.5s khi có 10,000 CCU. <strong>(Action)</strong> Tôi đã tối ưu query DB với Indexing, kích hoạt Redis Caching và nén hình ảnh CDN. <strong>(Result)</strong> Nhờ đó tốc độ giảm xuống 0.8s và giảm 99% lỗi timeout!"
                        </p>
                      </div>
                      <div className="stage-user-avatar">
                        <User size={22} />
                      </div>
                    </div>

                    <div className="stage-live-score-overlay">
                      <div className="score-header">
                        <Sparkles size={14} />
                        <span>AI Real-time Scoring:</span>
                        <strong>92 / 100 Điểm (Xuất sắc)</strong>
                      </div>
                      <div className="score-breakdown-row">
                        <div className="score-pill s-pill">Situation: 88%</div>
                        <div className="score-pill t-pill">Task: 90%</div>
                        <div className="score-pill a-pill">Action: 96%</div>
                        <div className="score-pill r-pill">Result: 94%</div>
                      </div>
                    </div>
                  </div>

                  <div className="stage-controls-bar">
                    <button
                      type="button"
                      className="control-play-pause"
                      onClick={() => setIsPlayingMockVideo((prev) => !prev)}
                    >
                      {isPlayingMockVideo ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <div className="control-progress-track">
                      <div className="control-progress-fill" style={{ width: '60%' }}></div>
                    </div>

                    <div className="control-right-tools">
                      <Volume2 size={18} color="#94a3b8" />
                      <Maximize2 size={18} color="#94a3b8" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3 Golden Key Takeaways */}
            <div className="video-modal-takeaways">
              <h4>🎯 3 Bí quyết ghi điểm cao nhất trong phòng phỏng vấn:</h4>
              <div className="takeaways-grid">
                <div className="takeaway-card">
                  <div className="takeaway-num">1</div>
                  <div>
                    <strong>Cấu trúc STAR rõ ràng</strong>
                    <p>Nêu ngắn gọn Bối cảnh (S) & Nhiệm vụ (T), dành 60% thời lượng cho Hành động (A).</p>
                  </div>
                </div>

                <div className="takeaway-card">
                  <div className="takeaway-num">2</div>
                  <div>
                    <strong>Dẫn chứng số liệu định lượng (R)</strong>
                    <p>Thay vì nói "làm rất tốt", hãy nêu: "Tăng 30% tốc độ, giảm 40% chi phí".</p>
                  </div>
                </div>

                <div className="takeaway-card">
                  <div className="takeaway-num">3</div>
                  <div>
                    <strong>Tự tin sử dụng Voice Mode</strong>
                    <p>Nói tự nhiên vào Micro, AI sẽ tự động phiên âm và phân tích chuẩn xác.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Action */}
            <div className="video-modal-footer">
              <button
                type="button"
                className="modal-finish-btn"
                onClick={onClose}
              >
                <CheckCircle2 size={18} />
                <span>Tôi đã hiểu rõ • Bắt đầu phỏng vấn ngay</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
