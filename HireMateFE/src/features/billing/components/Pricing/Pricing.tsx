import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, HelpCircle, Check, X, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { FaqAccordion } from '../../../../shared/components';
import { AuthRequiredModal } from '../../../../shared/components/AuthRequiredModal/AuthRequiredModal';
import { useApp } from '../../../../app/context/AppContext';
import { billingService } from '../../api/billing.service';
import { publicService } from '../../../../shared/services';
import './css/Pricing.css';

const PRICING_FAQS = [
  {
    q: 'Tôi có thể hủy gói đăng ký bất cứ lúc nào không?',
    a: 'Có, bạn có thể hủy gói đăng ký bất kỳ lúc nào trong cài đặt tài khoản. Bạn vẫn có quyền sử dụng đầy đủ tính năng cho đến hết kỳ thanh toán.',
  },
  {
    q: 'Thanh toán có an toàn và hỗ trợ ngân hàng Việt Nam không?',
    a: 'Hoàn toàn an toàn! Chúng tôi hỗ trợ thanh toán qua Thẻ tín dụng/ghi nợ quốc tế, thẻ ATM nội địa và quét mã VietQR tự động khớp đơn nhanh chóng.',
  },
  {
    q: 'Sự khác nhau giữa các gói là gì?',
    a: 'Gói Miễn phí: 3 buổi phỏng vấn và 1 lần phân tích CV mỗi tháng. Gói Cơ Bản (79k): 15 buổi phỏng vấn và 20 lần phân tích CV. Gói Nâng Cao (149k): 50 buổi phỏng vấn và 70 lần phân tích CV, kèm Cover Letter AI và so khớp CV–JD.',
  },
  {
    q: 'Tôi có nhận được hóa đơn VAT không?',
    a: 'Có! HireMate hỗ trợ xuất hóa đơn điện tử hợp lệ theo quy định của pháp luật Việt Nam ngay sau khi thanh toán thành công.',
  },
];

const DEFAULT_PLANS = [
  {
    id: 'free',
    label: 'Gói Miễn phí',
    monthlyPrice: 0,
    priceDisplay: '0đ',
    period: '/tháng',
    description: 'Lý tưởng để bắt đầu làm quen và luyện tập những câu hỏi phỏng vấn cơ bản.',
    features: [
      '3 lượt phỏng vấn ảo mỗi tháng',
      'Đánh giá phản xạ giọng nói cơ bản',
      'Phân tích CV chuẩn ATS 1 lần/tháng',
      'Feedback cấu trúc STAR tóm tắt',
    ],
    cta: 'Bắt đầu miễn phí',
    ctaTo: '/register',
    featured: false,
    badge: null,
  },
  {
    id: 'basic',
    label: 'Gói Chuyên Nghiệp (Pro)',
    monthlyPrice: 79000,
    priceDisplay: '79.000đ',
    period: '/tháng',
    description: 'Mở khóa toàn bộ tiềm năng AI chuẩn STAR để chiếm ưu thế trong mọi cuộc phỏng vấn.',
    features: [
      '15 lượt phỏng vấn ảo mỗi tháng',
      'Feedback chuẩn STAR chi tiết theo ngành',
      'Phân tích ngữ điệu & từ đệm chuyên sâu',
      'Phân tích CV chuẩn ATS 20 lần/tháng',
      'Ngân hàng 1,000+ câu hỏi JD thực tế',
    ],
    cta: 'Nâng cấp ngay',
    ctaTo: '/checkout?plan=basic',
    featured: true,
    badge: 'Phổ biến nhất 🔥',
  },
  {
    id: 'pro',
    label: 'Gói Toàn Diện (Ultimate)',
    monthlyPrice: 149000,
    priceDisplay: '149.000đ',
    period: '/tháng',
    description: 'Dành cho ứng viên muốn bứt phá nhanh nhất vào các tập đoàn đa quốc gia và Tech Unicorn.',
    features: [
      '50 lượt phỏng vấn ảo mỗi tháng',
      'Phân tích CV chuẩn ATS 70 lần/tháng',
      'Mô phỏng phỏng vấn hội đồng tuyển dụng',
      'Trợ lý viết Cover Letter & Email AI',
      'So khớp trực tiếp CV với Job Description',
      'Ưu tiên kết nối cố vấn chuyên gia 1-1',
      'Hỗ trợ kỹ thuật ưu tiên 24/7',
    ],
    cta: 'Nâng cấp ngay',
    ctaTo: '/checkout?plan=pro',
    featured: false,
    badge: 'Đầy đủ tính năng ⚡',
  },
];

const COMPARISON_ROWS = [
  { feature: 'Số lượt phỏng vấn AI / tháng', free: '3 lượt', basic: '15 lượt', pro: '50 lượt' },
  { feature: 'Chấm điểm cấu trúc chuẩn STAR', free: 'Rút gọn', basic: 'Chi tiết từng câu', pro: 'Chuyên sâu + Gợi ý sửa' },
  { feature: 'Phân tích ngữ điệu & giọng nói', free: 'Cơ bản', basic: 'Đầy đủ', pro: 'Nâng cao thời gian thực' },
  { feature: 'Phân tích & Tối ưu CV chuẩn ATS', free: '1 lần/tháng', basic: '20 lần/tháng', pro: '70 lần/tháng' },
  { feature: 'So khớp CV với Job Description', free: false, basic: true, pro: true },
  { feature: 'Trợ lý soạn thảo Email & Cover Letter', free: false, basic: false, pro: true },
  { feature: 'Hỗ trợ ưu tiên 24/7', free: false, basic: 'Email', pro: 'Email + Hotline 1-1' },
];

export const Pricing: React.FC = () => {
  const { isLoggedIn } = useApp();
  const navigate = useNavigate();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [faqs, setFaqs] = useState(PRICING_FAQS);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authFeatureName, setAuthFeatureName] = useState('Bảng giá & Gói dịch vụ');

  const handlePlanAction = (plan: (typeof DEFAULT_PLANS)[0]) => {
    if (!isLoggedIn) {
      setAuthFeatureName(plan.label);
      setShowAuthModal(true);
      return;
    }
    if (plan.monthlyPrice === 0 || plan.id === 'free') {
      navigate('/dashboard');
    } else {
      navigate(`/checkout?plan=${plan.id}`);
    }
  };

  useEffect(() => {
    billingService.getPlans().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        // Map backend plans or merge with rich visual attributes
        const mapped = res.data.map((p) => {
          const code = p.code.toLowerCase();
          const isFree = p.priceVnd === 0 || code === 'free';
          const isCombo = code.includes('combo') || code.includes('pro') || (!isFree && p.priceVnd >= 100000);
          const isPremium = !isFree && !isCombo;
          return {
            id: code,
            label: p.name || (isFree ? 'Gói Miễn phí' : isCombo ? 'Gói Cao cấp' : 'Gói Tiêu chuẩn'),
            monthlyPrice: p.priceVnd,
            priceDisplay: p.priceVnd > 0 ? `${p.priceVnd.toLocaleString('vi-VN')}đ` : '0đ',
            period: '/tháng',
            description: p.description || (isFree ? 'Bắt đầu làm quen với phỏng vấn ảo.' : 'Mở khóa tính năng HireMate AI.'),
            features: isFree
              ? ['3 lượt phỏng vấn mỗi tháng', 'Phân tích CV 1 lần/tháng', 'Đánh giá STAR tóm tắt']
              : isCombo
              ? ['50 lượt phỏng vấn mỗi tháng', 'Phân tích CV 70 lần/tháng', 'Trợ lý Cover Letter AI', 'So khớp CV & JD']
              : ['15 lượt phỏng vấn mỗi tháng', 'Feedback chuẩn STAR chi tiết', 'Phân tích CV 20 lần/tháng', 'Luyện tập câu hỏi nâng cao'],
            cta: isFree ? 'Bắt đầu miễn phí' : 'Nâng cấp ngay',
            ctaTo: isFree ? '/register' : `/checkout?plan=${code}`,
            featured: isPremium && p.priceVnd === 79000,
            badge: isPremium && p.priceVnd === 79000 ? 'Phổ biến nhất 🔥' : null,
          };
        });
        mapped.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
        if (mapped.length >= 2) {
          setPlans(mapped);
        }
      }
    }).catch(() => {});

    publicService.getFaqs().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        setFaqs(res.data.map((f: any) => ({ q: f.question, a: f.answer })));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="pricing-page">
      {/* ── HERO HEADER ── */}
      <section className="pricing-hero">
        <div className="container">
          <motion.div
            className="pricing-hero-badge"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Sparkles size={16} /> Bảng Giá Minh Bạch & Tiết Kiệm
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            Chọn gói phù hợp để <span className="highlight">bứt phá sự nghiệp</span>
          </motion.h1>

          <motion.p
            className="lead"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            Đầu tư thông minh cho sự nghiệp với chi phí chỉ bằng vài ly cà phê. Nâng cấp hoặc hủy bất cứ lúc nào không ràng buộc.
          </motion.p>

          {/* Billing Toggle */}
          <div className="billing-toggle-container">
            <button
              type="button"
              className={`billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Thanh toán theo tháng
            </button>
            <button
              type="button"
              className={`billing-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Thanh toán theo năm <span className="save-badge">Tiết kiệm 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── CARDS GRID ── */}
      <section className="pricing-cards-sec">
        <div className="container">
          <div className="pricing-grid">
            {plans.map((plan, i) => {
              const displayPrice =
                billingCycle === 'annual' && plan.monthlyPrice > 0
                  ? `${Math.round((plan.monthlyPrice * 0.8)).toLocaleString('vi-VN')}đ`
                  : plan.priceDisplay;

              return (
                <motion.div
                  key={plan.id}
                  className="pricing-card-wrapper"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.12 }}
                >
                  <div className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
                    {/* Featured Ribbon */}
                    {plan.badge && (
                      <div className="featured-badge">
                        <Zap size={14} />
                        <span>{plan.badge}</span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="plan-header">
                      <h3 className="plan-label">{plan.label}</h3>
                      <p className="plan-desc">{plan.description}</p>
                    </div>

                    {/* Price Box */}
                    <div className="plan-price-box">
                      <span className="plan-price-amount">{displayPrice}</span>
                      <span className="plan-price-period">{plan.period}</span>
                    </div>

                    {/* Features List */}
                    <ul className="plan-features-list">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="plan-feature-item">
                          <CheckCircle2 size={18} className="plan-feature-icon" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      type="button"
                      onClick={() => handlePlanAction(plan)}
                      className={`plan-cta-btn ${plan.featured ? 'plan-cta-btn--primary' : 'plan-cta-btn--outline'}`}
                      style={{ cursor: 'pointer', border: 'none', width: '100%', fontFamily: 'inherit' }}
                    >
                      {!isLoggedIn && <Lock size={16} style={{ marginRight: '4px' }} />}
                      <span>{plan.cta}</span>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST / GUARANTEE BANNER ── */}
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto 60px', padding: '0 20px' }}>
        <div className="pricing-trust-banner">
          <div className="trust-item">
            <ShieldCheck size={24} />
            <span>Bảo mật SSL 256-bit chuẩn quốc tế</span>
          </div>
          <div className="trust-item">
            <Zap size={24} />
            <span>Kích hoạt quyền lợi tức thì</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={24} />
            <span>Hỗ trợ VietQR, ATM & Thẻ Quốc Tế</span>
          </div>
        </div>
      </div>

      {/* ── DETAILED COMPARISON TABLE ── */}
      <section className="pricing-comparison-sec">
        <div className="container">
          <div className="faq-header">
            <h2>So sánh chi tiết tính năng</h2>
            <p>Bảng đối chiếu minh bạch quyền lợi giữa các gói cước</p>
          </div>

          <div className="comparison-table-card">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Tính năng</th>
                  <th style={{ width: '20%' }}>Miễn phí</th>
                  <th style={{ width: '20%' }}>Chuyên nghiệp (Pro)</th>
                  <th style={{ width: '20%' }}>Toàn diện (Ultimate)</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: '#1E293B' }}>{row.feature}</td>
                    <td>
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <Check size={18} color="#22C55E" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#94A3B8" style={{ margin: '0 auto' }} />
                        )
                      ) : (
                        row.free
                      )}
                    </td>
                    <td>
                      {typeof row.basic === 'boolean' ? (
                        row.basic ? (
                          <Check size={18} color="#03BFFF" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#94A3B8" style={{ margin: '0 auto' }} />
                        )
                      ) : (
                        <strong style={{ color: '#03BFFF' }}>{row.basic}</strong>
                      )}
                    </td>
                    <td>
                      {typeof row.pro === 'boolean' ? (
                        row.pro ? (
                          <Check size={18} color="#03BFFF" style={{ margin: '0 auto' }} />
                        ) : (
                          <X size={18} color="#94A3B8" style={{ margin: '0 auto' }} />
                        )
                      ) : (
                        <strong style={{ color: '#008BDD' }}>{row.pro}</strong>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pricing-faq-sec">
        <div className="container">
          <div className="faq-header">
            <h2>Câu hỏi thường gặp về Bảng giá</h2>
            <p>Giải đáp các thắc mắc về thanh toán và quyền lợi gói cước.</p>
          </div>
          <FaqAccordion items={faqs} />
        </div>
      </section>

      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        featureName={authFeatureName}
      />
    </div>
  );
};
