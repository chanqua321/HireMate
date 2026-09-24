import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Loader2, Plus, Sparkles, Trash2, UploadCloud, X, ChevronDown, Check, Search } from 'lucide-react';
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
  editingCvId?: string;
  onSwitchToUpload?: () => void;
  userCvCount?: number;
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

interface CustomComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

const CustomRoleCombobox: React.FC<CustomComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!value.trim()) return options;
    const lower = value.toLowerCase();
    const matched = options.filter((opt) => opt.toLowerCase().includes(lower));
    return matched.length > 0 ? matched : options;
  }, [value, options]);

  return (
    <div className="custom-combobox-wrap" ref={containerRef}>
      <div className="custom-combobox-input-row">
        <input
          ref={inputRef}
          required={required}
          type="text"
          className="custom-combobox-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          className={`custom-combobox-toggle ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title="Chọn gợi ý vị trí"
        >
          <ChevronDown size={17} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && options.length > 0 && (
          <motion.div
            className="custom-dropdown-panel"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
          >
            <div className="custom-dropdown-header">
              <span>Gợi ý vị trí theo ngành:</span>
            </div>
            <div className="custom-dropdown-list">
              {filteredOptions.map((opt) => {
                const isSelected = opt.toLowerCase() === value.trim().toLowerCase();
                return (
                  <div
                    key={opt}
                    className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt);
                      setIsOpen(false);
                      inputRef.current?.blur();
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={15} color="#0284c7" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  searchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '— Chọn —',
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  const displayedOptions = useMemo(() => {
    if (!searchable || !searchTerm.trim()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchable, searchTerm]);

  return (
    <div className="custom-combobox-wrap" ref={containerRef}>
      <button
        type="button"
        className={`custom-select-button ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearchTerm('');
        }}
      >
        <span className={selectedOption ? 'selected-text' : 'placeholder-text'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={17} className={`select-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-dropdown-panel"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            {searchable && (
              <div className="custom-dropdown-search-wrap">
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  className="custom-dropdown-search"
                  placeholder="Tìm kiếm nhanh..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            <div className="custom-dropdown-list">
              {displayedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="custom-dropdown-item-content">
                      <span>{opt.label}</span>
                      {opt.badge && <span className="custom-dropdown-badge">{opt.badge}</span>}
                    </div>
                    {isSelected && <Check size={15} color="#0284c7" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SectionNavigation = React.createContext<{
  active: number;
  setActive: (value: number) => void;
  hasExistingCv: boolean;
}>({ active: 1, setActive: () => {}, hasExistingCv: false });

const Section: React.FC<{
  n: number;
  title: string;
  stageName?: string;
  filled?: boolean;
  incomplete?: boolean;
  optional?: boolean;
  id?: string;
  children: React.ReactNode;
}> = ({ n, title, stageName, filled, incomplete, optional, id, children }) => {
  const { active, setActive, hasExistingCv } = React.useContext(SectionNavigation);
  const isMandatory = n >= 1 && n <= 3;
  // Alert "❗ Chưa điền" chỉ xuất hiện khi user mới tạo account hoặc chưa có CV
  const isMissing = !hasExistingCv && isMandatory && !filled;

  return (
    <details
      id={id}
      data-section={n}
      className={`cvb-section ${isMissing ? 'cvb-section-attention' : filled ? 'cvb-section-done' : ''}`}
      open={active === n}
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          setActive(active === n ? 0 : n);
        }}
        aria-expanded={active === n}
      >
        <span className="cvb-section-title-wrap">
          {isMissing ? (
            <span className="cvb-alert-mark" title="Mục bắt buộc chưa hoàn thành">
              ❗
            </span>
          ) : filled ? (
            <span className="cvb-done-mark" title="Đã hoàn thành">
              ✓
            </span>
          ) : null}
          <span className="cvb-section-num-title">
            {!hasExistingCv && stageName ? `${stageName}: ${title}` : `${n}. ${title}`}
          </span>
        </span>
        <em
          className={
            incomplete
              ? 'incomplete'
              : filled
              ? 'done'
              : isMissing
              ? 'attention'
              : optional
              ? 'optional'
              : ''
          }
        >
          {incomplete
            ? '⚠️ Cần bổ sung'
            : filled
            ? '✓ Đã hoàn thành'
            : isMissing
            ? '❗ Chưa điền'
            : isMandatory
            ? 'Bắt buộc'
            : optional
            ? 'Tùy chọn'
            : ''}
        </em>
      </summary>
      <div className="cvb-section-body">{children}</div>
    </details>
  );
};

const Tags: React.FC<{ value: string[]; onChange: (v: string[]) => void; placeholder: string }> = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = () => { const next = draft.trim(); if (next && !value.some(x => x.toLowerCase() === next.toLowerCase())) onChange([...value, next]); setDraft(''); };
  return <div><div className="cvb-inline"><input value={draft} placeholder={placeholder} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /><button type="button" onClick={add}><Plus size={14}/> Thêm</button></div><div className="cvb-tags">{value.map(x => <span key={x}>{x}<button type="button" onClick={() => onChange(value.filter(y => y !== x))}><X size={12}/></button></span>)}</div></div>;
};

const ExperienceList: React.FC<{ items: Exp[]; label: string; onUpdate: (i:number,p:Partial<Exp>)=>void; onRemove:(i:number)=>void; onAdd:()=>void }> = ({items,label,onUpdate,onRemove,onAdd}) => <>{items.map((x,i)=><div className="cvb-record" key={i}><b>{label} ({i+1})</b><div className="cvb-grid"><label>Vị trí / Tên *<input value={x.title||''} onChange={e=>onUpdate(i,{title:e.target.value})}/></label><label>Tổ chức / Công ty *<input value={x.org||''} onChange={e=>onUpdate(i,{org:e.target.value})}/></label><label>Vai trò<input value={x.role||''} onChange={e=>onUpdate(i,{role:e.target.value})}/></label><label>Bắt đầu<input type="month" value={x.startDate||''} onChange={e=>onUpdate(i,{startDate:e.target.value})}/></label><label>Kết thúc<input type="month" disabled={x.isCurrent} value={x.endDate||''} onChange={e=>onUpdate(i,{endDate:e.target.value})}/></label></div><label className="cvb-check"><input type="checkbox" checked={!!x.isCurrent} onChange={e=>onUpdate(i,{isCurrent:e.target.checked})}/> Đang thực hiện</label><label>Mô tả<textarea value={x.description||''} onChange={e=>onUpdate(i,{description:e.target.value})}/></label><label>Thành tựu (mỗi dòng một ý)<textarea value={(x.bulletPoints||[]).join('\n')} onChange={e=>onUpdate(i,{bulletPoints:e.target.value.split('\n')})}/></label><button type="button" className="cvb-delete" onClick={()=>onRemove(i)}><Trash2 size={14}/> Xóa</button></div>)}<button type="button" className="cvb-add" onClick={onAdd}><Plus size={14}/> Thêm {label.toLowerCase()}</button></>;

export const CvWizardModal: React.FC<CvWizardModalProps> = ({
  isOpen,
  embedded = false,
  onClose,
  onSuccess,
  defaultIndustry = '',
  defaultRole = '',
  templates = [],
  initial = {},
  editingCvId,
  onSwitchToUpload,
  userCvCount,
}) => {
  const hasExistingCv = typeof userCvCount === 'number' && userCvCount > 0;
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
  const [saveNotice, setSaveNotice] = useState('');
  const [activeSection, setActiveSection] = useState(1);
  const [showOptional, setShowOptional] = useState(false);
  const roles = useMemo(() => getRolesForField(form.desiredIndustry), [form.desiredIndustry]);
  const optionalCount = [!!form.careerObjective || !!form.summary, !!form.experiences?.length, !!form.activities?.length, !!form.certifications?.length, !!form.skills?.length, !!form.hobbies?.length, !!form.references?.length, !!form.projects?.length].filter(Boolean).length;
  const set = <K extends keyof CvWizardPayload>(key: K, value: CvWizardPayload[K]) => setForm(prev => ({ ...prev, [key]: value }));

  const section1Filled = Boolean(form.desiredIndustry?.trim() && form.desiredPosition?.trim());
  const section2Filled = Boolean(form.fullName?.trim() && form.phone?.trim() && form.email?.trim());
  const section3Filled = Boolean(form.educations?.length && form.educations.every(x => Boolean(x.institution?.trim())));
  const mandatoryCount = (section1Filled ? 1 : 0) + (section2Filled ? 1 : 0) + (section3Filled ? 1 : 0);

  const fillSampleData = () => {
    setForm(prev => ({
      ...prev,
      desiredIndustry: 'Công nghệ thông tin',
      desiredPosition: 'Lập trình viên Frontend',
      displayName: 'CV Lập trình viên Frontend — 2026',
      fullName: prev.fullName || 'Nguyễn Văn An',
      phone: prev.phone || '0912345678',
      email: prev.email || 'nguyenvanan.dev@gmail.com',
      address: prev.address || 'Quận Cầu Giấy, Hà Nội',
      careerObjective: 'Lập trình viên Frontend với nền tảng React & TypeScript vững chắc, mong muốn phát triển sản phẩm web hiệu năng cao và nâng cao kỹ năng thực chiến.',
      summary: 'Chủ động, có tinh thần trách nhiệm cao, khả năng nghiên cứu công nghệ mới nhanh và phối hợp làm việc nhóm hiệu quả.',
      educations: [
        {
          institution: 'Đại học Bách Khoa Hà Nội',
          major: 'Công nghệ thông tin',
          startDate: '2020-09',
          endDate: '2024-06',
          isCurrent: false,
          gpa: '3.6/4.0',
          description: 'Tốt nghiệp loại Giỏi chuyên ngành Kỹ thuật Phần mềm.'
        }
      ],
      experiences: [
        {
          title: 'Frontend Developer Intern',
          org: 'Công ty Cổ phần Công nghệ ABC',
          role: 'Thực tập sinh Frontend',
          startDate: '2023-06',
          endDate: '2023-12',
          isCurrent: false,
          description: 'Tham gia xây dựng giao diện ứng dụng quản lý với React và TailwindCSS.',
          bulletPoints: [
            'Tối ưu thời gian tải trang ban đầu giảm 25%',
            'Phát triển 15+ reusable UI components chuẩn Design System',
            'Phối hợp cùng Backend tích hợp RESTful APIs và xử lý xác thực người dùng'
          ]
        }
      ],
      skills: ['React', 'TypeScript', 'JavaScript', 'HTML5/CSS3', 'Git', 'RESTful API', 'TailwindCSS'],
      projects: [
        {
          name: 'Hệ thống Quản lý Bán hàng E-Commerce',
          role: 'Frontend Lead',
          period: '2023-09 — 2024-01',
          url: 'https://github.com/example/ecommerce-app',
          technologies: ['React', 'TypeScript', 'Redux Toolkit', 'Axios'],
          description: 'Ứng dụng thương mại điện tử hỗ trợ tìm kiếm sản phẩm, giỏ hàng và thanh toán trực tuyến.',
          bulletPoints: [
            'Xây dựng luồng thanh toán giỏ hàng mượt mà với Redux',
            'Đạt 95+ điểm Lighthouse về Accessibility & Performance'
          ]
        }
      ]
    }));
    setBirthDateText('15/08/2002');
    setError('');
  };

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
    setAiPanelOpen(false); setAiProposal(null); setAiMessage(''); setAiBusy(false); setError(''); setSaveNotice(''); setBusy(false); setActiveSection(1); setShowOptional(false);
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
  const backToEdit = () => { setAiPanelOpen(false); setSaveNotice(''); setPreviewHtml(''); setPreviewPdfUrl(previous => { if (previous) URL.revokeObjectURL(previous); return ''; }); };
  const closeBuilder = () => { if (embedded) backToEdit(); onClose(); };
  const confirm = async () => { if (busy) return; const validation = validate(); if (validation) { backToEdit(); showValidationError(validation); return; } setBusy(true); setError(''); setSaveNotice(''); try { const res = editingCvId ? await cvService.updateCv(editingCvId, clean()) : await cvService.createFromWizard(clean()); if (!res.ok || !res.data) throw new Error(res.message || (editingCvId ? 'Không lưu được CV.' : 'Không tạo được CV.')); await onSuccess(res.data, res.message); if (editingCvId) setSaveNotice('Đã lưu thay đổi vào CV này. Bản xem trước đang hiển thị nội dung mới; hãy chấm điểm lại khi cần.'); else { setForm(previous => ({ ...previous, clientRequestId: requestId() })); backToEdit(); onClose(); } } catch (e: any) { setError(e?.message || 'Không lưu được CV.'); } finally { setBusy(false); } };
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
    {(!embedded || previewHtml) && (
      <div className="wizard-modal-header">
        <div className="wizard-header-left">
          {previewHtml && (
            <button type="button" className="wizard-back-btn cvb-top-back" disabled={busy} onClick={backToEdit}>
              <ArrowLeft size={16}/> Quay lại chỉnh sửa
            </button>
          )}
          <div className="wizard-icon-box"><Sparkles size={20}/></div>
          <div>
            <h3 className="wizard-title">{previewHtml ? 'Xem trước CV' : editingCvId ? 'Chỉnh sửa CV' : 'Tạo CV'}</h3>
            <p className="wizard-subtitle">{previewHtml ? 'Kiểm tra nội dung trước khi lưu.' : editingCvId ? 'Chỉnh sửa nội dung của CV hiện tại, rồi xem trước và lưu.' : 'Điền thông tin một lần, xem trước rồi xác nhận tạo CV.'}</p>
          </div>
        </div>
        <button type="button" className="wizard-close-btn" disabled={busy} onClick={closeBuilder}><X size={18}/></button>
      </div>
    )}
    {error && <div className="wizard-alert-error">{error}</div>}
    {saveNotice && <div role="status" className="cvb-ai-message">{saveNotice}</div>}
    {previewHtml ? (
      <div className="cvb-preview-workspace">
        <div className="cvb-preview-document">
          {previewPdfUrl ? (
            <iframe title="Xem trước CV PDF" src={previewPdfUrl} />
          ) : (
            <iframe sandbox="" title="Xem trước CV HTML" srcDoc={previewHtml} />
          )}
        </div>
        {aiPanelOpen && (
          <aside className="cvb-ai-panel">
            <div className="cvb-ai-panel-heading">
              <div>
                <strong>✨ AI cải thiện nội dung</strong>
                <p>AI chỉ cải thiện nội dung CV, không thay đổi thông tin cá nhân. Bạn có thể xem lại trước khi áp dụng.</p>
              </div>
              <button type="button" onClick={() => setAiPanelOpen(false)} aria-label="Đóng AI panel">
                <X size={17} />
              </button>
            </div>
            <button
              type="button"
              className="cvb-ai-run"
              disabled={aiBusy || busy}
              onClick={() => void requestAiProposal()}
            >
              {aiBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              AI diễn đạt lại
            </button>
            {aiMessage && <p className="cvb-ai-message">{aiMessage}</p>}
            {aiProposal && (
              <div className="cvb-ai-proposal">
                <strong>Nội dung đề xuất</strong>
                {proposalSections.length ? (
                  proposalSections.map((row, index) => (
                    <div className="cvb-ai-proposal-item" key={`${row.label}-${index}`}>
                      <b>{row.label}</b>
                      <p>{row.value}</p>
                    </div>
                  ))
                ) : (
                  <p>AI giữ nguyên nội dung hiện tại vì không có phần nào cần thay đổi.</p>
                )}
              </div>
            )}
            <div className="cvb-ai-decision">
              <button
                type="button"
                className="wizard-back-btn"
                onClick={() => {
                  setAiProposal(null);
                  setAiMessage('');
                  setAiPanelOpen(false);
                }}
              >
                Giữ nguyên
              </button>
              <button
                type="button"
                className="wizard-submit-btn"
                disabled={!aiProposal || aiBusy || busy}
                onClick={() => void applyAiProposal()}
              >
                Áp dụng đề xuất
              </button>
            </div>
          </aside>
        )}
        <div className="wizard-footer-actions cvb-preview-actions">
          <button type="button" className="wizard-back-btn" disabled={busy || aiBusy} onClick={backToEdit}>
            <ArrowLeft size={16} /> Chỉnh sửa
          </button>
          <button
            type="button"
            className="cvb-ai-action"
            disabled={busy || aiBusy}
            onClick={() => setAiPanelOpen((value) => !value)}
          >
            <Sparkles size={16} /> AI cải thiện nội dung
          </button>
          <button type="button" className="wizard-submit-btn" disabled={busy || aiBusy} onClick={confirm}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {editingCvId ? 'Lưu thay đổi' : 'Xác nhận tạo CV'}
          </button>
        </div>
      </div>
    ) : (
      <div className="wizard-form-body cvb-body">
        {editingCvId && <div role="status" className="cvb-ai-message">Đang chỉnh sửa: <strong>{initial.displayName || 'CV hiện tại'}</strong>. Lưu sẽ cập nhật bản CV này.</div>}
        {/* Notification bar tiến độ hoàn thiện — chỉ xuất hiện khi user mới tạo account hoặc chưa có CV */}
        {!editingCvId && (!hasExistingCv ? (
          <div className="cvb-stepper-bar">
            <div className="cvb-stepper-info">
              <div className="cvb-stepper-label-row">
                <span className="cvb-stepper-label">
                  Tiến độ hoàn thiện: <strong>{mandatoryCount}/3 đợt bắt buộc</strong>
                </span>
                <span className="cvb-stepper-pct">{Math.round((mandatoryCount / 3) * 100)}%</span>
              </div>
              <div className="cvb-progress-track">
                <div className="cvb-progress-bar" style={{ width: `${(mandatoryCount / 3) * 100}%` }} />
              </div>
            </div>

            <button
              type="button"
              className="cvb-quick-fill-btn"
              onClick={fillSampleData}
              title="Tự động điền dữ liệu mẫu để bạn thử nghiệm nhanh tính năng"
            >
              <Sparkles size={14} />
              <span>Điền mẫu nhanh</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button
              type="button"
              className="cvb-quick-fill-btn"
              onClick={fillSampleData}
              title="Tự động điền dữ liệu mẫu để bạn thử nghiệm nhanh tính năng"
            >
              <Sparkles size={14} />
              <span>Điền mẫu nhanh</span>
            </button>
          </div>
        ))}

        <SectionNavigation.Provider value={{ active: activeSection, setActive: setActiveSection, hasExistingCv }}>
        <Section n={1} title="Thông tin CV & Vị trí mục tiêu" stageName="Đợt 1" filled={section1Filled}>
        <div className="cvb-grid">
          <label>
            Ngành nghề *
            <CustomSelect
              value={form.desiredIndustry}
              onChange={(val) => {
                set('desiredIndustry', val);
                const suggested = getRolesForField(val);
                if (suggested.length > 0 && !form.desiredPosition) {
                  set('desiredPosition', suggested[0]);
                }
              }}
              options={CAREER_FIELD_OPTIONS.map((f) => ({ value: f, label: f }))}
              searchable
              placeholder="Chọn ngành nghề"
            />
          </label>
          <label>
            Vị trí ứng tuyển *
            <CustomRoleCombobox
              required
              value={form.desiredPosition}
              onChange={(val) => set('desiredPosition', val)}
              options={roles}
              placeholder="VD: Lập trình viên Frontend"
            />
            {form.desiredPosition && !isRoleSuggestedForField(form.desiredPosition, form.desiredIndustry) && (
              <small>Vị trí tùy chỉnh (ngoài danh mục gợi ý mặc định).</small>
            )}
          </label>
          <label>
            Tên hiển thị CV
            <input
              value={form.displayName || ''}
              readOnly={!!editingCvId}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="VD: CV Frontend Developer — 2026"
            />
            {editingCvId && <small>Đổi tên CV trong Kho CV.</small>}
          </label>
          <label>
            Mẫu giao diện CV (Template)
            {editingCvId ? <><input readOnly value={templates.find(t => t.id === form.templateId)?.name || 'Mẫu hiện tại'} /><small>Đổi mẫu CV trong Kho CV.</small></> : <CustomSelect
              value={form.templateId || ''}
              onChange={(val) => set('templateId', val || undefined)}
              options={
                templates.length === 0
                  ? [{ value: '', label: 'CV Tiêu chuẩn HireMate (Modern)', badge: 'Chuẩn ATS' }]
                  : templates.map((t) => ({
                      value: t.id,
                      label: t.name,
                      badge: t.isSystemTemplate ? 'Chuẩn ATS' : undefined,
                    }))
              }
              placeholder="Chọn mẫu template"
            />}
          </label>
        </div>
      </Section>
      <Section n={2} title="Thông tin cá nhân" stageName="Đợt 2" filled={!!form.fullName && !!form.phone && !!form.email}>
        <div className="cvb-grid">
          <label>Họ và tên *<input required value={form.fullName} onChange={e => set('fullName', e.target.value)}/></label>
          <label>Số điện thoại *<input required type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)}/></label>
          <label>Email *<input required type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}/></label>
          <label>Địa chỉ<input value={form.address || ''} onChange={e => set('address', e.target.value)}/></label>
          <label>Ngày sinh (DD/MM/YYYY)<input type="text" inputMode="numeric" autoComplete="bday" placeholder="DD/MM/YYYY" maxLength={10} value={birthDateText} onChange={e => { const text = e.target.value.replace(/[^\d/-]/g, '').slice(0, 10); setBirthDateText(text); set('dateOfBirth', parseBirthDate(text) || ''); }} onBlur={() => { const iso = parseBirthDate(birthDateText); if (iso) setBirthDateText(displayBirthDate(iso)); }}/></label>
          <label>
            Giới tính
            <CustomSelect
              value={form.gender || ''}
              onChange={(val) => set('gender', val)}
              options={[
                { value: '', label: 'Để trống' },
                { value: 'Nam', label: 'Nam' },
                { value: 'Nữ', label: 'Nữ' },
                { value: 'Khác', label: 'Khác' },
              ]}
              placeholder="Chọn giới tính"
            />
          </label>
          <label>LinkedIn<input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedIn || ''} onChange={e => set('linkedIn', e.target.value)}/></label>
          <label>GitHub<input type="url" placeholder="https://github.com/..." value={form.gitHub || ''} onChange={e => set('gitHub', e.target.value)}/></label>
          <label>Ảnh đại diện<input type="file" accept="image/*" onChange={e => avatar(e.target.files?.[0])}/></label>
        </div>
      </Section>
      <Section n={3} id="cvb-education" title="Học vấn *" stageName="Đợt 3" filled={!!form.educations?.length && form.educations.every(x => !!x.institution?.trim())}>
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
      <div className="wizard-footer-actions">
        <button type="button" className="wizard-cancel-btn" onClick={closeBuilder}>
          {embedded ? (typeof userCvCount === 'number' ? `Mở Kho CV (${userCvCount})` : 'Kho CV') : 'Hủy'}
        </button>
        <button type="button" className="wizard-submit-btn cvb-primary-action-btn" disabled={busy} onClick={preview}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
          <span>{editingCvId ? 'Xem trước thay đổi' : 'Xem trước & Tối ưu bằng AI'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )}
</motion.div></div></AnimatePresence>;
};
