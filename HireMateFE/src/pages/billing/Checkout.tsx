import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, QrCode, Building2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<'credit' | 'atm' | 'qr'>('credit');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate checkout success
    navigate('/payment-success');
  };

  return (
    <div className="section container" style={{ maxWidth: '960px', margin: '30px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2>Thanh toán an toàn</h2>
        <p className="muted">
          Hoàn tất đơn hàng để kích hoạt quyền lợi gói Chuyên nghiệp (Pro).
        </p>
      </div>

      <div className="grid grid-2" style={{ gap: '32px', alignItems: 'flex-start' }}>
        {/* Payment Form Column */}
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>Chọn phương thức thanh toán</h3>

          {/* Payment Method Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            {[
              { id: 'credit', label: 'Thẻ tín dụng', icon: <CreditCard size={18} /> },
              { id: 'atm', label: 'Thẻ ATM', icon: <Building2 size={18} /> },
              { id: 'qr', label: 'VietQR', icon: <QrCode size={18} /> },
            ].map((t) => {
              const active = method === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMethod(t.id as 'credit' | 'atm' | 'qr')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: active
                      ? '2px solid var(--primary)'
                      : '1px solid var(--border)',
                    background: active
                      ? 'rgba(3, 191, 255, 0.08)'
                      : 'var(--card)',
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
              {method === 'credit' && (
                <motion.div
                  key="credit"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                      Số thẻ
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="4532 •••• •••• ••••"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                      Tên chủ thẻ
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="NGUYEN VAN A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                        Ngày hết hạn
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                        Mã CVC
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="123"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {method === 'atm' && (
                <motion.div
                  key="atm"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginBottom: '24px' }}
                >
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                      Chọn Ngân hàng
                    </label>
                    <select className="form-control" required>
                      <option value="vcb">Vietcombank</option>
                      <option value="tcb">Techcombank</option>
                      <option value="mb">MB Bank (Quân Đội)</option>
                      <option value="bidv">BIDV</option>
                      <option value="acb">ACB Bank</option>
                    </select>
                  </div>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    Bạn sẽ được chuyển hướng tới cổng thanh toán Napas an toàn của ngân hàng để hoàn tất.
                  </p>
                </motion.div>
              )}

              {method === 'qr' && (
                <motion.div
                  key="qr"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{ textAlign: 'center', marginBottom: '24px' }}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px dashed var(--border)',
                      display: 'inline-block',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '180px',
                        height: '180px',
                        background: 'var(--ink)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        fontWeight: 700,
                      }}
                    >
                      MÃ VIETQR
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>
                    Mở ứng dụng Ngân hàng trên điện thoại và quét mã QR để chuyển khoản nhanh.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Lock size={16} /> Thanh toán 1.908.000đ <ArrowRight size={18} />
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
            <ShieldCheck size={16} /> Bảo mật SSL 256-bit chuẩn quốc tế
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '20px' }}>Tóm tắt đơn hàng</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Gói Chuyên nghiệp (Pro)</div>
              <span className="muted" style={{ fontSize: '0.85rem' }}>Thanh toán theo năm</span>
            </div>
            <div style={{ fontWeight: 600 }}>2.388.000đ</div>
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
            <div>Ưu đãi giảm giá (20%)</div>
            <div>-480.000đ</div>
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
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>
              1.908.000đ
            </div>
          </div>

          <div
            style={{
              background: 'rgba(3, 191, 255, 0.08)',
              padding: '16px',
              borderRadius: '10px',
              borderLeft: '4px solid var(--primary)',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', marginBottom: '6px', color: 'var(--ink)' }}>
              Quyền lợi đi kèm
            </h4>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--muted)' }}>
              <li>Luyện phỏng vấn AI không giới hạn 365 ngày</li>
              <li>Chấm điểm STAR & phân tích chi tiết</li>
              <li>Trả lời bằng giọng nói (Voice AI)</li>
              <li>Hỗ trợ xuất báo cáo PDF</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
