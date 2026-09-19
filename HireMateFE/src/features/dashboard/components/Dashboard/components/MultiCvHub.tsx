import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  Plus,
  X,
  UploadCloud,
  Camera,
  Sparkles,
  Loader2,
  FileCheck,
  Briefcase,
  Layers,
  Award,
  Video,
  Target,
  Eye,
  FileText,
  Check,
  LayoutGrid,
  List,
  Search,
} from 'lucide-react';
import { UserCvCard } from '../Dashboard';
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
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectActiveCv: (cv: UserCvCard) => void;
  onDeleteCv: (id: string, title: string) => void;
  onOpenDetailModal: (cv: UserCvCard) => void;
  onNavigateInterview: () => void;
  onSwitchToMatch: (cvId: string) => void;
  onSwitchToAnalyze?: (cvId: string) => void;
  onOpenWizardModal?: () => void;
  isFreeTier?: boolean;
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
  onSwitchToAnalyze,
  onOpenWizardModal,
  isFreeTier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cvViewMode, setCvViewMode] = useState<'grid' | 'list'>('grid');

  const filteredOtherCvs = otherCvs.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      c.role.toLowerCase().includes(term) ||
      c.field.toLowerCase().includes(term)
    );
  });

  return (
    <motion.div
      key="scan-tab"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="multi-cv-hub-wrapper"
    >
      {/* Toast Alert Feedback */}
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

      {/* Section Header */}
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

        <div>
          <button
            type="button"
            className="add-cv-toggle-btn"
            onClick={() => setShowAddCvForm((prev) => !prev)}
          >
            {showAddCvForm ? <X size={15} /> : <Plus size={15} />}
            <span>{showAddCvForm ? 'Đóng form tải lên' : '+ Tải lên CV mới'}</span>
          </button>
        </div>
      </div>


      {/* Collapsible Upload & New CV Area */}
      <AnimatePresence>
        {showAddCvForm && (
          <motion.div
            className="add-cv-collapsible-box"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="cv-upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
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



            {/* Scanning Progress */}
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

      {/* Empty State — no CVs uploaded yet */}
      {userCvs.length === 0 && !isScanning && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#F8FAFC',
          borderRadius: '16px',
          border: '2px dashed #CBD5E1',
          margin: '16px 0',
        }}>
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

      {/* Section 1: Active CV Spotlight Banner */}
      {activeCv && (
        <div className="active-cv-spotlight-card">
          <div className="active-cv-top-bar">
            <div className="active-badge-pill">
              <span className="pulsing-green-dot" />
              <span>CV ĐANG KÍCH HOẠT</span>
            </div>
            <div className="active-cv-ats-score">
              <span>Điểm ATS:</span>
              <strong>{activeCv.atsScore}/100</strong>
            </div>
          </div>

          <div className="active-cv-body">
            <div className="active-cv-info-left">
              <div className="active-cv-file-title">
                <FileCheck size={20} color="#0284C7" />
                <h4>{activeCv.title}</h4>
              </div>

              <div className="active-cv-meta-chips">
                <span className="meta-chip">
                  <strong>Vị trí:</strong> {activeCv.role}
                </span>
                <span className="meta-chip">
                  <strong>Ngành:</strong> {activeCv.field}
                </span>
                <span className="meta-chip">
                  <strong>Kinh nghiệm:</strong> {activeCv.exp}
                </span>
                <span className="meta-chip date-chip">
                  Ngày tải: {activeCv.uploadedAt}
                </span>
              </div>

              {/* Skills - Only show when array is not empty */}
              {activeCv.skills && activeCv.skills.length > 0 && (
                <div className="active-cv-skills-row">
                  <span className="skills-row-label">Kỹ năng chính:</span>
                  <div className="skills-tags-mini">
                    {activeCv.skills.map((s) => (
                      <span key={s} className="mini-skill-tag">{s}</span>
                    ))}
                  </div>
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
                <span>Luyện phỏng vấn AI</span>
              </button>

              <div className="active-cv-sub-actions-row">
                {onSwitchToAnalyze && (
                  <button
                    type="button"
                    className="action-btn-match"
                    onClick={() => onSwitchToAnalyze(activeCv.id)}
                    title="Chuyển sang AI Analyze để đánh giá chi tiết chuẩn ATS"
                  >
                    <Sparkles size={14} color="#0284c7" />
                    <span>AI Đánh giá ATS</span>
                  </button>
                )}

                <button
                  type="button"
                  className="action-btn-match"
                  onClick={() => onSwitchToMatch(activeCv.id)}
                  title="So khớp JD với CV này"
                >
                  <Target size={15} />
                  <span>So khớp JD</span>
                </button>

                <button
                  type="button"
                  className="action-btn-detail"
                  onClick={() => onOpenDetailModal(activeCv)}
                  title="Xem chi tiết phân tích điểm ATS và nội dung"
                >
                  <Eye size={15} />
                  <span>Xem chi tiết</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Other CVs Collection */}
      <div className="other-cvs-section">
        <div className="other-cvs-header">
          <div className="other-cvs-header-left">
            <h4>Các CV khác trong kho ({otherCvs.length})</h4>
            <span className="other-cvs-subhint">
              Nhấn "Chọn làm CV phỏng vấn" để kích hoạt vị trí ứng tuyển mong muốn.
            </span>
          </div>

          {otherCvs.length > 0 && (
            <div className="other-cvs-controls">
              {/* Search filter */}
              <div className="cv-search-input-wrap">
                <Search size={14} color="#94A3B8" />
                <input
                  type="text"
                  className="cv-search-input"
                  placeholder="Tìm theo tên CV, vị trí..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchTerm('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Grid vs List View Toggle */}
              <div className="view-mode-toggle-group">
                <button
                  type="button"
                  className={`view-mode-btn ${cvViewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setCvViewMode('grid')}
                  title="Chế độ lưới thẻ (Grid view)"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${cvViewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setCvViewMode('list')}
                  title="Chế độ danh sách gọn (Compact list view - không nở trang)"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          )}
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
        ) : filteredOtherCvs.length === 0 ? (
          <div className="empty-search-box">
            <p>Không tìm thấy CV nào phù hợp với từ khóa "{searchTerm}".</p>
            <button
              type="button"
              className="reset-search-btn"
              onClick={() => setSearchTerm('')}
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : cvViewMode === 'grid' ? (
          /* Grid View có container giới hạn chiều cao và scrollbar */
          <div className="multi-cv-cards-grid scrollable-cv-grid">
            {filteredOtherCvs.map((cv) => (
              <div key={cv.id} className="cv-item-card">
                <div className="cv-item-header">
                  <div className="cv-item-title-row">
                    <FileText size={17} color="#64748B" />
                    <span className="cv-item-title" title={cv.title}>
                      {cv.title}
                    </span>
                  </div>
                  <div className="cv-item-score-badge">
                    {cv.atsScore}/100 ATS
                  </div>
                </div>

                <div className="cv-item-role-field">
                  <div className="cv-item-role">{cv.role}</div>
                  <div className="cv-item-submeta">{cv.field} • {cv.exp}</div>
                </div>

                <div className="cv-item-skills-preview">
                  {cv.skills.slice(0, 3).map((s) => (
                    <span key={s} className="cv-mini-chip">{s}</span>
                  ))}
                  {cv.skills.length > 3 && (
                    <span className="cv-mini-chip-more">+{cv.skills.length - 3}</span>
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
                    <span>Chọn làm CV phỏng vấn</span>
                  </button>

                  <div className="cv-item-secondary-btns">
                    {onSwitchToAnalyze && (
                      <button
                        type="button"
                        className="icon-detail-btn"
                        onClick={() => onSwitchToAnalyze(cv.id)}
                        title="AI Đánh giá ATS"
                      >
                        <Sparkles size={14} color="#0284c7" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-detail-btn"
                      onClick={() => onOpenDetailModal(cv)}
                      title="Xem chi tiết điểm ATS và kỹ năng"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Compact List View: Chiếm cực ít diện tích, không làm nở trang */
          <div className="multi-cv-compact-table-wrap">
            <div className="compact-table-header">
              <span className="col-name">Tên CV</span>
              <span className="col-role">Vị trí</span>
              <span className="col-date">Ngày tải</span>
              <span className="col-score">Điểm ATS</span>
              <span className="col-actions">Hành động</span>
            </div>
            <div className="compact-table-body">
              {filteredOtherCvs.map((cv) => (
                <div key={cv.id} className="compact-table-row">
                  <div className="col-name" title={cv.title}>
                    <FileText size={15} color="#0284C7" />
                    <span className="cv-title-ellipsis">{cv.title}</span>
                  </div>
                  <div className="col-role">
                    <span className="table-role-chip">{cv.role}</span>
                  </div>
                  <div className="col-date">{cv.uploadedAt}</div>
                  <div className="col-score">
                    <span className="table-ats-badge">{cv.atsScore}đ</span>
                  </div>
                  <div className="col-actions">
                    <button
                      type="button"
                      className="table-select-btn"
                      onClick={() => onSelectActiveCv(cv)}
                      title="Kích hoạt CV này"
                    >
                      <Check size={13} />
                      <span>Kích hoạt</span>
                    </button>
                    {onSwitchToAnalyze && (
                      <button
                        type="button"
                        className="table-detail-btn"
                        onClick={() => onSwitchToAnalyze(cv.id)}
                        title="AI Đánh giá ATS"
                      >
                        <Sparkles size={13} color="#0284c7" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="table-detail-btn"
                      onClick={() => onOpenDetailModal(cv)}
                      title="Xem chi tiết"
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
