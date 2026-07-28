import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { FaqAccordion } from '../../components/common/FaqAccordion';

const PRICING_FAQS = [
  {
    q: 'Tôi có thể hủy gói đăng ký bất cứ lúc nào không?',
    a: 'Có, bạn có thể hủy gói đăng ký bất kỳ lúc nào trong cài đặt tài khoản. Bạn vẫn có quyền sử dụng đầy đủ tính năng cho đến hết kỳ thanh toán.',
  },
  {
    q: 'Thanh toán có an toàn và hỗ trợ ngân hàng Việt Nam không?',
    a: 'Hoàn toàn an toàn! Chúng tôi hỗ trợ thanh toán qua Thẻ tín dụng/ghi nợ quốc tế, thẻ ATM nội địa và quét mã VietQR nhanh chóng.',
  },
  {
    q: 'Sự khác nhau giữa các gói là gì?',
    a: 'Gói Miễn phí cho phép bạn trải nghiệm 3 buổi phỏng vấn thử mỗi tháng. Gói Cơ Bản mở khóa 15 buổi phỏng vấn cùng feedback STAR chi tiết. Gói Nâng Cao cung cấp 50 buổi phỏng vấn tối ưu CV chuyên sâu và tính năng Beta ưu tiên.',
  },
];

const PLANS = [
  {
    id: 'free',
    label: 'Gói Miễn phí',
    price: '0đ',
    period: '/tháng',
    description: 'Lý tưởng để bắt đầu hành trình tìm kiếm công việc đầu tiên.',
    features: [
      '3 lượt Phỏng vấn ảo mỗi tháng',
      'Phân tích CV cơ bản (ATS)',
      'Feedback cấu trúc STAR rút gọn',
    ],
    cta: 'Nâng cấp ngay',
    ctaTo: '/register',
    featured: false,
    badge: null,
  },
  {
    id: 'basic',
    label: 'Gói Cơ Bản',
    price: '79.000đ',
    period: '/tháng',
    description: 'Mở khóa tiềm AI để chiếm ưu thế trong mọi cuộc phỏng vấn.',
    features: [
      '15 lượt Phỏng vấn ảo mỗi tháng',
      'Phân tích CV cơ bản (ATS)',
      'Feedback STAR chi tiết theo từng ngành',
      'Luyện tập câu hỏi chuyên sâu',
    ],
    cta: 'Nâng cấp ngay',
    ctaTo: '/checkout?plan=basic',
    featured: false,
    badge: null,
  },
  {
    id: 'pro',
    label: 'Gói Nâng Cao',
    price: '149.000đ',
    period: '/tháng',
    description: 'Mở khóa toàn bộ tiềm năng AI để chiếm ưu thế trong mọi cuộc phỏng vấn.',
    features: [
      '50 lượt Phỏng vấn ảo mỗi tháng',
      'Tối ưu CV chuẩn ATS chuyên sâu',
      'Feedback STAR chi tiết theo từng ngành',
      'Luyện tập câu hỏi nâng cao',
      'Ưu tiên trải nghiệm tính năng Beta',
    ],
    cta: 'Nâng cấp ngay',
    ctaTo: '/checkout?plan=pro',
    featured: true,
    badge: 'Phổ biến nhất',
  },
];

export const Pricing: React.FC = () => {
  return (
    <div className="pricing-page">
      {/* ── Header ── */}
      <section className="section" style={{ paddingBottom: '16px' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '700px' }}>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>
            <Sparkles size={16} />
            Đầu tư cho sự nghiệp của bạn
          </span>
          <h1 style={{ marginTop: '16px' }}>
            Bảng giá minh bạch,{' '}
            <span className="text-gradient">không phí ẩn</span>
          </h1>
          <p className="lead" style={{ margin: '16px auto 0' }}>
            Chọn gói cước phù hợp với mục tiêu chinh phục công việc mơ ước của bạn.
          </p>
        </div>
      </section>

      {/* ── Cards ── */}
      <section className="section" style={{ paddingTop: '24px', paddingBottom: '64px' }}>
        <div className="container">
          <div className="pricing-grid">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                style={{
                  background: 'transparent',
                  borderRadius: '20px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: plan.featured ? '2px solid #03BFFF' : '1.5px solid #E5E7EB',
                    padding: '36px 30px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    cursor: 'default',
                    height: '100%',
                    boxShadow: plan.featured
                      ? '0 12px 36px rgba(3, 191, 255, 0.18)'
                      : '0 4px 16px rgba(16, 24, 40, 0.05)',
                  }}
                >
                  {/* POPULAR badge at top right corner */}
                  {plan.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        background: '#03BFFF',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '6px 16px',
                        borderRadius: '0 18px 0 16px',
                        boxShadow: '0 2px 8px rgba(3, 191, 255, 0.3)',
                      }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan label */}
                  <h3
                    style={{
                      fontSize: '1.45rem',
                      fontWeight: 800,
                      color: '#001B3F',
                      margin: '0 0 14px',
                    }}
                  >
                    {plan.label}
                  </h3>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '14px' }}>
                    <span
                      style={{
                        fontSize: '2.4rem',
                        fontWeight: 800,
                        color: '#03BFFF',
                        lineHeight: 1,
                      }}
                    >
                      {plan.price}
                    </span>
                    <span style={{ color: '#6B7280', fontSize: '0.92rem', fontWeight: 500 }}>
                      {plan.period}
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: '#6B7280',
                      lineHeight: 1.55,
                      margin: '0 0 24px',
                      minHeight: '44px',
                    }}
                  >
                    {plan.description}
                  </p>

                  {/* Divider */}
                  <div
                    style={{
                      height: '1px',
                      background: '#F3F4F6',
                      marginBottom: '22px',
                    }}
                  />

                  {/* Feature list */}
                  <ul
                    style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '0 0 32px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          fontSize: '0.9rem',
                          color: '#374151',
                          lineHeight: 1.5,
                        }}
                      >
                        <CheckCircle2
                          size={18}
                          style={{
                            color: '#03BFFF',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link
                    to={plan.ctaTo}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      padding: '13px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#03BFFF',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.96rem',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(3, 191, 255, 0.35)',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#008BDD';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#03BFFF';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section faq-sec" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: '840px' }}>
          <div className="section-head">
            <h2>Câu hỏi thường gặp về Bảng giá</h2>
            <p className="lead">Giải đáp các thắc mắc về thanh toán và quyền lợi gói cước.</p>
          </div>
          <FaqAccordion items={PRICING_FAQS} />
        </div>
      </section>
    </div>
  );
};
