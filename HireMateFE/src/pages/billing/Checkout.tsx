import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CreditCard, QrCode, Building2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { billingService, toPlanCode, planTier, persistPlanCode, readStoredPlanCode } from '../../services/billing.service';

const hasAccessToken = () =>
  Boolean(sessionStorage.getItem('hm_access_token') || localStorage.getItem('hm_access_token'));

const PLAN_INFO_MAP: Record<
  string,
  {
    name: string;
    price: string;
    origPrice: string;
    period: string;
    desc: string;
    savings: string;
  }
> = {
  free: {
    name: 'Miễn phí',
    price: '0đ',
    origPrice: '0đ',
    period: 'Thanh toán theo tháng',
    desc: 'Cho người mới bắt đầu — 3 lượt phỏng vấn AI mỗi tháng.',
    savings: '0đ',
  },
  basic: {
    name: 'Tiêu chuẩn',
    price: '79.000đ',
    origPrice: '99.000đ',
    period: 'Thanh toán theo tháng',
    desc: 'Cho người luyện tập đều đặn — 15 lượt/tháng, phân tích CV ATS.',
    savings: '-20.000đ',
  },
  premium: {
    name: 'Tiêu chuẩn',
    price: '79.000đ',
    origPrice: '99.000đ',
    period: 'Thanh toán theo tháng',
    desc: 'Cho người luyện tập đều đặn — 15 lượt/tháng, phân tích CV ATS.',
    savings: '-20.000đ',
  },
  pro: {
    name: 'Cao cấp',
    price: '149.000đ',
    origPrice: '189.000đ',
    period: 'Thanh toán theo tháng',
    desc: 'Cho ứng viên nghiêm túc — 50 lượt/tháng, STAR chi tiết, ưu tiên Beta.',
    savings: '-40.000đ',
  },
  combo: {
    name: 'Cao cấp',
    price: '149.000đ',
    origPrice: '189.000đ',
    period: 'Thanh toán theo tháng',
    desc: 'Cho ứng viên nghiêm túc — 50 lượt/tháng, STAR chi tiết, ưu tiên Beta.',
    savings: '-40.000đ',
  },
};

type UiMethod = 'sandbox' | 'vnpay' | 'qr';

const envPayment = ((import.meta as any).env?.VITE_PAYMENT_METHOD as string | undefined)?.trim();

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get('plan') || 'pro';
  const planInfo = PLAN_INFO_MAP[planKey] || PLAN_INFO_MAP.pro;

  const [method, setMethod] = useState<UiMethod>(
    envPayment?.toLowerCase() === 'vnpay' ? 'vnpay' : 'sandbox'
  );
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState(readStoredPlanCode());
  const loginRedirect = `/login?redirect=${encodeURIComponent(`/checkout?plan=${planKey}`)}`;

  useEffect(() => {
    if (!hasAccessToken()) {
      setError('Cần đăng nhập trước khi thanh toán. Đang chuyển tới trang login…');
      const t = window.setTimeout(() => navigate(loginRedirect), 600);
      return () => window.clearTimeout(t);
    }

    billingService.getCurrentPlanCode().then((code) => {
      setCurrentPlan(code);
      const current = planTier(code);
      const target = planTier(planKey);
      if (target <= current) {
        setError(
          target === current
            ? `Bạn đang dùng gói ${planKey === 'pro' ? 'Cao cấp' : planKey === 'basic' ? 'Tiêu chuẩn' : 'Miễn phí'}. Chỉ được nâng cấp lên gói cao hơn.`
            : 'Không thể mua gói thấp hơn gói hiện tại.'
        );
      }
    }).catch(() => {});
  }, [loginRedirect, navigate, planKey]);

  const resolvePaymentMethod = (): string => {
    if (method === 'vnpay' || method === 'qr') return 'VNPay';
    return 'Mock';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasAccessToken()) {
      setError('Bạn cần đăng nhập trước khi thanh toán.');
      navigate(loginRedirect);
      return;
    }

    const current = planTier(currentPlan);
    const target = planTier(planKey);
    if (target <= current) {
      setError('Chỉ được nâng cấp lên gói cao hơn gói đang dùng. Quay lại Bảng giá để chọn.');
      return;
    }

    setSubmitting(true);

    try {
      const planCode = toPlanCode(planKey);
      const paymentMethod = resolvePaymentMethod();
      const res = await billingService.checkout({
        planCode,
        promoCode: promoCode.trim() || undefined,
        paymentMethod,
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          sessionStorage.removeItem('hm_access_token');
          navigate(loginRedirect);
          return;
        }
        setError(res.message || 'Checkout thất bại');
        return;
      }

      const data = res.data || {};
      if (data.plan) persistPlanCode(data.plan);
      else persistPlanCode(toPlanCode(planKey));

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      navigate(
        `/payment-success?plan=${encodeURIComponent(planKey)}&invoiceId=${encodeURIComponent(data.id || '')}&invoiceNumber=${encodeURIComponent(data.invoiceNumber || '')}`
      );
    } catch (err: any) {
      setError(err?.message || 'Không kết nối được API thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section container" style={{ maxWidth: '960px', margin: '30px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2>Thanh toán an toàn</h2>
        <p className="muted">
          Local: AI Heuristic (mock). Payment mặc định Mock sandbox; VNPay dùng cổng sandbox khi đã cấu hình
          TmnCode/HashSecret.
        </p>
      </div>

      <div className="grid grid-2" style={{ gap: '32px', alignItems: 'flex-start' }}>
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>Chọn phương thức thanh toán</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            {[
              { id: 'sandbox' as const, label: 'Sandbox Mock', icon: <CreditCard size={18} /> },
              { id: 'vnpay' as const, label: 'VNPay Sandbox', icon: <Building2 size={18} /> },
              { id: 'qr' as const, label: 'VNPay QR', icon: <QrCode size={18} /> },
            ].map((t) => {
              const active = method === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMethod(t.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: active ? 'rgba(3, 191, 255, 0.08)' : 'var(--surface)',
                    color: active ? 'var(--primary)' : 'var(--ink)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t.icon}
                  <span style={{ fontSize: '0.85rem' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {method === 'sandbox' && (
                <motion.div
                  key="sandbox"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginBottom: '24px' }}
                >
                  <p className="muted" style={{ fontSize: '0.9rem' }}>
                    Mock local: gọi API <code>/Billing/checkout</code> với <code>paymentMethod=Mock</code>,
                    kích hoạt Premium ngay — không cần cổng thật.
                  </p>
                </motion.div>
              )}

              {(method === 'vnpay' || method === 'qr') && (
                <motion.div
                  key="vnpay"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginBottom: '24px' }}
                >
                  <p className="muted" style={{ fontSize: '0.9rem' }}>
                    Chuyển tới{' '}
                    <strong>sandbox.vnpayment.vn</strong>. Cần set{' '}
                    <code>VnPay:TmnCode</code> + <code>VnPay:HashSecret</code> trong{' '}
                    <code>appsettings.Development.json</code> trên BE.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                Mã khuyến mãi (tuỳ chọn)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="HIREMATE10"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </div>

            {error && (
              <p style={{ color: '#EF4444', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={submitting}
            >
              <Lock size={16} />{' '}
              {submitting ? 'Đang xử lý…' : `Thanh toán ${planInfo.price}`} <ArrowRight size={18} />
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '16px',
              color: 'var(--muted)',
              fontSize: '0.8rem',
            }}
          >
            <ShieldCheck size={16} /> BE local · sandbox payment
          </div>
          <p style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/pricing" className="muted" style={{ fontSize: '0.85rem' }}>
              ← Quay lại bảng giá
            </Link>
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>Tóm tắt đơn hàng</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{planInfo.name}</div>
              <span className="muted" style={{ fontSize: '0.85rem' }}>{planInfo.period}</span>
            </div>
            <div style={{ fontWeight: 600, textDecoration: 'line-through', color: 'var(--muted)' }}>
              {planInfo.origPrice}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '16px',
              color: '#22C55E',
              fontWeight: 600,
            }}
          >
            <div>Ưu đãi</div>
            <div>{planInfo.savings}</div>
          </div>

          <hr style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Tổng thanh toán</div>
            <div style={{ fontWeight: 800, fontSize: '1.8rem', color: '#03BFFF' }}>
              {planInfo.price}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(3, 191, 255, 0.08)',
              padding: '16px',
              borderRadius: '10px',
              borderLeft: '4px solid #03BFFF',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--ink)' }}>
              Quyền lợi đi kèm
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              {planInfo.desc}
            </p>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.8rem' }}>
              BE planCode: <code>{toPlanCode(planKey)}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
