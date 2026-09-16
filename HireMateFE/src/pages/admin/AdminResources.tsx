import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import { publicService } from '../../shared/services/public.service';
import { adminService } from '../../shared/services/admin.service';
import './admin.css';

export interface ResourceItem {
  id: string;
  title: string;
  category: string;
  type: string;
  url: string;
  description: string;
  free: boolean;
  featured: boolean;
}

const CATS = ['Frontend', 'Backend', 'Algorithm', 'CV', 'Career', 'Data Science', 'DevOps'];
const TYPES = ['Course', 'Platform', 'Template', 'Article', 'Book', 'Video', 'Tool'];
const typeIcon: Record<string, string> = { Course: '🎓', Platform: '💻', Template: '📄', Article: '📰', Book: '📚', Video: '🎬', Tool: '🔧' };

const AdminResources: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [form, setForm] = useState({ title: '', category: CATS[0], type: TYPES[0], url: '', description: '', free: true, featured: false });

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await publicService.getResources();
      if (res.ok && Array.isArray(res.data)) {
        const mapped: ResourceItem[] = res.data.map((r: any) => ({
          id: r.id || String(Date.now()),
          title: r.title || 'Tài nguyên',
          category: r.category || 'Career',
          type: r.type || 'Course',
          url: r.url || 'https://example.com',
          description: r.description || '',
          free: r.free !== false,
          featured: r.featured === true,
        }));
        setResources(mapped);
      } else {
        setResources([]);
      }
    } catch (err) {
      console.warn('Real resources API error:', err);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const filtered = filterCat === 'all' ? resources : resources.filter(r => r.category === filterCat);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', category: CATS[0], type: TYPES[0], url: '', description: '', free: true, featured: false });
    setShowModal(true);
  };

  const openEdit = (r: ResourceItem) => {
    setEditing(r);
    setForm({ title: r.title, category: r.category, type: r.type, url: r.url, description: r.description, free: r.free, featured: r.featured });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const payload = {
      id: editing?.id,
      title: form.title,
      category: form.category,
      type: form.type,
      url: form.url,
      description: form.description,
      free: form.free,
      featured: form.featured,
    };

    if (editing) {
      setResources(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r));
    } else {
      setResources(prev => [...prev, { id: String(Date.now()), ...form }]);
    }
    setShowModal(false);

    try {
      await adminService.upsertResource(payload);
    } catch (err) {
      console.warn('Failed to upsert resource on BE:', err);
    }
  };

  const deleteResource = (id: string) => {
    if (window.confirm('Xóa tài nguyên này?')) setResources(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="admin-page-title">📚 Quản lý Tài nguyên</h1>
          <p className="admin-page-subtitle">Tài nguyên học tập gợi ý cho người dùng HireMate từ cơ sở dữ liệu thời gian thực.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchResources} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Đang tải...' : 'Làm mới API'}
          </button>
          <button className="admin-btn admin-btn-primary" onClick={openCreate}><Plus size={16} /> Thêm tài nguyên</button>
        </div>
      </div>

      {/* Filter */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-card-body" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', ...CATS].map(cat => (
              <button
                key={cat}
                className={`admin-tab${filterCat === cat ? ' active' : ''}`}
                onClick={() => setFilterCat(cat)}
                style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filtered.length === 0 ? (
          <div className="admin-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '1rem', margin: '0 0 1.25rem' }}>
              Chưa có tài nguyên nào trong cơ sở dữ liệu.
            </p>
            <button className="admin-btn admin-btn-primary" onClick={openCreate} style={{ display: 'inline-flex', margin: '0 auto', gap: '6px' }}>
              <Plus size={16} /> Thêm tài nguyên đầu tiên
            </button>
          </div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="admin-card">
              <div className="admin-card-body">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.25rem' }}>{typeIcon[r.type] || '📌'}</span>
                    <span className="admin-badge info">{r.type}</span>
                    <span className="admin-badge neutral">{r.category}</span>
                    {r.free && <span className="admin-badge success">Free</span>}
                    {r.featured && <span className="admin-badge purple">⭐ Featured</span>}
                  </div>
                </div>
                <h3 style={{ color: 'var(--admin-text)', fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.4rem' }}>{r.title}</h3>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.82rem', lineHeight: 1.55, margin: '0 0 1rem' }}>{r.description}</p>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="admin-btn admin-btn-secondary admin-btn-sm">
                    <ExternalLink size={12} /> Xem
                  </a>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(r)}><Edit2 size={12} /></button>
                  <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteResource(r.id)}><Trash2 size={12} /></button>
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
              <h3 className="admin-modal-title">{editing ? '✏️ Chỉnh sửa tài nguyên' : '➕ Thêm tài nguyên mới'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-label">Tiêu đề</label>
                <input className="admin-input" placeholder="Tên tài nguyên..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Danh mục</label>
                  <select className="admin-select" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Loại</label>
                  <select className="admin-select" style={{ width: '100%' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">URL</label>
                <input className="admin-input" placeholder="https://..." value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Mô tả</label>
                <textarea className="admin-textarea" placeholder="Mô tả ngắn..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ minHeight: 80 }} />
              </div>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.free} onChange={e => setForm({ ...form, free: e.target.checked })} /> Miễn phí
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} /> Featured
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

export default AdminResources;
