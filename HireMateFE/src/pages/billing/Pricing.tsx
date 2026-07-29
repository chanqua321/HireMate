import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle2, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { FaqAccordion } from '../../components/common/FaqAccordion';
import {
  billingService,
  planTier,
  toUiPlanKey,
  planLabel,
  type UiPlanKey,
} from '../../services/billing.service';

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
    a: 'Gói Miễn phí cho phép bạn trải nghiệm 3 buổi phỏng vấn thử mỗi tháng. Gói Tiêu chuẩn mở khóa 15 buổi phỏng vấn cùng phân tích CV ATS. Gói Cao cấp cung cấp 50 buổi, feedback STAR chi tiết và ưu tiên tính năng Beta. Bạn chỉ được nâng cấp lên gói cao hơn gói đang dùng.',
  },
];

type UiPlan = {
  id: UiPlanKey;
  label: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaTo: string;
  featured: boolean;
  badge: string | null;
  ctaStyle: 'outline' | 'primary' | 'navy';
};

const PLANS: UiPlan[] = [
  {
    id: 'free',
    label: 'Miễn phí',
    price: '0đ',
    period: '/tháng',
    description: 'Cho người mới bắt đầu',
    features: [
      '3 lượt phỏng vấn AI mỗi tháng.',
      'Phản hồi STAR với cấu trúc rút gọn.',
    ],
    cta: 'Bắt đầu miễn phí',
    ctaTo: '/register',
    featured: false,
    badge: null,
    ctaStyle: 'outline',
  },
  {
    id: 'basic',
    label: 'Tiêu chuẩn',
    price: '79.000đ',
    period: '/tháng',
    description: 'Cho người luyện tập đều đặn',
    features: [
      '15 lượt phỏng vấn AI mỗi tháng.',
      'Phản hồi STAR với cấu trúc rút gọn.',
      'Phân tích CV cơ bản theo chuẩn ATS.',
      'Luyện tập các câu hỏi phỏng vấn nâng cao.',
    ],
    cta: 'Nâng cấp ngay',
    ctaTo: '/checkout?plan=basic',
    featured: true,
    badge: 'Phổ biến nhất',
    ctaStyle: 'primary',
  },
  {
    id: 'pro',
    label: 'Cao cấp',
    price: '149.000đ',
    period: '/tháng',
    description: 'Cho ứng viên nghiêm túc',
    features: [
      '50 lượt phỏng vấn AI mỗi tháng.',
      'Phản hồi STAR chi tiết.',
      'Tối ưu CV chuẩn ATS chuyên sâu.',
      'Luyện tập các câu hỏi phỏng vấn chuyên sâu.',
      'Ưu tiên trải nghiệm các tính năng Beta mới.',
    ],
    cta: 'Nâng cấp ngay',
    ctaTo: '/checkout?plan=pro',
    featured: false,
    badge: null,
    ctaStyle: 'navy',
  },
];

function formatVnd(n: number) {
  return `${Math.round(n).toLocaleString('vi-VN')}đ`;
}

function applyApiPrices(base: UiPlan[], apiPlans: any[]): UiPlan[] {
  const byCode = Object.fromEntries(apiPlans.map((p) => [p.code, p]));
  return base.map((plan) => {
    const code = plan.id === 'basic' ? 'premium' : plan.id === 'pro' ? 'combo' : 'free';
    const api = byCode[code];
    if (!api || api.priceVnd == null) return plan;
    return { ...plan, price: formatVnd(Number(api.priceVnd)) };
  });
}

function ctaButtonStyle(style: UiPlan['ctaStyle'], disabled?: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    justifyContent: 'center',
    width: '100%',
    fontWeight: 700,
    pointerEvents: disabled ? 'none' : undefined,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
  if (style === 'outline') {
    return { ...base, background: '#ffffff', color: '#0B1F3A', border: '1.5px solid #D1D5DB' };
  }
  if (style === 'navy') {
    return { ...base, background: '#0B1F3A', color: '#ffffff', border: 'none' };
  }
  return { ...base, background: '#03BFFF', color: '#ffffff', border: 'none' };
}

export const Pricing: React.FC = () => {
  const [plans, setPlans] = useState<UiPlan[]>(PLANS);
  const [currentUiKey, setCurrentUiKey] = useState<UiPlanKey>('free');
  const loggedIn = Boolean(sessionStorage.getItem('hm_access_token'));

  useEffect(() => {
    billingService
      .getPlans()
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length) {
          setPlans(applyApiPrices(PLANS, res.data));
        }
      })
      .catch(() => {});

    if (loggedIn) {
      billingService.getCurrentPlanCode().then((code) => {
        setCurrentUiKey(toUiPlanKey(code));
      }).catch(() => {});
    }
  }, [loggedIn]);

  const currentTier = planTier(currentUiKey);
  const currentName = planLabel(currentUiKey);

  return (
    <div className="pricing-page">
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
            Chọn gói phù hợp với mục tiêu luyện phỏng vấn của bạn.
          </p>

          {loggedIn && (
            <div
              style={{
                marginTop: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 999,
                background: 'rgba(3,191,255,0.1)',
                border: '1px solid rgba(3,191,255,0.35)',
                fontWeight: 700,
                color: '#0B1F3A',
              }}
            >
              <BadgeCheck size={18} color="#03BFFF" />
              Gói đang dùng: <span style={{ color: '#03BFFF' }}>{currentName}</span>
              {currentTier < 2 && (
                <span className="muted" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                  — chỉ nâng cấp lên gói cao hơn
                </span>
              )}
              {currentTier >= 2 && (
                <span className="muted" style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                  — bạn đang ở gói cao nhất
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingTop: '24px', paddingBottom: '64px' }}>
        <div className="container">
          <div className="pricing-grid">
            {plans.map((plan, i) => {
              const tier = planTier(plan.id);
              const isCurrent = loggedIn && tier === currentTier;
              const isLower = loggedIn && tier < currentTier;
              const canUpgrade = !loggedIn || tier > currentTier;
              const disabled = loggedIn && !canUpgrade;

              let ctaText = plan.cta;
              if (isCurrent) ctaText = 'Gói hiện tại';
              else if (isLower) ctaText = 'Gói thấp hơn';
              else if (loggedIn && canUpgrade) ctaText = 'Nâng cấp ngay';

              const border = isCurrent
                ? '2px solid #22C55E'
                : plan.featured
                ? '2px solid #03BFFF'
                : '1.5px solid #E5E7EB';

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.1 }}
                  whileHover={disabled ? undefined : { y: -6, transition: { duration: 0.25 } }}
                  style={{ background: 'transparent', borderRadius: '20px', position: 'relative' }}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      border,
                      padding: '40px 30px 32px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      height: '100%',
                      boxShadow: plan.featured
                        ? '0 12px 36px rgba(3, 191, 255, 0.22)'
                        : '0 4px 16px rgba(16, 24, 40, 0.05)',
                      opacity: isLower ? 0.72 : 1,
                    }}
                  >
                    {(plan.badge || isCurrent) && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -14,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: isCurrent ? '#22C55E' : '#03BFFF',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '6px 16px',
                          borderRadius: 999,
                          whiteSpace: 'nowrap',
                          boxShadow: isCurrent
                            ? '0 4px 12px rgba(34,197,94,0.35)'
                            : '0 4px 12px rgba(3, 191, 255, 0.35)',
                        }}
                      >
                        {isCurrent ? 'Đang dùng' : plan.badge}
                      </div>
                    )}

                    <h3 style={{ marginBottom: 6, fontSize: '1.5rem' }}>{plan.label}</h3>
                    <p className="muted" style={{ marginBottom: 20, minHeight: 24 }}>
                      {plan.description}
                    </p>

                    <div style={{ marginBottom: 24 }}>
                      <span
                        style={{
                          fontSize: '2.1rem',
                          fontWeight: 800,
                          color: plan.featured || isCurrent ? '#03BFFF' : '#0B1F3A',
                        }}
                      >
                        {plan.price}
                      </span>
                      <span className="muted"> {plan.period}</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginBottom: 12,
                            alignItems: 'flex-start',
                            lineHeight: 1.45,
                          }}
                        >
                          <CheckCircle2 size={18} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {disabled ? (
                      <button
                        type="button"
                        className="btn"
                        disabled
                        style={ctaButtonStyle(plan.ctaStyle, true)}
                      >
                        {ctaText}
                      </button>
                    ) : (
                      <Link
                        to={plan.id === 'free' && loggedIn ? '/dashboard' : plan.ctaTo}
                        className="btn"
                        style={ctaButtonStyle(plan.ctaStyle)}
                      >
                        {ctaText}
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <FaqAccordion items={PRICING_FAQS} />
        </div>
      </section>
    </div>
  );
};
