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
  const invoiceParam = searchParams.get('invoice') || '';
  const planInfo = PLAN_SUCCESS_MAP[planKey] || {
    title: `Chào mừng bạn đến với gói ${planKey}!`,
    packageName: `Gói ${planKey}`,
    price: '',
  };

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
    <div className="payment-success-page">
      <motion.div
        className="payment-success-card"
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <motion.div
          className="payment-success-icon-wrap"
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          <CheckCircle size={38} />
        </motion.div>

        <span className="payment-success-badge">
          <Sparkles size={15} /> Thanh toán thành công
        </span>
        <h2 className="payment-success-title">{planInfo.title}</h2>
        <p className="payment-success-subtitle">
          Tài khoản HireMate của bạn đã được kích hoạt đầy đủ quyền lợi phỏng vấn AI cao cấp.
        </p>

        <div className="payment-receipt-box">
          <div className="receipt-row">
            <span className="receipt-label">Mã đơn hàng</span>
            <span className="receipt-value">#{invoiceParam}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Gói cước</span>
            <span className="receipt-value">{planInfo.packageName}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Số tiền thanh toán</span>
            <span className="receipt-value receipt-value--price">{planInfo.price}</span>
          </div>
          <div className="receipt-row">
            <span className="receipt-label">Trạng thái</span>
            <span className="badge badge--success">
              {isVerifying ? 'Đang xác thực...' : 'Đã thanh toán'}
            </span>
          </div>
        </div>

        <div className="payment-actions">
          <Link to="/dashboard" className="payment-btn-primary">
            <span>Về Bảng điều khiển</span>
            <ArrowRight size={18} />
          </Link>
          <Link
            to={`/invoice?plan=${planKey}&invoice=${invoiceParam}`}
            className="payment-btn-ghost"
          >
            <FileText size={18} />
            <span>Xem hóa đơn điện tử</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
