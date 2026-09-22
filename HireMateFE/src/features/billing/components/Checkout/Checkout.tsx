import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { billingService } from '../../api/billing.service';
import { PlanDto } from '../../types';
import { useApp } from '../../../../app/context/AppContext';
import './css/Checkout.css';

const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

const planFeaturesFallback = (priceVnd: number, code: string): string[] => {
  const c = code.toLowerCase();
  if (priceVnd <= 0 || c === 'free') {
    return [
      '3 lượt phỏng vấn AI / tháng',
      'Đánh giá STAR tóm tắt',
      'Phân tích CV ATS 1 lần / tháng',
    ];
  }
  if (c === 'combo' || priceVnd >= 100000) {
    return [
      '50 lượt phỏng vấn AI / tháng',
      'Phân tích CV ATS 70 lần / tháng',
      'Trợ lý Cover Letter AI',
      'So khớp CV & JD',
    ];
  }
  return [
    '15 lượt phỏng vấn AI / tháng',
    'Feedback STAR chi tiết',
    'Phân tích CV ATS 20 lần / tháng',
  ];
};

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [method, setMethod] = useState<'VNPay' | 'PayOS'>('PayOS');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const rawPlanKey = (searchParams.get('plan') || '').toLowerCase();

  useEffect(() => {
    let alive = true;
    setPlansLoading(true);
    billingService
      .getPlans()
      .then((res) => {
        if (!alive) return;
        if (res.ok && Array.isArray(res.data)) {
          setPlans(res.data.filter((p) => p.isActive !== false));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setPlansLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const selectedPlan = useMemo(() => {
    if (plans.length === 0) return null;
    const byCode = plans.find((p) => p.code.toLowerCase() === rawPlanKey);
    if (byCode) return byCode;
    // Không fallback sang 79k — ưu tiên gói trả phí rẻ nhất nếu thiếu ?plan=
    const paid = plans.filter((p) => p.priceVnd > 0).sort((a, b) => a.priceVnd - b.priceVnd);
    return paid[0] || plans[0];
  }, [plans, rawPlanKey]);

  const planKey = selectedPlan?.code.toLowerCase() || rawPlanKey;
  const rawPrice = selectedPlan?.priceVnd ?? 0;
  const discountAmount = promoApplied ? (rawPrice * promoDiscount) / 100 : 0;
  const finalAmount = Math.max(0, rawPrice - discountAmount);
  const features = selectedPlan
    ? planFeaturesFallback(selectedPlan.priceVnd, selectedPlan.code)
    : [];

  const handleSelectPlan = (code: string) => {
    setSearchParams({ plan: code });
    setErrorMessage('');
  };

  const handleApplyPromo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoDiscount(10);
    setPromoApplied(true);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      setErrorMessage('Không tìm thấy gói thanh toán. Vui lòng quay lại bảng giá.');
      return;
    }
    if (!selectedPlan.code?.trim()) {
      setErrorMessage('Gói này thiếu mã (code). Mở lại trang Pricing để hệ thống tự sửa, hoặc Admin cập nhật lại gói.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await billingService.checkout({
        planCode: selectedPlan.code,
        promoCode: promoApplied ? promoCode.toUpperCase() : undefined,
        paymentMethod: method,
      });

      if (!res.ok || !res.data) {
        setErrorMessage(res.message || 'Thanh toán thất bại. Vui lòng thử lại.');
        return;
      }

      const paymentUrl = res.data.paymentUrl || res.data.redirectUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      // Chỉ coi là thành công ngay khi gói miễn phí (0đ) — không fake success cho PayOS/VNPay
      if (selectedPlan.priceVnd <= 0 || res.data.status === 'Paid') {
        if (refreshProfile) await refreshProfile();
        navigate(
          `/payment-success?invoice=${encodeURIComponent(res.data.invoiceId || '')}`
        );
        return;
      }

      setErrorMessage(
        res.message ||
          'Không nhận được link thanh toán PayOS/VNPay. Kiểm tra cấu hình cổng thanh toán hoặc thử lại.'
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không kết nối được máy chủ thanh toán.');
    } finally {
      setIsLoading(false);
    }
  };

  const paidPlans = plans.filter((p) => p.priceVnd > 0).sort((a, b) => a.priceVnd - b.priceVnd);
  const freePlan = plans.find((p) => p.priceVnd <= 0);

  if (rawPlanKey === 'free' || selectedPlan?.priceVnd === 0) {
    return <Navigate to="/activate-free" replace />;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-top-bar">
          <Link to="/pricing" className="checkout-back-link">
            <ArrowLeft size={16} /> Quay lại bảng giá
          </Link>
          <div className="checkout-ssl-pill">
            <ShieldCheck size={16} /> Thanh toán bảo mật SSL 256-bit
          </div>
        </div>

        <div className="checkout-header">
          <h1>Nâng cấp tài khoản HireMate</h1>
          <p>Chọn gói giải pháp phù hợp và hoàn tất kích hoạt để bứt phá sự nghiệp ngay hôm nay.</p>
        </div>

        <div className="plan-switcher-box">
          <div className="plan-switcher-title">Chọn gói nâng cấp của bạn:</div>
          {plansLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B' }}>
              <Loader2 className="animate-spin" size={18} /> Đang tải gói...
            </div>
          ) : (
            <div className="plan-options-grid">
              {[...(freePlan ? [freePlan] : []), ...paidPlans].map((p) => {
                const isSelected = planKey === p.code.toLowerCase();
                return (
                  <button
                    key={p.id || p.code}
                    type="button"
                    onClick={() => handleSelectPlan(p.code)}
                    className={`plan-option-btn ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="plan-option-info">
                      <div className="option-name">
                        {p.name}{' '}
                        {isSelected && (
                          <Check size={14} style={{ display: 'inline', color: '#03BFFF', marginLeft: 4 }} />
                        )}
                      </div>
                      <div className="option-desc">{p.description || p.code}</div>
                    </div>
                    <div className="plan-option-price">{formatVnd(p.priceVnd)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="checkout-main-grid">
          <div className="checkout-card">
            <h2 className="checkout-card-title">
              <CreditCard size={20} color="#03BFFF" /> Phương thức thanh toán
            </h2>

            <div className="payment-methods-tabs">
              {[
                { id: 'VNPay' as const, label: 'Cổng VNPay', icon: <Building2 size={20} /> },
                { id: 'PayOS' as const, label: 'VietQR (PayOS)', icon: <QrCode size={20} /> },
              ].map((t) => {
                const active = method === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMethod(t.id)}
                    className={`payment-tab-btn ${active ? 'active' : ''}`}
                  >
                    <div className="payment-tab-icon">{t.icon}</div>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
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
                        Bạn sẽ được chuyển tiếp sang cổng VNPay để thanh toán qua VNPAY-QR, Thẻ ATM nội địa hoặc thẻ Quốc tế.
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
                        Hệ thống sẽ chuyển bạn sang trang PayOS để quét VietQR. Chỉ kích hoạt gói sau khi thanh toán thành công.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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

              <button type="submit" className="checkout-submit-btn" disabled={isLoading || plansLoading || !selectedPlan}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} /> Đang xử lý giao dịch...
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    {finalAmount > 0 ? (
                      <span>Thanh toán {formatVnd(finalAmount)}</span>
                    ) : (
                      <span>Kích hoạt miễn phí</span>
                    )}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* <div
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
            </div> */}
          </div>

          <div className="checkout-card">
            <h2 className="checkout-card-title">
              <Sparkles size={20} color="#03BFFF" /> Tóm tắt đơn hàng
            </h2>

            <div className="order-summary-row">
              <span className="label">Gói dịch vụ</span>
              <span className="val">{selectedPlan?.name || '—'}</span>
            </div>

            <div className="order-summary-row">
              <span className="label">Mã gói</span>
              <span className="val">{selectedPlan?.code || '—'}</span>
            </div>

            <div className="order-summary-row">
              <span className="label">Thời hạn</span>
              <span className="val">
                {selectedPlan?.durationDays ? `${selectedPlan.durationDays} ngày` : '/tháng'}
              </span>
            </div>

            <div className="order-summary-row">
              <span className="label">Giá gói</span>
              <span className="val">{formatVnd(rawPrice)}</span>
            </div>

            {promoApplied && discountAmount > 0 && (
              <div className="order-summary-row discount">
                <span className="label" style={{ color: '#16A34A' }}>
                  Mã giảm giá ({promoCode.toUpperCase()})
                </span>
                <span className="val">-{formatVnd(discountAmount)}</span>
              </div>
            )}

            <div className="order-divider" />

            <div className="order-total-row">
              <span className="order-total-label">Tổng thanh toán</span>
              <span className="order-total-amount">{formatVnd(finalAmount)}</span>
            </div>

            <div className="plan-benefits-card">
              <div className="benefits-title">
                <CheckCircle2 size={18} color="#03BFFF" /> Quyền lợi đi kèm gói cước
              </div>
              <ul className="benefits-list">
                {features.map((feat, idx) => (
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
