import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Star, Zap, Crown } from 'lucide-react';
import './admin.css';

// ---- Fake data ----
const PLANS = [
  {
    id: '1', name: 'Free', slug: 'free', price: 0, currency: 'VND', interval: 'month',
    features: ['3 phiên phỏng vấn/tháng', 'Phân tích CV cơ bản', 'Hỏi đáp AI giới hạn'],
    active: true, popular: false, color: '#4facfe', icon: '🆓',
    subscribers: 3210,
  },
  {
    id: '2', name: 'Pro', slug: 'pro', price: 299000, currency: 'VND', interval: 'month',
    features: ['Phỏng vấn AI không giới hạn', 'Phân tích CV nâng cao', 'Career OS đầy đủ', 'Hỏi đáp AI không giới hạn', 'Hỗ trợ email'],
    active: true, popular: true, color: '#667eea', icon: '⚡',
    subscribers: 1105,
  },
  {
    id: '3', name: 'Premium', slug: 'premium', price: 499000, currency: 'VND', interval: 'month',
    features: ['Tất cả tính năng Pro', 'Mentor 1-on-1 mỗi tháng', 'Mock interview với chuyên gia', 'Priority support 24/7', 'Chứng chỉ kỹ năng', 'Roadmap cá nhân hóa'],
    active: true, popular: false, color: '#f093fb', icon: '👑',
    subscribers: 506,
  },
];

type Plan = typeof PLANS[0];
const fmt = (n: number) => n === 0 ? 'Miễn phí' : `₫${n.toLocaleString('vi-VN')}/tháng`;

const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>(PLANS);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', price: 0, features: [''], active: true, popular: false, color: '#667eea', icon: '⚡'
  });
  const [newFeature, setNewFeature] = useState('');

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', slug: '', price: 0, features: [''], active: true, popular: false, color: '#667eea', icon: '⚡' });
    setShowModal(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({ name: p.name, slug: p.slug, price: p.price, features: [...p.features], active: p.active, popular: p.popular, color: p.color, icon: p.icon });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data = { ...form, currency: 'VND', interval: 'month', subscribers: 0 };
    if (editing) {
      setPlans(prev => prev.map(p => p.id === editing.id ? { ...p, ...data } : p));
    } else {
      setPlans(prev => [...prev, { id: String(Date.now()), ...data }]);
    }
    setShowModal(false);
  };

  const deletePlan = (id: string) => {
    if (window.confirm('Xóa gói này?')) setPlans(prev => prev.filter(p => p.id !== id));
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setForm(f => ({ ...f, features: [...f.features, newFeature.trim()] }));
    setNewFeature('');
  };

  const removeFeature = (i: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  };

  const planIcon = (name: string) => name === 'Free' ? <Star size={20} /> : name === 'Pro' ? <Zap size={20} /> : <Crown size={20} />;

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="admin-page-title">💳 Gói Subscription</h1>
          <p className="admin-page-subtitle">Quản lý các gói dịch vụ và giá cước của HireMate.</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}><Plus size={16} /> Thêm gói mới</button>
      </div>

      {/* Summary */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="admin-stat-card" style={{ padding: '1.25rem' }}>
          <div className="admin-stat-value" style={{ fontSize: '1.75rem' }}>{plans.filter(p => p.active).length}</div>
          <div className="admin-stat-label">Gói đang hoạt động</div>
        </div>
        <div className="admin-stat-card" style={{ padding: '1.25rem' }}>
          <div className="admin-stat-value" style={{ fontSize: '1.75rem' }}>{plans.reduce((s, p) => s + p.subscribers, 0).toLocaleString()}</div>
          <div className="admin-stat-label">Tổng subscribers</div>
        </div>
        <div className="admin-stat-card" style={{ padding: '1.25rem' }}>
          <div className="admin-stat-value" style={{ fontSize: '1.75rem' }}>
            ₫{((plans.find(p => p.slug === 'pro')?.subscribers ?? 0) * 299000 / 1_000_000).toFixed(1)}M
          </div>
          <div className="admin-stat-label">MRR (Monthly Recurring Revenue)</div>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {plans.map(p => (
          <div key={p.id} className="admin-card" style={{ position: 'relative' }}>
            {p.popular && (
              <div style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                color: '#fff', padding: '0.2rem 0.6rem', borderRadius: 999,
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px',
              }}>
                ⭐ PHỔ BIẾN NHẤT
              </div>
            )}
            <div className="admin-card-body">
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: 14, marginBottom: '0.875rem',
                  background: `linear-gradient(135deg, ${p.color}, ${p.color}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.35rem', boxShadow: `0 8px 24px ${p.color}40`,
                }}>
                  {p.icon}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>{p.name}</div>
                <div style={{ fontWeight: 800, fontSize: '1.75rem', color: p.color, marginTop: '0.25rem' }}>
                  {fmt(p.price)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginTop: '0.25rem' }}>
                  {p.subscribers.toLocaleString()} subscribers
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem' }}>
                {p.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)' }}>
                    <Check size={14} style={{ color: p.color, flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span className={`admin-badge ${p.active ? 'success' : 'warning'}`}>{p.active ? 'Active' : 'Ẩn'}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                  <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deletePlan(p.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editing ? '✏️ Chỉnh sửa gói' : '➕ Tạo gói mới'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Tên gói</label>
                  <input className="admin-input" placeholder="Pro" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Giá (VNĐ)</label>
                  <input className="admin-input" type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Tính năng</label>
                {form.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <input className="admin-input" style={{ flex: 1 }} value={f} onChange={e => {
                      const newF = [...form.features]; newF[i] = e.target.value;
                      setForm({ ...form, features: newF });
                    }} placeholder={`Tính năng ${i + 1}`} />
                    <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => removeFeature(i)}><X size={12} /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <input className="admin-input" style={{ flex: 1 }} value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Thêm tính năng mới..." onKeyDown={e => e.key === 'Enter' && addFeature()} />
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={addFeature}><Plus size={13} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.popular} onChange={e => setForm({ ...form, popular: e.target.checked })} /> Phổ biến nhất
                </label>
              </div>
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

export default AdminPlans;
