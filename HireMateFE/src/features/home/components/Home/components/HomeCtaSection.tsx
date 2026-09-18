import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { TextMaskReveal } from '../TextMaskReveal';
import './HomeCtaSection.css';

interface HomeCtaSectionProps {
  waitlistEmail: string;
  setWaitlistEmail: (val: string) => void;
  waitlistSuccess: boolean;
  isSubmittingWaitlist: boolean;
  onSubmitWaitlist: (e: React.FormEvent) => void;
}

export const HomeCtaSection: React.FC<HomeCtaSectionProps> = ({
  waitlistEmail,
  setWaitlistEmail,
  waitlistSuccess,
  isSubmittingWaitlist,
  onSubmitWaitlist,
}) => {
  return (
    <section className="hm-cta-section">
      <div className="hm-container">
        <motion.div
          className="hm-cta-banner-box"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="cta-sparkle-blob" />
          <TextMaskReveal>
            <h2 className="cta-banner-title">
              Sẵn sàng bứt phá sự nghiệp của bạn?
            </h2>
          </TextMaskReveal>
          <p className="cta-banner-desc">
            Tham gia cùng hàng ngàn sinh viên và ứng viên đang bứt phá sự nghiệp với
            trợ lý phỏng vấn AI hàng đầu. Miễn phí hoàn toàn cho buổi luyện tập đầu
            tiên!
          </p>
          <div className="cta-banner-actions">
            <Link
              to="/interview-setup"
              className="hm-btn hm-btn--primary hm-btn--lg"
              style={{ background: '#ffffff', color: '#09182d !important' }}
              data-cursor="Bắt đầu 🎯"
            >
              <Sparkles size={18} color="#09182d" />
              <span style={{ color: '#09182d', fontWeight: 800 }}>
                Bắt đầu luyện tập ngay
              </span>
              <ArrowRight size={18} color="#09182d" />
            </Link>
            <Link
              to="/pricing"
              className="hm-btn hm-btn--outline hm-btn--lg"
              style={{
                background: 'transparent',
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.3)',
              }}
              data-cursor="Gói Pro ⭐"
            >
              <span style={{ color: '#ffffff' }}>Xem các gói Pro</span>
            </Link>
          </div>

          {/* Newsletter / Waitlist form */}
          <div
            style={{
              marginTop: '36px',
              maxWidth: '480px',
              margin: '36px auto 0',
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.9rem',
                marginBottom: '12px',
              }}
            >
              Hoặc đăng ký nhận trọn bộ bí kíp phỏng vấn & tính năng AI mới nhất:
            </p>
            {waitlistSuccess ? (
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid #22C55E',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: '#86EFAC',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                ✓ Đăng ký thành công! HireMate sẽ gửi thông tin cập nhật sớm nhất
                cho bạn.
              </div>
            ) : (
              <form
                onSubmit={onSubmitWaitlist}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="email"
                  placeholder="Nhập email của bạn..."
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingWaitlist}
                  className="hm-btn"
                  style={{
                    background: '#03BFFF',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '12px 20px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSubmittingWaitlist ? 'Đang gửi...' : 'Đăng ký'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
