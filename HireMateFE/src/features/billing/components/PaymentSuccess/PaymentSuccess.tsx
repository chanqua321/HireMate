import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, FileText, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfetti } from '../../../../shared/hooks';
import { billingService } from '../../api/billing.service';
import { useApp } from '../../../../app/context/AppContext';
import './css/PaymentSuccess.css';

const PLAN_SUCCESS_MAP: Record<
  string,
  {
    title: string;
    packageName: string;
    price: string;
  }
> = {
  free: {
    title: 'Chào mừng bạn đến với Gói Miễn phí!',
    packageName: 'Gói Miễn phí - 1 tháng',
    price: '0đ',
  },
  basic: {
    title: 'Chào mừng bạn đến với Gói Cơ Bản!',
    packageName: 'Gói Cơ Bản - 1 tháng',
    price: '79.000đ',
  },
  pro: {
    title: 'Chào mừng bạn đến với Gói Nâng Cao!',
    packageName: 'Gói Nâng Cao - 1 tháng',
    price: '149.000đ',
  },
  premium: {
    title: 'Chào mừng bạn đến với Gói Cao Cấp!',
    packageName: 'Gói Cao Cấp - 1 tháng',
    price: '149.000đ',
  },
};

export const PaymentSuccess: React.FC = () => {
  const { triggerConfetti } = useConfetti();
  const { refreshProfile } = useApp();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const planKey = (searchParams.get('plan') || 'pro').toLowerCase();
  const invoiceParam = searchParams.get('invoice') || 'HM-20260726-3362';
  const planInfo = PLAN_SUCCESS_MAP[planKey] || PLAN_SUCCESS_MAP.pro;

  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    triggerConfetti();

    // If returning from VNPay or PayOS with query parameters
    if (location.search && (location.search.includes('vnp_') || location.search.includes('code='))) {
      setIsVerifying(true);
      billingService.handleVnPayReturn(location.search)
        .then(() => {
          if (refreshProfile) refreshProfile();
        })
        .catch(() => {})
        .finally(() => setIsVerifying(false));
    } else {
      if (refreshProfile) refreshProfile();
    }
  }, [triggerConfetti, location.search]);

  return (
    <div className="section container" style={{ maxWidth: '580px', margin: '40px auto' }}>
      <motion.div
        className="card"
        style={{ padding: '40px', textAlign: 'center' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="icon-chip"
          style={{
            margin: '0 auto 20px',
            width: '68px',
            height: '68px',
            color: '#22C55E',
            background: 'rgba(34, 197, 94, 0.12)',
          }}
          initial={{ scale: 0.5, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <CheckCircle size={40} />
        </motion.div>

        <span
          className="eyebrow"
          style={{ justifyContent: 'center', marginBottom: '8px', color: '#22C55E' }}
        >
          <Sparkles size={16} /> Thanh toán thành công
        </span>
        <h2 style={{ marginBottom: '12px' }}>{planInfo.title}</h2>
        <p className="muted" style={{ marginBottom: '28px' }}>
          Tài khoản HireMate của bạn đã được kích hoạt đầy đủ quyền lợi phỏng vấn AI cao cấp.
        </p>

        <div
          style={{
            background: 'var(--bg-subtle, #F8FAFC)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'left',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="muted">Mã đơn hàng</span>
            <strong>#{invoiceParam}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="muted">Gói cước</span>
            <strong>{planInfo.packageName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="muted">Số tiền thanh toán</span>
            <strong style={{ color: 'var(--primary)' }}>{planInfo.price}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Trạng thái</span>
            <span className="badge badge--success">
              {isVerifying ? 'Đang xác thực giao dịch...' : 'Đã thanh toán'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            to="/dashboard"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Về Bảng điều khiển <ArrowRight size={18} />
          </Link>
          <Link
            to={`/invoice?plan=${planKey}&invoice=${invoiceParam}`}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <FileText size={18} /> Xem hóa đơn điện tử
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
