import { useEffect, useRef, useState } from 'react';
import { adminService } from '../../shared/services/admin.service';
import { BlogPost, BlogWrite, blogDate, blogSlug } from '../../shared/types/blog';
import { BlogArticle, BlogCover } from '../../shared/components/BlogArticle';
import './admin.css';

const empty = (): BlogWrite => ({ title: '', slug: '', tag: '', summary: '', body: '', isPublished: false });
const message = (e: unknown) => e instanceof Error ? e.message : 'Không thể kết nối API. Hãy thử lại.';
export default function AdminBlog() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  async function openForm(id?: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      let post: BlogPost | null = null;
      if (id) {
        const res = await adminService.getBlog(id);
        if (!res.ok || !res.data) throw new Error(res.message || 'Không tải được bài viết.');
        post = res.data;
      }
      editingId.current = post?.id; setEditing(post);
      setForm(post ? { title: post.title, slug: post.slug, tag: post.tag || '', summary: post.summary, body: post.body, isPublished: post.isPublished } : { ...empty(), tag: categories[0] || '' });
      setManualSlug(!!post); setCover(null); setRemoveCover(false); setFormError(''); setPreview(false); setOpen(true);
    } catch (e) { setError(message(e)); }
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
  async function deletePost(post: BlogPost) {
    if (lock.current || !window.confirm(`Xóa bài viết “${post.title}”? Thao tác này không thể hoàn tác.`)) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const res = await adminService.deleteBlog(post.id);
      if (!res.ok) throw new Error(res.message || 'Không xóa được bài viết.');
      setBlogs(prev => prev.filter(p => p.id !== post.id)); setNotice('Đã xóa bài viết.');
    } catch (e) { setError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  const imageUrl = coverPreview || (removeCover ? null : editing?.coverUrl || null);
  return <div>
    <div className="admin-page-header"><h1 className="admin-page-title">Quản lý Blog</h1>
      <p className="admin-page-subtitle">Soạn bản nháp, xem trước và xuất bản bài viết.</p>
      <button className="admin-btn admin-btn-primary" disabled={busy || loading || !categories.length} onClick={() => void openForm()}>Tạo bài viết mới</button>{' '}
      <button className="admin-btn admin-btn-secondary" disabled={busy || loading} onClick={() => void load()}>Làm mới</button></div>
    {notice && <p role="status">{notice}</p>}
    {error && <div role="alert">{error} <button className="admin-btn admin-btn-secondary" disabled={busy || loading} onClick={() => void load()}>Thử lại</button></div>}
    {loading ? <p role="status">Đang tải bài viết...</p> : !error && blogs.length === 0 ? <p>Chưa có bài viết.</p> : null}
    {!loading && blogs.map(post => <div className="admin-card" key={post.id} style={{ padding: 20, marginBottom: 12 }}>
      <span className={`admin-badge ${post.isPublished ? 'success' : 'warning'}`}>{post.isPublished ? 'Đã xuất bản' : 'Bản nháp'}</span>
      <h2>{post.title}</h2><p>{post.tag} · /blog/{post.slug}</p><p>{post.summary}</p>
      {post.author && <p>Tác giả: {post.author}</p>}{post.publishedAt && <p>Xuất bản: {blogDate(post.publishedAt)}</p>}
      <button className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void openForm(post.id)}>Chỉnh sửa / Trạng thái</button>{' '}
      <button className="admin-btn admin-btn-danger" disabled={busy} onClick={() => void deletePost(post)}>Xóa</button></div>)}
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
