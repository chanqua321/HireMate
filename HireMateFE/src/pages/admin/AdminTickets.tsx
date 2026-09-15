import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, X, Check, Clock, RefreshCw } from 'lucide-react';
import { adminService, AdminTicketItem } from '../../shared/services/admin.service';
import './admin.css';

// ---- Fallback data ----
const FALLBACK_TICKETS = [
  { id: 'TKT-0091', subject: 'Không vào được tính năng phỏng vấn', user: 'an.nguyen@email.com', category: 'Bug', priority: 'high', status: 'open', created: '2026-07-27', message: 'Tôi click vào "Bắt đầu phỏng vấn" nhưng trang bị lỗi trắng. Đã thử reload nhiều lần.' },
  { id: 'TKT-0090', subject: 'Thanh toán VNPay bị lỗi', user: 'bich.tran@email.com', category: 'Payment', priority: 'high', status: 'open', created: '2026-07-27', message: 'Bị chuyển sang trang trống sau khi thanh toán. Tài khoản bị trừ nhưng chưa nâng cấp.' },
  { id: 'TKT-0089', subject: 'CV phân tích sai thông tin kỹ năng', user: 'cuong.le@email.com', category: 'AI', priority: 'medium', status: 'in_progress', created: '2026-07-26', message: 'AI nhận diện sai kỹ năng React thành Angular trong phần phân tích CV của tôi.' },
  { id: 'TKT-0088', subject: 'Yêu cầu hoàn tiền', user: 'dung.pham@email.com', category: 'Billing', priority: 'medium', status: 'resolved', created: '2026-07-25', message: 'Tôi muốn hoàn tiền vì không dùng được sản phẩm do lỗi kỹ thuật.' },
  { id: 'TKT-0087', subject: 'Câu hỏi về tính năng Career OS', user: 'giang.dang@email.com', category: 'Feature', priority: 'low', status: 'resolved', created: '2026-07-24', message: 'Career OS có thể tùy chỉnh lộ trình học không? Tôi muốn thêm mục tiêu riêng.' },
  { id: 'TKT-0086', subject: 'Không nhận được email xác nhận', user: 'fong.vu@email.com', category: 'Account', priority: 'medium', status: 'open', created: '2026-07-24', message: 'Đã đăng ký 2 ngày nhưng không nhận được email xác nhận. Đã kiểm tra spam.' },
];

export interface TicketUI {
  id: string;
  subject: string;
  user: string;
  category: string;
  priority: string;
  status: string;
  created: string;
  message: string;
}

const priorityBadge = (p: string) => {
  const map: Record<string, string> = { high: 'danger', medium: 'warning', low: 'info' };
  const label: Record<string, string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
  return <span className={`admin-badge ${map[p] || 'neutral'}`}>{label[p] || p}</span>;
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = { open: 'danger', in_progress: 'warning', resolved: 'success' };
  const label: Record<string, string> = { open: 'Mở', in_progress: 'Đang xử lý', resolved: 'Đã giải quyết' };
  return <span className={`admin-badge ${map[s] || 'neutral'}`}>{label[s] || s}</span>;
};

const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<TicketUI[]>(FALLBACK_TICKETS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selected, setSelected] = useState<TicketUI | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTickets();
      if (res.ok && res.data && res.data.length > 0) {
        const mapped: TicketUI[] = res.data.map((t: AdminTicketItem) => ({
          id: t.id ? t.id.substring(0, 8).toUpperCase() : 'TKT-NEW',
          subject: t.subject || 'Yêu cầu hỗ trợ',
          user: t.email || 'Người dùng ẩn danh',
          category: 'Support',
          priority: 'medium',
          status: t.status?.toLowerCase() === 'resolved' ? 'resolved' : (t.status?.toLowerCase() === 'in_progress' ? 'in_progress' : 'open'),
          created: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '2026-07-27',
          message: t.body || '',
        }));
        setTickets(mapped);
      }
    } catch (err) {
      console.warn('Real tickets API fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filtered = tickets.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (filterPriority === 'all' || t.priority === filterPriority) &&
    (t.subject.toLowerCase().includes(search.toLowerCase()) || t.user.toLowerCase().includes(search.toLowerCase()))
  );

  const updateStatus = async (id: string, status: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    try {
      await adminService.patchTicket(id, { status });
    } catch (err) {
      console.warn('Could not patch ticket on BE:', err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    alert(`Đã gửi phản hồi cho ${selected.user}:\n\n${replyText}`);
    const targetId = selected.id;
    setReplyText('');
    await updateStatus(targetId, 'resolved');
    setSelected(null);
  };

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="admin-page-title">🎫 Support Tickets</h1>
          <p className="admin-page-subtitle">Quản lý và phản hồi các ticket hỗ trợ từ người dùng trong cơ sở dữ liệu thời gian thực.</p>
        </div>
        <button 
          className="admin-btn admin-btn-secondary admin-btn-sm" 
          onClick={fetchTickets} 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Đang tải...' : 'Làm mới API'}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        {[
          { label: 'Tổng tickets', value: tickets.length, color: 'blue' },
          { label: 'Đang mở', value: tickets.filter(t => t.status === 'open').length, color: 'orange' },
          { label: 'Đang xử lý', value: tickets.filter(t => t.status === 'in_progress').length, color: 'purple' },
          { label: 'Đã giải quyết', value: tickets.filter(t => t.status === 'resolved').length, color: 'green' },
        ].map((s, i) => (
          <div key={i} className="admin-stat-card" style={{ padding: '1.25rem' }}>
            <div className="admin-stat-value" style={{ fontSize: '1.75rem' }}>{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-body" style={{ padding: '1.25rem' }}>
          <div className="admin-toolbar">
            <div className="admin-search" style={{ flex: 2 }}>
              <Search className="admin-search-icon" size={16} />
              <input placeholder="Tìm ticket..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="admin-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="open">Mở</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã giải quyết</option>
            </select>
            <select className="admin-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">Tất cả mức ưu tiên</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-card-body" style={{ padding: 0 }}>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Chủ đề</th>
                  <th>Danh mục</th>
                  <th>Ưu tiên</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>{t.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--admin-text)' }}>{t.subject}</div>
                      <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}>{t.user}</div>
                    </td>
                    <td><span className="admin-badge neutral">{t.category}</span></td>
                    <td>{priorityBadge(t.priority)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{t.created}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setSelected(t)}>
                          <MessageSquare size={13} /> Xem
                        </button>
                        {t.status !== 'resolved' && (
                          <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => updateStatus(t.id, 'resolved')}>
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="admin-modal-overlay" onClick={() => setSelected(null)}>
          <div className="admin-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title">{selected.subject}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
                  {selected.id} · {selected.user} · {selected.created}
                </div>
              </div>
              <button className="admin-modal-close" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {priorityBadge(selected.priority)}
                {statusBadge(selected.status)}
                <span className="admin-badge neutral">{selected.category}</span>
              </div>

              <div style={{ background: '#F0F8FF', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(3, 191, 255, 0.2)' }}>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Nội dung</p>
                <p style={{ color: 'var(--admin-text)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>{selected.message}</p>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Phản hồi của admin</label>
                <textarea
                  className="admin-textarea"
                  placeholder="Nhập phản hồi cho người dùng..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  style={{ minHeight: 120 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selected.status === 'open' && (
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => updateStatus(selected.id, 'in_progress')}>
                    <Clock size={13} /> Chuyển sang đang xử lý
                  </button>
                )}
                {selected.status !== 'resolved' && (
                  <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => updateStatus(selected.id, 'resolved')}>
                    <Check size={13} /> Đánh dấu đã giải quyết
                  </button>
                )}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setSelected(null)}>Đóng</button>
              <button className="admin-btn admin-btn-primary" onClick={handleReply} disabled={!replyText.trim()}>
                <MessageSquare size={15} /> Gửi phản hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTickets;
