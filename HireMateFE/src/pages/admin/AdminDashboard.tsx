import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  CreditCard,
  MessageSquare,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import './admin.css';
import {
  adminService,
  AdminAnalytics,
  AdminInterviewStats,
  AdminRevenue,
  AdminUserItem,
  AdminTicketItem
} from '../../shared/services';

const statusBadge = (s: string) => {
  const norm = (s || '').toLowerCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    active: 'success',
    banned: 'danger',
    locked: 'danger',
    open: 'danger',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'neutral',
  };
  const label: Record<string, string> = {
    active: 'Hoạt động',
    banned: 'Đã khóa',
    locked: 'Đã khóa',
    open: 'Chưa xử lý',
    in_progress: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    closed: 'Đã đóng',
  };
  return <span className={`admin-badge ${map[norm] || 'neutral'}`}>{label[norm] || s}</span>;
};

const formatVND = (num?: number) => {
  if (num === undefined || num === null) return '0 ₫';
  return `${num.toLocaleString('vi-VN')} ₫`;
};

const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [interviews, setInterviews] = useState<AdminInterviewStats | null>(null);
  const [revenue, setRevenue] = useState<AdminRevenue | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [tickets, setTickets] = useState<AdminTicketItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = useCallback(async (isRefresh = false, q = '') => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [aRes, iRes, rRes, uRes, tRes] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getInterviews(),
        adminService.getRevenue(),
        adminService.getUsers(q || undefined),
        adminService.getTickets(),
      ]);

      if (aRes.ok && aRes.data) setAnalytics(aRes.data);
      else if (!aRes.ok && (aRes.status === 401 || aRes.status === 403)) {
        setError('Tài khoản không có quyền truy cập API Admin.');
      }

      if (iRes.ok && iRes.data) setInterviews(iRes.data);
      if (rRes.ok && rRes.data) setRevenue(rRes.data);
      if (uRes.ok && Array.isArray(uRes.data)) setUsers(uRes.data);
      if (tRes.ok && Array.isArray(tRes.data)) setTickets(tRes.data);
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi đồng bộ dữ liệu từ Backend .NET');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false, '');
  }, [loadData]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      adminService.getUsers(searchQuery || undefined).then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setUsers(res.data);
        }
      }).catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toggle Lock User Account
  const handleToggleLock = async (user: AdminUserItem) => {
    const isLocked = Boolean(user.lockoutEnd);
    const targetLock = !isLocked;
    setActionLoading((prev) => ({ ...prev, [user.id]: true }));

    try {
      const res = await adminService.patchUser(user.id, { lock: targetLock });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, lockoutEnd: targetLock ? new Date(Date.now() + 100 * 365 * 86400000).toISOString() : null }
              : u
          )
        );
        showToast(targetLock ? `Đã khóa tài khoản ${user.email}` : `Đã mở khóa tài khoản ${user.email}`);
      } else {
        showToast(`Lỗi: ${res.message || 'Không thể cập nhật khóa'}`);
      }
    } catch (e: any) {
      showToast('Lỗi kết nối máy chủ');
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  // Toggle Premium Status
  const handleTogglePremium = async (user: AdminUserItem) => {
    const nextPremium = !user.isPremium;
    setActionLoading((prev) => ({ ...prev, [user.id]: true }));

    try {
      const res = await adminService.patchUser(user.id, { isPremium: nextPremium });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isPremium: nextPremium } : u))
        );
        showToast(`Đã đổi gói thành ${nextPremium ? 'Premium' : 'Miễn phí'} cho ${user.email}`);
      } else {
        showToast(`Lỗi: ${res.message || 'Không thể cập nhật gói'}`);
      }
    } catch (e: any) {
      showToast('Lỗi kết nối máy chủ');
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  // Update Ticket Status
  const handleTicketStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const res = await adminService.patchTicket(ticketId, { status: newStatus });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
        );
        showToast(`Đã chuyển ticket sang "${newStatus}"`);
      } else {
        showToast(`Lỗi: ${res.message || 'Không thể đổi trạng thái'}`);
      }
    } catch (e: any) {
      showToast('Lỗi kết nối');
    }
  };

  const openTicketsCount = tickets.filter((t) => (t.status || '').toLowerCase() === 'open').length;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast Feedback */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: '#FFFFFF',
          color: '#0077CC',
          border: '1px solid rgba(3, 191, 255, 0.3)',
          padding: '12px 20px',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(3, 191, 255, 0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.875rem',
          fontWeight: 700,
          animation: 'fadeInUp 0.3s ease'
        }}>
          <CheckCircle size={18} color="#10B981" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="admin-page-title">Trung Tâm Điều Hành Quản Trị</h1>
            <p className="admin-page-subtitle">
              Báo cáo hiệu suất hệ thống thời gian thực từ HireMate API (.NET 8)
            </p>
          </div>
        </div>
      </div>

      {/* Cockpit Status Bar */}
      <div className="admin-cockpit-bar">
        <div className="admin-cockpit-info">
          <div className="admin-live-chip">
            <div className="admin-live-dot" />
            <span>Hệ thống: Trực tuyến</span>
          </div>
          <div style={{ color: '#64748B', fontSize: '0.813rem' }}>|</div>
          <div style={{ color: '#94A3B8', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} color="#38BDF8" />
            Phiên làm việc: <b>Administrator</b>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="admin-refresh-btn"
            disabled={loading || refreshing}
            onClick={() => loadData(true, searchQuery)}
          >
            <RefreshCw size={14} className={refreshing ? 'admin-spin' : ''} />
            <span>{refreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 12,
          padding: '14px 18px',
          color: '#F87171',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="admin-stats-grid">
        {/* Metric 1: Users & Conversion */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue">
            <Users size={24} />
          </div>
          <div className="admin-stat-value">
            {loading ? '...' : (analytics?.registrations ?? users.length).toLocaleString()}
          </div>
          <div className="admin-stat-label">Tổng Người Dùng Đăng Ký</div>
          <div className="admin-stat-change up" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={12} />
            <span>{revenue?.premiumUsers ?? 0} tài khoản Premium ({revenue?.conversionRate ?? 0}%)</span>
          </div>
        </div>

        {/* Metric 2: AI Interviews & Completion Rate */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple">
            <Briefcase size={24} />
          </div>
          <div className="admin-stat-value">
            {loading ? '...' : (interviews?.total ?? 0).toLocaleString()}
          </div>
          <div className="admin-stat-label">Phiên Phỏng Vấn AI Hoàn Thành</div>
          <div className="admin-stat-change up" style={{ color: '#38BDF8' }}>
            <span>Tỷ lệ hoàn thành: {analytics?.interviewCompletionRate ?? 0}% • Điểm TB: {analytics?.avgSessionScore ?? interviews?.avgStar ?? 0}/10</span>
          </div>
        </div>

        {/* Metric 3: Revenue & Invoices */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon green">
            <TrendingUp size={24} />
          </div>
          <div className="admin-stat-value">
            {loading ? '...' : formatVND(revenue?.mrr)}
          </div>
          <div className="admin-stat-label">Doanh Thu Tháng (MRR 30 ngày)</div>
          <div className="admin-stat-change up" style={{ color: '#34D399' }}>
            <span>Tổng tích lũy: {formatVND(revenue?.totalRevenue)} ({analytics?.paidInvoices ?? 0} Hóa đơn)</span>
          </div>
        </div>

        {/* Metric 4: Support Tickets */}
        <div className="admin-stat-card">
          <div className="admin-stat-icon orange">
            <MessageSquare size={24} />
          </div>
          <div className="admin-stat-value">
            {loading ? '...' : openTicketsCount}
          </div>
          <div className="admin-stat-label">Phiếu Hỗ Trợ Đang Chờ Xử Lý</div>
          <div className="admin-stat-change" style={{ color: openTicketsCount > 0 ? '#F87171' : '#34D399' }}>
            <span>{openTicketsCount > 0 ? `Cần xem xét (${tickets.length} tổng số)` : 'Đã giải quyết tất cả'}</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Analytical Deep Dive */}
      <div className="admin-grid-2" style={{ marginBottom: 24 }}>
        {/* Visual Analytics 1: STAR Breakdown */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#38BDF8" /> Phân Tích Kỹ Năng STAR Toàn Sàn
            </h3>
            <span style={{ fontSize: '0.813rem', color: '#94A3B8' }}>
              Điểm trung bình chuẩn hóa
            </span>
          </div>
          <div className="admin-card-body">
            <div className="admin-star-meter-wrap">
              {/* S: Situation */}
              <div className="admin-star-item">
                <div className="admin-star-label-row">
                  <span className="admin-star-name">
                    <span style={{ color: '#38BDF8', fontWeight: 700 }}>S</span> — Situation (Mô tả tình huống)
                  </span>
                  <span className="admin-star-badge">{interviews?.avgS ? interviews.avgS.toFixed(1) : '0.0'}/10</span>
                </div>
                <div className="admin-star-track">
                  <div
                    className="admin-star-fill s"
                    style={{ width: `${Math.min(100, ((interviews?.avgS || 0) / 10) * 100)}%` }}
                  />
                </div>
              </div>

              {/* T: Task */}
              <div className="admin-star-item">
                <div className="admin-star-label-row">
                  <span className="admin-star-name">
                    <span style={{ color: '#818CF8', fontWeight: 700 }}>T</span> — Task (Xác định mục tiêu/nhiệm vụ)
                  </span>
                  <span className="admin-star-badge">{interviews?.avgT ? interviews.avgT.toFixed(1) : '0.0'}/10</span>
                </div>
                <div className="admin-star-track">
                  <div
                    className="admin-star-fill t"
                    style={{ width: `${Math.min(100, ((interviews?.avgT || 0) / 10) * 100)}%` }}
                  />
                </div>
              </div>

              {/* A: Action */}
              <div className="admin-star-item">
                <div className="admin-star-label-row">
                  <span className="admin-star-name">
                    <span style={{ color: '#34D399', fontWeight: 700 }}>A</span> — Action (Hành động triển khai)
                  </span>
                  <span className="admin-star-badge">{interviews?.avgA ? interviews.avgA.toFixed(1) : '0.0'}/10</span>
                </div>
                <div className="admin-star-track">
                  <div
                    className="admin-star-fill a"
                    style={{ width: `${Math.min(100, ((interviews?.avgA || 0) / 10) * 100)}%` }}
                  />
                </div>
              </div>

              {/* R: Result */}
              <div className="admin-star-item">
                <div className="admin-star-label-row">
                  <span className="admin-star-name">
                    <span style={{ color: '#FBBF24', fontWeight: 700 }}>R</span> — Result (Định lượng kết quả)
                  </span>
                  <span className="admin-star-badge">{interviews?.avgR ? interviews.avgR.toFixed(1) : '0.0'}/10</span>
                </div>
                <div className="admin-star-track">
                  <div
                    className="admin-star-fill r"
                    style={{ width: `${Math.min(100, ((interviews?.avgR || 0) / 10) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 20,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(3, 191, 255, 0.05)',
              border: '1px solid rgba(3, 191, 255, 0.16)',
              fontSize: '0.813rem',
              color: '#475569',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>ARPU (Doanh thu trung bình/User):</span>
              <b style={{ color: '#001B3F', fontSize: '0.938rem' }}>{formatVND(revenue?.arpu)}</b>
            </div>
          </div>
        </div>

        {/* Visual Analytics 2: Top Positions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} color="#10B981" /> Top Vị Trí Ứng Tuyển Phổ Biến
            </h3>
            <span style={{ fontSize: '0.813rem', color: '#64748B', fontWeight: 600 }}>
              Số lượt & Điểm TB
            </span>
          </div>
          <div className="admin-card-body">
            <div className="admin-rank-list">
              {interviews?.popularPositions && interviews.popularPositions.length > 0 ? (
                interviews.popularPositions.slice(0, 5).map((p, idx) => (
                  <div key={idx} className="admin-rank-item">
                    <div className="admin-rank-name">
                      <div className="admin-rank-pos">{idx + 1}</div>
                      <span>{p.position || 'Chung / Đang định hướng'}</span>
                    </div>
                    <div className="admin-rank-stats">
                      <span className="admin-rank-count">{p.count} lượt</span>
                      <span className="admin-rank-score">{p.avg.toFixed(1)} ⭐</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748B', fontSize: '0.875rem' }}>
                  Chưa có đủ dữ liệu thống kê vị trí phỏng vấn
                </div>
              )}
            </div>

            <div style={{
              marginTop: 18,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(3, 191, 255, 0.08)',
              border: '1px solid rgba(3, 191, 255, 0.22)',
              fontSize: '0.813rem',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600
            }}>
              <Sparkles size={16} />
              <span>AI tự động tinh chỉnh câu hỏi theo tỷ lệ hoàn thành của từng ngành nghề.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Operational Control */}
      <div className="admin-grid-2">
        {/* Operational 1: Users Control Table */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <h3 className="admin-card-title">Quản Lý Người Dùng Gần Đây</h3>
            <div style={{ position: 'relative', width: 240 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#0284C7' }} />
              <input
                type="text"
                placeholder="Tìm email, họ tên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: 8,
                  background: '#F8FAFC',
                  border: '1px solid rgba(3, 191, 255, 0.25)',
                  color: '#001B3F',
                  fontSize: '0.813rem',
                  fontWeight: 500,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Gói</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 6).map((u) => {
                  const isLocked = Boolean(u.lockoutEnd);
                  const isBusy = actionLoading[u.id];

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#001B3F' }}>{u.fullName || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{u.email}</div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleTogglePremium(u)}
                          disabled={isBusy}
                          className={`admin-action-btn-sm ${u.isPremium ? 'premium' : ''}`}
                          title="Click để chuyển đổi gói Premium/Miễn phí"
                        >
                          {u.isPremium ? '⭐ Premium' : 'Free'}
                        </button>
                      </td>
                      <td>
                        {statusBadge(isLocked ? 'locked' : 'active')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggleLock(u)}
                          disabled={isBusy}
                          className={`admin-action-btn-sm ${isLocked ? 'unlock' : 'lock'}`}
                          title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                          <span>{isLocked ? 'Mở khóa' : 'Khóa'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!users.length && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#64748B', padding: '24px 0' }}>
                      {loading ? 'Đang tải danh sách...' : 'Không tìm thấy người dùng'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational 2: Support Tickets Queue */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Hàng Đợi Hỗ Trợ Khách Hàng</h3>
            <span style={{ fontSize: '0.813rem', color: '#64748B', fontWeight: 600 }}>
              {tickets.length} Phiếu
            </span>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vấn đề</th>
                  <th>Người gửi</th>
                  <th style={{ textAlign: 'right' }}>Cập nhật trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 6).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#001B3F', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.subject || 'Không tiêu đề'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.813rem', color: '#475569' }}>
                      {t.email || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select
                        value={t.status || 'Open'}
                        onChange={(e) => handleTicketStatusChange(t.id, e.target.value)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          background: '#F8FAFC',
                          border: '1px solid rgba(3, 191, 255, 0.25)',
                          color: '#001B3F',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="Open" style={{ background: '#FFF', color: '#DC2626' }}>Mở (Open)</option>
                        <option value="InProgress" style={{ background: '#FFF', color: '#D97706' }}>Đang xử lý</option>
                        <option value="Resolved" style={{ background: '#FFF', color: '#059669' }}>Đã xử lý</option>
                        <option value="Closed" style={{ background: '#FFF', color: '#64748B' }}>Đóng</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!tickets.length && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#64748B', padding: '24px 0' }}>
                      {loading ? 'Đang tải...' : 'Không có phiếu hỗ trợ'}
                    </td>
                  </tr>
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
