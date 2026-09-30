import React, { useEffect, useState } from 'react';
import { adminService, AdminPaymentRow } from '../../shared/services/admin.service';
import './admin.css';

const AdminPayments: React.FC = () => {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if ((from && !to) || (!from && to) || (from && to && from > to)) {
      setError('Chọn đủ từ ngày và đến ngày, với từ ngày không sau đến ngày.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const res = await adminService.getPayments({ q: q || undefined, status: status || undefined, from: from || undefined, to: to || undefined, page, pageSize: 20 });
    if (!res.ok || !res.data) {
      setRows([]);
      setError(res.message || 'Không thể tải hóa đơn.');
    } else {
      setRows(res.data.items || []);
      setTotal(res.data.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => { load().catch((e) => { setError(e?.message || 'Không thể tải hóa đơn.'); setLoading(false); }); }, [page, status, from, to]);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Thanh toán</h1>
        <p className="admin-page-subtitle">Danh sách hóa đơn chỉ để xem. Không đổi trạng thái thanh toán tại đây.</p>
      </div>
      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <div className="admin-card-body" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input className="admin-input" placeholder="Mã hóa đơn, email, tên" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="admin-select" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Mọi trạng thái</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input className="admin-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="admin-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => { setPage(1); load(); }}>Lọc</button>
        </div>
      </div>
      {loading && <p>Đang tải...</p>}
      {!loading && error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      {!loading && !error && (
        <div className="admin-card">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr><th>Hóa đơn</th><th>Người dùng</th><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Tạo</th><th>Thanh toán</th><th>Cổng</th><th>Mã giao dịch</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Không có hóa đơn.</td></tr> : rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.invoiceNumber}</td>
                    <td><div>{row.fullName || '—'}</div><div>{row.email}</div></td>
                    <td>{row.planName || '—'}</td>
                    <td>{Number(row.amountVnd).toLocaleString('vi-VN')} ₫</td>
                    <td>{row.status}</td>
                    <td>{new Date(row.createdAt).toLocaleString('vi-VN')}</td>
                    <td>{row.paidAt ? new Date(row.paidAt).toLocaleString('vi-VN') : '—'}</td>
                    <td>{row.provider || '—'}</td>
                    <td>{row.transactionRef || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem' }}>
            <span>{total} hóa đơn</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
              <span>Trang {page}</span>
              <button className="admin-btn admin-btn-secondary admin-btn-sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Sau</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
