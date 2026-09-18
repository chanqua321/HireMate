import React from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionValue } from 'framer-motion';
import {
  Flame,
  Sparkles,
  ArrowRight,
  BarChart3,
  Award,
  Bot,
  Volume2,
  VolumeX,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { InteractiveTiltCard, AnimatedCounter } from './HomeCommon';
import './HomeHeroSection.css';

interface HomeHeroSectionProps {
  heroParallaxY?: MotionValue<number>;
  heroCardParallaxY?: MotionValue<number>;
  isAudioPlaying: boolean;
  onPlaySampleVoice: () => void;
}

export const HomeHeroSection: React.FC<HomeHeroSectionProps> = ({
  heroParallaxY,
  heroCardParallaxY,
  isAudioPlaying,
  onPlaySampleVoice,
}) => {
  return (
    <section className="hm-hero-section">
      <div className="hm-container hm-hero-grid">
        {/* Left Column: Kinetic Headline & CTA */}
        <motion.div className="hm-hero-left" style={{ y: heroParallaxY }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <div className="hm-hero-pill-badge" data-cursor="Mới nhất ✨">
              <Flame size={18} color="#f97316" className="hm-flame-icon" />
              <span>Trợ lý luyện phỏng vấn AI số 1 theo phương pháp STAR</span>
            </div>
          </motion.div>

          <motion.h1
            className="hm-hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
          >
            Luyện phỏng vấn thông minh.
            <br className="hm-hero-br" />
            Nhận việc làm <span className="hm-gradient-text">mơ ước</span>.
          </motion.h1>

          <motion.p
            className="hm-hero-desc"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35 }}
          >
            HireMate là người bạn đồng hành ảo 1-1 giúp bạn rèn luyện phản xạ đối thoại giọng nói
            tiếng Việt chân thực, bóc tách câu trả lời theo chuẩn <strong>STAR</strong> và tự tin
            chinh phục mọi nhà tuyển dụng.
          </motion.p>

          <motion.div
            className="hm-hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.45 }}
          >
            <Link
              to="/interview-setup"
              className="hm-btn hm-btn--primary hm-btn--lg"
              data-cursor="Bắt đầu 🚀"
            >
              <Sparkles size={18} />
              <span>Bắt đầu luyện tập miễn phí</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/dashboard"
              className="hm-btn hm-btn--outline hm-btn--lg"
              data-cursor="Bảng điều khiển 📊"
            >
              <BarChart3 size={18} />
              <span>Bảng điều khiển</span>
            </Link>
          </motion.div>

          {/* Trust badge */}
          <motion.div
            className="hm-hero-trust"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55 }}
          >
            <div className="hm-trust-avatars">
              <div className="hm-trust-avatar" style={{ background: '#0284c7' }}>H</div>
              <div className="hm-trust-avatar" style={{ background: '#10b981' }}>M</div>
              <div className="hm-trust-avatar" style={{ background: '#8b5cf6' }}>A</div>
              <div className="hm-trust-avatar" style={{ background: '#f59e0b' }}>T</div>
              <div className="hm-trust-avatar" style={{ background: '#09182d', fontSize: '0.75rem' }}>+10k</div>
            </div>
            <div className="hm-trust-text">
              <div className="hm-trust-stars">
                {'★'.repeat(5)}{' '}
                <strong>
                  <AnimatedCounter target={4.9} suffix="/5" duration={1} /> Điểm hài lòng
                </strong>
              </div>
              <span>
                Được tin dùng bởi hơn{' '}
                <strong>
                  <AnimatedCounter target={10000} suffix="+" duration={1.2} />
                </strong>{' '}
                lượt phỏng vấn từ các trường ĐH & doanh nghiệp hàng đầu
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Column: 3D Holographic Simulated Interview Room Card */}
        <motion.div
          className="hm-hero-visual-col"
          style={{ y: heroCardParallaxY }}
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <InteractiveTiltCard className="hm-hero-preview-card" glowColor="rgba(3, 191, 255, 0.2)">
            <motion.div
              className="floating-badge top-right"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Flame size={16} color="#f97316" />
              <span>Streak: 7 ngày 🔥 (+350 XP)</span>
            </motion.div>

            <motion.div
              className="floating-badge bottom-left"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <Award size={16} color="#0284c7" />
              <span>Top 5% Ứng viên xuất sắc</span>
            </motion.div>

            <div className="preview-card-header">
              <div className="preview-bot-info">
                <div className={`preview-bot-icon ${isAudioPlaying ? 'speaking' : ''}`}>
                  <Bot size={24} />
                  {isAudioPlaying && <span className="preview-bot-pulse-ring" />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>
                    Cố vấn AI HireMate
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Phòng Phỏng vấn Ảo 1-1 • Giọng nói thời gian thực
                  </div>
                </div>
              </div>

              <div className={`preview-status-pill ${isAudioPlaying ? 'active' : ''}`}>
                <span className="preview-pulse-dot" />
                <span>{isAudioPlaying ? 'AI đang nói...' : 'Đang kết nối'}</span>
              </div>
            </div>

            {/* Soundwave equalizer */}
            <div className="preview-soundwave-container">
              <div className="preview-waveform-bars">
                {[40, 75, 95, 60, 85, 45, 90, 65, 30, 80, 50, 70].map((h, i) => (
                  <span
                    key={i}
                    className={`preview-wave-bar ${isAudioPlaying ? 'animated' : ''}`}
                    style={{
                      height: isAudioPlaying ? `${h}%` : '20%',
                      animationDelay: `${(i % 5) * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                className={`preview-listen-btn ${isAudioPlaying ? 'playing' : ''}`}
                onClick={onPlaySampleVoice}
                data-cursor={isAudioPlaying ? 'Dừng ⏸️' : 'Nghe 🎧'}
              >
                {isAudioPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isAudioPlaying ? 'Dừng nghe' : 'Nghe giọng AI'}</span>
              </button>
            </div>

            <div className="preview-dialog-bubble">
              <MessageSquare size={16} className="dialog-bubble-icon" />
              <span>
                "Chào bạn! Hãy kể cho tôi nghe về một dự án gần nhất mà bạn đã tối ưu hóa hiệu năng
                hoặc giải quyết sự cố kỹ thuật phức tạp theo phương pháp STAR?"
              </span>
            </div>

            <div className="preview-star-score-row">
              <div className="preview-score-left">
                <span className="preview-score-number">94/100</span>
                <span className="preview-score-label">ĐIỂM CHUẨN STAR</span>
              </div>
              <div className="preview-score-tag">
                <CheckCircle2 size={16} color="#16a34a" />
                <span>⭐ Xuất sắc (Rất thuyết phục)</span>
              </div>
            </div>
          </InteractiveTiltCard>
        </motion.div>
      </div>
    </section>
  );
};
