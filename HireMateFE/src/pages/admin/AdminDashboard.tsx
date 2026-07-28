import React, { useState } from 'react';
import {
  Users, TrendingUp, Briefcase, CreditCard,
  MessageSquare, Activity, ArrowUpRight, ArrowDownRight,
  Star, FileText, Award, GitBranch
} from 'lucide-react';
import './admin.css';

// ---- Fake data ----
const stats = [
  { label: 'Tổng Users', value: '4,821', change: '+12.5%', up: true, icon: <Users size={22} />, color: 'blue' },
  { label: 'Doanh thu tháng', value: '₫48.6M', change: '+8.2%', up: true, icon: <TrendingUp size={22} />, color: 'green' },
  { label: 'Phỏng vấn AI', value: '12,340', change: '+31%', up: true, icon: <Briefcase size={22} />, color: 'purple' },
  { label: 'Subscriptions', value: '1,286', change: '+5.1%', up: true, icon: <CreditCard size={22} />, color: 'orange' },
  { label: 'Tickets mở', value: '38', change: '-14%', up: false, icon: <MessageSquare size={22} />, color: 'teal' },
  { label: 'Referrals', value: '903', change: '+22%', up: true, icon: <GitBranch size={22} />, color: 'pink' },
];

const recentUsers = [
  { id: 1, name: 'Nguyễn Văn An', email: 'an.nguyen@email.com', plan: 'Pro', joined: '2026-07-27', status: 'active' },
  { id: 2, name: 'Trần Thị Bích', email: 'bich.tran@email.com', plan: 'Free', joined: '2026-07-26', status: 'active' },
  { id: 3, name: 'Lê Minh Cường', email: 'cuong.le@email.com', plan: 'Premium', joined: '2026-07-25', status: 'active' },
  { id: 4, name: 'Phạm Thu Dung', email: 'dung.pham@email.com', plan: 'Pro', joined: '2026-07-24', status: 'banned' },
  { id: 5, name: 'Hoàng Đức Em', email: 'em.hoang@email.com', plan: 'Free', joined: '2026-07-23', status: 'active' },
];

const recentTickets = [
  { id: 1, subject: 'Không vào được tính năng phỏng vấn', user: 'an.nguyen@email.com', priority: 'high', status: 'open' },
  { id: 2, subject: 'Thanh toán bị lỗi', user: 'bich.tran@email.com', priority: 'high', status: 'open' },
  { id: 3, subject: 'CV phân tích sai thông tin', user: 'cuong.le@email.com', priority: 'medium', status: 'in_progress' },
  { id: 4, subject: 'Yêu cầu hoàn tiền', user: 'dung.pham@email.com', priority: 'medium', status: 'resolved' },
];

const revenueMonths = [
  { month: 'T2', value: 38 },
  { month: 'T3', value: 42 },
  { month: 'T4', value: 35 },
  { month: 'T5', value: 50 },
  { month: 'T6', value: 44 },
  { month: 'T7', value: 48.6 },
];

const planDist = [
  { name: 'Free', count: 3210, pct: 67, color: '#4facfe' },
  { name: 'Pro', count: 1105, pct: 23, color: '#667eea' },
  { name: 'Premium', count: 506, pct: 10, color: '#f093fb' },
];

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    active: 'success', banned: 'danger',
    open: 'danger', in_progress: 'warning', resolved: 'success',
    high: 'danger', medium: 'warning', low: 'info',
  };
  const label: Record<string, string> = {
    active: 'Active', banned: 'Banned',
    open: 'Mở', in_progress: 'Đang xử lý', resolved: 'Đã giải quyết',
    high: 'Cao', medium: 'Trung bình', low: 'Thấp',
  };
  return <span className={`admin-badge ${map[s] || 'neutral'}`}>{label[s] || s}</span>;
};

const AdminDashboard: React.FC = () => {
  const maxRevenue = Math.max(...revenueMonths.map(r => r.value));

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Tổng quan hệ thống</h1>
        <p className="admin-page-subtitle">
          Chào mừng trở lại! Đây là tổng quan toàn bộ hoạt động HireMate.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="admin-stat-card">
            <div className={`admin-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="admin-stat-value">{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
            <div className={`admin-stat-change ${s.up ? 'up' : 'down'}`}>
              {s.up ? <ArrowUpRight size={13} style={{ display: 'inline' }} /> : <ArrowDownRight size={13} style={{ display: 'inline' }} />}
              {' '}{s.change} so với tháng trước
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="admin-charts-grid" style={{ marginBottom: '1.75rem' }}>
        {/* Revenue Bar Chart */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">📈 Doanh thu 6 tháng gần nhất (triệu ₫)</h3>
          </div>
          <div className="admin-card-body">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.875rem', height: 160 }}>
              {revenueMonths.map((r, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {r.value}M
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: `${(r.value / maxRevenue) * 130}px`,
                      background: i === revenueMonths.length - 1
                        ? 'linear-gradient(180deg, #f093fb, #667eea)'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.15))',
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'height 0.6s ease',
                      minHeight: 16,
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}>{r.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🎯 Phân bổ gói dùng thử</h3>
          </div>
          <div className="admin-card-body">
            {planDist.map((p, i) => (
              <div key={i} style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>{p.count.toLocaleString()} ({p.pct}%)</span>
                </div>
                <div className="admin-progress">
                  <div className="admin-progress-bar" style={{ width: `${p.pct}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}aa)` }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Conversion rate</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f093fb' }}>33%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Avg. revenue / user</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4facfe' }}>₫38K</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Churn rate</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>4.2%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users + Tickets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Users */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">👥 Users mới nhất</h3>
            <a href="/admin/users" style={{ fontSize: '0.8rem', color: '#4facfe', textDecoration: 'none', fontWeight: 600 }}>
              Xem tất cả →
            </a>
          </div>
          <div className="admin-card-body" style={{ padding: '0' }}>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Gói</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div className="admin-avatar" style={{ width: '1.875rem', height: '1.875rem', fontSize: '0.75rem' }}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.name}</div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="admin-badge info">{u.plan}</span></td>
                      <td>{statusBadge(u.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🎫 Tickets gần đây</h3>
            <a href="/admin/tickets" style={{ fontSize: '0.8rem', color: '#4facfe', textDecoration: 'none', fontWeight: 600 }}>
              Xem tất cả →
            </a>
          </div>
          <div className="admin-card-body" style={{ padding: '0' }}>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Chủ đề</th>
                    <th>Ưu tiên</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '0.82rem' }}>{t.subject}</div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>{t.user}</div>
                      </td>
                      <td>{statusBadge(t.priority)}</td>
                      <td>{statusBadge(t.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="admin-card" style={{ marginTop: '1.5rem' }}>
        <div className="admin-card-header">
          <h3 className="admin-card-title">⚡ Hoạt động hệ thống</h3>
          <span className="admin-badge success"><Activity size={12} /> Online</span>
        </div>
        <div className="admin-card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: '🟢', text: 'API phỏng vấn AI hoạt động bình thường', time: '2 phút trước', color: '#34d399' },
              { icon: '💳', text: 'Giao dịch #INV-2847 thành công — ₫299,000', time: '8 phút trước', color: '#4facfe' },
              { icon: '👤', text: 'User mới đăng ký: em.hoang@email.com', time: '15 phút trước', color: '#c4b5fd' },
              { icon: '⚠️', text: 'Ticket ưu tiên cao mới: "Thanh toán bị lỗi"', time: '22 phút trước', color: '#fbbf24' },
              { icon: '🎯', text: '45 phiên phỏng vấn AI hoàn thành trong 1 giờ qua', time: '1 giờ trước', color: '#f093fb' },
            ].map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'background 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
                <span style={{ flex: 1, fontSize: '0.875rem', color: 'rgba(255,255,255,0.9)' }}>{a.text}</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
