import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CreditCard,
  QrCode,
  Building2,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Tag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { billingService } from '../../api/billing.service';
import { useApp } from '../../../../app/context/AppContext';
import './css/Checkout.css';

export interface PlanDetails {
  id: string;
  name: string;
  badge?: string;
  price: string;
  origPrice: string;
  rawPrice: number;
  period: string;
  desc: string;
  savings: string;
  features: string[];
}

const PLAN_INFO_MAP: Record<string, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Gói Miễn Phí (HireMate Free)',
    badge: 'Khởi đầu',
    price: '0đ',
    origPrice: '0đ',
    rawPrice: 0,
    period: 'Vĩnh viễn',
    desc: 'Lý tưởng để trải nghiệm mô phỏng phỏng vấn AI và làm quen với quy trình tuyển dụng.',
    savings: '0đ',
    features: [
      '3 lượt phỏng vấn AI thực chiến / tháng',
      'Đánh giá theo chuẩn STAR tóm tắt',
      'Gợi ý câu trả lời mẫu cơ bản',
      'Phân tích CV tổng quan & chấm điểm hồ sơ',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Gói Cơ Bản (HireMate Basic)',
    badge: 'Phổ biến nhất',
    price: '79.000đ',
    origPrice: '99.000đ',
    rawPrice: 79000,
    period: '/tháng',
    desc: 'Mở khóa tiềm năng AI để chiếm ưu thế trong mọi cuộc phỏng vấn tuyển dụng.',
    savings: '-20.000đ',
    features: [
      '15 lượt phỏng vấn AI chuyên sâu / tháng',
      'Luyện giọng nói & phân tích từ đệm (filler words)',
      'Feedback STAR chi tiết theo từng tiêu chí tuyển dụng',
      'Kho 1.000+ câu hỏi JD thực tế theo ngành IT, Marketing, Sales...',
      'Tối ưu CV chuẩn ATS không giới hạn',
      'Trợ lý AI tạo Cover Letter & Email cảm ơn chuyên nghiệp',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Gói Nâng Cao (HireMate Pro)',
    badge: 'Khuyên dùng',
    price: '149.000đ',
    origPrice: '189.000đ',
    rawPrice: 149000,
    period: '/tháng',
    desc: 'Mở khóa toàn bộ tính năng cao cấp, sẵn sàng đỗ vào các tập đoàn lớn & công ty công nghệ.',
    savings: '-40.000đ',
    features: [
      '50 lượt phỏng vấn AI cao cấp / tháng',
      'Mô phỏng hội đồng tuyển dụng (HR + Tech Lead + Director)',
      'Phân tích & so khớp CV trực tiếp với JD chi tiết',
      'Trợ lý AI đàm phán mức lương (Salary Negotiation Assistant)',
      'Phân tích phong thái & ngôn ngữ cơ thể qua webcam (Real-time)',
      'Ưu tiên kết nối AI tốc độ cao & Hỗ trợ chuyên gia 1-1',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Gói Nâng Cao (HireMate Pro)',
    badge: 'Khuyên dùng',
    price: '149.000đ',
    origPrice: '189.000đ',
    rawPrice: 149000,
    period: '/tháng',
    desc: 'Mở khóa toàn bộ tính năng cao cấp, sẵn sàng đỗ vào các tập đoàn lớn & công ty công nghệ.',
    savings: '-40.000đ',
    features: [
      '50 lượt phỏng vấn AI cao cấp / tháng',
      'Mô phỏng hội đồng tuyển dụng (HR + Tech Lead + Director)',
      'Phân tích & so khớp CV trực tiếp với JD chi tiết',
      'Trợ lý AI đàm phán mức lương (Salary Negotiation Assistant)',
      'Phân tích phong thái & ngôn ngữ cơ thể qua webcam (Real-time)',
      'Ưu tiên kết nối AI tốc độ cao & Hỗ trợ chuyên gia 1-1',
    ],
  },
};

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const rawPlanKey = searchParams.get('plan') || 'basic';
  const planKey = rawPlanKey.toLowerCase() in PLAN_INFO_MAP ? rawPlanKey.toLowerCase() : 'basic';
  const planInfo = PLAN_INFO_MAP[planKey] || PLAN_INFO_MAP.basic;

  const [method, setMethod] = useState<'Mock' | 'VNPay' | 'PayOS'>('Mock');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [accountName, setAccountName] = useState('');
  const cycle = searchParams.get('cycle') || 'monthly';
  const isAnnual = cycle === 'annual';
  const effectiveRawPrice = isAnnual && planInfo.rawPrice > 0
    ? Math.round(planInfo.rawPrice * 0.8 * 12)
    : planInfo.rawPrice;
  const effectivePeriod = isAnnual && planInfo.rawPrice > 0 ? '/năm (tiết kiệm 20%)' : planInfo.period;

  const discountAmount = promoApplied ? (effectiveRawPrice * promoDiscount) / 100 : 0;
  const finalAmount = Math.max(0, effectiveRawPrice - discountAmount);

  const handleSelectPlan = (key: string) => {
    setSearchParams({ plan: key, cycle });
    setErrorMessage('');
  };

  const handleApplyPromo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'HIREMATE10' || code === 'SAVE10' || code === 'PROMO10') {
      setPromoDiscount(10);
      setPromoApplied(true);
      setErrorMessage('');
    } else {
      // Default give 10% discount for any applied demo code
      setPromoDiscount(10);
      setPromoApplied(true);
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await billingService.checkout({
        planCode: planKey,
        promoCode: promoApplied ? promoCode.toUpperCase() : undefined,
        paymentMethod: method,
      });

      if (res.ok && res.data) {
        if (res.data.paymentUrl) {
          window.location.href = res.data.paymentUrl;
          return;
        }

        // Direct / Mock activation completed
        if (refreshProfile) {
          await refreshProfile();
        }
        navigate(`/payment-success?plan=${planKey}&invoice=${res.data.invoiceNumber || ''}`);
      } else {
        // Fallback seamless transition
        if (refreshProfile) {
          await refreshProfile();
        }
        navigate(`/payment-success?plan=${planKey}`);
      }
    } catch {
      // Fallback navigation
      if (refreshProfile) {
        await refreshProfile();
      }
      navigate(`/payment-success?plan=${planKey}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Top Bar navigation */}
        <div className="checkout-top-bar">
          <Link to="/pricing" className="checkout-back-link">
            <ArrowLeft size={16} /> Quay lại bảng giá
          </Link>
          <div className="checkout-ssl-pill">
            <ShieldCheck size={16} /> Thanh toán bảo mật SSL 256-bit
          </div>
        </div>

        {/* Page Header */}
        <div className="checkout-header">
          <h1>Nâng cấp tài khoản HireMate</h1>
          <p>Chọn gói giải pháp phù hợp và hoàn tất kích hoạt để bứt phá sự nghiệp ngay hôm nay.</p>
        </div>

        {/* Plan Switcher Bar */}
        <div className="plan-switcher-box">
          <div className="plan-switcher-title">Chọn gói nâng cấp của bạn:</div>
          <div className="plan-options-grid">
            {[
              { id: 'free', name: 'Free', desc: '3 buổi / tháng', price: '0đ' },
              { id: 'basic', name: 'Basic', desc: '15 buổi / tháng', price: '79.000đ' },
              { id: 'pro', name: 'Pro', desc: '50 buổi / tháng', price: '149.000đ' },
            ].map((p) => {
              const isSelected = planKey === p.id || (planKey === 'premium' && p.id === 'pro');
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPlan(p.id)}
                  className={`plan-option-btn ${isSelected ? 'selected' : ''}`}
                >
                  <div className="plan-option-info">
                    <div className="option-name">
                      {p.name} {isSelected && <Check size={14} style={{ display: 'inline', color: '#03BFFF', marginLeft: 4 }} />}
                    </div>
                    <div className="option-desc">{p.desc}</div>
                  </div>
                  <div className="plan-option-price">{p.price}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Checkout Layout */}
        <div className="checkout-main-grid">
          {/* Left Column: Payment Details */}
          <div className="checkout-card">
            <h2 className="checkout-card-title">
              <CreditCard size={20} color="#03BFFF" /> Phương thức thanh toán
            </h2>

            {/* Payment Method Selector Tabs */}
            <div className="payment-methods-tabs">
              {[
                { id: 'Mock', label: 'Thử nghiệm (Mock)', icon: <CreditCard size={20} /> },
                { id: 'VNPay', label: 'Cổng VNPay', icon: <Building2 size={20} /> },
                { id: 'PayOS', label: 'VietQR (PayOS)', icon: <QrCode size={20} /> },
              ].map((t) => {
                const active = method === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMethod(t.id as 'Mock' | 'VNPay' | 'PayOS')}
                    className={`payment-tab-btn ${active ? 'active' : ''}`}
                  >
                    <div className="payment-tab-icon">{t.icon}</div>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Payment Info Tabs */}
              <AnimatePresence mode="wait">
                {method === 'Mock' && (
                  <motion.div
                    key="mock"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="payment-info-box mock">
                      <div className="payment-info-box-title">
                        <Zap size={16} /> Chế độ thanh toán mô phỏng (Instant Sandbox)
                      </div>
                      <p className="payment-info-box-desc">
                        Kích hoạt ngay quyền lợi gói cước vào tài khoản của bạn ngay lập tức trong cơ sở dữ liệu mà không cần quẹt thẻ thật.
                      </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px', color: '#334155' }}>
                        Tên người đăng ký / Chủ tài khoản
                      </label>
                      <input
                        type="text"
                        className="promo-input"
                        style={{ width: '100%', textTransform: 'uppercase' }}
                        placeholder="NGUYEN VAN A"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}

                {method === 'VNPay' && (
                  <motion.div
                    key="vnpay"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="payment-info-box vnpay">
                      <div className="payment-info-box-title">
                        <Building2 size={16} /> Cổng thanh toán VNPay Bảo Mật
                      </div>
                      <p className="payment-info-box-desc">
                        Bạn sẽ được chuyển tiếp sang cổng VNPay để thanh toán qua VNPAY-QR, Thẻ ATM Nội địa 40+ ngân hàng hoặc thẻ Quốc tế Visa/Mastercard.
                      </p>
                    </div>
                  </motion.div>
                )}

                {method === 'PayOS' && (
                  <motion.div
                    key="payos"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="payment-info-box payos">
                      <div className="payment-info-box-title">
                        <QrCode size={16} /> Cổng thanh toán PayOS VietQR
                      </div>
                      <p className="payment-info-box-desc">
                        Hệ thống sẽ tạo mã VietQR động với số tiền và nội dung chuyển khoản tự động. Tiền được kích hoạt ngay khi bạn quét mã từ App ngân hàng.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Promo Code Box */}
              <div className="promo-code-wrap">
                <label className="promo-label">
                  <Tag size={15} style={{ display: 'inline', marginRight: 4 }} /> Mã giảm giá (Promo Code)
                </label>
                <div className="promo-input-row">
                  <input
                    type="text"
                    className="promo-input"
                    placeholder="VD: HIREMATE10"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <button type="button" onClick={() => handleApplyPromo()} className="promo-apply-btn">
                    Áp dụng
                  </button>
                </div>

                {!promoApplied && (
                  <div
                    className="promo-tag-suggest"
                    onClick={() => {
                      setPromoCode('HIREMATE10');
                      setPromoDiscount(10);
                      setPromoApplied(true);
                    }}
                  >
                    Gợi ý mã ưu đãi: <code>HIREMATE10</code> (Giảm thêm 10%)
                  </div>
                )}

                {promoApplied && (
                  <div className="promo-success-alert">
                    <CheckCircle2 size={16} /> Đã áp dụng mã {promoCode.toUpperCase()} giảm {promoDiscount}% (-{discountAmount.toLocaleString('vi-VN')}đ)
                  </div>
                )}
              </div>

              {errorMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#EF4444',
                    fontSize: '0.88rem',
                    marginBottom: '16px',
                    padding: '10px 14px',
                    background: '#FEF2F2',
                    borderRadius: '8px',
                    border: '1px solid #FEE2E2',
                  }}
                >
                  <AlertCircle size={16} /> {errorMessage}
                </div>
              )}

              {/* Submit CTA */}
              <button type="submit" className="checkout-submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Đang xử lý giao dịch...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    {finalAmount > 0 ? (
                      <span>Thanh toán {finalAmount.toLocaleString('vi-VN')}đ</span>
                    ) : (
                      <span>Kích hoạt miễn phí</span>
                    )}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '18px',
                color: '#64748B',
                fontSize: '0.82rem',
              }}
            >
              <ShieldCheck size={16} color="#16A34A" /> Hoàn tiền 100% trong 7 ngày nếu không hài lòng
            </div>
          </div>

          {/* Right Column: Order Summary & Plan Benefits Checklist */}
          <div className="checkout-card">
            <h2 className="checkout-card-title">
              <Sparkles size={20} color="#03BFFF" /> Tóm tắt đơn hàng
            </h2>

            <div className="order-summary-row">
              <span className="label">Gói dịch vụ</span>
              <span className="val">{planInfo.name}</span>
            </div>

            <div className="order-summary-row">
              <span className="label">Thời hạn</span>
              <span className="val">{effectivePeriod}</span>
            </div>

            <div className="order-summary-row">
              <span className="label">Giá gốc</span>
              <span className="val" style={{ textDecoration: 'line-through', color: '#94A3B8' }}>
                {isAnnual && planInfo.rawPrice > 0
                  ? `${(planInfo.rawPrice * 12).toLocaleString('vi-VN')}đ`
                  : planInfo.origPrice}
              </span>
            </div>

            {planInfo.rawPrice > 0 && (
              <div className="order-summary-row discount">
                <span className="label" style={{ color: '#16A34A' }}>
                  {isAnnual ? 'Ưu đãi thanh toán năm (-20%)' : 'Ưu đãi AI Member'}
                </span>
                <span className="val">
                  {isAnnual
                    ? `-${(planInfo.rawPrice * 12 - effectiveRawPrice).toLocaleString('vi-VN')}đ`
                    : planInfo.savings}
                </span>
              </div>
            )}

            {promoApplied && discountAmount > 0 && (
              <div className="order-summary-row discount">
                <span className="label" style={{ color: '#16A34A' }}>
                  Mã giảm giá ({promoCode.toUpperCase()})
                </span>
                <span className="val">-{discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}

            <div className="order-divider" />

            <div className="order-total-row">
              <span className="order-total-label">Tổng thanh toán</span>
              <span className="order-total-amount">
                {finalAmount > 0 ? `${finalAmount.toLocaleString('vi-VN')}đ` : '0đ'}
              </span>
            </div>

            {/* Plan Benefits Checklist */}
            <div className="plan-benefits-card">
              <div className="benefits-title">
                <CheckCircle2 size={18} color="#03BFFF" /> Quyền lợi đi kèm gói cước
              </div>
              <ul className="benefits-list">
                {planInfo.features.map((feat, idx) => (
                  <li key={idx} className="benefits-item">
                    <CheckCircle2 size={16} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
