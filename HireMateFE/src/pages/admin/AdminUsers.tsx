import React, { useEffect, useState } from 'react';
import { Search, UserCheck, UserX, Shield, Edit2, X, Check } from 'lucide-react';
import './admin.css';
import { adminService } from '../../shared/services';
import { isSoleAdminEmail, SOLE_ADMIN_EMAIL } from '../../shared/config/constants';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  interviews: number;
  joinDate: string;
  status: string;
  emailConfirmed: boolean;
};

const planColor = (plan: string) => plan === 'Premium' ? 'purple' : plan === 'Pro' ? 'info' : 'neutral';
const roleColor = (role: string) => role === 'Admin' ? 'warning' : 'neutral';

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await adminService.getUsers(search || undefined);
    if (!res.ok) {
      setError(res.message || 'Không tải users');
      return;
    }
    const mapped: User[] = (res.data || []).map((u: any) => ({
      id: String(u.id),
      name: u.fullName || u.name || '—',
      email: u.email || '',
      role: (u.roles && u.roles[0]) || u.role || 'User',
      plan: u.isPremium ? 'Premium' : 'Free',
      interviews: u.interviewCount ?? 0,
      joinDate: (u.createdAt || '').slice(0, 10),
      status: u.isDeleted || u.lockoutEnd ? 'banned' : 'active',
      emailConfirmed: !!u.emailConfirmed,
    }));
    setUsers(mapped);
    setError(null);
  };

  useEffect(() => {
    load().catch((e) => setError(e?.message || 'Lỗi API'));
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    const matchPlan = filterPlan === 'all' || u.plan === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const toggleBan = async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const isSelf = isSoleAdminEmail(target.email);
    if (isSelf) {
      setError('Không thể khóa tài khoản Quản trị viên hiện tại!');
      return;
    }
    const shouldLock = target.status === 'active';
    const res = await adminService.patchUser(id, { lock: shouldLock });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: shouldLock ? 'banned' : 'active' } : u))
      );
    } else {
      setError(res.message || 'Patch user thất bại');
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    const isSelf = isSoleAdminEmail(editUser.email);
    if (isSelf && editStatus === 'banned') {
      setError('Không thể tự khóa tài khoản Quản trị viên!');
      return;
    }
    const shouldLock = editStatus !== 'active';
    const res = await adminService.patchUser(editUser.id, {
      lock: shouldLock,
    });
    if (!res.ok) {
      setError(res.message || 'Lưu user thất bại');
      return;
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editUser.id ? { ...u, role: editRole, status: editStatus } : u
      )
    );
    setEditUser(null);
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">👥 Quản lý Users</h1>
        <p className="admin-page-subtitle">Xem, tìm kiếm và quản lý toàn bộ tài khoản người dùng (API).</p>
        {error && <p style={{ color: '#EF4444' }}>{error}</p>}
      </div>

      {/* Summary stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Tổng Users', value: users.length, color: 'blue' },
          { label: 'Đang active', value: users.filter(u => u.status === 'active').length, color: 'green' },
          { label: 'Bị ban', value: users.filter(u => u.status === 'banned').length, color: 'orange' },
          { label: 'Chưa xác nhận', value: users.filter(u => !u.emailConfirmed).length, color: 'purple' },
        ].map((s, i) => (
          <div key={i} className="admin-stat-card" style={{ padding: '1.25rem' }}>
            <div className="admin-stat-value" style={{ fontSize: '1.75rem', color: '#FFFFFF' }}>{s.value}</div>
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
              <input
                placeholder="Tìm theo tên hoặc email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="admin-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
            <select className="admin-select" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
              <option value="all">Tất cả gói</option>
              <option value="Free">Free</option>
              <option value="Pro">Pro</option>
              <option value="Premium">Premium</option>
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
                  <th>#</th>
                  <th>Người dùng</th>
                  <th>Role</th>
                  <th>Gói</th>
                  <th>Phỏng vấn</th>
                  <th>Ngày tham gia</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="admin-empty">
                        <div className="admin-empty-icon">🔍</div>
                        <h3>Không tìm thấy user</h3>
                        <p>Thử thay đổi điều kiện lọc</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="admin-avatar">{u.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--admin-text)' }}>{u.name}</div>
                          <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`admin-badge ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td><span className={`admin-badge ${planColor(u.plan)}`}>{u.plan}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--admin-accent, #00F2FE)' }}>{u.interviews}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{u.joinDate || 'Mới tham gia'}</td>
                    <td>
                      {u.emailConfirmed
                        ? <span className="admin-badge success"><Check size={11} /> Confirmed</span>
                        : <span className="admin-badge warning">Chờ xác nhận</span>
                      }
                    </td>
                    <td>
                      <span className={`admin-badge ${u.status === 'active' ? 'success' : 'danger'}`}>
                        {u.status === 'active' ? 'Active' : 'Banned'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(u)} title="Chỉnh sửa">
                          <Edit2 size={13} />
                        </button>
                        {(() => {
                          const isSelf = isSoleAdminEmail(u.email);
                          if (isSelf) {
                            return (
                              <span className="admin-badge neutral" style={{ fontSize: '0.72rem', opacity: 0.8 }} title="Tài khoản Quản trị viên hiện tại">
                                Quản trị
                              </span>
                            );
                          }
                          return (
                            <button
                              className={`admin-btn admin-btn-sm ${u.status === 'active' ? 'admin-btn-danger' : 'admin-btn-success'}`}
                              onClick={() => toggleBan(u.id)}
                              title={u.status === 'active' ? 'Ban user' : 'Unban user'}
                            >
                              {u.status === 'active' ? <UserX size={13} /> : <UserCheck size={13} />}
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="admin-modal-overlay" onClick={() => setEditUser(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">✏️ Chỉnh sửa người dùng</h3>
              <button className="admin-modal-close" onClick={() => setEditUser(null)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0, 242, 254, 0.08)', borderRadius: 12, border: '1px solid rgba(0, 242, 254, 0.25)' }}>
                <div className="admin-avatar" style={{ width: '3rem', height: '3rem', fontSize: '1.25rem' }}>{editUser.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--admin-text)', fontSize: '1rem' }}>{editUser.name}</div>
                  <div style={{ color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>{editUser.email}</div>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Role</label>
                {isSoleAdminEmail(editUser.email) ? (
                  <input className="admin-select" style={{ width: '100%' }} value="Admin" disabled />
                ) : (
                  <select className="admin-select" style={{ width: '100%' }} value="User" disabled>
                    <option value="User">User</option>
                  </select>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--admin-text-muted)' }}>
                  Hệ thống chỉ có một Admin ({SOLE_ADMIN_EMAIL}). Tài khoản mới luôn là User.
                </p>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Trạng thái</label>
                <select className="admin-select" style={{ width: '100%' }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setEditUser(null)}>Hủy</button>
              <button className="admin-btn admin-btn-primary" onClick={saveEdit}><Check size={15} /> Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
