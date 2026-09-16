import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Eye, RefreshCw } from 'lucide-react';
import { publicService } from '../../shared/services/public.service';
import { adminService } from '../../shared/services/admin.service';
import './admin.css';

export interface BlogItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  published: boolean;
  views: number;
  date: string;
  excerpt: string;
}

const CATEGORIES = ['Interview Tips', 'CV Tips', 'Career Path', 'AI Interview', 'Industry News'];

const AdminBlog: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BlogItem | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', category: CATEGORIES[0], excerpt: '', published: false });

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await publicService.getBlogList();
      if (res.ok && Array.isArray(res.data)) {
        const mapped: BlogItem[] = res.data.map((b: any) => ({
          id: String(b.id || b.slug),
          title: b.title || 'Bài viết',
          slug: b.slug || 'slug-bai-viet',
          category: b.category || 'Career Path',
          author: b.author || 'HireMate Editorial',
          published: b.published !== false,
          views: b.views || 0,
          date: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '—',
          excerpt: b.summary || b.content?.substring(0, 100) || '',
        }));
        setBlogs(mapped);
      } else {
        setBlogs([]);
      }
    } catch (err) {
      console.warn('Real blog list API error:', err);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', slug: '', category: CATEGORIES[0], excerpt: '', published: false });
    setShowModal(true);
  };

  const openEdit = (b: BlogItem) => {
    setEditing(b);
    setForm({ title: b.title, slug: b.slug, category: b.category, excerpt: b.excerpt, published: b.published });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    const postPayload = {
      id: editing?.id,
      title: form.title,
      slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-'),
      category: form.category,
      summary: form.excerpt,
      content: form.excerpt,
      published: form.published,
    };

    if (editing) {
      setBlogs(prev => prev.map(b => b.id === editing.id ? { ...b, ...form } : b));
    } else {
      const newBlog: BlogItem = {
        id: String(Date.now()), ...form,
        author: 'HireMate Team', views: 0, date: new Date().toISOString().split('T')[0],
      };
      setBlogs(prev => [newBlog, ...prev]);
    }
    setShowModal(false);

    try {
      await adminService.upsertBlog(postPayload);
    } catch (err) {
      console.warn('Failed to upsert blog on BE:', err);
    }
  };

  const togglePublish = async (id: string) => {
    const updated = blogs.map(b => b.id === id ? { ...b, published: !b.published } : b);
    setBlogs(updated);
    const target = updated.find(b => b.id === id);
    if (target) {
      try {
        await adminService.upsertBlog({ id: target.id, title: target.title, slug: target.slug, published: target.published });
      } catch (err) {
        console.warn('Toggle publish API failed:', err);
      }
    }
  };

  const deleteBlog = (id: string) => {
    if (window.confirm('Xóa bài viết này?')) {
      setBlogs(prev => prev.filter(b => b.id !== id));
    }
  };

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="admin-page-title">📝 Quản lý Blog</h1>
          <p className="admin-page-subtitle">Tạo, chỉnh sửa và xuất bản bài viết blog từ cơ sở dữ liệu thời gian thực.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={fetchBlogs} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Đang tải...' : 'Làm mới API'}
          </button>
          <button className="admin-btn admin-btn-primary" onClick={openCreate}>
            <Plus size={16} /> Tạo bài mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Tổng bài viết', value: blogs.length },
          { label: 'Đã xuất bản', value: blogs.filter(b => b.published).length },
          { label: 'Bản nháp', value: blogs.filter(b => !b.published).length },
          { label: 'Tổng lượt xem', value: blogs.reduce((s, b) => s + b.views, 0).toLocaleString() },
        ].map((s, i) => (
          <div key={i} className="admin-stat-card" style={{ padding: '1.25rem' }}>
            <div className="admin-stat-value" style={{ fontSize: '1.75rem' }}>{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Blog list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {blogs.length === 0 ? (
          <div className="admin-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '1rem', margin: '0 0 1.25rem' }}>
              Chưa có bài viết nào được lưu trong cơ sở dữ liệu.
            </p>
            <button className="admin-btn admin-btn-primary" onClick={openCreate} style={{ display: 'inline-flex', margin: '0 auto', gap: '6px' }}>
              <Plus size={16} /> Tạo bài viết đầu tiên
            </button>
          </div>
        ) : (
          blogs.map(b => (
          <div key={b.id} className="admin-card">
            <div className="admin-card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="admin-badge info">{b.category}</span>
                    {b.published
                      ? <span className="admin-badge success"><Check size={10} /> Đã xuất bản</span>
                      : <span className="admin-badge warning">Bản nháp</span>
                    }
                    <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{b.date}</span>
                  </div>
                  <h3 style={{ color: 'var(--admin-text)', fontWeight: 700, fontSize: '1rem', margin: '0 0 0.4rem' }}>{b.title}</h3>
                  <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', margin: '0 0 0.4rem', lineHeight: 1.5 }}>{b.excerpt}</p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.775rem', color: 'var(--admin-text-muted)' }}>
                    <span><Eye size={12} style={{ display: 'inline', marginRight: 3 }} />{b.views.toLocaleString()} views</span>
                    <span>/{b.slug}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button
                    className={`admin-btn admin-btn-sm ${b.published ? 'admin-btn-warning' : 'admin-btn-success'}`}
                    onClick={() => togglePublish(b.id)}
                    style={{ background: b.published ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)', color: b.published ? '#fbbf24' : '#34d399', border: `1px solid ${b.published ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}
                  >
                    {b.published ? 'Ẩn' : 'Xuất bản'}
                  </button>
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(b)}><Edit2 size={13} /></button>
                  <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteBlog(b.id)}><Trash2 size={13} /></button>
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
          <div className="admin-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editing ? '✏️ Chỉnh sửa bài viết' : '✨ Tạo bài viết mới'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-label">Tiêu đề</label>
                <input className="admin-input" placeholder="Nhập tiêu đề bài viết..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Slug (URL)</label>
                <input className="admin-input" placeholder="ten-bai-viet" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Danh mục</label>
                <select className="admin-select" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Tóm tắt</label>
                <textarea className="admin-textarea" placeholder="Tóm tắt ngắn về bài viết..." value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" id="pub-check" checked={form.published} onChange={e => setForm({ ...form, published: e.target.checked })} />
                <label htmlFor="pub-check" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', cursor: 'pointer' }}>Xuất bản ngay</label>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave}><Check size={15} /> {editing ? 'Lưu thay đổi' : 'Tạo bài viết'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
