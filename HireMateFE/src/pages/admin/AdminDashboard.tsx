import React, { useEffect, useState } from 'react';
import {
  Users, TrendingUp, Briefcase, CreditCard, MessageSquare, GitBranch,
} from 'lucide-react';
import './admin.css';
import { adminService } from '../../services';

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
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [a, u, t] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getUsers(),
        adminService.getTickets(),
      ]);
      if (cancelled) return;
      if (!a.ok && a.status === 401) setError('Cần đăng nhập Admin.');
      else if (!a.ok && a.status === 403) setError('Tài khoản không có quyền Admin.');
      else if (!a.ok) setError(a.message || 'Không tải được analytics');
      else setAnalytics(a.data);

      if (u.ok && Array.isArray(u.data)) setUsers(u.data.slice(0, 8));
      if (t.ok && Array.isArray(t.data)) setTickets(t.data.slice(0, 8));
      setLoading(false);
    })().catch((e) => {
      if (!cancelled) {
        setError(e?.message || 'Lỗi API admin');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { label: 'Users', value: String(analytics?.usersCount ?? analytics?.totalUsers ?? users.length ?? '—'), icon: <Users size={22} />, color: 'blue' },
    { label: 'Premium', value: String(analytics?.premiumUsers ?? analytics?.premiumCount ?? '—'), icon: <CreditCard size={22} />, color: 'orange' },
    { label: 'Phỏng vấn', value: String(analytics?.interviewsCount ?? analytics?.totalInterviews ?? '—'), icon: <Briefcase size={22} />, color: 'purple' },
    { label: 'Conversion', value: analytics?.conversionRate != null ? `${analytics.conversionRate}%` : '—', icon: <TrendingUp size={22} />, color: 'green' },
    { label: 'Tickets', value: String(tickets.length || analytics?.openTickets || '—'), icon: <MessageSquare size={22} />, color: 'teal' },
    { label: 'Revenue', value: analytics?.revenue != null ? `₫${analytics.revenue}` : '—', icon: <GitBranch size={22} />, color: 'pink' },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Tổng quan hệ thống</h1>
        <p className="admin-page-subtitle">
          {loading ? 'Đang tải từ API Admin…' : 'Dữ liệu từ /api/Admin/*'}
        </p>
        {error && <p style={{ color: '#EF4444' }}>{error}</p>}
      </div>

      <div className="admin-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="admin-stat-card">
            <div className={`admin-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="admin-stat-body">
              <div className="admin-stat-label">{s.label}</div>
              <div className="admin-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-grid-2" style={{ marginTop: 24 }}>
        <div className="admin-card">
          <h3>Users gần đây</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Tên</th>
                  <th>Premium</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id || u.email}>
                    <td>{u.email}</td>
                    <td>{u.fullName || u.name || '—'}</td>
                    <td>{statusBadge(u.isPremium ? 'active' : 'open')}</td>
                  </tr>
                ))}
                {!users.length && (
                  <tr><td colSpan={3}>Chưa có dữ liệu API</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <h3>Tickets</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.subject || t.title || '—'}</td>
                    <td>{statusBadge(String(t.status || 'open').toLowerCase())}</td>
                  </tr>
                ))}
                {!tickets.length && (
                  <tr><td colSpan={2}>Chưa có ticket</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
