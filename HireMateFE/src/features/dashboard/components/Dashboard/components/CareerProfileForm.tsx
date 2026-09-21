import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Briefcase,
  Layers,
  Award,
  GraduationCap,
  Cpu,
  FileText,
  Plus,
  X,
  ChevronDown,
  CheckCircle2,
  Eye,
  Save,
  Loader2,
  Edit3,
  Video,
  ArrowRight,
  FileCheck,
  FolderOpen,
} from 'lucide-react';
import type { CvTemplateDto } from '../../../../../shared/services/cv.service';
import {
  CAREER_FIELD_OPTIONS,
  CUSTOM_ROLE_OPTION,
  getRolesForField,
  isRoleSuggestedForField,
  resolveCatalogField,
  sortTemplatesForField,
} from '../../../../../shared/data/careerFieldCatalog';
import { AiTextAssistBar } from './AiTextAssistBar';
import './CareerProfileForm.css';
import type {
  CvExperienceItem,
  CvProjectItem,
  CvCertificationItem,
} from '../../../../../shared/services/profile.service';

interface CareerProfileFormProps {
  name: string;
  setName: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  field: string;
  setField: (v: string) => void;
  exp: string;
  setExp: (v: string) => void;
  education: string;
  setEducation: (v: string) => void;
  graduationYear: number | '';
  setGraduationYear: (v: number | '') => void;
  bio: string;
  setBio: (v: string) => void;
  skills: string[];
  setSkills: (v: string[]) => void;
  experiences: CvExperienceItem[];
  setExperiences: (v: CvExperienceItem[]) => void;
  projects: CvProjectItem[];
  setProjects: (v: CvProjectItem[]) => void;
  certifications: CvCertificationItem[];
  setCertifications: (v: CvCertificationItem[]) => void;
  saving: boolean;
  savedSuccess: boolean;
  onSave: (e: React.FormEvent) => void;
  onCreateCv?: () => void | Promise<void>;
  onOpenCheckCvModal: () => void;
  activeCv?: any;
  onOpenCvDetail?: (cv: any) => void;
  onSwitchToCvTab?: () => void;
  onNavigateInterview?: () => void;
  wizardDisplayName?: string;
  setWizardDisplayName?: (v: string) => void;
  wizardTemplateId?: string;
  setWizardTemplateId?: (v: string) => void;
  cvTemplates?: CvTemplateDto[];
  creatingCv?: boolean;
}
const EXP_OPTIONS = [
  'Chưa có KN (Intern / Fresher)',
  'Dưới 1 năm (Junior)',
  '1 - 2 năm kinh nghiệm',
  '2 - 3 năm (Mid-level)',
  '3 - 5 năm (Senior)',
  '5+ năm (Lead / Manager)',
];

export const CareerProfileForm: React.FC<CareerProfileFormProps> = ({
  name,
  setName,
  role,
  setRole,
  field,
  setField,
  exp,
  setExp,
  education,
  setEducation,
  graduationYear,
  setGraduationYear,
  bio,
  setBio,
  skills,
  setSkills,
  experiences,
  setExperiences,
  projects,
  setProjects,
  certifications,
  setCertifications,
  saving,
  savedSuccess,
  onSave,
  onCreateCv,
  onOpenCheckCvModal,
  activeCv,
  onOpenCvDetail,
  onSwitchToCvTab,
  onNavigateInterview,
  wizardDisplayName = '',
  setWizardDisplayName,
  wizardTemplateId = '',
  setWizardTemplateId,
  cvTemplates = [],
  creatingCv = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [expDropdownOpen, setExpDropdownOpen] = useState(false);
  const [roleModeCustom, setRoleModeCustom] = useState(false);
  const [autoStartAiPolish, setAutoStartAiPolish] = useState(false);

  const fieldWrapperRef = useRef<HTMLDivElement>(null);
  const expWrapperRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bioSectionRef = useRef<HTMLDivElement>(null);

  const suggestedRoles = getRolesForField(field);
  const roleInCatalog = isRoleSuggestedForField(role, field);
  const showRoleMismatchWarning =
    !!role.trim() && !!resolveCatalogField(field) && !roleInCatalog && !roleModeCustom;
  const sortedTemplates = sortTemplatesForField(cvTemplates, field);

  useEffect(() => {
    // Init custom mode if existing role is outside catalog (preserve data).
    if (role.trim() && resolveCatalogField(field) && !isRoleSuggestedForField(role, field)) {
      setRoleModeCustom(true);
    }
  }, [field, role]);

  useEffect(() => {
    if (savedSuccess) {
      const timer = setTimeout(() => setIsEditing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [savedSuccess]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fieldWrapperRef.current && !fieldWrapperRef.current.contains(e.target as Node)) {
        setFieldDropdownOpen(false);
      }
      if (expWrapperRef.current && !expWrapperRef.current.contains(e.target as Node)) {
        setExpDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddSkill = (skillToAdd?: string) => {
    const s = (skillToAdd || newSkillInput).trim();
    if (s && !skills.some((item) => item.toLowerCase() === s.toLowerCase())) {
      setSkills([...skills, s]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const updateExperience = (index: number, patch: Partial<CvExperienceItem>) => {
    setExperiences(experiences.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const updateProject = (index: number, patch: Partial<CvProjectItem>) => {
    setProjects(projects.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const updateCertification = (index: number, patch: Partial<CvCertificationItem>) => {
    setCertifications(certifications.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  // 1. VIEW MODE (Default: Hiển thị thông tin tổng quan Career Profile & CV đã kết nối)
  if (!isEditing) {
    const avatarLetter = (name || 'U').trim().charAt(0).toUpperCase() || 'U';

    return (
      <motion.div
        key="career-overview"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="career-profile-overview-wrap"
      >
        {/* Profile Hero Header Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-left">
            <div className="profile-avatar-circle">
              <span>{avatarLetter}</span>
            </div>
            <div className="profile-hero-titles">
              <div className="profile-hero-name-row">
                <h3 className="profile-hero-name">{name || 'Ứng viên'}</h3>
                <span className="profile-role-badge">{role || 'Chưa cập nhật vị trí'}</span>
              </div>
              <p className="profile-hero-meta">
                <span>{field || 'Chưa chọn ngành nghề'}</span>
                <span className="meta-separator">•</span>
                <span>{exp || 'Chưa chọn kinh nghiệm'}</span>
              </p>
            </div>
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="edit-profile-btn"
              onClick={() => setIsEditing(true)}
              title="Chỉnh sửa thông tin hồ sơ nghề nghiệp"
            >
              <Edit3 size={15} />
              <span>Chỉnh sửa hồ sơ</span>
            </button>
          </div>
        </div>

        {/* 2x2 Details Grid */}
        <div className="profile-details-grid">
          <div className="profile-info-tile">
            <div className="tile-icon-wrap" style={{ background: '#E0F2FE', color: '#0284C7' }}>
              <Briefcase size={18} />
            </div>
            <div className="tile-content">
              <span className="tile-label">Vị trí mục tiêu</span>
              <strong className="tile-value">{role || 'Chưa cập nhật'}</strong>
            </div>
          </div>

          <div className="profile-info-tile">
            <div className="tile-icon-wrap" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              <Layers size={18} />
            </div>
            <div className="tile-content">
              <span className="tile-label">Ngành nghề / Lĩnh vực</span>
              <strong className="tile-value">{field || 'Chưa cập nhật'}</strong>
            </div>
          </div>

          <div className="profile-info-tile">
            <div className="tile-icon-wrap" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Award size={18} />
            </div>
            <div className="tile-content">
              <span className="tile-label">Cấp độ kinh nghiệm</span>
              <strong className="tile-value">{exp || 'Chưa cập nhật'}</strong>
            </div>
          </div>

          <div className="profile-info-tile">
            <div className="tile-icon-wrap" style={{ background: '#F3E8FF', color: '#9333EA' }}>
              <GraduationCap size={18} />
            </div>
            <div className="tile-content">
              <span className="tile-label">Học vấn & Trường ĐH</span>
              <strong className="tile-value">
                {education || 'Chưa cập nhật'}
                {graduationYear ? ` (Tốt nghiệp: ${graduationYear})` : ''}
              </strong>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} color="#0284C7" />
              <h4>Kỹ năng chuyên môn ({skills.length})</h4>
            </div>
            {skills.length > 0 && (
              <span className="skills-sync-tag">Đồng bộ chuẩn ATS</span>
            )}
          </div>

          <div className="profile-skills-pills">
            {skills.length > 0 ? (
              skills.map((s, idx) => (
                <span key={idx} className="overview-skill-badge">
                  {s}
                </span>
              ))
            ) : (
              <p className="empty-hint-text">
                Chưa có kỹ năng chuyên môn nào. Bấm <strong>"Chỉnh sửa hồ sơ"</strong> để thêm hoặc kích hoạt CV để tự động trích xuất.
              </p>
            )}
          </div>
        </div>

        {/* Bio Section */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#0284C7" />
              <h4>Mục tiêu nghề nghiệp & Giới thiệu bản thân</h4>
            </div>
          </div>
          <div className="profile-bio-quote">
            {bio ? (
              <p className="bio-text">"{bio}"</p>
            ) : (
              <p className="empty-hint-text">
                Chưa có phần giới thiệu. Thêm tóm tắt điểm mạnh để AI thiết kế câu hỏi phỏng vấn chuẩn xác nhất.
              </p>
            )}
          </div>
        </div>

        {/* Experiences */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} color="#0284C7" />
              <h4>Kinh nghiệm ({experiences.length})</h4>
            </div>
          </div>
          {experiences.length > 0 ? (
            <ul className="profile-list-plain">
              {experiences.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.title || 'Vị trí'}</strong>
                  {item.org ? ` · ${item.org}` : ''}
                  {item.period ? ` (${item.period})` : ''}
                  {item.description ? <p className="empty-hint-text" style={{ marginTop: 4 }}>{item.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-hint-text">Chưa có kinh nghiệm. Bấm &quot;Chỉnh sửa hồ sơ&quot; để thêm.</p>
          )}
        </div>

        {/* Projects */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={18} color="#0284C7" />
              <h4>Dự án ({projects.length})</h4>
            </div>
          </div>
          {projects.length > 0 ? (
            <ul className="profile-list-plain">
              {projects.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.name || 'Dự án'}</strong>
                  {item.role ? ` · ${item.role}` : ''}
                  {item.period ? ` (${item.period})` : ''}
                  {item.technologies && item.technologies.length > 0 ? (
                    <p className="empty-hint-text" style={{ marginTop: 4 }}>
                      Tech: {item.technologies.join(', ')}
                    </p>
                  ) : null}
                  {item.description ? <p className="empty-hint-text" style={{ marginTop: 4 }}>{item.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-hint-text">Chưa có dự án. Bấm &quot;Chỉnh sửa hồ sơ&quot; để thêm.</p>
          )}
        </div>

        {/* Certifications */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#0284C7" />
              <h4>Chứng chỉ ({certifications.length})</h4>
            </div>
          </div>
          {certifications.length > 0 ? (
            <ul className="profile-list-plain">
              {certifications.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.name || 'Chứng chỉ'}</strong>
                  {item.issuer ? ` · ${item.issuer}` : ''}
                  {item.issueDate ? ` (${item.issueDate})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-hint-text">Chưa có chứng chỉ. Bấm &quot;Chỉnh sửa hồ sơ&quot; để thêm.</p>
          )}
        </div>

        {/* Linked / Confirmed Active CV Section */}
        <div className="profile-section-card linked-cv-card">
          <div className="section-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={18} color="#0284C7" />
              <h4>CV đang kích hoạt phỏng vấn & so khớp</h4>
            </div>
            {activeCv && (
              <span className="linked-cv-status-pill">
                <span className="pulsing-green-dot" />
                Đang kích hoạt
              </span>
            )}
          </div>

          {activeCv ? (
            <div className="linked-cv-body">
              <div className="linked-cv-info-row">
                <div className="linked-cv-name-group">
                  <span className="linked-cv-file-title">{activeCv.title}</span>
                  <span className="linked-cv-subtext">
                    Ngày tải: {activeCv.uploadedAt} • Vị trí: {activeCv.role} • Ngành: {activeCv.field}
                  </span>
                </div>
                <div className="linked-cv-ats-badge">
                  <span>Điểm ATS:</span>
                  <strong>{activeCv.atsScore}/100</strong>
                </div>
              </div>

              {typeof activeCv.atsScore === 'number' && activeCv.atsScore < 50 ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                  }}
                >
                  <div style={{ fontWeight: 750, color: '#92400E', fontSize: '0.9rem' }}>
                    ⚠️ CV nên được cải thiện
                  </div>
                  <p style={{ margin: '6px 0 8px', fontSize: '0.82rem', color: '#78350F' }}>
                    Điểm CV: {activeCv.atsScore}/100 — AI không tự sửa. Bạn có thể xem gợi ý rồi nhờ AI đề xuất (preview trước khi áp dụng).
                  </p>
                  {Array.isArray(activeCv.suggestions) && activeCv.suggestions.length > 0 && (
                    <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: '0.82rem', color: '#78350F' }}>
                      {activeCv.suggestions.slice(0, 5).map((t: string) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className="view-cv-details-btn"
                    onClick={() => {
                      setIsEditing(true);
                      setAutoStartAiPolish(true);
                      setTimeout(() => bioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
                    }}
                  >
                    <span>AI giúp cải thiện</span>
                  </button>
                </div>
              ) : typeof activeCv.atsScore === 'number' && activeCv.atsScore >= 50 ? (
                <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#15803D', fontWeight: 650 }}>
                  ✓ CV có thể sử dụng
                </p>
              ) : null}

              <div className="linked-cv-actions-row">
                {onOpenCvDetail && (
                  <button
                    type="button"
                    className="view-cv-details-btn"
                    onClick={() => onOpenCvDetail(activeCv)}
                  >
                    <Eye size={14} />
                    <span>Xem chi tiết CV</span>
                  </button>
                )}
                {onSwitchToCvTab && (
                  <button
                    type="button"
                    className="switch-cv-btn"
                    onClick={onSwitchToCvTab}
                  >
                    <FolderOpen size={14} />
                    <span>Quản lý Kho CV</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-linked-cv-box">
              <p>Chưa có CV nào được kích hoạt. Hãy tải lên CV để hồ sơ đạt độ sẵn sàng cao nhất.</p>
              {onSwitchToCvTab && (
                <button
                  type="button"
                  className="switch-cv-btn primary"
                  onClick={onSwitchToCvTab}
                >
                  <span>Mở Kho CV để tải lên</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom CTA Bar */}
        <div className="profile-overview-footer">
          <button
            type="button"
            className="footer-edit-btn"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={15} />
            <span>Chỉnh sửa hồ sơ</span>
          </button>

          {onNavigateInterview && (
            <button
              type="button"
              className="footer-interview-btn"
              onClick={onNavigateInterview}
            >
              <Video size={16} />
              <span>Vào phỏng vấn AI ngay</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // 2. EDIT MODE (Khi user bấm "Chỉnh sửa hồ sơ")
  return (
    <motion.form
      id="manual-profile-form"
      key="manual-tab-edit"
      onSubmit={onSave}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="career-profile-form"
    >
      {/* Edit Mode Top Indicator */}
      <div className="edit-mode-header-bar">
        <div className="edit-mode-title">
          <Edit3 size={17} color="#0284C7" />
          <span>Chỉnh sửa thông tin Hồ sơ nghề nghiệp</span>
        </div>
        <button
          type="button"
          className="cancel-edit-btn"
          onClick={() => setIsEditing(false)}
        >
          <X size={14} />
          <span>Quay lại xem hồ sơ</span>
        </button>
      </div>

      {/* Row 1: Full Name & Target Role */}
      <div className="form-two-col">
        <div className="form-group">
          <label className="form-label">
            <User size={15} />
            <span>Họ và tên ứng viên</span>
            <span className="required-dot">*</span>
          </label>
          <input
            ref={nameInputRef}
            type="text"
            className="custom-form-input"
            placeholder="VD: Nguyễn Văn A"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <Briefcase size={15} />
            <span>Vị trí ứng tuyển mục tiêu</span>
            <span className="required-dot">*</span>
          </label>
          {suggestedRoles.length > 0 && !roleModeCustom ? (
            <select
              className="custom-form-input"
              value={roleInCatalog ? role : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === CUSTOM_ROLE_OPTION) {
                  setRoleModeCustom(true);
                  return;
                }
                setRole(v);
              }}
              required
            >
              <option value="" disabled>
                Chọn vị trí phù hợp với ngành…
              </option>
              {suggestedRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value={CUSTOM_ROLE_OPTION}>{CUSTOM_ROLE_OPTION}</option>
            </select>
          ) : (
            <div>
              <input
                type="text"
                className="custom-form-input"
                placeholder="Nhập vị trí tùy chỉnh…"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              />
              {suggestedRoles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRoleModeCustom(false)}
                  style={{
                    marginTop: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#0284C7',
                    fontSize: '0.78rem',
                    fontWeight: 650,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  ← Chọn từ danh sách gợi ý
                </button>
              )}
            </div>
          )}
          {showRoleMismatchWarning && (
            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#B45309' }}>
              Vị trí hiện tại không nằm trong gợi ý của ngành «{resolveCatalogField(field)}». Dữ liệu được giữ nguyên — bạn có thể chọn lại hoặc giữ tùy chỉnh.
            </p>
          )}
          {suggestedRoles.length === 0 && (
            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
              Chọn ngành nghề trước để xem vị trí gợi ý, hoặc nhập tùy chỉnh.
            </p>
          )}
        </div>
      </div>

      {(setWizardDisplayName || setWizardTemplateId) && (
        <div className="form-two-col" style={{ marginTop: 12 }}>
          {setWizardDisplayName && (
            <div className="form-group">
              <label className="form-label">
                <FileText size={15} />
                <span>Tên CV khi tạo mới</span>
              </label>
              <input
                type="text"
                className="custom-form-input"
                placeholder="VD: CV Backend Developer"
                value={wizardDisplayName}
                onChange={(e) => setWizardDisplayName(e.target.value)}
                maxLength={120}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                Để trống sẽ lấy theo vị trí ứng tuyển.
              </p>
            </div>
          )}
          {setWizardTemplateId && cvTemplates.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                <Layers size={15} />
                <span>Mẫu CV (Template)</span>
              </label>
              <select
                className="custom-form-input"
                value={wizardTemplateId}
                onChange={(e) => setWizardTemplateId(e.target.value)}
              >
                <option value="">Modern 01 (mặc định)</option>
                {sortedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isSystemTemplate ? '' : ' (của tôi)'}
                  </option>
                ))}
              </select>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                Gợi ý mẫu theo ngành (layout không bị AI đổi). Bạn vẫn chọn bất kỳ mẫu nào.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Row 2: Field & Experience */}
      <div className="form-two-col">
        <div className="form-group" ref={fieldWrapperRef} style={{ position: 'relative' }}>
          <label className="form-label">
            <Layers size={15} />
            <span>Ngành nghề / Lĩnh vực (Career Field)</span>
            <span className="required-dot">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="custom-form-input"
              placeholder="Nhập hoặc chọn ngành nghề..."
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setFieldDropdownOpen(true);
              }}
              onFocus={() => setFieldDropdownOpen(true)}
              autoComplete="off"
              required
              style={{ paddingRight: '2.2rem' }}
            />
            <button
              type="button"
              onClick={() => setFieldDropdownOpen((prev) => !prev)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              tabIndex={-1}
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {fieldDropdownOpen && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                zIndex: 60,
                maxHeight: '220px',
                overflowY: 'auto',
                padding: '6px 0',
                margin: '4px 0 0',
                listStyle: 'none',
              }}
            >
              {CAREER_FIELD_OPTIONS.filter((item) => !field.trim() || item.toLowerCase().includes(field.trim().toLowerCase())).map((item) => (
                <li
                  key={item}
                  onClick={() => {
                    setField(item);
                    setFieldDropdownOpen(false);
                    // Do NOT auto-change position — warn only if mismatch.
                    if (role.trim() && !isRoleSuggestedForField(role, item)) {
                      setRoleModeCustom(true);
                    } else {
                      setRoleModeCustom(false);
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: '#0F172A',
                    background: field === item ? '#EFF6FF' : 'transparent',
                    fontWeight: field === item ? 600 : 400,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = field === item ? '#EFF6FF' : 'transparent')}
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group" ref={expWrapperRef} style={{ position: 'relative' }}>
          <label className="form-label">
            <Award size={15} />
            <span>Số năm kinh nghiệm</span>
            <span className="required-dot">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="custom-form-input"
              placeholder="Nhập hoặc chọn kinh nghiệm..."
              value={exp}
              onChange={(e) => {
                setExp(e.target.value);
                setExpDropdownOpen(true);
              }}
              onFocus={() => setExpDropdownOpen(true)}
              autoComplete="off"
              required
              style={{ paddingRight: '2.2rem' }}
            />
            <button
              type="button"
              onClick={() => setExpDropdownOpen((prev) => !prev)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              tabIndex={-1}
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {expDropdownOpen && (
            <ul
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                zIndex: 60,
                maxHeight: '220px',
                overflowY: 'auto',
                padding: '6px 0',
                margin: '4px 0 0',
                listStyle: 'none',
              }}
            >
              {EXP_OPTIONS.filter((item) => !exp.trim() || item.toLowerCase().includes(exp.trim().toLowerCase())).map((item) => (
                <li
                  key={item}
                  onClick={() => {
                    setExp(item);
                    setExpDropdownOpen(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    color: '#0F172A',
                    background: exp === item ? '#EFF6FF' : 'transparent',
                    fontWeight: exp === item ? 600 : 400,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = exp === item ? '#EFF6FF' : 'transparent')}
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Row 3: Education & Graduation Year */}
      <div className="form-two-col">
        <div className="form-group" style={{ flex: 1.8 }}>
          <label className="form-label">
            <GraduationCap size={15} />
            <span>Trình độ học vấn & Trường ĐH</span>
          </label>
          <input
            type="text"
            className="custom-form-input"
            placeholder="VD: Đại học Bách Khoa TP.HCM / ĐH Kinh Tế..."
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">
            <Award size={15} />
            <span>Năm tốt nghiệp</span>
          </label>
          <input
            type="number"
            min="1980"
            max="2100"
            className="custom-form-input"
            placeholder="2026"
            value={graduationYear}
            onChange={(e) => setGraduationYear(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      {/* Row 4: Skills Tag Manager */}
      <div className="form-group">
        <label className="form-label">
          <Cpu size={15} />
          <span>Kỹ năng chuyên môn chính ({skills.length})</span>
        </label>

        <div className="skills-tags-container">
          {skills.map((skill) => (
            <span key={skill} className="skill-pill-item">
              {skill}
              <button
                type="button"
                className="skill-remove-btn"
                onClick={() => handleRemoveSkill(skill)}
                title="Xóa kỹ năng"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          <div className="skill-add-wrapper">
            <input
              type="text"
              className="skill-inline-input"
              placeholder="+ Nhập kỹ năng rồi nhấn Enter..."
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
            />
            {newSkillInput.trim() && (
              <button
                type="button"
                className="skill-add-btn"
                onClick={() => handleAddSkill()}
              >
                <Plus size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Experiences editor */}
      <div className="form-group">
        <label className="form-label">
          <Briefcase size={15} />
          <span>Kinh nghiệm làm việc ({experiences.length})</span>
        </label>
        {experiences.map((item, idx) => (
          <div key={idx} className="profile-list-editor-card">
            <div className="form-two-col">
              <input
                className="custom-form-input"
                placeholder="Vị trí / Title"
                value={item.title || ''}
                onChange={(e) => updateExperience(idx, { title: e.target.value })}
              />
              <input
                className="custom-form-input"
                placeholder="Công ty / Org"
                value={item.org || ''}
                onChange={(e) => updateExperience(idx, { org: e.target.value })}
              />
            </div>
            <input
              className="custom-form-input"
              placeholder="Thời gian (VD: 2023 - 2024)"
              value={item.period || ''}
              onChange={(e) => updateExperience(idx, { period: e.target.value })}
              style={{ marginTop: 8 }}
            />
            <textarea
              className="custom-form-textarea"
              rows={2}
              placeholder="Mô tả ngắn"
              value={item.description || ''}
              onChange={(e) => updateExperience(idx, { description: e.target.value })}
              style={{ marginTop: 8 }}
            />
            <button
              type="button"
              className="cancel-edit-btn"
              style={{ marginTop: 8 }}
              onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
            >
              <X size={14} />
              <span>Xóa</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          className="preview-cv-btn"
          onClick={() => setExperiences([...experiences, { title: '', org: '', period: '', description: '' }])}
          disabled={experiences.length >= 20}
        >
          <Plus size={14} />
          <span>Thêm kinh nghiệm</span>
        </button>
      </div>

      {/* Projects editor */}
      <div className="form-group">
        <label className="form-label">
          <FolderOpen size={15} />
          <span>Dự án ({projects.length})</span>
        </label>
        {projects.map((item, idx) => (
          <div key={idx} className="profile-list-editor-card">
            <div className="form-two-col">
              <input
                className="custom-form-input"
                placeholder="Tên dự án"
                value={item.name || ''}
                onChange={(e) => updateProject(idx, { name: e.target.value })}
              />
              <input
                className="custom-form-input"
                placeholder="Vai trò"
                value={item.role || ''}
                onChange={(e) => updateProject(idx, { role: e.target.value })}
              />
            </div>
            <div className="form-two-col" style={{ marginTop: 8 }}>
              <input
                className="custom-form-input"
                placeholder="Thời gian"
                value={item.period || ''}
                onChange={(e) => updateProject(idx, { period: e.target.value })}
              />
              <input
                className="custom-form-input"
                placeholder="URL (nếu có)"
                value={item.url || ''}
                onChange={(e) => updateProject(idx, { url: e.target.value })}
              />
            </div>
            <input
              className="custom-form-input"
              placeholder="Công nghệ (cách nhau bởi dấu phẩy)"
              value={(item.technologies || []).join(', ')}
              onChange={(e) =>
                updateProject(idx, {
                  technologies: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              style={{ marginTop: 8 }}
            />
            <textarea
              className="custom-form-textarea"
              rows={2}
              placeholder="Mô tả dự án"
              value={item.description || ''}
              onChange={(e) => updateProject(idx, { description: e.target.value })}
              style={{ marginTop: 8 }}
            />
            <button
              type="button"
              className="cancel-edit-btn"
              style={{ marginTop: 8 }}
              onClick={() => setProjects(projects.filter((_, i) => i !== idx))}
            >
              <X size={14} />
              <span>Xóa</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          className="preview-cv-btn"
          onClick={() =>
            setProjects([...projects, { name: '', description: '', role: '', technologies: [], url: '', period: '' }])
          }
          disabled={projects.length >= 20}
        >
          <Plus size={14} />
          <span>Thêm dự án</span>
        </button>
      </div>

      {/* Certifications editor */}
      <div className="form-group">
        <label className="form-label">
          <Award size={15} />
          <span>Chứng chỉ ({certifications.length})</span>
        </label>
        {certifications.map((item, idx) => (
          <div key={idx} className="profile-list-editor-card">
            <div className="form-two-col">
              <input
                className="custom-form-input"
                placeholder="Tên chứng chỉ"
                value={item.name || ''}
                onChange={(e) => updateCertification(idx, { name: e.target.value })}
              />
              <input
                className="custom-form-input"
                placeholder="Tổ chức cấp"
                value={item.issuer || ''}
                onChange={(e) => updateCertification(idx, { issuer: e.target.value })}
              />
            </div>
            <div className="form-two-col" style={{ marginTop: 8 }}>
              <input
                className="custom-form-input"
                placeholder="Ngày cấp"
                value={item.issueDate || ''}
                onChange={(e) => updateCertification(idx, { issueDate: e.target.value })}
              />
              <input
                className="custom-form-input"
                placeholder="Hết hạn (nếu có)"
                value={item.expiryDate || ''}
                onChange={(e) => updateCertification(idx, { expiryDate: e.target.value })}
              />
            </div>
            <div className="form-two-col" style={{ marginTop: 8 }}>
              <input
                className="custom-form-input"
                placeholder="Credential ID"
                value={item.credentialId || ''}
                onChange={(e) => updateCertification(idx, { credentialId: e.target.value })}
              />
              <input
                className="custom-form-input"
                placeholder="Credential URL"
                value={item.credentialUrl || ''}
                onChange={(e) => updateCertification(idx, { credentialUrl: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="cancel-edit-btn"
              style={{ marginTop: 8 }}
              onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
            >
              <X size={14} />
              <span>Xóa</span>
            </button>
          </div>
        ))}
        <button
          type="button"
          className="preview-cv-btn"
          onClick={() =>
            setCertifications([
              ...certifications,
              { name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' },
            ])
          }
          disabled={certifications.length >= 20}
        >
          <Plus size={14} />
          <span>Thêm chứng chỉ</span>
        </button>
      </div>

      {/* Row 5: Bio / Career Goals */}
      <div className="form-group" ref={bioSectionRef}>
        <label className="form-label">
          <FileText size={15} />
          <span>Mục tiêu nghề nghiệp & Giới thiệu ngắn</span>
        </label>
        <textarea
          className="custom-form-textarea"
          rows={4}
          placeholder="Viết ý của bạn (có thể ngắn). Sau đó dùng AI diễn đạt — xem preview rồi mới chấp nhận..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <AiTextAssistBar
          value={bio}
          onChange={setBio}
          field="bio"
          context={[role, field, skills.slice(0, 12).join(', ')].filter(Boolean).join(' · ')}
          disabled={saving}
          autoStartPolish={autoStartAiPolish}
          onAutoStartConsumed={() => setAutoStartAiPolish(false)}
        />
      </div>

      {/* Form Action Footer */}
      <div className="profile-form-footer">
        <div className="footer-status-left">
          {savedSuccess ? (
            <motion.div
              className="save-success-indicator"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <CheckCircle2 size={16} />
              <span>Đã lưu thành công Hồ sơ nghề nghiệp (Career Profile)!</span>
            </motion.div>
          ) : (
            <span className="footer-hint-text">
              💡 Dữ liệu hồ sơ nghề nghiệp sẽ được đồng bộ trực tiếp với hệ thống câu hỏi phỏng vấn AI.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="preview-cv-btn"
            style={{ color: '#64748B', borderColor: '#CBD5E1', background: '#FFFFFF' }}
            title="Hủy bỏ và quay lại xem hồ sơ"
          >
            <X size={15} />
            <span>Hủy bỏ</span>
          </button>

          {onCreateCv && (
            <button
              type="button"
              className="preview-cv-btn"
              disabled={saving || creatingCv}
              onClick={() => void onCreateCv()}
              title="Tạo CvDocument mới từ hồ sơ (DisplayName + Template). Không chạy khi chỉ Lưu hồ sơ."
            >
              {creatingCv ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Đang tạo CV...</span>
                </>
              ) : (
                <>
                  <FileText size={15} />
                  <span>Tạo CV</span>
                </>
              )}
            </button>
          )}

          <button
            type="submit"
            className="save-profile-btn"
            disabled={saving || creatingCv}
            title="Chỉ cập nhật Career Profile — không tạo CV mới"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang cập nhật...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Lưu hồ sơ nghề nghiệp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );
};
