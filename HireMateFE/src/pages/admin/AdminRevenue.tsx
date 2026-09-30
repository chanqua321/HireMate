import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, FileText, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { adminService, AdminInvoiceRow, AdminRevenueSeries, RevenueBucket } from '../../shared/services/admin.service';
import './admin.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const fmt = (n: number) => `₫${n.toLocaleString('vi-VN')}`;
const fmtM = (n: number) => {
  if (n >= 1_000_000_000) return `₫${(n / 1_000_000_000).toFixed(1)} Tỷ`;
  if (n >= 1_000_000) return `₫${(n / 1_000_000).toFixed(1)} Tr`;
  if (n >= 1_000) return `₫${(n / 1_000).toFixed(0)}K`;
  return `₫${n.toLocaleString('vi-VN')}`;
};
const statusBadge = (s: string) => {
  const key = s.toLowerCase();
  const map: Record<string, string> = { paid: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral' };
  const label: Record<string, string> = { paid: 'Đã thanh toán', pending: 'Chờ xử lý', failed: 'Thất bại', refunded: 'Hoàn tiền' };
  return <span className={`admin-badge ${map[key] || 'neutral'}`}>{label[key] || s}</span>;
};

const AdminRevenue: React.FC = () => {
  const [tab, setTab] = useState<'overview' | 'invoices'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grain, setGrain] = useState<'day' | 'week' | 'month'>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [series, setSeries] = useState<AdminRevenueSeries | null>(null);
  const [buckets, setBuckets] = useState<RevenueBucket[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoiceRow[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const res = await adminService.getRevenueSeries(grain, from || undefined, to || undefined);
    if (res.ok && res.data) {
      setSeries(res.data);
      setBuckets(res.data.buckets ?? []);
      setInvoices(res.data.invoices ?? []);
    } else {
      setSeries(null);
      setBuckets([]);
      setInvoices([]);
      setError(res.message || 'Không tải được doanh thu');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [grain, from, to]);

  const summary = series?.summary;
  const change = summary?.changePercent ?? 0;
  const changeUp = change >= 0;

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-page-title">Doanh thu & Thanh toán</h1>
          <p className="admin-page-subtitle">Toàn bộ hóa đơn hệ thống, lọc theo ngày, tuần hoặc tháng.</p>
        </div>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Đang cập nhật...' : 'Làm mới'}
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <div className="admin-card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
          {(['day', 'week', 'month'] as const).map((value) => (
            <button key={value} className={`admin-tab${grain === value ? ' active' : ''}`} onClick={() => setGrain(value)}>
              {value === 'day' ? 'Theo ngày' : value === 'week' ? 'Theo tuần' : 'Theo tháng'}
            </button>
          ))}
          <label className="admin-form-group" style={{ margin: 0 }}>
            <span className="admin-label">Từ ngày</span>
            <input className="admin-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="admin-form-group" style={{ margin: 0 }}>
            <span className="admin-label">Đến ngày</span>
            <input className="admin-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          {(from || to) && <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => { setFrom(''); setTo(''); }}>Xóa lọc ngày</button>}
        </div>
      </div>

      {error && <div className="admin-card" style={{ marginBottom: '1rem', padding: '0.9rem 1rem', color: '#b91c1c' }}>{error}</div>}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon green"><DollarSign size={22} /></div>
          <div className="admin-stat-value">{fmtM(summary?.totalRevenue ?? 0)}</div>
          <div className="admin-stat-label">Doanh thu trong kỳ</div>
          <div className={`admin-stat-change ${changeUp ? 'up' : ''}`}>
            {changeUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change > 0 ? '+' : ''}{change}% so với kỳ trước
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue"><CreditCard size={22} /></div>
          <div className="admin-stat-value">{(summary?.premiumUsers ?? 0).toLocaleString('vi-VN')}</div>
          <div className="admin-stat-label">User Premium</div>
          <div className="admin-stat-change">Tổng mọi thời điểm {fmtM(summary?.allTimeRevenue ?? 0)}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple"><TrendingUp size={22} /></div>
          <div className="admin-stat-value">{summary?.conversionRate ?? 0}%</div>
          <div className="admin-stat-label">Tỷ lệ chuyển đổi</div>
          <div className="admin-stat-change">ARPU kỳ này {fmt(summary?.arpu ?? 0)}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon orange"><FileText size={22} /></div>
          <div className="admin-stat-value">{summary?.paidInvoices ?? 0}</div>
          <div className="admin-stat-label">Hóa đơn đã thanh toán</div>
          <div className="admin-stat-change">{invoices.length} giao dịch trong kỳ</div>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Biểu đồ</button>
        <button className={`admin-tab${tab === 'invoices' ? ' active' : ''}`} onClick={() => setTab('invoices')}>Hóa đơn</button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-card-header"><h3 className="admin-card-title">Doanh thu {grain === 'day' ? 'theo ngày' : grain === 'week' ? 'theo tuần' : 'theo tháng'}</h3></div>
            <div className="admin-card-body">
              {buckets.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--admin-text-muted)' }}>Chưa có hóa đơn đã thanh toán trong khoảng đã chọn.</p>
              ) : (
                <div style={{ height: 280 }}>
                  <Bar
                    data={{
                      labels: buckets.map((b) => b.label),
                      datasets: [{ label: 'Doanh thu', data: buckets.map((b) => b.revenue), backgroundColor: 'rgba(3, 191, 255, 0.75)', borderRadius: 8, maxBarThickness: 48 }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => fmt(Number(item.raw)) } } },
                      scales: { y: { ticks: { callback: (value) => fmtM(Number(value)) } } },
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="admin-card">
            <div className="admin-card-body" style={{ padding: 0 }}>
              <table className="admin-table">
                <thead><tr><th>Kỳ</th><th>Doanh thu</th><th>Hóa đơn</th><th>User mới</th><th>ARPU</th></tr></thead>
                <tbody>
                  {buckets.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có dữ liệu trong khoảng này.</td></tr>
                  ) : buckets.map((m) => (
                    <tr key={m.start}>
                      <td style={{ fontWeight: 600 }}>{m.label}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{fmtM(m.revenue)}</td>
                      <td>{m.invoices}</td>
                      <td>{m.newUsers}</td>
                      <td>{fmt(m.invoices > 0 ? Math.round(m.revenue / m.invoices) : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <div className="admin-card">
          <div className="admin-card-body" style={{ padding: 0 }}>
            <table className="admin-table">
              <thead><tr><th>Mã</th><th>Người dùng</th><th>Gói</th><th>Số tiền</th><th>Phương thức</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>Không có hóa đơn trong khoảng đã chọn.</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: 'monospace' }}>{inv.invoiceNumber || inv.id.slice(0, 8)}</td>
                    <td><div style={{ fontWeight: 600 }}>{inv.fullName || 'Người dùng'}</div><div style={{ fontSize: '0.75rem' }}>{inv.email}</div></td>
                    <td>{inv.planName || '—'}</td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>{fmt(inv.amountVnd)}</td>
                    <td>{inv.paymentMethod}</td>
                    <td>{(inv.paidAt || inv.createdAt || '').slice(0, 10)}</td>
                    <td>{statusBadge(inv.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRevenue;
