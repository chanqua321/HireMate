import React from 'react';
import { Link } from 'react-router-dom';
import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Invoice: React.FC = () => {
  const { profile } = useApp();

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('vi-VN');

  return (
    <div className="section container" style={{ maxWidth: '800px', margin: '30px auto' }}>
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Link
          to="/dashboard"
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={18} /> Quay lại
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Printer size={18} /> In hóa đơn
        </button>
      </div>

      <div className="card invoice-card" style={{ padding: '48px', background: '#ffffff' }}>
        {/* Invoice Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '36px',
          }}
        >
          <div>
            <img src="/logo.png" alt="HireMate" style={{ height: '36px', marginBottom: '12px' }} />
            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
              Công ty Cổ phần Công nghệ HireMate
              <br />
              Khu Công nghệ cao, TP. Hồ Chí Minh
              <br />
              MST: 0317829104
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: '0 0 6px', color: 'var(--ink)' }}>HÓA ĐƠN</h2>
            <div className="muted" style={{ fontSize: '0.9rem' }}>
              <strong>Số hóa đơn:</strong> INV-2026-9843
              <br />
              <strong>Ngày lập:</strong> {today}
            </div>
            <div style={{ marginTop: '10px' }}>
              <span className="badge badge--success">
                <CheckCircle2 size={14} /> ĐÃ THANH TOÁN
              </span>
            </div>
          </div>
        </div>

        <hr style={{ borderTop: '1px solid var(--border)', margin: '24px 0' }} />

        {/* Client & Billing Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '36px',
          }}
        >
          <div>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Đơn vị xuất hóa đơn:</span>
            <div style={{ fontWeight: 600, marginTop: '4px' }}>HireMate Vietnam Ltd.</div>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
              Email: billing@hiremate.ai
              <br />
              Hotline: 0918 306 884
            </p>
          </div>

          <div>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Khách hàng:</span>
            <div style={{ fontWeight: 600, marginTop: '4px' }}>
              {profile.name || 'Khách hàng HireMate'}
            </div>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
              Ngành ứng tuyển: {profile.field || 'Công nghệ thông tin'}
              <br />
              Vị trí: {profile.role || 'Lập trình viên Frontend'}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '36px',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--muted)' }}>
              <th style={{ padding: '12px 8px' }}>Mô tả dịch vụ</th>
              <th style={{ padding: '12px 8px', textAlign: 'center' }}>Số lượng</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Đơn giá</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '16px 8px' }}>
                <div style={{ fontWeight: 600 }}>Gói Chuyên nghiệp (Pro) - 1 Năm</div>
                <div className="muted" style={{ fontSize: '0.85rem' }}>
                  Luyện phỏng vấn AI không giới hạn, chấm điểm STAR S-T-A-R
                </div>
              </td>
              <td style={{ padding: '16px 8px', textAlign: 'center' }}>1</td>
              <td style={{ padding: '16px 8px', textAlign: 'right' }}>2.388.000đ</td>
              <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 600 }}>
                2.388.000đ
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '16px 8px' }}>
                <div style={{ fontWeight: 600 }}>Ưu đãi thanh toán năm (20%)</div>
              </td>
              <td style={{ padding: '16px 8px', textAlign: 'center' }}>1</td>
              <td style={{ padding: '16px 8px', textAlign: 'right', color: '#22C55E' }}>
                -480.000đ
              </td>
              <td
                style={{
                  padding: '16px 8px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: '#22C55E',
                }}
              >
                -480.000đ
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '36px' }}>
          <div style={{ width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="muted">Cộng tiền hàng:</span>
              <span>1.908.000đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="muted">Thuế VAT (0%):</span>
              <span>0đ</span>
            </div>
            <hr style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 800,
                fontSize: '1.2rem',
                color: 'var(--primary)',
              }}
            >
              <span>Tổng thanh toán:</span>
              <span>1.908.000đ</span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--muted)',
            borderTop: '1px dashed var(--border)',
            paddingTop: '24px',
          }}
        >
          Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của HireMate!
          <br />
          Hóa đơn điện tử có giá trị lưu hành toàn quốc theo quy định pháp luật.
        </div>
      </div>
    </div>
  );
};
