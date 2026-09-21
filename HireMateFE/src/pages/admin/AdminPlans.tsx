import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Eye, EyeOff, X, Check, Star, Zap, Crown, RefreshCw } from 'lucide-react';
import { billingService } from '../../features/billing/api/billing.service';
import { adminService } from '../../shared/services/admin.service';
import { PlanDto } from '../../features/billing/types';
import './admin.css';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  active: boolean;
  popular: boolean;
  color: string;
  icon: string;
  subscribers: number;
}

const fmt = (n: number) => n === 0 ? 'Miễn phí' : `₫${n.toLocaleString('vi-VN')}/tháng`;

const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', price: 0, features: [''], active: true, popular: false, color: '#667eea', icon: '⚡'
  });
  const [newFeature, setNewFeature] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await billingService.getPlans();
      if (res.ok && Array.isArray(res.data)) {
        const mapped: Plan[] = res.data.map((p: PlanDto) => ({
          id: p.id,
          name: p.name,
          slug: p.code?.toLowerCase() || 'pro',
          price: p.priceVnd,
          currency: 'VND',
          interval: 'month',
          features: p.description ? p.description.split('\n').filter(Boolean) : ['Phỏng vấn AI thông minh', 'Phân tích CV'],
          active: p.isActive !== false,
          popular: p.code?.toLowerCase().includes('pro') || false,
          color: p.code?.toLowerCase().includes('premium') ? '#f093fb' : '#667eea',
          icon: p.code?.toLowerCase().includes('premium') ? '👑' : '⚡',
          subscribers: 0,
        }));
        setPlans(mapped);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.warn('Real plans API error:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

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

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const slug =
      form.slug.trim() ||
      form.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      `plan-${Date.now()}`;
    const data = { ...form, slug, currency: 'VND', interval: 'month', subscribers: 0 };
    if (editing) {
      setPlans((prev) => prev.map((p) => (p.id === editing.id ? { ...p, ...data } : p)));
    } else {
      setPlans((prev) => [...prev, { id: String(Date.now()), ...data }]);
    }
    setShowModal(false);

    try {
      await adminService.upsertPlan({
        id: editing?.id,
        code: slug,
        name: form.name,
        priceVnd: form.price,
        durationDays: 30,
        description: form.features.join('\n'),
        isActive: form.active,
      });
      await fetchPlans();
    } catch (err) {
      console.warn('Failed to upsert plan on BE:', err);
    }
  };

  const togglePlanActive = async (id: string) => {
    const target = plans.find(p => p.id === id);
    if (!target) return;
    const newStatus = !target.active;
    setPlans(prev => prev.map(p => p.id === id ? { ...p, active: newStatus } : p));
    try {
      await adminService.upsertPlan({
        id: target.id,
        code: target.slug.toUpperCase(),
        name: target.name,
        priceVnd: target.price,
        durationDays: 30,
        description: target.features.join('\n'),
        isActive: newStatus,
      });
    } catch (err) {
      console.warn('Failed to toggle plan status on BE:', err);
    }
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
          <h1 className="admin-page-title">💳 Gói dịch vụ</h1>
          {/* <p className="admin-page-subtitle">Quản lý các gói dịch vụ và giá cước của HireMate đồng bộ với cổng thanh toán.</p> */}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchPlans} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Đang tải...' : 'Làm mới API'}
          </button>
          <button className="admin-btn admin-btn-primary" onClick={openCreate}><Plus size={16} /> Thêm gói mới</button>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {plans.length === 0 ? (
          <div className="admin-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '1rem', margin: '0 0 1.25rem' }}>
              Chưa có gói dịch vụ nào trong cơ sở dữ liệu.
            </p>
            <button className="admin-btn admin-btn-primary" onClick={openCreate} style={{ display: 'inline-flex', margin: '0 auto', gap: '6px' }}>
              <Plus size={16} /> Thêm gói dịch vụ đầu tiên
            </button>
          </div>
        ) : (
          plans.map(p => (
            <div key={p.id} className="admin-card" style={{ position: 'relative', opacity: p.active ? 1 : 0.75 }}>
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
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--admin-text)' }}>{p.name}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.75rem', color: p.color, marginTop: '0.25rem' }}>
                    {fmt(p.price)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
                    Mã hệ thống: <strong style={{ color: 'var(--admin-text)' }}>{p.slug.toUpperCase()}</strong>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem' }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--admin-text)' }}>
                      <Check size={14} style={{ color: p.color, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid var(--admin-border)' }}>
                  <span className={`admin-badge ${p.active ? 'success' : 'neutral'}`}>
                    {p.active ? 'Hoạt động' : 'Tạm ẩn'}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(p)} title="Chỉnh sửa">
                      <Edit2 size={13} />
                    </button>
                    <button 
                      className={`admin-btn admin-btn-sm ${p.active ? 'admin-btn-secondary' : 'admin-btn-primary'}`}
                      onClick={() => togglePlanActive(p.id)}
                      title={p.active ? 'Tạm ẩn gói (Xóa mềm - không xóa vĩnh viễn)' : 'Kích hoạt lại hiển thị gói'}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                    >
                      {p.active ? <><EyeOff size={13} /> Tạm ẩn</> : <><Eye size={13} /> Hiện</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editing ? '✏️ Chỉnh sửa gói dịch vụ' : '➕ Tạo gói dịch vụ mới'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Tên gói dịch vụ</label>
                  <input className="admin-input" placeholder="Pro" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Giá cước (VNĐ)</label>
                  <input className="admin-input" type="number" min={0} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Tính năng đi kèm</label>
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--admin-text)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Kích hoạt hiển thị
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--admin-text)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.popular} onChange={e => setForm({ ...form, popular: e.target.checked })} /> Gói nổi bật
                </label>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave}><Check size={15} /> Lưu gói</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlans;
