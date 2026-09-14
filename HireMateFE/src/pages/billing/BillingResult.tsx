import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

/** VNPay / PayOS return landing: /billing-result?status=success|failed&invoiceId=... */
export const BillingResult: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = (params.get('status') || '').toLowerCase();
  const invoiceId = params.get('invoiceId') || '';
  const ok = status === 'success';

  useEffect(() => {
    if (ok) {
      const t = window.setTimeout(() => {
        navigate(`/payment-success?plan=premium&invoiceId=${encodeURIComponent(invoiceId)}`, {
          replace: true,
        });
      }, 1200);
      return () => window.clearTimeout(t);
    }
  }, [ok, invoiceId, navigate]);

  return (
    <div className="section container" style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
      <div className="card" style={{ padding: '36px' }}>
        {ok ? (
          <>
            <CheckCircle size={48} color="#22C55E" style={{ marginBottom: 12 }} />
            <h2>Thanh toán sandbox thành công</h2>
            <p className="muted">Đang chuyển tới trang xác nhận…</p>
          </>
        ) : (
          <>
            <XCircle size={48} color="#EF4444" style={{ marginBottom: 12 }} />
            <h2>Thanh toán thất bại / hủy</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Giao dịch sandbox không hoàn tất. Bạn có thể thử lại.
            </p>
            <Link to="/pricing" className="btn btn-primary" style={{ justifyContent: 'center' }}>
              Về bảng giá <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
