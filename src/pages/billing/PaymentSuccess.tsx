import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useConfetti } from '../../hooks/useConfetti';

export const PaymentSuccess: React.FC = () => {
  const { triggerConfetti } = useConfetti();

  useEffect(() => {
    triggerConfetti();
  }, [triggerConfetti]);

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
        <h2 style={{ marginBottom: '12px' }}>Chào mừng bạn đến với gói Pro!</h2>
        <p className="muted" style={{ marginBottom: '28px' }}>
          Tài khoản HireMate của bạn đã được kích hoạt đầy đủ quyền lợi phỏng vấn không giới hạn.
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
            <strong>#HM2026-9843</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="muted">Gói cước</span>
            <strong>Chuyên nghiệp (Pro) - 1 năm</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="muted">Số tiền thanh toán</span>
            <strong style={{ color: 'var(--primary)' }}>1.908.000đ</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Trạng thái</span>
            <span className="badge badge--success">Đã thanh toán</span>
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
            to="/invoice"
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
