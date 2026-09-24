import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Power, RotateCcw, Search, X } from 'lucide-react';
import { adminService, AdminQuestion, AdminQuestionInput } from '../../shared/services/admin.service';
import { CAREER_FIELD_OPTIONS, getRolesForField } from '../../shared/data/careerFieldCatalog';
import './admin.css';
import './adminQuestions.css';

type Filters = Record<'search' | 'language' | 'industry' | 'position' | 'category' | 'difficulty' | 'seniority' | 'isActive', string>;
type FieldErrors = Partial<Record<'content' | 'category' | 'roleHint', string>>;
const emptyFilters: Filters = { search: '', language: '', industry: '', position: '', category: '', difficulty: '', seniority: '', isActive: '' };
const blank = (): AdminQuestionInput => ({ content: '', language: 'vi', industry: null, roleHint: null, category: 'General', difficulty: 'Medium', seniority: null, hint: null, isActive: true });
const languageLabel = (value: string) => value === 'vi' ? 'Tiếng Việt' : value === 'en' ? 'English' : value;
const dateLabel = (value: string) => value ? new Date(value).toLocaleString('vi-VN') : '—';
const errorText = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback;

const AdminQuestions: React.FC = () => {
  const [rows, setRows] = useState<AdminQuestion[]>([]);
  const [filterOptions, setFilterOptions] = useState<AdminQuestion[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [form, setForm] = useState<AdminQuestionInput>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [customPosition, setCustomPosition] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminQuestion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const roles = useMemo(() => form.industry ? getRolesForField(form.industry) : [], [form.industry]);
  const positions = useMemo(() => [...new Set(filterOptions.map(row => row.roleHint).filter((value): value is string => !!value))].sort(), [filterOptions]);
  const categories = useMemo(() => [...new Set([...filterOptions.map(row => row.category), 'General'])].sort(), [filterOptions]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const load = async (next: Filters) => {
    setLoading(true); setListError('');
    try {
      const result = await adminService.getQuestions(next);
      if (!result.ok || !Array.isArray(result.data)) throw new Error(result.message || 'Không thể tải ngân hàng câu hỏi.');
      setRows(result.data);
      if (Object.values(next).every(value => !value)) setFilterOptions(result.data);
    } catch (cause) { setListError(errorText(cause, 'Không thể tải ngân hàng câu hỏi.')); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(emptyFilters); }, []);

  const openCreate = () => { setEditing(null); setForm(blank()); setCustomPosition(false); setFormError(''); setFieldErrors({}); setFormOpen(true); };
  const openEdit = (row: AdminQuestion) => {
    setEditing(row); setCustomPosition(!!row.roleHint && !getRolesForField(row.industry || '').includes(row.roleHint));
    setForm({ content: row.content, language: row.language, industry: row.industry, roleHint: row.roleHint, category: row.category, difficulty: row.difficulty, seniority: row.seniority, hint: row.hint, isActive: row.isActive });
    setFormError(''); setFieldErrors({}); setFormOpen(true);
  };
  const closeForm = () => { if (!saving) setFormOpen(false); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return;
    const errors: FieldErrors = {};
    if (!form.content.trim()) errors.content = 'Vui lòng nhập nội dung câu hỏi.';
    if (!form.category.trim()) errors.category = 'Vui lòng nhập nhóm câu hỏi.';
    if (customPosition && !form.roleHint?.trim()) errors.roleHint = 'Vui lòng nhập vị trí hoặc chọn Chung.';
    setFieldErrors(errors); if (Object.keys(errors).length) return;
    setSaving(true); setFormError('');
    const payload: AdminQuestionInput = { ...form, content: form.content.trim(), category: form.category.trim(), industry: form.industry || null, roleHint: form.roleHint?.trim() || null, hint: form.hint?.trim() || null };
    try {
      const result = editing ? await adminService.updateQuestion(editing.id, payload) : await adminService.createQuestion(payload);
      if (!result.ok) throw new Error(/question already exists/i.test(result.message || '') ? 'Câu hỏi này đã tồn tại với cùng ngôn ngữ, ngành, vị trí và nhóm.' : result.message || 'Không lưu được câu hỏi.');
      setFormOpen(false); setNotice(editing ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi.');
      setEditing(null); await load(applied);
    } catch (cause) { setFormError(errorText(cause, 'Không lưu được câu hỏi.')); }
    finally { setSaving(false); }
  };
  const toggle = async (row: AdminQuestion) => {
    if (row.isActive && !window.confirm('Bạn có chắc muốn tắt câu hỏi này?')) return;
    setChangingId(row.id); setActionError(''); setNotice('');
    try {
      const result = await adminService.setQuestionActive(row.id, !row.isActive);
      if (!result.ok) throw new Error(result.message || 'Không cập nhật được trạng thái.');
      setNotice(row.isActive ? 'Đã tắt câu hỏi.' : 'Đã bật lại câu hỏi.'); await load(applied);
    } catch (cause) { setActionError(errorText(cause, 'Không cập nhật được trạng thái.')); }
    finally { setChangingId(null); }
  };
  const view = async (row: AdminQuestion) => {
    setDetail(row); setDetailLoading(true); setDetailError('');
    try {
      const result = await adminService.getQuestion(row.id);
      if (!result.ok || !result.data) throw new Error(result.message || 'Không tải được chi tiết câu hỏi.');
      setDetail(result.data);
    } catch (cause) { setDetailError(errorText(cause, 'Không tải được chi tiết câu hỏi.')); }
    finally { setDetailLoading(false); }
  };
  const actions = (row: AdminQuestion) => <div className="question-actions">
    <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => void view(row)}><Eye size={15} /> Xem</button>
    <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => openEdit(row)}><Pencil size={15} /> Sửa</button>
    <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" disabled={changingId === row.id} onClick={() => void toggle(row)}>
      {row.isActive ? <Power size={15} /> : <RotateCcw size={15} />}{changingId === row.id ? 'Đang xử lý...' : row.isActive ? 'Tắt' : 'Bật lại'}
    </button>
  </div>;

  return <div className="question-bank">
    <div className="admin-page-header question-header"><div><h1 className="admin-page-title">Ngân hàng câu hỏi</h1><p>Các câu hỏi hệ thống sử dụng để tạo phỏng vấn theo CV, JD và ngôn ngữ.</p></div>
      <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}><Plus size={17} /> Thêm câu hỏi</button></div>
    {notice && <div className="question-notice" role="status">{notice}</div>}
    {actionError && <div className="question-error" role="alert">{actionError}</div>}
    <form className="admin-card question-filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }); void load(filters); }}>
      <label className="question-filter-search"><span>Tìm câu hỏi</span><div className="admin-search"><Search size={16} className="admin-search-icon" /><input value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} placeholder="Tìm câu hỏi..." /></div></label>
      <label><span>Ngôn ngữ</span><select className="admin-select" value={filters.language} onChange={event => setFilters({ ...filters, language: event.target.value })}><option value="">Tất cả</option><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
      <label><span>Ngành</span><select className="admin-select" value={filters.industry} onChange={event => setFilters({ ...filters, industry: event.target.value, position: '' })}><option value="">Tất cả</option>{CAREER_FIELD_OPTIONS.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label><span>Vị trí</span><select className="admin-select" value={filters.position} onChange={event => setFilters({ ...filters, position: event.target.value })}><option value="">Tất cả</option>{[...new Set([...positions, ...(filters.industry ? getRolesForField(filters.industry) : [])])].sort().map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span>Nhóm</span><select className="admin-select" value={filters.category} onChange={event => setFilters({ ...filters, category: event.target.value })}><option value="">Tất cả</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span>Độ khó</span><select className="admin-select" value={filters.difficulty} onChange={event => setFilters({ ...filters, difficulty: event.target.value })}><option value="">Tất cả</option>{['Easy', 'Medium', 'Hard'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span>Cấp độ</span><select className="admin-select" value={filters.seniority} onChange={event => setFilters({ ...filters, seniority: event.target.value })}><option value="">Tất cả</option>{['Student', 'Fresher', 'Junior', 'Mid', 'Senior'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span>Trạng thái</span><select className="admin-select" value={filters.isActive} onChange={event => setFilters({ ...filters, isActive: event.target.value })}><option value="">Tất cả</option><option value="true">Đang dùng</option><option value="false">Đã tắt</option></select></label>
      <div className="question-filter-buttons"><button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>Lọc</button><button className="admin-btn admin-btn-secondary" type="button" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); void load(emptyFilters); }}>Xóa lọc</button></div>
    </form>
    <section className="admin-card question-results" aria-label="Danh sách câu hỏi"><div className="question-results-heading"><h2>Danh sách câu hỏi</h2><span>{rows.length} câu hỏi hiển thị</span></div>
      {loading ? <p className="question-state" role="status">Đang tải câu hỏi...</p> : listError ? <div className="question-state"><p role="alert">Không thể tải ngân hàng câu hỏi. {listError}</p><button type="button" className="admin-btn admin-btn-secondary" onClick={() => void load(applied)}>Thử lại</button></div> : rows.length === 0 ? <p className="question-state">Chưa có câu hỏi phù hợp.</p> : <>
        <div className="admin-table-container question-table-wrap"><table className="admin-table question-table"><thead><tr>{['Câu hỏi', 'Ngôn ngữ', 'Ngành', 'Vị trí', 'Nhóm', 'Độ khó', 'Cấp độ', 'Trạng thái', 'Cập nhật', 'Thao tác'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}>
          <td className="question-content-cell">{row.content}</td><td>{languageLabel(row.language)}</td><td>{row.industry || 'Chung'}</td><td>{row.roleHint || 'Chung'}</td><td>{row.category}</td><td><span className={`question-difficulty ${row.difficulty.toLowerCase()}`}>{row.difficulty}</span></td><td>{row.seniority || 'Mọi cấp độ'}</td><td><span className={`admin-badge ${row.isActive ? 'success' : 'neutral'}`}>{row.isActive ? 'Đang dùng' : 'Đã tắt'}</span></td><td>{dateLabel(row.updatedAt)}</td><td>{actions(row)}</td>
        </tr>)}</tbody></table></div>
        <div className="question-mobile-list">{rows.map(row => <article className="question-mobile-card" key={row.id}><h3>{row.content}</h3><p>{languageLabel(row.language)} · {row.industry || 'Chung'} · {row.roleHint || 'Chung'}</p><div className="question-mobile-meta"><span className={`question-difficulty ${row.difficulty.toLowerCase()}`}>{row.difficulty}</span><span>{row.seniority || 'Mọi cấp độ'}</span><span className={`admin-badge ${row.isActive ? 'success' : 'neutral'}`}>{row.isActive ? 'Đang dùng' : 'Đã tắt'}</span></div>{actions(row)}</article>)}</div>
      </>}
    </section>
    {detail && <div className="admin-modal-overlay" onClick={() => setDetail(null)}><div className="admin-modal question-modal" role="dialog" aria-modal="true" aria-labelledby="question-detail-title" onClick={event => event.stopPropagation()}><div className="admin-modal-header"><h2 className="admin-modal-title" id="question-detail-title">Chi tiết câu hỏi</h2><button type="button" className="admin-modal-close" aria-label="Đóng" onClick={() => setDetail(null)}><X size={18} /></button></div><div className="admin-modal-body">{detailLoading && <p>Đang tải chi tiết...</p>}{detailError && <p className="question-error" role="alert">{detailError}</p>}<p className="question-detail-content">{detail.content}</p><dl className="question-detail-grid">
      <dt>Ngôn ngữ</dt><dd>{languageLabel(detail.language)}</dd><dt>Ngành</dt><dd>{detail.industry || 'Chung'}</dd><dt>Vị trí</dt><dd>{detail.roleHint || 'Chung'}</dd><dt>Nhóm</dt><dd>{detail.category}</dd><dt>Độ khó</dt><dd>{detail.difficulty}</dd><dt>Cấp độ</dt><dd>{detail.seniority || 'Mọi cấp độ'}</dd><dt>Trạng thái</dt><dd>{detail.isActive ? 'Đang dùng' : 'Đã tắt'}</dd><dt>Gợi ý</dt><dd>{detail.hint || '—'}</dd><dt>Ngày tạo</dt><dd>{dateLabel(detail.createdAt)}</dd><dt>Ngày cập nhật</dt><dd>{dateLabel(detail.updatedAt)}</dd><dt>Người tạo</dt><dd>{detail.createdBy || 'Dữ liệu hệ thống'}</dd>
    </dl></div><div className="admin-modal-footer"><button type="button" className="admin-btn admin-btn-secondary" onClick={() => setDetail(null)}>Đóng</button></div></div></div>}
    {formOpen && <div className="admin-modal-overlay" onClick={closeForm}><div className="admin-modal question-modal" role="dialog" aria-modal="true" aria-labelledby="question-form-title" onClick={event => event.stopPropagation()}><div className="admin-modal-header"><h2 className="admin-modal-title" id="question-form-title">{editing ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</h2><button type="button" className="admin-modal-close" aria-label="Đóng" disabled={saving} onClick={closeForm}><X size={18} /></button></div><form onSubmit={save} noValidate><div className="admin-modal-body question-form-grid">
      {formError && <p className="question-error question-form-wide" role="alert">{formError}</p>}
      <label className="question-form-wide"><span>Câu hỏi *</span><textarea className="admin-input" autoFocus rows={4} maxLength={1000} value={form.content} aria-invalid={!!fieldErrors.content} onChange={event => { setForm({ ...form, content: event.target.value }); setFieldErrors({ ...fieldErrors, content: undefined }); }} placeholder="Nhập nội dung câu hỏi" />{fieldErrors.content && <small className="question-field-error">{fieldErrors.content}</small>}</label>
      <label><span>Ngôn ngữ *</span><select className="admin-select" value={form.language} onChange={event => setForm({ ...form, language: event.target.value as 'vi' | 'en' })}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
      <label><span>Ngành</span><select className="admin-select" value={form.industry || ''} onChange={event => { setCustomPosition(false); setForm({ ...form, industry: event.target.value || null, roleHint: null }); }}><option value="">Chung</option>{CAREER_FIELD_OPTIONS.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span>Vị trí</span><select className="admin-select" disabled={!form.industry} value={customPosition ? '__custom' : form.roleHint || ''} onChange={event => { setCustomPosition(event.target.value === '__custom'); setForm({ ...form, roleHint: event.target.value === '__custom' ? '' : event.target.value || null }); }}><option value="">Chung</option>{roles.map(value => <option key={value}>{value}</option>)}<option value="__custom">Khác (tự nhập)</option></select></label>
      {customPosition && <label><span>Vị trí tự nhập *</span><input className="admin-input" maxLength={150} value={form.roleHint || ''} aria-invalid={!!fieldErrors.roleHint} onChange={event => { setForm({ ...form, roleHint: event.target.value }); setFieldErrors({ ...fieldErrors, roleHint: undefined }); }} />{fieldErrors.roleHint && <small className="question-field-error">{fieldErrors.roleHint}</small>}</label>}
      <label><span>Nhóm *</span><input className="admin-input" maxLength={100} list="question-categories" value={form.category} aria-invalid={!!fieldErrors.category} onChange={event => { setForm({ ...form, category: event.target.value }); setFieldErrors({ ...fieldErrors, category: undefined }); }} /><datalist id="question-categories">{categories.map(value => <option key={value} value={value} />)}</datalist>{fieldErrors.category && <small className="question-field-error">{fieldErrors.category}</small>}</label>
      <label><span>Độ khó</span><select className="admin-select" value={form.difficulty} onChange={event => setForm({ ...form, difficulty: event.target.value as AdminQuestionInput['difficulty'] })}>{['Easy', 'Medium', 'Hard'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span>Cấp độ</span><select className="admin-select" value={form.seniority || ''} onChange={event => setForm({ ...form, seniority: event.target.value || null })}><option value="">Mọi cấp độ</option>{['Student', 'Fresher', 'Junior', 'Mid', 'Senior'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="question-form-wide"><span>Gợi ý</span><input className="admin-input" maxLength={500} value={form.hint || ''} onChange={event => setForm({ ...form, hint: event.target.value })} /></label>
      <label className="question-checkbox question-form-wide"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} /> Đang dùng</label>
    </div><div className="admin-modal-footer"><button type="button" className="admin-btn admin-btn-secondary" disabled={saving} onClick={closeForm}>Hủy</button><button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu câu hỏi'}</button></div></form></div></div>}
  </div>;
};

export default AdminQuestions;
