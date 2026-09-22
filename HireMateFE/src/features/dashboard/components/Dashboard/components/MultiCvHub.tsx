import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  Plus,
  X,
  UploadCloud,
  Camera,
  Loader2,
  FileCheck,
  Video,
  Target,
  Eye,
  FileText,
  Check,
  Download,
  Trash2,
  Pencil,
  LayoutTemplate,
  BookmarkPlus,
} from 'lucide-react';
import { UserCvCard } from '../Dashboard';
import type { CvTemplateDto } from '../../../../../shared/services/cv.service';
import './MultiCvHub.css';

interface MultiCvHubProps {
  userCvs: UserCvCard[];
  activeCv?: UserCvCard;
  otherCvs: UserCvCard[];
  toastMsg: string | null;
  showAddCvForm: boolean;
  setShowAddCvForm: React.Dispatch<React.SetStateAction<boolean>>;
  isScanning: boolean;
  scanProgress: number;
  scanStatusText: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, displayName?: string) => void;
  onSelectActiveCv: (cv: UserCvCard) => void | Promise<void>;
  onDeleteCv: (id: string, title: string) => void | Promise<void>;
  onOpenDetailModal: (cv: UserCvCard) => void;
  onNavigateInterview: () => void;
  onSwitchToMatch: (cvId: string) => void;
  onDownloadCv?: (cv: UserCvCard) => void;
  templates?: CvTemplateDto[];
  onRenameCv?: (cv: UserCvCard, displayName: string) => void | Promise<void>;
  onChangeCvTemplate?: (cv: UserCvCard, templateId: string) => void | Promise<void>;
  onSaveAsTemplate?: (cv: UserCvCard) => void | Promise<void>;
}

export const MultiCvHub: React.FC<MultiCvHubProps> = ({
  userCvs,
  activeCv,
  otherCvs,
  toastMsg,
  showAddCvForm,
  setShowAddCvForm,
  isScanning,
  scanProgress,
  scanStatusText,
  fileInputRef,
  onFileUpload,
  onSelectActiveCv,
  onDeleteCv,
  onOpenDetailModal,
  onNavigateInterview,
  onSwitchToMatch,
  onDownloadCv,
  templates = [],
  onRenameCv,
  onChangeCvTemplate,
  onSaveAsTemplate,
}) => {
  const [uploadDisplayName, setUploadDisplayName] = useState('');
  const [renameTarget, setRenameTarget] = useState<UserCvCard | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [templateTarget, setTemplateTarget] = useState<UserCvCard | null>(null);
  const [pickedTemplateId, setPickedTemplateId] = useState('');

  const openRename = (cv: UserCvCard) => {
    setRenameTarget(cv);
    setRenameValue(cv.title || '');
  };

  const submitRename = async () => {
    if (!renameTarget || !onRenameCv) return;
    await onRenameCv(renameTarget, renameValue);
    setRenameTarget(null);
  };

  const openTemplatePicker = (cv: UserCvCard) => {
    setTemplateTarget(cv);
    setPickedTemplateId(cv.templateId || '');
  };

  const submitTemplateChange = async () => {
    if (!templateTarget || !pickedTemplateId || !onChangeCvTemplate) return;
    await onChangeCvTemplate(templateTarget, pickedTemplateId);
    setTemplateTarget(null);
  };

  const renderMetaLine = (cv: UserCvCard) => (
    <div className="cv-meta-line">
      <span>{cv.uploadedAt}</span>
      <span className="cv-meta-sep">|</span>
      <span>{cv.role}</span>
      <span className="cv-meta-sep">|</span>
      <span>{cv.field}</span>
    </div>
  );

  const renderTemplateLine = (cv: UserCvCard) =>
    cv.templateName ? (
      <div className="cv-template-line">
        <LayoutTemplate size={13} />
        <span>Mẫu: {cv.templateName}</span>
      </div>
    ) : null;

  const renderSecondaryActions = (cv: UserCvCard, compact = false) => (
    <div className={compact ? 'cv-item-secondary-btns' : 'cv-extra-actions'}>
      <button
        type="button"
        className={compact ? 'icon-detail-btn' : 'action-btn-detail'}
        onClick={() => onOpenDetailModal(cv)}
        title="Xem chi tiết / Phân tích"
      >
        <Eye size={compact ? 15 : 16} />
        {!compact && <span>Xem / Phân tích</span>}
      </button>
      {onRenameCv && (
        <button
          type="button"
          className={compact ? 'icon-detail-btn' : 'action-btn-detail'}
          onClick={() => openRename(cv)}
          title="Đổi tên hiển thị"
        >
          <Pencil size={compact ? 15 : 16} />
          {!compact && <span>Đổi tên</span>}
        </button>
      )}
      {onChangeCvTemplate && templates.length > 0 && (
        <button
          type="button"
          className={compact ? 'icon-detail-btn' : 'action-btn-detail'}
          onClick={() => openTemplatePicker(cv)}
          title="Đổi mẫu CV"
        >
          <LayoutTemplate size={compact ? 15 : 16} />
          {!compact && <span>Đổi mẫu</span>}
        </button>
      )}
      {onSaveAsTemplate && (
        <button
          type="button"
          className={compact ? 'icon-detail-btn' : 'action-btn-detail'}
          onClick={() => onSaveAsTemplate(cv)}
          title="Lưu làm mẫu tùy chỉnh"
        >
          <BookmarkPlus size={compact ? 15 : 16} />
          {!compact && <span>Lưu làm mẫu</span>}
        </button>
      )}
      <button
        type="button"
        className={compact ? 'icon-delete-btn' : 'action-btn-detail icon-delete-btn'}
        onClick={() => onDeleteCv(cv.id, cv.title)}
        title="Xóa CV"
      >
        <Trash2 size={compact ? 15 : 16} />
        {!compact && <span>Xóa</span>}
      </button>
    </div>
  );

  return (
    <motion.div
      key="scan-tab"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="multi-cv-hub-wrapper"
    >
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            className="multi-cv-toast"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="multi-cv-header-row">
        <div>
          <h3 className="multi-cv-section-title">
            <Folder size={19} color="#0284C7" />
            <span>Kho CV ứng viên ({userCvs.length} bản ghi)</span>
          </h3>
          <p className="multi-cv-section-desc">
            Hệ thống hỗ trợ lưu trữ nhiều CV cho từng vị trí khác nhau (Frontend, Backend, Data, PM...). Chọn 1 CV để làm hồ sơ phỏng vấn AI và so khớp JD.
          </p>
        </div>

        <button
          type="button"
          className="add-cv-toggle-btn"
          onClick={() => setShowAddCvForm((prev) => !prev)}
        >
          {showAddCvForm ? <X size={15} /> : <Plus size={15} />}
          <span>{showAddCvForm ? 'Đóng form tải lên' : '+ Tải lên CV mới'}</span>
        </button>
      </div>

      <AnimatePresence>
        {showAddCvForm && (
          <motion.div
            className="add-cv-collapsible-box"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="cv-upload-name-field" onClick={(e) => e.stopPropagation()}>
              <label htmlFor="cv-upload-display-name">
                Tên CV <span className="required-look">*</span>
              </label>
              <input
                id="cv-upload-display-name"
                type="text"
                className="cv-upload-name-input"
                placeholder="VD: CV Backend Developer — Fresher 2026"
                value={uploadDisplayName}
                onChange={(e) => setUploadDisplayName(e.target.value)}
                maxLength={120}
              />
              <p className="cv-upload-name-hint">
                Để trống vẫn tải lên được — hệ thống sẽ lấy tên từ file.
              </p>
            </div>

            <div
              className="cv-upload-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  onFileUpload(e, uploadDisplayName.trim() || undefined);
                  setUploadDisplayName('');
                }}
                accept=".pdf,.docx,.doc"
                style={{ display: 'none' }}
              />
              <div className="dropzone-icon-circle">
                <UploadCloud size={28} />
              </div>
              <div className="dropzone-text-group">
                <div className="dropzone-title">Tải lên thêm CV mới (.PDF, .DOCX)</div>
                <div className="dropzone-subtitle">
                  Tự động phân tích ATS và lưu thành một CV độc lập trong kho (không ghi đè các CV đã lưu khác).
                </div>
              </div>
              <button type="button" className="choose-file-btn">
                <Camera size={15} />
                <span>Chọn file từ máy</span>
              </button>
            </div>

            {isScanning && (
              <motion.div
                className="scanning-progress-box"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ marginTop: '16px' }}
              >
                <div className="scanning-status-text">
                  <Loader2 size={16} className="animate-spin" color="#03BFFF" />
                  <span>{scanStatusText}</span>
                </div>
                <div className="scanning-progress-track">
                  <motion.div
                    className="scanning-progress-bar"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {userCvs.length === 0 && !isScanning && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#F8FAFC',
            borderRadius: '16px',
            border: '2px dashed #CBD5E1',
            margin: '16px 0',
          }}
        >
          <FileText size={42} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h4 style={{ color: '#334155', fontSize: '1rem', fontWeight: 700, margin: '0 0 6px' }}>
            Chưa có CV nào trong kho
          </h4>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0 0 16px' }}>
            Tải lên CV đầu tiên của bạn để bắt đầu luyện phỏng vấn AI và so khớp JD.
          </p>
          <button
            type="button"
            className="add-cv-toggle-btn"
            onClick={() => setShowAddCvForm(true)}
            style={{ margin: '0 auto' }}
          >
            <Plus size={15} />
            <span>Tải lên CV ngay</span>
          </button>
        </div>
      )}

      {activeCv ? (
        <div className="active-cv-spotlight-card">
          <div className="active-cv-top-bar">
            <div className="active-badge-pill">
              <span className="pulsing-green-dot" />
              <span>CV đang kích hoạt</span>
            </div>
            <div className="active-cv-ats-score">
              <span>Điểm ATS:</span>
              <strong>{activeCv.atsScore}/100</strong>
            </div>
          </div>

          <div className="active-cv-body">
            <div className="active-cv-info-left">
              <div className="active-cv-file-title">
                <FileCheck size={22} color="#0284C7" />
                <h4>{activeCv.title}</h4>
              </div>

              {renderMetaLine(activeCv)}
              {renderTemplateLine(activeCv)}

              {activeCv.filename && activeCv.filename !== activeCv.title && (
                <div className="cv-filename-sub">File: {activeCv.filename}</div>
              )}

              <div className="active-cv-skills-row">
                <span className="skills-row-label">Kỹ năng chính:</span>
                <div className="skills-tags-mini">
                  {activeCv.skills.map((s) => (
                    <span key={s} className="mini-skill-tag">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {Array.isArray(activeCv.suggestions) && activeCv.suggestions.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: activeCv.parseSucceeded ? '#F0FDF4' : '#FFFBEB',
                    border: `1px solid ${activeCv.parseSucceeded ? '#BBF7D0' : '#FDE68A'}`,
                    fontSize: '0.82rem',
                    color: '#334155',
                  }}
                >
                  <strong style={{ display: 'block', marginBottom: 4, color: '#0F172A' }}>
                    {activeCv.parseSucceeded ? 'Gợi ý tối ưu CV' : 'Cần sửa trước khi phỏng vấn'}
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {activeCv.suggestions.slice(0, 4).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => onOpenDetailModal(activeCv)}
                    style={{
                      marginTop: 8,
                      border: 'none',
                      background: 'transparent',
                      color: '#0284C7',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.82rem',
                    }}
                  >
                    Xem đầy đủ điểm ATS & gợi ý →
                  </button>
                </div>
              )}
            </div>

            <div className="active-cv-actions-right">
              <button
                type="button"
                className="action-btn-interview"
                onClick={onNavigateInterview}
                title="Bắt đầu buổi phỏng vấn AI với CV này"
              >
                <Video size={16} />
                <span>Luyện phỏng vấn</span>
              </button>

              {onDownloadCv && (
                <button
                  type="button"
                  className="action-btn-detail"
                  onClick={() => onDownloadCv(activeCv)}
                  title="Tải CV về máy (PDF)"
                >
                  <Download size={16} />
                  <span>Tải CV PDF</span>
                </button>
              )}

              <button
                type="button"
                className="action-btn-match"
                onClick={() => onSwitchToMatch(activeCv.id)}
                title="So khớp JD với CV này"
              >
                <Target size={16} />
                <span>So khớp JD</span>
              </button>

              {renderSecondaryActions(activeCv, false)}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-other-cvs-box" style={{ marginBottom: 16 }}>
          <FileText size={30} color="#94A3B8" />
          <p>
            <strong>No Active CV</strong> — chưa có CV được kích hoạt trên server.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Tải CV lên và bấm &quot;Kích hoạt&quot; để chọn hồ sơ phỏng vấn.
          </p>
        </div>
      )}

      <div className="other-cvs-section">
        <div className="other-cvs-header">
          <h4>Các CV khác trong kho ({otherCvs.length})</h4>
          <span className="other-cvs-subhint">
            Nhấn &quot;Kích hoạt&quot; để dùng CV này cho phỏng vấn &amp; so khớp JD.
          </span>
        </div>

        {otherCvs.length === 0 ? (
          <div className="empty-other-cvs-box">
            <FileText size={30} color="#94A3B8" />
            <p>Chưa có CV phụ nào khác trong kho của bạn.</p>
            <button
              type="button"
              className="empty-add-btn"
              onClick={() => setShowAddCvForm(true)}
            >
              + Tải lên thêm CV khác
            </button>
          </div>
        ) : (
          <div className="multi-cv-cards-grid">
            {otherCvs.map((cv) => (
              <div key={cv.id} className="cv-item-card">
                <div className="cv-item-header">
                  <div className="cv-item-title-row">
                    <FileText size={17} color="#64748B" />
                    <span className="cv-item-title" title={cv.title}>
                      {cv.title}
                    </span>
                  </div>
                  <div className="cv-item-score-badge">{cv.atsScore}/100 ATS</div>
                </div>

                {renderMetaLine(cv)}
                {renderTemplateLine(cv)}

                <div className="cv-item-skills-preview">
                  {cv.skills.slice(0, 4).map((s) => (
                    <span key={s} className="cv-mini-chip">
                      {s}
                    </span>
                  ))}
                  {cv.skills.length > 4 && (
                    <span className="cv-mini-chip-more">+{cv.skills.length - 4}</span>
                  )}
                </div>

                <div className="cv-item-footer-actions">
                  <button
                    type="button"
                    className="set-active-cv-btn"
                    onClick={() => onSelectActiveCv(cv)}
                    title="Kích hoạt CV này làm hồ sơ phỏng vấn chính"
                  >
                    <Check size={14} />
                    <span>Kích hoạt</span>
                  </button>

                  {renderSecondaryActions(cv, true)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename modal */}
      <AnimatePresence>
        {renameTarget && (
          <motion.div
            className="cv-hub-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRenameTarget(null)}
          >
            <motion.div
              className="cv-hub-modal"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4>Đổi tên CV</h4>
              <p className="cv-hub-modal-hint">Chỉ đổi tên hiển thị — không đổi file gốc.</p>
              <input
                type="text"
                className="cv-upload-name-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={120}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename();
                }}
              />
              <div className="cv-hub-modal-actions">
                <button type="button" className="action-btn-detail" onClick={() => setRenameTarget(null)}>
                  Hủy
                </button>
                <button type="button" className="set-active-cv-btn" onClick={submitRename}>
                  Lưu tên
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template picker modal */}
      <AnimatePresence>
        {templateTarget && (
          <motion.div
            className="cv-hub-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTemplateTarget(null)}
          >
            <motion.div
              className="cv-hub-modal"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4>Đổi mẫu CV</h4>
              <p className="cv-hub-modal-hint">
                Chọn layout cho «{templateTarget.title}». Nội dung CV giữ nguyên.
              </p>
              <select
                className="cv-upload-name-input"
                value={pickedTemplateId}
                onChange={(e) => setPickedTemplateId(e.target.value)}
              >
                <option value="">— Chọn mẫu —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isSystemTemplate ? ' (hệ thống)' : ' (của bạn)'}
                  </option>
                ))}
              </select>
              <div className="cv-hub-modal-actions">
                <button type="button" className="action-btn-detail" onClick={() => setTemplateTarget(null)}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="set-active-cv-btn"
                  disabled={!pickedTemplateId}
                  onClick={submitTemplateChange}
                >
                  Áp dụng mẫu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
