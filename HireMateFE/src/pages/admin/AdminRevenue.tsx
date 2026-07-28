import React, { useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, FileText, ArrowUpRight, Download } from 'lucide-react';
import './admin.css';

// ---- Fake data ----
const monthlyRevenue = [
  { month: 'Tháng 2', revenue: 38200000, subscriptions: 982, newUsers: 312 },
  { month: 'Tháng 3', revenue: 42100000, subscriptions: 1040, newUsers: 358 },
  { month: 'Tháng 4', revenue: 35800000, subscriptions: 998, newUsers: 289 },
  { month: 'Tháng 5', revenue: 50400000, subscriptions: 1152, newUsers: 421 },
  { month: 'Tháng 6', revenue: 44600000, subscriptions: 1098, newUsers: 376 },
  { month: 'Tháng 7', revenue: 48620000, subscriptions: 1286, newUsers: 405 },
];

const invoices = [
  { id: 'INV-2847', user: 'Lê Minh Cường', email: 'cuong.le@email.com', plan: 'Premium', amount: 499000, date: '2026-07-27', status: 'paid', method: 'VNPay' },
  { id: 'INV-2846', user: 'Nguyễn Văn An', email: 'an.nguyen@email.com', plan: 'Pro', amount: 299000, date: '2026-07-26', status: 'paid', method: 'PayOS' },
  { id: 'INV-2845', user: 'Trần Thị Bích', email: 'bich.tran@email.com', plan: 'Pro', amount: 299000, date: '2026-07-26', status: 'pending', method: 'VNPay' },
  { id: 'INV-2844', user: 'Tô Minh Khoa', email: 'khoa.to@email.com', plan: 'Premium', amount: 499000, date: '2026-07-25', status: 'paid', method: 'PayOS' },
  { id: 'INV-2843', user: 'Đặng Văn Giang', email: 'giang.dang@email.com', plan: 'Pro', amount: 299000, date: '2026-07-24', status: 'failed', method: 'VNPay' },
  { id: 'INV-2842', user: 'Hoàng Đức Em', email: 'em.hoang@email.com', plan: 'Premium', amount: 499000, date: '2026-07-23', status: 'paid', method: 'PayOS' },
  { id: 'INV-2841', user: 'Bùi Thị Hoa', email: 'hoa.bui@email.com', plan: 'Pro', amount: 299000, date: '2026-07-22', status: 'refunded', method: 'VNPay' },
];

const fmt = (n: number) => `₫${n.toLocaleString('vi-VN')}`;
const fmtM = (n: number) => `₫${(n / 1_000_000).toFixed(1)}M`;

const statusBadge = (s: string) => {
  const map: Record<string, string> = { paid: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral' };
  const label: Record<string, string> = { paid: 'Đã thanh toán', pending: 'Chờ xử lý', failed: 'Thất bại', refunded: 'Hoàn tiền' };
  return <span className={`admin-badge ${map[s] || 'neutral'}`}>{label[s] || s}</span>;
};

const AdminRevenue: React.FC = () => {
  const [tab, setTab] = useState<'overview' | 'invoices'>('overview');
  const maxRev = Math.max(...monthlyRevenue.map(m => m.revenue));
  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">💰 Doanh thu & Thanh toán</h1>
        <p className="admin-page-subtitle">Theo dõi doanh thu, invoices và lịch sử giao dịch.</p>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon green"><DollarSign size={22} /></div>
          <div className="admin-stat-value">{fmtM(totalRevenue)}</div>
          <div className="admin-stat-label">Tổng doanh thu (6 tháng)</div>
          <div className="admin-stat-change up"><ArrowUpRight size={13} style={{ display: 'inline' }} /> +8.2%</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue"><CreditCard size={22} /></div>
          <div className="admin-stat-value">1,286</div>
          <div className="admin-stat-label">Subscriptions active</div>
          <div className="admin-stat-change up"><ArrowUpRight size={13} style={{ display: 'inline' }} /> +5.1%</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple"><TrendingUp size={22} /></div>
          <div className="admin-stat-value">33%</div>
          <div className="admin-stat-label">Conversion rate</div>
          <div className="admin-stat-change up"><ArrowUpRight size={13} style={{ display: 'inline' }} /> +2.1%</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon orange"><FileText size={22} /></div>
          <div className="admin-stat-value">38</div>
          <div className="admin-stat-label">Invoices tháng này</div>
          <div className="admin-stat-change up"><ArrowUpRight size={13} style={{ display: 'inline' }} /> +12%</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>
          📊 Thống kê tháng
        </button>
        <button className={`admin-tab${tab === 'invoices' ? ' active' : ''}`} onClick={() => setTab('invoices')}>
          🧾 Invoices
        </button>
      </div>

      {tab === 'overview' && (
        <div>
          {/* Monthly Revenue Chart */}
          <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-card-header">
              <h3 className="admin-card-title">📈 Doanh thu theo tháng</h3>
            </div>
            <div className="admin-card-body">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: 200, marginBottom: '0.5rem' }}>
                {monthlyRevenue.map((m, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                      {fmtM(m.revenue)}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        height: `${(m.revenue / maxRev) * 160}px`,
                        background: i === monthlyRevenue.length - 1
                          ? 'linear-gradient(180deg, #f093fb, #667eea)'
                          : 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.15))',
                        borderRadius: '10px 10px 4px 4px',
                        minHeight: 20,
                        transition: 'height 0.6s ease',
                        position: 'relative',
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly table */}
          <div className="admin-card">
            <div className="admin-card-body" style={{ padding: 0 }}>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Doanh thu</th>
                      <th>Subscriptions</th>
                      <th>Users mới</th>
                      <th>ARPU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRevenue.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{m.month}</td>
                        <td style={{ fontWeight: 700, color: '#34d399' }}>{fmtM(m.revenue)}</td>
                        <td style={{ color: '#93c5fd' }}>{m.subscriptions.toLocaleString()}</td>
                        <td style={{ color: '#c4b5fd' }}>{m.newUsers}</td>
                        <td style={{ color: '#fbbf24' }}>{fmt(Math.round(m.revenue / m.subscriptions))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🧾 Lịch sử Invoices</h3>
            <button className="admin-btn admin-btn-secondary admin-btn-sm"><Download size={14} /> Export CSV</button>
          </div>
          <div className="admin-card-body" style={{ padding: 0 }}>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Người dùng</th>
                    <th>Gói</th>
                    <th>Số tiền</th>
                    <th>Phương thức</th>
                    <th>Ngày</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'monospace', color: '#93c5fd', fontWeight: 600 }}>{inv.id}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.user}</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>{inv.email}</div>
                      </td>
                      <td><span className={`admin-badge ${inv.plan === 'Premium' ? 'purple' : 'info'}`}>{inv.plan}</span></td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>{fmt(inv.amount)}</td>
                      <td>
                        <span className="admin-badge neutral">
                          {inv.method === 'VNPay' ? '🏦' : '💳'} {inv.method}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{inv.date}</td>
                      <td>{statusBadge(inv.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRevenue;
