import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Eye, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { cvService, type CvTemplateDto, type CvWizardPayload } from '../../services/cv.service';
import { CAREER_FIELD_OPTIONS, getRolesForField, isRoleSuggestedForField } from '../../data/careerFieldCatalog';
import './CvWizardModal.css';

type Exp = NonNullable<CvWizardPayload['experiences']>[number];
type Education = NonNullable<CvWizardPayload['educations']>[number];
type Project = NonNullable<CvWizardPayload['projects']>[number];
type Certification = NonNullable<CvWizardPayload['certifications']>[number];
type Reference = NonNullable<CvWizardPayload['references']>[number];

interface CvWizardModalProps {
  isOpen: boolean;
  embedded?: boolean;
  onClose: () => void;
  onSuccess: (newCv: any, message?: string) => void | Promise<void>;
  defaultIndustry?: string;
  defaultRole?: string;
  templates?: CvTemplateDto[];
  initial?: Partial<CvWizardPayload>;
}

const emptyExp = (): Exp => ({ title: '', org: '', startDate: '', endDate: '', isCurrent: false, description: '', bulletPoints: [] });
const emptyEducation = (): Education => ({ institution: '', major: '', startDate: '', endDate: '', isCurrent: false, gpa: '', description: '' });
const emptyProject = (): Project => ({ name: '', role: '', period: '', url: '', technologies: [], description: '', bulletPoints: [] });
const emptyCertification = (): Certification => ({ name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '', description: '' });
const emptyReference = (): Reference => ({ name: '', title: '', organization: '', email: '', phone: '', description: '' });
const requestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const todayInputValue = () => { const date = new Date(); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); };
const parseBirthDate = (value: string): string | null => {
  const text = value.trim().replace(/^(\d{4}-\d{2}-\d{2})T.*$/, '$1');
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const display = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(text);
  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(text);
  const year = Number(iso?.[1] || display?.[3] || compact?.[3]);
  const month = Number(iso?.[2] || display?.[2] || compact?.[2]);
  const day = Number(iso?.[3] || display?.[1] || compact?.[1]);
  if (!year || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const displayBirthDate = (value?: string): string => {
  const iso = value ? parseBirthDate(value) : null;
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : value || '';
};

const SectionNavigation = React.createContext<{ active: number; setActive: (value: number) => void }>({ active: 1, setActive: () => {} });

const Section: React.FC<{ n: number; title: string; filled?: boolean; incomplete?: boolean; optional?: boolean; id?: string; children: React.ReactNode }> = ({ n, title, filled, incomplete, optional, id, children }) => {
  const { active, setActive } = React.useContext(SectionNavigation);
  return <details id={id} data-section={n} className="cvb-section" open={active === n}>
    <summary onClick={event => { event.preventDefault(); setActive(active === n ? 0 : n); }} aria-expanded={active === n}><span>{n}. {title}</span><em className={incomplete ? 'incomplete' : filled ? 'done' : ''}>{incomplete ? 'Cần bổ sung' : filled ? 'Đã điền' : optional ? 'Tùy chọn' : 'Chưa điền'}</em></summary>
    <div className="cvb-section-body">{children}</div>
  </details>;
};

const Tags: React.FC<{ value: string[]; onChange: (v: string[]) => void; placeholder: string }> = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = () => { const next = draft.trim(); if (next && !value.some(x => x.toLowerCase() === next.toLowerCase())) onChange([...value, next]); setDraft(''); };
  return <div><div className="cvb-inline"><input value={draft} placeholder={placeholder} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /><button type="button" onClick={add}><Plus size={14}/> Thêm</button></div><div className="cvb-tags">{value.map(x => <span key={x}>{x}<button type="button" onClick={() => onChange(value.filter(y => y !== x))}><X size={12}/></button></span>)}</div></div>;
};

const ExperienceList: React.FC<{ items: Exp[]; label: string; onUpdate: (i:number,p:Partial<Exp>)=>void; onRemove:(i:number)=>void; onAdd:()=>void }> = ({items,label,onUpdate,onRemove,onAdd}) => <>{items.map((x,i)=><div className="cvb-record" key={i}><b>{label} ({i+1})</b><div className="cvb-grid"><label>Vị trí / Tên *<input value={x.title||''} onChange={e=>onUpdate(i,{title:e.target.value})}/></label><label>Tổ chức / Công ty *<input value={x.org||''} onChange={e=>onUpdate(i,{org:e.target.value})}/></label><label>Vai trò<input value={x.role||''} onChange={e=>onUpdate(i,{role:e.target.value})}/></label><label>Bắt đầu<input type="month" value={x.startDate||''} onChange={e=>onUpdate(i,{startDate:e.target.value})}/></label><label>Kết thúc<input type="month" disabled={x.isCurrent} value={x.endDate||''} onChange={e=>onUpdate(i,{endDate:e.target.value})}/></label></div><label className="cvb-check"><input type="checkbox" checked={!!x.isCurrent} onChange={e=>onUpdate(i,{isCurrent:e.target.checked})}/> Đang thực hiện</label><label>Mô tả<textarea value={x.description||''} onChange={e=>onUpdate(i,{description:e.target.value})}/></label><label>Thành tựu (mỗi dòng một ý)<textarea value={(x.bulletPoints||[]).join('\n')} onChange={e=>onUpdate(i,{bulletPoints:e.target.value.split('\n')})}/></label><button type="button" className="cvb-delete" onClick={()=>onRemove(i)}><Trash2 size={14}/> Xóa</button></div>)}<button type="button" className="cvb-add" onClick={onAdd}><Plus size={14}/> Thêm {label.toLowerCase()}</button></>;

export const CvWizardModal: React.FC<CvWizardModalProps> = ({ isOpen, embedded = false, onClose, onSuccess, defaultIndustry = '', defaultRole = '', templates = [], initial = {} }) => {
  const [form, setForm] = useState<CvWizardPayload>({ fullName: '', university: '', major: '', graduationYear: 0, desiredIndustry: '', desiredPosition: '', experienceLevel: '' });
  const [birthDateText, setBirthDateText] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiProposal, setAiProposal] = useState<CvWizardPayload | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(1);
  const [showOptional, setShowOptional] = useState(false);
  const roles = useMemo(() => getRolesForField(form.desiredIndustry), [form.desiredIndustry]);
  const optionalCount = [!!form.careerObjective || !!form.summary, !!form.experiences?.length, !!form.activities?.length, !!form.certifications?.length, !!form.skills?.length, !!form.hobbies?.length, !!form.references?.length, !!form.projects?.length].filter(Boolean).length;
  const set = <K extends keyof CvWizardPayload>(key: K, value: CvWizardPayload[K]) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isOpen) return;
    const industry = initial.desiredIndustry?.trim() || defaultIndustry.trim() || CAREER_FIELD_OPTIONS[0];
    const educations = initial.educations?.length ? initial.educations : (initial.university || initial.major || initial.graduationYear ? [{ institution: initial.university, major: initial.major, graduationYear: initial.graduationYear || undefined }] : [emptyEducation()]);
    setForm({
      fullName: initial.fullName || '', university: initial.university || '', major: initial.major || '', graduationYear: initial.graduationYear || 0,
      desiredIndustry: industry, desiredPosition: initial.desiredPosition || defaultRole || '', experienceLevel: initial.experienceLevel || '',
      displayName: initial.displayName || '', templateId: initial.templateId || templates.find(t => t.layoutKey === 'modern-01' && t.isSystemTemplate)?.id || undefined, email: initial.email || '', phone: initial.phone || '', address: initial.address || '',
      linkedIn: initial.linkedIn || '', gitHub: initial.gitHub || '', dateOfBirth: initial.dateOfBirth ? parseBirthDate(initial.dateOfBirth) || '' : '', gender: initial.gender || '', avatarUrl: initial.avatarUrl || '',
      bio: initial.bio || '', careerObjective: initial.careerObjective || initial.bio || '', summary: initial.summary || '', educations,
      experiences: initial.experiences || [], projects: initial.projects || [], skills: initial.skills || [], certifications: initial.certifications || [],
      activities: initial.activities || [], hobbies: initial.hobbies || [], references: initial.references || [], clientRequestId: requestId(),
    });
    setBirthDateText(displayBirthDate(initial.dateOfBirth));
    setPreviewHtml('');
    setPreviewPdfUrl(previous => { if (previous) URL.revokeObjectURL(previous); return ''; });
    setAiPanelOpen(false); setAiProposal(null); setAiMessage(''); setAiBusy(false); setError(''); setBusy(false); setActiveSection(1); setShowOptional(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || templates.length === 0) return;
    const defaultId = templates.find(t => t.layoutKey === 'modern-01' && t.isSystemTemplate)?.id || templates[0].id;
    setForm(previous => previous.templateId ? previous : { ...previous, templateId: defaultId });
  }, [isOpen, templates]);

  useEffect(() => () => {
    if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
  }, [previewPdfUrl]);

  const validate = () => {
    if (!form.desiredIndustry?.trim() || !form.desiredPosition?.trim() || !form.fullName.trim()) return 'Vui lòng nhập Ngành nghề, Vị trí ứng tuyển và Họ tên.';
    if (!form.phone?.trim()) return 'Vui lòng nhập Số điện thoại.';
    if (!/^\+?[0-9][0-9\s().-]{6,24}$/.test(form.phone.trim())) return 'Số điện thoại chưa hợp lệ.';
    if (!form.email?.trim()) return 'Vui lòng nhập Email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email chưa hợp lệ.';
    if (birthDateText.trim() && !parseBirthDate(birthDateText)) return 'Ngày sinh phải đúng định dạng DD/MM/YYYY.';
    if (form.dateOfBirth && form.dateOfBirth > todayInputValue()) return 'Ngày sinh không được ở tương lai.';
    const validUrl = (value?: string) => { if (!value?.trim()) return true; try { const url = new URL(value.trim()); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; } };
    if (!validUrl(form.linkedIn)) return 'LinkedIn phải là URL http/https hợp lệ.';
    if (!validUrl(form.gitHub)) return 'GitHub phải là URL http/https hợp lệ.';
    if (!form.educations?.length) return 'Vui lòng thêm ít nhất một Học vấn và nhập Trường / Tổ chức.';
    if ((form.educations || []).some(x => !x.institution?.trim())) return 'Mỗi học vấn cần có Trường / Tổ chức.';
    if ((form.experiences || []).some(x => !x.title?.trim() || !x.org?.trim())) return 'Mỗi kinh nghiệm cần có Vị trí và Công ty.';
    if ((form.activities || []).some(x => !x.title?.trim() || !x.org?.trim())) return 'Mỗi hoạt động cần có Tên và Tổ chức.';
    if ((form.projects || []).some(x => !x.name?.trim())) return 'Mỗi dự án cần có Tên dự án.';
    return '';
  };
  const clean = (source: CvWizardPayload = form): CvWizardPayload => ({ ...source, university: '', major: '', graduationYear: 0, bio: '', fullName: source.fullName.trim(), desiredIndustry: source.desiredIndustry.trim(), desiredPosition: source.desiredPosition.trim(), email: source.email?.trim(), phone: source.phone?.trim(), address: source.address?.trim(), linkedIn: source.linkedIn?.trim(), gitHub: source.gitHub?.trim(), educations: (source.educations || []).filter(x => x.institution?.trim() || x.major?.trim() || x.description?.trim()), experiences: (source.experiences || []).filter(x => x.title?.trim() || x.org?.trim() || x.description?.trim()), projects: (source.projects || []).filter(x => x.name?.trim() || x.description?.trim()), certifications: (source.certifications || []).filter(x => x.name?.trim() || x.issuer?.trim() || x.description?.trim()), activities: (source.activities || []).filter(x => x.title?.trim() || x.org?.trim() || x.description?.trim()), references: (source.references || []).filter(x => x.name?.trim() || x.email?.trim() || x.phone?.trim() || x.description?.trim()) });
  const setPreviewDocument = (html: string, pdfBase64?: string) => {
    setPreviewHtml(html);
    setPreviewPdfUrl(previous => {
      if (previous) URL.revokeObjectURL(previous);
      if (!pdfBase64) return '';
      const binary = atob(pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    });
  };
  const renderPreview = async (source: CvWizardPayload) => { setBusy(true); setError(''); try { const res = await cvService.previewDraft(clean(source)); if (!res.ok || !res.data?.html) throw new Error(res.message || 'Không tạo được bản xem trước.'); setPreviewDocument(res.data.html, res.data.pdfBase64); } catch (e: any) { setError(e?.message || 'Không tạo được bản xem trước.'); } finally { setBusy(false); } };
  const showValidationError = (msg: string) => {
    setError(msg);
    const section = /Học vấn|Trường \/ Tổ chức/.test(msg) ? 3 : /kinh nghiệm/i.test(msg) ? 5 : /hoạt động/i.test(msg) ? 6 : /dự án/i.test(msg) ? 11 : /Số điện thoại|Email|Ngày sinh|LinkedIn|GitHub/.test(msg) ? 2 : 1;
    if ([5, 6, 11].includes(section)) setShowOptional(true);
    setActiveSection(section);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`.cvb-section[data-section="${section}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const preview = async () => { const msg = validate(); if (msg) { showValidationError(msg); return; } await renderPreview(form); };
  const backToEdit = () => { setAiPanelOpen(false); setPreviewHtml(''); setPreviewPdfUrl(previous => { if (previous) URL.revokeObjectURL(previous); return ''; }); };
  const closeBuilder = () => { if (embedded) backToEdit(); onClose(); };
  const confirm = async () => { if (busy) return; const validation = validate(); if (validation) { backToEdit(); showValidationError(validation); return; } setBusy(true); setError(''); try { const res = await cvService.createFromWizard(clean()); if (!res.ok || !res.data) throw new Error(res.message || 'Không tạo được CV.'); await onSuccess(res.data, res.message); setForm(previous => ({ ...previous, clientRequestId: requestId() })); backToEdit(); onClose(); } catch (e: any) { setError(e?.message || 'Không tạo được CV.'); } finally { setBusy(false); } };
  const updateArray = <T,>(key: keyof CvWizardPayload, index: number, patch: Partial<T>) => setForm(prev => ({ ...prev, [key]: ((prev[key] as T[] | undefined) || []).map((x, i) => i === index ? { ...x, ...patch } : x) }));
  const remove = (key: keyof CvWizardPayload, index: number) => setForm(prev => ({ ...prev, [key]: ((prev[key] as any[] | undefined) || []).filter((_, i) => i !== index) }));
  const avatar = (file?: File) => { if (!file) return; if (file.size > 1_500_000) return setError('Ảnh đại diện tối đa 1,5 MB.'); const reader = new FileReader(); reader.onload = () => set('avatarUrl', String(reader.result)); reader.readAsDataURL(file); };
  const requestAiProposal = async () => {
    if (aiBusy) return;
    setAiBusy(true); setAiMessage(''); setAiProposal(null);
    try {
      const res = await cvService.improveDraftContent(clean(form));
      if (!res.ok || !res.data?.content) throw new Error(res.message || 'AI chưa tạo được đề xuất.');
      setAiProposal(res.data.content);
      setAiMessage('AI đã tạo đề xuất. Hãy xem lại trước khi áp dụng.');
    } catch (e: any) {
      setAiMessage(e?.message || 'AI chưa tạo được đề xuất. Dữ liệu hiện tại vẫn được giữ nguyên.');
    } finally { setAiBusy(false); }
  };
  const applyAiProposal = async () => {
    if (!aiProposal) return;
    const next: CvWizardPayload = {
      ...form,
      careerObjective: aiProposal.careerObjective ?? form.careerObjective,
      summary: aiProposal.summary ?? form.summary,
      skills: aiProposal.skills ?? form.skills,
      hobbies: aiProposal.hobbies ?? form.hobbies,
      educations: (form.educations || []).map((item, i) => ({ ...item, description: aiProposal.educations?.[i]?.description ?? item.description })),
      experiences: (form.experiences || []).map((item, i) => ({ ...item, description: aiProposal.experiences?.[i]?.description ?? item.description, bulletPoints: aiProposal.experiences?.[i]?.bulletPoints ?? item.bulletPoints })),
      projects: (form.projects || []).map((item, i) => ({ ...item, description: aiProposal.projects?.[i]?.description ?? item.description, bulletPoints: aiProposal.projects?.[i]?.bulletPoints ?? item.bulletPoints })),
      activities: (form.activities || []).map((item, i) => ({ ...item, description: aiProposal.activities?.[i]?.description ?? item.description, bulletPoints: aiProposal.activities?.[i]?.bulletPoints ?? item.bulletPoints })),
      certifications: (form.certifications || []).map((item, i) => ({ ...item, description: aiProposal.certifications?.[i]?.description ?? item.description })),
      references: (form.references || []).map((item, i) => ({ ...item, description: aiProposal.references?.[i]?.description ?? item.description })),
    };
    setForm(next); setAiProposal(null); setAiPanelOpen(false); setAiMessage('');
    await renderPreview(next);
  };
  const proposalSections = useMemo(() => {
    if (!aiProposal) return [];
    const rows: Array<{ label: string; value: string }> = [];
    const add = (label: string, value?: string) => { if (value?.trim()) rows.push({ label, value: value.trim() }); };
    add('Mục tiêu nghề nghiệp', aiProposal.careerObjective);
    add('Giới thiệu bản thân', aiProposal.summary);
    aiProposal.educations?.forEach((x, i) => add(`Học vấn ${i + 1}`, x.description));
    aiProposal.experiences?.forEach((x, i) => add(`Kinh nghiệm ${i + 1}`, [x.description, ...(x.bulletPoints || [])].filter(Boolean).join('\n• ')));
    aiProposal.projects?.forEach((x, i) => add(`Dự án ${i + 1}`, [x.description, ...(x.bulletPoints || [])].filter(Boolean).join('\n• ')));
    aiProposal.activities?.forEach((x, i) => add(`Hoạt động ${i + 1}`, [x.description, ...(x.bulletPoints || [])].filter(Boolean).join('\n• ')));
    aiProposal.certifications?.forEach((x, i) => add(`Chứng chỉ ${i + 1}`, x.description));
    if (aiProposal.skills?.length) add('Kỹ năng', aiProposal.skills.join(' · '));
    if (aiProposal.hobbies?.length) add('Sở thích', aiProposal.hobbies.join(' · '));
    aiProposal.references?.forEach((x, i) => add(`Người giới thiệu ${i + 1}`, x.description));
    return rows;
  }, [aiProposal]);

  if (!isOpen) return null;
  return <AnimatePresence><div className={`cv-wizard-backdrop${previewHtml ? ' cvb-preview-backdrop' : embedded ? ' cvb-inline-backdrop' : ''}`}><motion.div className={`cv-wizard-modal cvb-modal${previewHtml ? ' cvb-preview-mode' : embedded ? ' cvb-inline-mode' : ''}`} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}>
    <div className="wizard-modal-header"><div className="wizard-header-left">{previewHtml && <button type="button" className="wizard-back-btn cvb-top-back" disabled={busy} onClick={backToEdit}><ArrowLeft size={16}/> Quay lại chỉnh sửa</button>}<div className="wizard-icon-box"><Sparkles size={20}/></div><div><h3 className="wizard-title">{previewHtml ? 'Xem trước CV' : 'Tạo CV'}</h3><p className="wizard-subtitle">{previewHtml ? 'Kiểm tra toàn bộ CV trước khi xác nhận tạo.' : 'Điền thông tin một lần, xem trước rồi xác nhận tạo CV.'}</p></div></div>{(!embedded || previewHtml) && <button type="button" className="wizard-close-btn" disabled={busy} onClick={closeBuilder}><X size={18}/></button>}</div>
    {error && <div className="wizard-alert-error">{error}</div>}
    {previewHtml ? <div className="cvb-preview-workspace"><div className="cvb-preview-document">{previewPdfUrl ? <iframe title="Xem trước CV PDF" src={previewPdfUrl}/> : <iframe sandbox="" title="Xem trước CV HTML" srcDoc={previewHtml}/>}</div>{aiPanelOpen && <aside className="cvb-ai-panel"><div className="cvb-ai-panel-heading"><div><strong>✨ AI cải thiện nội dung</strong><p>AI chỉ cải thiện nội dung CV, không thay đổi thông tin cá nhân. Bạn có thể xem lại trước khi áp dụng.</p></div><button type="button" onClick={() => setAiPanelOpen(false)} aria-label="Đóng AI panel"><X size={17}/></button></div><button type="button" className="cvb-ai-run" disabled={aiBusy || busy} onClick={() => void requestAiProposal()}>{aiBusy ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} AI diễn đạt lại</button>{aiMessage && <p className="cvb-ai-message">{aiMessage}</p>}{aiProposal && <div className="cvb-ai-proposal"><strong>Nội dung đề xuất</strong>{proposalSections.length ? proposalSections.map((row, index) => <div className="cvb-ai-proposal-item" key={`${row.label}-${index}`}><b>{row.label}</b><p>{row.value}</p></div>) : <p>AI giữ nguyên nội dung hiện tại vì không có phần nào cần thay đổi.</p>}</div>}<div className="cvb-ai-decision"><button type="button" className="wizard-back-btn" onClick={() => { setAiProposal(null); setAiMessage(''); setAiPanelOpen(false); }}>Giữ nguyên</button><button type="button" className="wizard-submit-btn" disabled={!aiProposal || aiBusy || busy} onClick={() => void applyAiProposal()}>Áp dụng đề xuất</button></div></aside>}<div className="wizard-footer-actions cvb-preview-actions"><button type="button" className="wizard-back-btn" disabled={busy || aiBusy} onClick={backToEdit}><ArrowLeft size={16}/> Chỉnh sửa</button><button type="button" className="cvb-ai-action" disabled={busy || aiBusy} onClick={() => setAiPanelOpen(value => !value)}><Sparkles size={16}/> AI cải thiện nội dung</button><button type="button" className="wizard-submit-btn" disabled={busy || aiBusy} onClick={confirm}>{busy ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle2 size={16}/>} Xác nhận tạo CV</button></div></div> : <div className="wizard-form-body cvb-body">
      <div className="cvb-form-intro"><strong>Thông tin cần có</strong><span>Điền một lần để tạo CV. Các mục bổ sung có thể để sau.</span></div>
      <SectionNavigation.Provider value={{ active: activeSection, setActive: setActiveSection }}>
      <Section n={1} title="Thông tin CV" filled={!!form.desiredIndustry && !!form.desiredPosition}>
        <div className="cvb-grid">
          <label>Ngành nghề *<select required value={form.desiredIndustry} onChange={e => set('desiredIndustry', e.target.value)}>{!CAREER_FIELD_OPTIONS.includes(form.desiredIndustry) && <option value={form.desiredIndustry}>{form.desiredIndustry}</option>}{CAREER_FIELD_OPTIONS.map(x => <option key={x}>{x}</option>)}</select></label>
          <label>Vị trí ứng tuyển *<input required list="cvb-roles" value={form.desiredPosition} onChange={e => set('desiredPosition', e.target.value)}/><datalist id="cvb-roles">{roles.map(x => <option key={x} value={x}/>)}</datalist>{form.desiredPosition && !isRoleSuggestedForField(form.desiredPosition, form.desiredIndustry) && <small>Vị trí cũ không thuộc gợi ý ngành này; dữ liệu vẫn được giữ.</small>}</label>
          <label>Tên CV<input value={form.displayName || ''} onChange={e => set('displayName', e.target.value)} placeholder="VD: CV Backend Developer"/></label>
          <label>Template<select value={form.templateId || ''} onChange={e => set('templateId', e.target.value || undefined)}>{templates.length === 0 && <option value="">CV Tiêu chuẩn HireMate</option>}{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        </div>
      </Section>
      <Section n={2} title="Thông tin cá nhân" filled={!!form.fullName && !!form.phone && !!form.email}>
        <div className="cvb-grid">
          <label>Họ và tên *<input required value={form.fullName} onChange={e => set('fullName', e.target.value)}/></label>
          <label>Số điện thoại *<input required type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)}/></label>
          <label>Email *<input required type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}/></label>
          <label>Địa chỉ<input value={form.address || ''} onChange={e => set('address', e.target.value)}/></label>
          <label>Ngày sinh (DD/MM/YYYY)<input type="text" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/YYYY" maxLength={10} value={birthDateText} onChange={e => { const text = e.target.value.replace(/[^\d/-]/g, '').slice(0, 10); setBirthDateText(text); set('dateOfBirth', parseBirthDate(text) || ''); }} onBlur={() => { const iso = parseBirthDate(birthDateText); if (iso) setBirthDateText(displayBirthDate(iso)); }}/></label>
          <label>Giới tính<select value={form.gender || ''} onChange={e => set('gender', e.target.value)}><option value="">Để trống</option><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
          <label>LinkedIn<input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedIn || ''} onChange={e => set('linkedIn', e.target.value)}/></label>
          <label>GitHub<input type="url" placeholder="https://github.com/..." value={form.gitHub || ''} onChange={e => set('gitHub', e.target.value)}/></label>
          <label>Ảnh đại diện<input type="file" accept="image/*" onChange={e => avatar(e.target.files?.[0])}/></label>
        </div>
      </Section>
      <Section n={3} id="cvb-education" title="Học vấn *" filled={!!form.educations?.length && form.educations.every(x => !!x.institution?.trim())}>
        {(form.educations || []).map((x, i) => <div className="cvb-record" key={i}>
          <b>Học vấn ({i + 1})</b>
          <div className="cvb-grid">
            <label>Trường / Tổ chức *<input required value={x.institution || ''} onChange={e => updateArray<Education>('educations', i, { institution: e.target.value })}/></label>
            <label>Chuyên ngành<input value={x.major || ''} onChange={e => updateArray<Education>('educations', i, { major: e.target.value })}/></label>
            <label>Bắt đầu<input type="month" value={x.startDate || ''} onChange={e => updateArray<Education>('educations', i, { startDate: e.target.value })}/></label>
            <label>Kết thúc<input type="month" disabled={x.isCurrent} value={x.endDate || ''} onChange={e => updateArray<Education>('educations', i, { endDate: e.target.value })}/></label>
            <label>GPA / Xếp loại<input type="text" placeholder="VD: 3.6/4.0 hoặc Giỏi" value={x.gpa || ''} onChange={e => updateArray<Education>('educations', i, { gpa: e.target.value })}/></label>
          </div>
          <label className="cvb-check"><input type="checkbox" checked={!!x.isCurrent} onChange={e => updateArray<Education>('educations', i, { isCurrent: e.target.checked })}/> Đang học</label>
          <label>Thành tích / Mô tả<textarea value={x.description || ''} onChange={e => updateArray<Education>('educations', i, { description: e.target.value })}/></label>
          {(form.educations?.length || 0) > 1 && <button type="button" className="cvb-delete" onClick={() => remove('educations', i)}><Trash2 size={14}/> Xóa</button>}
        </div>)}
        <button type="button" className="cvb-add" onClick={() => set('educations', [...(form.educations || []), emptyEducation()])}><Plus size={14}/> Thêm học vấn</button>
      </Section>
      <div className="cvb-optional-group"><button type="button" className="cvb-optional-toggle" aria-expanded={showOptional} onClick={() => { if (showOptional && activeSection >= 4) setActiveSection(1); setShowOptional(value => !value); }}><span><strong>Nội dung bổ sung</strong><small>Mục tiêu, kinh nghiệm, dự án, kỹ năng và các mục khác</small></span><em>{optionalCount ? `${optionalCount}/8 mục có dữ liệu` : 'Không bắt buộc'}</em><span aria-hidden="true">{showOptional ? '−' : '+'}</span></button></div>
      <div className="cvb-optional-content" hidden={!showOptional}>
      <Section n={4} title="Mục tiêu & Giới thiệu" filled={!!form.careerObjective || !!form.summary} optional><label>Mục tiêu nghề nghiệp<textarea rows={4} value={form.careerObjective || ''} onChange={e => set('careerObjective', e.target.value)}/></label><label>Giới thiệu bản thân<textarea rows={4} value={form.summary || ''} onChange={e => set('summary', e.target.value)}/></label></Section>
      <Section n={5} title="Kinh nghiệm làm việc" filled={!!form.experiences?.length} incomplete={form.experiences?.some(x => !x.title?.trim() || !x.org?.trim())} optional><ExperienceList items={form.experiences || []} label="Kinh nghiệm" onUpdate={(i,p) => updateArray<Exp>('experiences',i,p)} onRemove={i => remove('experiences',i)} onAdd={() => set('experiences',[...(form.experiences || []),emptyExp()])}/></Section>
      <Section n={6} title="Hoạt động" filled={!!form.activities?.length} incomplete={form.activities?.some(x => !x.title?.trim() || !x.org?.trim())} optional><ExperienceList items={form.activities || []} label="Hoạt động" onUpdate={(i,p) => updateArray<Exp>('activities',i,p)} onRemove={i => remove('activities',i)} onAdd={() => set('activities',[...(form.activities || []),emptyExp()])}/></Section>
      <Section n={7} title="Chứng chỉ" filled={!!form.certifications?.length} optional>{(form.certifications||[]).map((x,i)=><div className="cvb-record" key={i}><b>Chứng chỉ ({i+1})</b><div className="cvb-grid"><label>Tên chứng chỉ<input value={x.name||''} onChange={e=>updateArray<Certification>('certifications',i,{name:e.target.value})}/></label><label>Tổ chức cấp<input value={x.issuer||''} onChange={e=>updateArray<Certification>('certifications',i,{issuer:e.target.value})}/></label><label>Ngày cấp<input type="month" value={x.issueDate||''} onChange={e=>updateArray<Certification>('certifications',i,{issueDate:e.target.value})}/></label><label>Ngày hết hạn<input type="month" value={x.expiryDate||''} onChange={e=>updateArray<Certification>('certifications',i,{expiryDate:e.target.value})}/></label><label>Credential ID<input value={x.credentialId||''} onChange={e=>updateArray<Certification>('certifications',i,{credentialId:e.target.value})}/></label><label>Credential URL<input value={x.credentialUrl||''} onChange={e=>updateArray<Certification>('certifications',i,{credentialUrl:e.target.value})}/></label></div><label>Mô tả<textarea value={x.description||''} onChange={e=>updateArray<Certification>('certifications',i,{description:e.target.value})}/></label><button type="button" className="cvb-delete" onClick={()=>remove('certifications',i)}><Trash2 size={14}/> Xóa</button></div>)}<button type="button" className="cvb-add" onClick={()=>set('certifications',[...(form.certifications||[]),emptyCertification()])}><Plus size={14}/> Thêm chứng chỉ</button></Section>
      <Section n={8} title="Kỹ năng" filled={!!form.skills?.length} optional><Tags value={form.skills || []} onChange={v => set('skills', v)} placeholder="Nhập kỹ năng"/></Section>
      <Section n={9} title="Sở thích" filled={!!form.hobbies?.length} optional><Tags value={form.hobbies || []} onChange={v => set('hobbies', v)} placeholder="Nhập sở thích"/></Section>
      <Section n={10} title="Người giới thiệu" filled={!!form.references?.length} optional>{(form.references||[]).map((x,i)=><div className="cvb-record" key={i}><b>Người giới thiệu ({i+1})</b><div className="cvb-grid"><label>Họ tên<input value={x.name||''} onChange={e=>updateArray<Reference>('references',i,{name:e.target.value})}/></label><label>Chức vụ<input value={x.title||''} onChange={e=>updateArray<Reference>('references',i,{title:e.target.value})}/></label><label>Công ty / Tổ chức<input value={x.organization||''} onChange={e=>updateArray<Reference>('references',i,{organization:e.target.value})}/></label><label>Email<input type="email" value={x.email||''} onChange={e=>updateArray<Reference>('references',i,{email:e.target.value})}/></label><label>Số điện thoại<input value={x.phone||''} onChange={e=>updateArray<Reference>('references',i,{phone:e.target.value})}/></label></div><label>Mô tả<textarea value={x.description||''} onChange={e=>updateArray<Reference>('references',i,{description:e.target.value})}/></label><button type="button" className="cvb-delete" onClick={()=>remove('references',i)}><Trash2 size={14}/> Xóa</button></div>)}<button type="button" className="cvb-add" onClick={()=>set('references',[...(form.references||[]),emptyReference()])}><Plus size={14}/> Thêm người giới thiệu</button></Section>
      <Section n={11} title="Dự án" filled={!!form.projects?.length} incomplete={form.projects?.some(x => !x.name?.trim())} optional>{(form.projects || []).map((x,i)=><div className="cvb-record" key={i}><b>Dự án ({i+1})</b><div className="cvb-grid"><label>Tên dự án *<input value={x.name||''} onChange={e=>updateArray<Project>('projects',i,{name:e.target.value})}/></label><label>Vai trò<input value={x.role||''} onChange={e=>updateArray<Project>('projects',i,{role:e.target.value})}/></label><label>Thời gian<input value={x.period||''} onChange={e=>updateArray<Project>('projects',i,{period:e.target.value})}/></label><label>URL<input value={x.url||''} onChange={e=>updateArray<Project>('projects',i,{url:e.target.value})}/></label></div><label>Công nghệ<input value={(x.technologies||[]).join(', ')} onChange={e=>updateArray<Project>('projects',i,{technologies:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})}/></label><label>Mô tả<textarea value={x.description||''} onChange={e=>updateArray<Project>('projects',i,{description:e.target.value})}/></label><label>Thành tựu (mỗi dòng một ý)<textarea value={(x.bulletPoints||[]).join('\n')} onChange={e=>updateArray<Project>('projects',i,{bulletPoints:e.target.value.split('\n')})}/></label><button type="button" className="cvb-delete" onClick={()=>remove('projects',i)}><Trash2 size={14}/> Xóa</button></div>)}<button type="button" className="cvb-add" onClick={()=>set('projects',[...(form.projects||[]),emptyProject()])}><Plus size={14}/> Thêm dự án</button></Section>
      </div>
      </SectionNavigation.Provider>
      <div className="wizard-footer-actions"><button type="button" className="wizard-cancel-btn" onClick={closeBuilder}>{embedded ? 'Kho CV' : 'Hủy'}</button><button type="button" className="wizard-submit-btn" disabled={busy} onClick={preview}>{busy ? <Loader2 size={16} className="animate-spin"/> : <Eye size={16}/>} Xem trước CV với dữ liệu hiện tại</button></div>
    </div>}
  </motion.div></div></AnimatePresence>;
};
