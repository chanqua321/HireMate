import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
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
    a: 'Gói Basic (Miễn phí) cho phép bạn trải nghiệm 3 buổi phỏng vấn thử mỗi tháng. Gói Premium mở khóa phỏng vấn không giới hạn với AI tiên tiến hơn. Gói VIP cung cấp toàn bộ tính năng cao cấp nhất, hỗ trợ ưu tiên 24/7.',
  },
];

const PLANS = [
  {
    id: 'free',
    label: 'BASIC (FREE)',
    price: '0đ',
    period: '/mo',
    features: [
      '3 buổi phỏng vấn thử / tháng',
      'Phản hồi điểm STAR cơ bản',
      'Bộ 30+ câu hỏi phổ biến',
      'Mô hình AI tiêu chuẩn',
    ],
    cta: 'Đăng ký miễn phí',
    ctaTo: '/register',
    ctaStyle: 'ghost',
    featured: false,
    badge: null,
  },
  {
    id: 'premium',
    label: 'PREMIUM',
    price: '250.000đ',
    period: '/mo',
    features: [
      'Không giới hạn buổi phỏng vấn',
      'Phân tích STAR chi tiết từng câu',
      'Ưu tiên xử lý nhanh',
      'Ngân hàng 500+ câu hỏi chuyên sâu',
      'Mô hình AI Mistral nâng cao',
    ],
    cta: 'Thanh toán 250.000đ',
    ctaTo: '/checkout',
    ctaStyle: 'primary',
    featured: false,
    badge: null,
  },
  {
    id: 'vip',
    label: 'VIP',
    price: '500.000đ',
    period: '/mo',
    features: [
      'Mọi quyền lợi gói Premium',
      'Hỗ trợ ưu tiên 24/7',
      'Tùy chỉnh bộ câu hỏi theo CV',
      'Xuất báo cáo PDF chi tiết',
      'Mô hình AI Qwen2.5 mạnh nhất',
    ],
    cta: 'THANH TOÁN 500.000Đ',
    ctaTo: '/checkout',
    ctaStyle: 'ayaka',
    featured: true,
    badge: 'POPULAR',
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              alignItems: 'stretch',
              maxWidth: '960px',
              margin: '0 auto',
            }}
          >
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
                style={{
                  /* Gradient border wrapper for featured (VIP) card */
                  background: plan.featured
                    ? '#a1cbe5'
                    : 'transparent',
                  borderRadius: '18px',
                  padding: plan.featured ? '2px' : '0',
                  boxShadow: plan.featured
                    ? '0 8px 32px rgba(161, 203, 229, 0.45)'
                    : '0 2px 12px rgba(16,24,40,0.06)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: plan.featured ? '16px' : '16px',
                    border: plan.featured ? 'none' : '1.5px solid #E5E7EB',
                    padding: '36px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    cursor: 'default',
                    height: '100%',
                  }}
                >

                {/* POPULAR badge */}
                {plan.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '20px',
                      background: '#a1cbe5',
                      color: '#141c28',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      padding: '5px 12px',
                      borderRadius: '0 0 10px 10px',
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Plan label */}
                <p
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    marginBottom: '14px',
                  }}
                >
                  {plan.label}
                </p>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                  <span
                    style={{
                      fontSize: '2.1rem',
                      fontWeight: 800,
                      color: 'var(--secondary)',
                      lineHeight: 1,
                    }}
                  >
                    {plan.price}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                    {plan.period}
                  </span>
                </div>

                {/* Divider */}
                <div
                  style={{
                    height: '1px',
                    background: '#E5E7EB',
                    marginBottom: '20px',
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
                    gap: '11px',
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
                      <span
                        style={{
                          color: 'var(--primary)',
                          fontWeight: 700,
                          fontSize: '1rem',
                          lineHeight: 1.4,
                          flexShrink: 0,
                        }}
                      >
                        •
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {plan.ctaStyle === 'ghost' && (
                  <Link
                    to={plan.ctaTo}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '13px 20px',
                      borderRadius: '999px',
                      border: '1.5px solid #D1D5DB',
                      background: '#fff',
                      color: '#1B1D21',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      textDecoration: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(3,191,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {plan.cta}
                  </Link>
                )}

                {plan.ctaStyle === 'primary' && (
                  <Link
                    to={plan.ctaTo}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '13px 20px',
                      borderRadius: '999px',
                      border: 'none',
                      background: 'var(--grad-primary)',
                      color: 'var(--navy)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textDecoration: 'none',
                      boxShadow: 'var(--sh-primary)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    }}
                  >
                    {plan.cta}
                    <ArrowRight size={16} />
                  </Link>
                )}

                {plan.ctaStyle === 'ayaka' && (
                  <Link
                    to={plan.ctaTo}
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '13px 20px',
                      borderRadius: '999px',
                      border: 'none',
                      background: '#a1cbe5',
                      color: '#141c28',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      letterSpacing: '0.04em',
                      textDecoration: 'none',
                      boxShadow: '0 4px 15px rgba(161, 203, 229, 0.45)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 22px rgba(161, 203, 229, 0.65)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(161, 203, 229, 0.45)';
                    }}
                  >
                    {plan.cta}
                  </Link>
                )}
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
