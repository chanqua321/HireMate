import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { ScrollWordHighlight } from '../ScrollWordHighlight';
import './HomeStatementSection.css';

interface HomeStatementSectionProps {
  onPlaySampleVoice: () => void;
}

export const HomeStatementSection: React.FC<HomeStatementSectionProps> = ({
  onPlaySampleVoice,
}) => {
  return (
    <section className="hm-statement-section">
      <div className="hm-container">
        <div className="hm-statement-grid">
          <div className="hm-statement-left">
            <span className="hm-section-tag">Đột phá công nghệ</span>
            <ScrollWordHighlight
              className="hm-statement-scrub-text"
              text="HireMate là nền tảng luyện phỏng vấn 1-1 tiên phong tại Việt Nam, ứng dụng mô hình AI đa phương thức để bóc tách từng câu chữ, chuẩn hóa tư duy trả lời và giúp bạn tự tin làm chủ mọi vòng phỏng vấn chuyên môn."
            />
          </div>

          <div className="hm-statement-right">
            <motion.div
              className="hm-magnetic-reel-btn"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={onPlaySampleVoice}
              data-cursor="Play 🎧"
            >
              <div className="reel-rotating-border">
                <svg viewBox="0 0 100 100" className="rotating-text-svg">
                  <path
                    id="circlePath"
                    d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    fill="none"
                  />
                  <text
                    fontSize="8.2"
                    fill="#03bfff"
                    fontWeight="700"
                    letterSpacing="1.5"
                  >
                    <textPath href="#circlePath">
                      • HIREMATE AI VOICE REEL • NGHE THỬ GIỌNG NÓI
                    </textPath>
                  </text>
                </svg>
              </div>
              <div className="reel-center-icon">
                <Play size={24} color="#ffffff" fill="#ffffff" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
