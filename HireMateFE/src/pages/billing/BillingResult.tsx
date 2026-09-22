import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { billingService } from '../../features/billing/api/billing.service';
import { useApp } from '../../app/context/AppContext';

/** VNPay / PayOS return landing: /billing-result?status=success|cancel&orderCode=... */
export const BillingResult: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useApp();
  const status = (params.get('status') || '').toLowerCase();
  const orderCode = params.get('orderCode') || params.get('order_code') || '';
  const code = params.get('code') || '';
  const invoiceId = params.get('invoiceId') || '';
  const canceled = status === 'cancel' || status === 'cancelled' || status === 'failed';

  const [phase, setPhase] = useState<'loading' | 'ok' | 'fail'>(canceled ? 'fail' : 'loading');
  const [planCode, setPlanCode] = useState('');
  const [message, setMessage] = useState(
    canceled ? 'Giao dịch bị hủy hoặc thất bại.' : 'Đang xác nhận thanh toán PayOS...'
  );

  useEffect(() => {
    if (canceled) return;

    let alive = true;
    (async () => {
      try {
        const res = await billingService.confirmPayOs({
          orderCode: orderCode || undefined,
          invoiceId: invoiceId || undefined,
          status: params.get('status') || undefined,
          code: code || undefined,
          cancel: false,
        });

        if (!alive) return;

        if (res.ok && (res.data?.success || res.data?.status === 'Paid')) {
          const plan = res.data?.plan || '';
          setPlanCode(plan);
          setPhase('ok');
          setMessage('Thanh toán thành công.');
          await refreshProfile?.();
          window.setTimeout(() => {
            navigate(
              `/payment-success?invoice=${encodeURIComponent(res.data?.invoiceId || invoiceId || '')}`,
              { replace: true }
            );
          }, 900);
          return;
        }

        setPhase('fail');
        setMessage(res.message || 'Thanh toán chưa hoàn tất.');
      } catch (err: any) {
        if (!alive) return;
        setPhase('fail');
        setMessage(err?.message || 'Không xác nhận được giao dịch PayOS.');
      }
    })();

    return () => {
      alive = false;
    };
  }, [canceled, orderCode, invoiceId, code, navigate, params, refreshProfile]);

  return (
    <div className="section container" style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
      <div className="card" style={{ padding: '36px' }}>
        {phase === 'loading' && (
          <>
            <Loader2 size={40} color="#03BFFF" style={{ marginBottom: 12, animation: 'spin 1s linear infinite' }} />
            <h2>Đang xác nhận PayOS</h2>
            <p className="muted">{message}</p>
          </>
        )}
        {phase === 'ok' && (
          <>
            <CheckCircle size={48} color="#22C55E" style={{ marginBottom: 12 }} />
            <h2>Thanh toán thành công</h2>
            <p className="muted">Đang chuyển tới trang xác nhận… ({planCode})</p>
          </>
        )}
        {phase === 'fail' && (
          <>
            <XCircle size={48} color="#EF4444" style={{ marginBottom: 12 }} />
            <h2>Thanh toán thất bại / hủy</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              {message}
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
