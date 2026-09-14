import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Tag, Calendar, Percent } from 'lucide-react';
import './admin.css';

// ---- Fake data ----
const PROMOS = [
  { id: '1', code: 'HIREMATE30', discount: 30, type: 'percent', minAmount: 0, maxUses: 100, usedCount: 67, validFrom: '2026-07-01', validTo: '2026-07-31', plan: 'all', active: true },
  { id: '2', code: 'NEWUSER50K', discount: 50000, type: 'fixed', minAmount: 199000, maxUses: 500, usedCount: 123, validFrom: '2026-06-01', validTo: '2026-08-31', plan: 'Pro', active: true },
  { id: '3', code: 'SUMMER2026', discount: 20, type: 'percent', minAmount: 0, maxUses: 200, usedCount: 200, validFrom: '2026-06-15', validTo: '2026-07-15', plan: 'all', active: false },
  { id: '4', code: 'PREMIUM15', discount: 15, type: 'percent', minAmount: 0, maxUses: 50, usedCount: 12, validFrom: '2026-07-20', validTo: '2026-08-20', plan: 'Premium', active: true },
  { id: '5', code: 'REFER100K', discount: 100000, type: 'fixed', minAmount: 299000, maxUses: 999, usedCount: 45, validFrom: '2026-01-01', validTo: '2026-12-31', plan: 'Pro', active: true },
];

type Promo = typeof PROMOS[0];
const fmtDiscount = (p: Promo) => p.type === 'percent' ? `${p.discount}%` : `₫${p.discount.toLocaleString()}`;
const isExpired = (to: string) => new Date(to) < new Date();
const getStatusBadge = (p: Promo) => {
  if (!p.active) return <span className="admin-badge warning">Tắt</span>;
  if (isExpired(p.validTo)) return <span className="admin-badge danger">Hết hạn</span>;
  if (p.usedCount >= p.maxUses) return <span className="admin-badge neutral">Hết lượt</span>;
  return <span className="admin-badge success">Hoạt động</span>;
};

const AdminPromos: React.FC = () => {
  const [promos, setPromos] = useState<Promo[]>(PROMOS);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [form, setForm] = useState({
    code: '', discount: 10, type: 'percent', minAmount: 0, maxUses: 100,
    validFrom: '', validTo: '', plan: 'all', active: true
  });

  const openCreate = () => {
    setEditing(null);
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setForm({ code: '', discount: 10, type: 'percent', minAmount: 0, maxUses: 100, validFrom: today, validTo: nextMonth, plan: 'all', active: true });
    setShowModal(true);
  };

  const openEdit = (p: Promo) => {
    setEditing(p);
    setForm({ code: p.code, discount: p.discount, type: p.type, minAmount: p.minAmount, maxUses: p.maxUses, validFrom: p.validFrom, validTo: p.validTo, plan: p.plan, active: p.active });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.code.trim()) return;
    if (editing) {
      setPromos(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p));
    } else {
      setPromos(prev => [...prev, { id: String(Date.now()), ...form, usedCount: 0 }]);
    }
    setShowModal(false);
  };

  const deletePromo = (id: string) => {
    if (window.confirm('Xóa mã này?')) setPromos(prev => prev.filter(p => p.id !== id));
  };

  const toggleActive = (id: string) => {
    setPromos(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="admin-page-title">🎟️ Mã khuyến mãi</h1>
          <p className="admin-page-subtitle">Quản lý promo codes và chương trình giảm giá.</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}><Plus size={16} /> Tạo mã mới</button>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Tổng mã', value: promos.length },
          { label: 'Đang hoạt động', value: promos.filter(p => p.active && !isExpired(p.validTo)).length },
          { label: 'Hết hạn', value: promos.filter(p => isExpired(p.validTo)).length },
          { label: 'Tổng lượt dùng', value: promos.reduce((s, p) => s + p.usedCount, 0) },
        ].map((s, i) => (
          <div key={i} className="admin-stat-card" style={{ padding: '1.25rem' }}>
            <div className="admin-stat-value" style={{ fontSize: '1.75rem' }}>{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="admin-card">
        <div className="admin-card-body" style={{ padding: 0 }}>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Giảm giá</th>
                  <th>Áp dụng</th>
                  <th>Lượt dùng</th>
                  <th>Hiệu lực</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(p => (
                  <tr key={p.id}>
                    <td>
                      <code style={{
                        background: 'rgba(255,255,255,0.12)', padding: '0.2rem 0.6rem', borderRadius: 6,
                        fontFamily: 'monospace', fontSize: '0.875rem', color: '#f093fb', fontWeight: 700, letterSpacing: 1
                      }}>
                        {p.code}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {p.type === 'percent' ? <Percent size={14} style={{ color: '#fbbf24' }} /> : <Tag size={14} style={{ color: '#34d399' }} />}
                        <span style={{ fontWeight: 700, color: p.type === 'percent' ? '#fbbf24' : '#34d399', fontSize: '1rem' }}>
                          {fmtDiscount(p)}
                        </span>
                      </div>
                      {p.minAmount > 0 && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>Tối thiểu ₫{p.minAmount.toLocaleString()}</div>}
                    </td>
                    <td><span className="admin-badge info">{p.plan === 'all' ? 'Tất cả gói' : p.plan}</span></td>
                    <td>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                        <span style={{ fontWeight: 700, color: '#c4b5fd' }}>{p.usedCount}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> / {p.maxUses}</span>
                      </div>
                      <div className="admin-progress" style={{ marginTop: '0.3rem', height: 5 }}>
                        <div className="admin-progress-bar" style={{ width: `${Math.min((p.usedCount / p.maxUses) * 100, 100)}%` }} />
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>
                        <div><Calendar size={11} style={{ display: 'inline', marginRight: 3 }} />{p.validFrom}</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)' }}>→ {p.validTo}</div>
                      </div>
                    </td>
                    <td>{getStatusBadge(p)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className={`admin-btn admin-btn-sm`}
                          style={{ background: p.active ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)', color: p.active ? '#fbbf24' : '#34d399', border: `1px solid ${p.active ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, padding: '0.35rem 0.7rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                          onClick={() => toggleActive(p.id)}
                        >
                          {p.active ? 'Tắt' : 'Bật'}
                        </button>
                        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                        <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deletePromo(p.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editing ? '✏️ Sửa mã khuyến mãi' : '🎟️ Tạo mã mới'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-label">Mã code</label>
                <input className="admin-input" placeholder="HIREMATE30" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Loại giảm giá</label>
                  <select className="admin-select" style={{ width: '100%' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (₫)</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">{form.type === 'percent' ? 'Giảm (%)' : 'Giảm (₫)'}</label>
                  <input className="admin-input" type="number" min={0} value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Số lần dùng tối đa</label>
                  <input className="admin-input" type="number" min={1} value={form.maxUses} onChange={e => setForm({ ...form, maxUses: Number(e.target.value) })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Áp dụng gói</label>
                  <select className="admin-select" style={{ width: '100%' }} value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                    <option value="all">Tất cả</option>
                    <option value="Pro">Pro</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Từ ngày</label>
                  <input className="admin-input" type="date" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Đến ngày</label>
                  <input className="admin-input" type="date" value={form.validTo} onChange={e => setForm({ ...form, validTo: e.target.value })} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Kích hoạt ngay
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave}><Check size={15} /> Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromos;
