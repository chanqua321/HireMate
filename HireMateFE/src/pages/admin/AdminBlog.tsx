import { useEffect, useRef, useState } from 'react';
import { FileText, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import { adminService } from '../../shared/services/admin.service';
import { authenticatedFetch, getFileUrl } from '../../shared/api/apiClient';
import { BlogPost, BlogWrite, blogDate, blogSlug } from '../../shared/types/blog';
import { BlogArticle, BlogCover } from '../../shared/components/BlogArticle';
import './admin.css';

const empty = (): BlogWrite => ({ title: '', slug: '', tag: '', summary: '', body: '', isPublished: false });
const message = (e: unknown) => e instanceof Error ? e.message : 'Không thể kết nối API. Hãy thử lại.';

function CoverThumb({ url }: { url: string | null }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!url) return undefined;
    authenticatedFetch(getFileUrl(url)).then(async (response) => {
      if (!response.ok) return;
      const blob = await response.blob();
      if (active) { objectUrl = URL.createObjectURL(blob); setSource(objectUrl); }
    }).catch(() => undefined);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);
  if (!source) return <span className="adm-thumb adm-thumb-empty" aria-hidden="true"><FileText size={14} /></span>;
  return <img className="adm-thumb" src={source} alt="" />;
}

export default function AdminBlog() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogWrite>(empty);
  const [manualSlug, setManualSlug] = useState(false);
  const [preview, setPreview] = useState(false);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const editingId = useRef<string>();
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  useEffect(() => {
    if (!cover) { setCoverPreview(null); return; }
    const url = URL.createObjectURL(cover); setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);
  async function load() {
    setLoading(true); setError('');
    try {
      const [list, cats] = await Promise.all([adminService.getBlogs(), adminService.getBlogCategories()]);
      if (!list.ok || !list.data) throw new Error(list.message || 'Không tải được bài viết.');
      if (!cats.ok || !cats.data) throw new Error(cats.message || 'Không tải được danh mục.');
      setBlogs(list.data); setCategories(cats.data);
    } catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function openForm(id?: string, startPreview = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setActionError(''); setNotice('');
    try {
      let post: BlogPost | null = null;
      if (id) {
        const res = await adminService.getBlog(id);
        if (!res.ok || !res.data) throw new Error(res.message || 'Không tải được bài viết.');
        post = res.data;
      }
      editingId.current = post?.id; setEditing(post);
      setForm(post ? { title: post.title, slug: post.slug, tag: post.tag || '', summary: post.summary, body: post.body, isPublished: post.isPublished } : { ...empty(), tag: categories[0] || '' });
      setManualSlug(!!post); setCover(null); setRemoveCover(false); setFormError(''); setPreview(startPreview); setOpen(true);
    } catch (e) { setActionError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save(publish: boolean) {
    if (lock.current) return;
    const payload = { ...form, isPublished: publish };
    if (!payload.title.trim() || !blogSlug(payload.slug) || !payload.tag) { setFormError('Nhập tiêu đề, slug và danh mục hợp lệ.'); return; }
    if (publish && !payload.body.trim()) { setFormError('Cần nhập nội dung trước khi xuất bản.'); return; }
    lock.current = true; setBusy(true); setFormError('');
    let saved = false;
    try {
      const res = await adminService.upsertBlog(payload, editingId.current);
      if (!res.ok || !res.data?.id) throw new Error(res.message || 'Không lưu được bài viết.');
      saved = true;
      // Retain ID if the following cover request fails: retry must update, never insert.
      editingId.current = res.data.id; setEditing(res.data); setForm({ ...payload, slug: res.data.slug });
      if (cover || removeCover) {
        const image = cover ? await adminService.uploadBlogCover(res.data.id, cover) : await adminService.removeBlogCover(res.data.id);
        if (!image.ok) throw new Error(image.message || 'Không lưu được ảnh bìa.');
      }
      setOpen(false); setCover(null); setNotice(publish ? 'Đã lưu và xuất bản bài viết.' : 'Đã lưu bản nháp.'); await load();
    } catch (e) { setFormError((saved ? 'Nội dung đã lưu; ảnh bìa chưa cập nhật. Thử lưu lại sẽ cập nhật cùng bài viết. ' : '') + message(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function setPublished(post: BlogPost, publish: boolean) {
    if (lock.current) return;
    if (publish && !post.body.trim()) { setActionError('Cần nhập nội dung trước khi xuất bản.'); setMenuId(null); return; }
    lock.current = true; setBusy(true); setActionError(''); setNotice(''); setMenuId(null);
    try {
      const res = await adminService.upsertBlog({
        title: post.title, slug: post.slug, tag: post.tag, summary: post.summary, body: post.body, isPublished: publish,
      }, post.id);
      if (!res.ok) throw new Error(res.message || 'Không cập nhật được trạng thái.');
      setNotice(publish ? 'Đã xuất bản bài viết.' : 'Đã chuyển về bản nháp.');
      await load();
    } catch (e) { setActionError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function deletePost(post: BlogPost) {
    if (lock.current || !window.confirm(`Xóa bài viết “${post.title}”? Thao tác này không thể hoàn tác.`)) return;
    lock.current = true; setBusy(true); setActionError(''); setNotice(''); setMenuId(null);
    try {
      const res = await adminService.deleteBlog(post.id);
      if (!res.ok) throw new Error(res.message || 'Không xóa được bài viết.');
      setBlogs(prev => prev.filter(p => p.id !== post.id)); setNotice('Đã xóa bài viết.');
    } catch (e) { setActionError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  const imageUrl = coverPreview || (removeCover ? null : editing?.coverUrl || null);
  const needle = query.trim().toLowerCase();
  const visible = blogs.filter((post) => {
    if (needle && !post.title.toLowerCase().includes(needle)) return false;
    if (statusFilter === 'draft' && post.isPublished) return false;
    if (statusFilter === 'published' && !post.isPublished) return false;
    if (tagFilter && post.tag !== tagFilter) return false;
    return true;
  });
  const tags = Array.from(new Set([...categories, ...blogs.map((post) => post.tag).filter(Boolean)]));
  return <div className="adm-page">
    <div className="admin-page-header">
      <div>
        <h1 className="admin-page-title">Quản lý Blog</h1>
        <p className="admin-page-subtitle">Tạo, chỉnh sửa và quản lý nội dung bài viết.</p>
      </div>
      <div className="adm-actions">
        <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={busy || loading} onClick={() => void load()} aria-label="Làm mới danh sách bài viết">
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
        </button>
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy || loading || !categories.length} onClick={() => void openForm()}>
          <Plus size={14} /> Tạo bài viết
        </button>
      </div>
    </div>
    {notice && <p className="adm-notice" role="status">{notice}</p>}
    {actionError && <p className="adm-filter-error" role="alert">{actionError}</p>}
    {loading && <div className="adm-skeleton" aria-busy="true" aria-live="polite"><span className="sr-only">Đang tải danh sách bài viết</span></div>}
    {!loading && error && <div className="adm-error" role="alert"><p>Không thể tải danh sách bài viết.</p><button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={busy} onClick={() => void load()}>Thử lại</button></div>}
    {!loading && !error && blogs.length === 0 && (
      <div className="adm-card adm-empty">
        <FileText size={28} aria-hidden="true" />
        <h2>Chưa có bài viết</h2>
        <p>Tạo bài viết đầu tiên để bắt đầu xây dựng nội dung HireMate.</p>
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={busy || !categories.length} onClick={() => void openForm()}><Plus size={14} /> Tạo bài viết</button>
      </div>
    )}
    {!loading && !error && blogs.length > 0 && <>
      <section className="adm-card adm-filter" aria-label="Bộ lọc bài viết">
        <div className="adm-filter-row adm-blog-filters">
          <label className="adm-field adm-field-search">
            <span>Tìm kiếm</span>
            <input className="admin-input" placeholder="Tìm theo tiêu đề..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Trạng thái</span>
            <select className="admin-select" aria-label="Lọc trạng thái bài viết" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}>
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
            </select>
          </label>
          <label className="adm-field">
            <span>Danh mục</span>
            <select className="admin-select" aria-label="Lọc danh mục" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="">Tất cả danh mục</option>
              {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </label>
        </div>
      </section>
      {visible.length === 0 ? <div className="adm-card adm-empty"><p>Không có bài viết khớp bộ lọc.</p></div> : (
        <div className="adm-card">
          <div className="admin-table-container">
            <table className="admin-table adm-table adm-blog-table">
              <thead>
                <tr><th>Bài viết</th><th>Danh mục</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {visible.map((post) => {
                  const updated = post.updatedAt || post.publishedAt || post.createdAt;
                  return (
                    <tr key={post.id}>
                      <td>
                        <div className="adm-post">
                          <CoverThumb url={post.coverUrl} />
                          <div>
                            <div className="adm-strong">{post.title}</div>
                            <div className="adm-sub">/{post.slug}{post.author ? ` · ${post.author}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>{post.tag || '—'}</td>
                      <td><span className={`admin-badge ${post.isPublished ? 'success' : 'warning'}`}>{post.isPublished ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
                      <td>{updated ? blogDate(updated) : '—'}</td>
                      <td>
                        <div className="adm-row-actions">
                          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={busy} onClick={() => void openForm(post.id, true)}>Xem trước</button>
                          <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={busy} onClick={() => void openForm(post.id)}>Chỉnh sửa</button>
                          <div className="adm-menu">
                            <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm adm-icon-btn" aria-label={`Thao tác khác cho ${post.title}`} aria-expanded={menuId === post.id} onClick={() => setMenuId(menuId === post.id ? null : post.id)}>
                              <MoreHorizontal size={16} />
                            </button>
                            {menuId === post.id && (
                              <div className="adm-menu-pop" role="menu">
                                <button type="button" role="menuitem" disabled={busy} onClick={() => void setPublished(post, !post.isPublished)}>{post.isPublished ? 'Chuyển về bản nháp' : 'Xuất bản'}</button>
                                <button type="button" role="menuitem" className="is-danger" disabled={busy} onClick={() => { setMenuId(null); void deletePost(post); }}>Xóa</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>}
    {open && <div className="admin-modal-overlay"><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="blog-dialog-title" style={{ maxWidth: 800 }}>
      <div className="admin-modal-header"><h2 id="blog-dialog-title">{editingId.current ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h2>
        <button className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => { setOpen(false); setCover(null); }}>Đóng</button></div>
      <div className="admin-modal-body">
        {formError && <p role="alert" style={{ color: '#f87171' }}>{formError}</p>}
        {preview ? <><p role="status">Xem trước nội dung chưa lưu — không ghi dữ liệu.</p><BlogArticle post={form} coverUrl={imageUrl} author={editing?.author} publishedAt={form.isPublished ? editing?.publishedAt : null} /></> :
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="admin-form-group"><label className="admin-label" htmlFor="blog-title">Tiêu đề *</label><input id="blog-title" className="admin-input" maxLength={200} required value={form.title} onChange={e => { const title = e.target.value; setForm(p => ({ ...p, title, slug: manualSlug ? p.slug : blogSlug(title) })); }} /></div>
            <div className="admin-form-group"><label className="admin-label" htmlFor="blog-slug">Slug (URL) *</label><input id="blog-slug" className="admin-input" maxLength={120} required value={form.slug} onChange={e => { setManualSlug(true); setForm({ ...form, slug: e.target.value }); }} onBlur={() => setForm(p => ({ ...p, slug: blogSlug(p.slug) }))} /><small>Tự tạo từ tiêu đề; bạn có thể sửa. Thay đổi slug sẽ đổi đường dẫn bài viết.</small></div>
            <div className="admin-form-group"><label className="admin-label" htmlFor="blog-tag">Danh mục *</label><select id="blog-tag" className="admin-select" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })}><option value="">Chọn danh mục</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="admin-form-group"><label className="admin-label" htmlFor="blog-summary">Mô tả ngắn</label><textarea id="blog-summary" className="admin-textarea" maxLength={500} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /><small>Tối đa 500 ký tự; dùng trên thẻ bài viết.</small></div>
            <div className="admin-form-group"><label className="admin-label" htmlFor="blog-cover">Ảnh đại diện</label><input id="blog-cover" style={{ maxWidth: '100%' }} type="file" accept="image/png,image/jpeg" onChange={e => {
              const file = e.target.files?.[0]; if (!file) return;
              if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) { setFormError('Chỉ nhận ảnh PNG/JPEG, tối đa 5 MB.'); e.target.value = ''; return; }
              setCover(file); setRemoveCover(false); setFormError(''); e.target.value = '';
            }} /><p>PNG/JPEG, tối đa 5 MB. Ảnh được tải lên khi lưu bài.</p><BlogCover url={imageUrl} title={form.title} />{imageUrl && <button className="admin-btn admin-btn-secondary" onClick={() => { setCover(null); setRemoveCover(true); }}>Gỡ ảnh khi lưu</button>}</div>
            <div className="admin-form-group"><label className="admin-label" htmlFor="blog-body">Nội dung *</label><textarea id="blog-body" className="admin-textarea" rows={12} maxLength={100000} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /><small>Văn bản thuần, không chạy HTML. Bắt buộc khi xuất bản; bản nháp có thể chưa có nội dung.</small></div>
            <div className="admin-form-group"><label className="admin-label" htmlFor="blog-status">Trạng thái</label><select id="blog-status" className="admin-select" value={String(form.isPublished)} onChange={e => setForm({ ...form, isPublished: e.target.value === 'true' })}><option value="false">Bản nháp</option><option value="true">Xuất bản</option></select>{editing?.isPublished && <p>Lưu nháp sẽ ẩn bài viết khỏi trang công khai.</p>}</div>
          </fieldset>}
      </div><div className="admin-modal-footer" style={{ flexWrap: 'wrap' }}>
        <button className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => setPreview(!preview)}>{preview ? 'Quay lại soạn thảo' : 'Xem trước'}</button>
        <button className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void save(false)}>Lưu nháp</button>
        <button className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void save(true)}>Xuất bản</button>
        <button className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void save(form.isPublished)}>Lưu trạng thái đã chọn</button>
        {busy && <span role="status">Đang lưu...</span>}
      </div></section></div>}
  </div>;
}
