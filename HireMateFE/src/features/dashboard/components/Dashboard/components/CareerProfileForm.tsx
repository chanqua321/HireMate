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
} from 'lucide-react';
import './CareerProfileForm.css';

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
  saving: boolean;
  savedSuccess: boolean;
  onSave: (e: React.FormEvent) => void;
  onOpenCheckCvModal: () => void;
}

const FIELD_OPTIONS = [
  'Công nghệ thông tin',
  'Tài chính - Ngân hàng (Fintech)',
  'Thương mại điện tử (E-Commerce)',
  'Marketing & Truyền thông',
  'Quản trị Nhân sự & Tuyển dụng',
  'Kinh doanh & Bán lẻ (Sales / Retail)',
  'Thiết kế Đồ họa / UI-UX',
  'Logistics & Chuỗi cung ứng',
  'Giáo dục & Đào tạo',
  'Y tế & Chăm sóc sức khỏe',
  'Khách sạn & Du lịch',
  'Bất động sản & Xây dựng',
  'Kỹ thuật & Cơ khí',
];

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
  saving,
  savedSuccess,
  onSave,
  onOpenCheckCvModal,
}) => {
  const [newSkillInput, setNewSkillInput] = useState('');
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [expDropdownOpen, setExpDropdownOpen] = useState(false);

  const fieldWrapperRef = useRef<HTMLDivElement>(null);
  const expWrapperRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <motion.form
      id="manual-profile-form"
      key="manual-tab"
      onSubmit={onSave}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="career-profile-form"
    >
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
          <input
            type="text"
            className="custom-form-input"
            placeholder="VD: Chuyên viên Phân tích, Frontend Developer..."
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          />
        </div>
      </div>

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
              {FIELD_OPTIONS.filter((item) => !field.trim() || item.toLowerCase().includes(field.trim().toLowerCase())).map((item) => (
                <li
                  key={item}
                  onClick={() => {
                    setField(item);
                    setFieldDropdownOpen(false);
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

      {/* Row 5: Bio / Career Goals */}
      <div className="form-group">
        <label className="form-label">
          <FileText size={15} />
          <span>Mục tiêu nghề nghiệp & Giới thiệu ngắn</span>
        </label>
        <textarea
          className="custom-form-textarea"
          rows={3}
          placeholder="Tóm tắt ngắn về điểm mạnh, kinh nghiệm nổi bật hoặc mục tiêu ứng tuyển của bạn..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(name.trim() || role.trim() || field.trim()) && (
            <button
              type="button"
              onClick={onOpenCheckCvModal}
              className="preview-cv-btn"
              title="Xem lại thông tin hồ sơ đã tạo"
            >
              <Eye size={16} />
              <span>Xem lại hồ sơ</span>
            </button>
          )}

          <button
            type="submit"
            className="save-profile-btn"
            disabled={saving}
            title="Lưu và cập nhật hồ sơ ứng viên"
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
