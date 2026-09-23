import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, FileText, Loader2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { billingService } from '../../api/billing.service';
import { useApp } from '../../../../app/context/AppContext';
import './css/PaymentSuccess.css';

type VerificationState =
  | { status: 'loading' }
  | { status: 'paid'; invoiceNumber: string; planName: string; amount: number }
  | { status: 'failed'; message: string };

export const PaymentSuccess: React.FC = () => {
  const { refreshProfile } = useApp();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice') || '';
  const [verification, setVerification] = useState<VerificationState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    if (!invoiceId) {
      setVerification({ status: 'failed', message: 'Thiếu mã hóa đơn để xác nhận thanh toán.' });
      return;
    }

    billingService.getInvoiceDetail(invoiceId)
      .then(async (res) => {
        if (!alive) return;
        const invoice = res.data;
        if (!res.ok || !invoice || invoice.status !== 'Paid') {
          setVerification({ status: 'failed', message: res.message || 'Thanh toán chưa được máy chủ xác nhận.' });
          return;
        }
        await refreshProfile();
        if (!alive) return;
        setVerification({
          status: 'paid',
          invoiceNumber: invoice.invoiceNumber || invoice.id,
          planName: invoice.plan?.name || invoice.plan?.code || 'Gói HireMate',
          amount: invoice.amountVnd,
        });
      })
      .catch(() => {
        if (alive) setVerification({ status: 'failed', message: 'Không thể xác minh hóa đơn với máy chủ.' });
      });

    return () => { alive = false; };
  }, [invoiceId, refreshProfile]);

  if (verification.status === 'loading') {
    return <div className="payment-success-page"><div className="payment-success-card"><Loader2 className="animate-spin" /><p>Đang xác minh thanh toán với máy chủ…</p></div></div>;
  }

  if (verification.status === 'failed') {
    return <div className="payment-success-page"><div className="payment-success-card"><XCircle size={38} /><h2>Thanh toán chưa được xác nhận</h2><p>{verification.message}</p><Link to="/pricing" className="payment-btn-primary">Về bảng giá <ArrowRight size={18} /></Link></div></div>;
  }

  return (
    <div className="payment-success-page">
      <motion.div className="payment-success-card" initial={{ opacity: 0, scale: 0.92, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
        <div className="payment-success-icon-wrap"><CheckCircle size={38} /></div>
        <h2 className="payment-success-title">Thanh toán thành công</h2>
        <p className="payment-success-subtitle">Quyền lợi được xác nhận từ hóa đơn trên máy chủ.</p>
        <div className="payment-receipt-box">
          <div className="receipt-row"><span className="receipt-label">Mã đơn hàng</span><span className="receipt-value">#{verification.invoiceNumber}</span></div>
          <div className="receipt-row"><span className="receipt-label">Gói cước</span><span className="receipt-value">{verification.planName}</span></div>
          <div className="receipt-row"><span className="receipt-label">Số tiền thanh toán</span><span className="receipt-value receipt-value--price">{verification.amount.toLocaleString('vi-VN')}đ</span></div>
          <div className="receipt-row"><span className="receipt-label">Trạng thái</span><span className="badge badge--success">Đã thanh toán</span></div>
        </div>
        <div className="payment-actions">
          <Link to="/onboarding/summary" className="payment-btn-primary"><span>Xác nhận hồ sơ & Phỏng vấn AI</span><ArrowRight size={18} /></Link>
          <Link to="/dashboard?tab=scan" className="payment-btn-ghost"><span>Về Kho CV</span></Link>
          <Link to={`/invoice?invoice=${encodeURIComponent(invoiceId)}`} className="payment-btn-ghost"><FileText size={18} /><span>Xem hóa đơn điện tử</span></Link>
        </div>
      </motion.div>
    </div>
  );
};
