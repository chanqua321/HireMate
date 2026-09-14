import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import './admin.css';

// ---- Fake data ----
const FAQS = [
  { id: '1', question: 'HireMate hỗ trợ những vị trí phỏng vấn nào?', answer: 'HireMate hỗ trợ hơn 50 vị trí phổ biến trong ngành công nghệ thông tin, marketing, kinh doanh, tài chính và nhiều lĩnh vực khác.', category: 'Sản phẩm', order: 1, active: true },
  { id: '2', question: 'Tôi có thể thực hành phỏng vấn bao nhiêu lần?', answer: 'Gói Free cho phép 3 phiên/tháng. Gói Pro không giới hạn số lần thực hành.', category: 'Billing', order: 2, active: true },
  { id: '3', question: 'AI phỏng vấn có thực sự chính xác không?', answer: 'Hệ thống AI của HireMate được huấn luyện trên hàng nghìn phiên phỏng vấn thực tế, đạt độ chính xác 94% so với phỏng vấn viên chuyên nghiệp.', category: 'AI', order: 3, active: true },
  { id: '4', question: 'Thanh toán qua những phương thức nào?', answer: 'Chúng tôi hỗ trợ VNPay, PayOS, và tất cả các thẻ tín dụng quốc tế.', category: 'Billing', order: 4, active: true },
  { id: '5', question: 'Dữ liệu của tôi có được bảo mật không?', answer: 'Tất cả dữ liệu được mã hóa AES-256. Chúng tôi không bán thông tin người dùng cho bên thứ ba.', category: 'Bảo mật', order: 5, active: false },
];

type Faq = typeof FAQS[0];
const CATS = ['Sản phẩm', 'Billing', 'AI', 'Bảo mật', 'Tài khoản'];

const AdminFaq: React.FC = () => {
  const [faqs, setFaqs] = useState<Faq[]>(FAQS);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ question: '', answer: '', category: CATS[0], order: 1, active: true });

  const openCreate = () => {
    setEditing(null);
    setForm({ question: '', answer: '', category: CATS[0], order: faqs.length + 1, active: true });
    setShowModal(true);
  };

  const openEdit = (f: Faq) => {
    setEditing(f);
    setForm({ question: f.question, answer: f.answer, category: f.category, order: f.order, active: f.active });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.question.trim()) return;
    if (editing) {
      setFaqs(prev => prev.map(f => f.id === editing.id ? { ...f, ...form } : f));
    } else {
      setFaqs(prev => [...prev, { id: String(Date.now()), ...form }]);
    }
    setShowModal(false);
  };

  const deleteFaq = (id: string) => {
    if (window.confirm('Xóa FAQ này?')) setFaqs(prev => prev.filter(f => f.id !== id));
  };

  const toggleActive = (id: string) => {
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const sorted = [...faqs].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="admin-page-title">❓ Quản lý FAQ</h1>
          <p className="admin-page-subtitle">Quản lý các câu hỏi thường gặp hiển thị trên trang web.</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreate}><Plus size={16} /> Thêm FAQ</button>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Tổng FAQ', value: faqs.length },
          { label: 'Đang hiển thị', value: faqs.filter(f => f.active).length },
          { label: 'Đã ẩn', value: faqs.filter(f => !f.active).length },
        ].map((s, i) => (
          <div key={i} className="admin-stat-card" style={{ padding: '1.25rem' }}>
            <div className="admin-stat-value" style={{ fontSize: '1.75rem' }}>{s.value}</div>
            <div className="admin-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* FAQ Accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {sorted.map(f => (
          <div key={f.id} className="admin-card" style={{ overflow: 'hidden' }}>
            <div
              style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}
              onClick={() => setExpanded(expanded === f.id ? null : f.id)}
            >
              <div style={{
                width: '2rem', height: '2rem', borderRadius: 8, background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#fff', flexShrink: 0
              }}>
                {f.order}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.925rem' }}>{f.question}</span>
                  {!f.active && <span className="admin-badge warning">Ẩn</span>}
                </div>
                <span className="admin-badge neutral" style={{ fontSize: '0.7rem' }}>{f.category}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={e => { e.stopPropagation(); openEdit(f); }}><Edit2 size={12} /></button>
                <button className={`admin-btn admin-btn-sm`}
                  style={{ background: f.active ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)', color: f.active ? '#fbbf24' : '#34d399', border: `1px solid ${f.active ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`, padding: '0.4rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  onClick={e => { e.stopPropagation(); toggleActive(f.id); }}>
                  {f.active ? 'Ẩn' : 'Hiện'}
                </button>
                <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={e => { e.stopPropagation(); deleteFaq(f.id); }}><Trash2 size={12} /></button>
                {expanded === f.id ? <ChevronUp size={16} color="rgba(255,255,255,0.5)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.5)" />}
              </div>
            </div>
            {expanded === f.id && (
              <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.65, margin: '1rem 0 0' }}>{f.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">{editing ? '✏️ Chỉnh sửa FAQ' : '➕ Thêm FAQ mới'}</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-label">Câu hỏi</label>
                <input className="admin-input" placeholder="Nhập câu hỏi..." value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Câu trả lời</label>
                <textarea className="admin-textarea" placeholder="Nhập câu trả lời..." value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="admin-form-group">
                  <label className="admin-label">Danh mục</label>
                  <select className="admin-select" style={{ width: '100%' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-label">Thứ tự</label>
                  <input className="admin-input" type="number" min={1} value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input type="checkbox" id="faq-active" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                <label htmlFor="faq-active" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', cursor: 'pointer' }}>Hiển thị trên website</label>
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

export default AdminFaq;
