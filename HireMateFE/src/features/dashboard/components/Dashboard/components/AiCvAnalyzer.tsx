import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Video,
  Target,
  UploadCloud,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Award,
  Layers,
  FileText,
  Plus,
} from 'lucide-react';
import { UserCvCard } from '../Dashboard';
import './AiCvAnalyzer.css';

interface AiCvAnalyzerProps {
  userCvs: UserCvCard[];
  activeCv: UserCvCard | null;
  selectedCvId: string;
  onSelectCvId: (id: string) => void;
  isFreeTier: boolean;
  isAnalyzing: boolean;
  analyzeProgress: number;
  analyzeStatusText: string;
  onAnalyzeCv: (cvId: string) => Promise<void>;
  onFileUploadAndAnalyze: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onNavigateInterview: (cv: UserCvCard) => void;
  onNavigateMatch: (cvId: string) => void;
  onOpenWizard: () => void;
}

export const AiCvAnalyzer: React.FC<AiCvAnalyzerProps> = ({
  userCvs,
  activeCv,
  selectedCvId,
  onSelectCvId,
  isFreeTier,
  isAnalyzing,
  analyzeProgress,
  analyzeStatusText,
  onAnalyzeCv,
  onFileUploadAndAnalyze,
  onNavigateInterview,
  onNavigateMatch,
  onOpenWizard,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine which CV is currently selected for analysis
  const currentCv =
    userCvs.find((c) => c.id === selectedCvId) ||
    activeCv;

  const isAnalyzed = currentCv && currentCv.atsScore > 0;
  const atsScore = currentCv?.atsScore || 0;

  const formatScore = currentCv?.formatScore ?? 0;
  const keywordsScore = currentCv?.keywordsScore ?? 0;
  const readabilityScore = currentCv?.readabilityScore ?? 0;
  const parsedSuggestions = currentCv?.suggestions ?? [];

  const scoreLevelClass =
    atsScore >= 80 ? 'high' : atsScore >= 60 ? 'medium' : 'low';

  return (
    <motion.div
      className="ai-cv-analyzer-wrapper"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 1. Free Tier Quota Reminder Bar - specifically placed in AI Analyze workspace */}
      {isFreeTier && (
        <div className="analyzer-quota-banner">
          <div className="analyzer-quota-content">
            <Sparkles size={16} color="#0284c7" />
            <span>
              Gói Miễn phí: Bạn được phân tích CV &amp; đánh giá ATS{' '}
              <strong>1 lần trong tháng</strong>. Nâng cấp lên gói Tiêu chuẩn hoặc
              Cao cấp để phân tích không giới hạn và phỏng vấn AI.
            </span>
          </div>
          <Link to="/pricing" className="analyzer-upgrade-link">
            Khám phá các gói dịch vụ
          </Link>
        </div>
      )}

      {/* 2. Section Header */}
      <div className="analyzer-header-row">
        <div className="analyzer-title-group">
          <h3>
            <FileSearch size={20} color="#0284c7" />
            <span>AI Analyze — Đánh giá &amp; Phân tích CV chuẩn ATS</span>
          </h3>
          <p>
            Mô phỏng bộ lọc ứng viên tự động của các tập đoàn công nghệ hàng đầu.
            Hệ thống chấm điểm cấu trúc, trích xuất từ khóa trọng yếu và kiểm tra
            tính sẵn sàng trước khi bước vào phòng phỏng vấn AI.
          </p>
        </div>
      </div>

      {/* 3. Selector Bar: Select CV from warehouse or upload new */}
      <div className="analyzer-selector-bar">
        <div className="analyzer-select-wrap">
          <span className="analyzer-select-label">Chọn CV cần đánh giá:</span>
          {userCvs.length > 0 ? (
            <select
              className="analyzer-cv-dropdown"
              value={currentCv?.id || ''}
              onChange={(e) => onSelectCvId(e.target.value)}
              disabled={isAnalyzing}
            >
              {userCvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.title} ({cv.role} • {cv.atsScore > 0 ? `${cv.atsScore}đ ATS` : 'Chưa chấm'})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '0.86rem', color: '#64748b' }}>
              Chưa có CV nào trong kho. Hãy tải lên file để AI đánh giá ngay!
            </span>
          )}
        </div>

        <div className="analyzer-action-btn-group">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUploadAndAnalyze}
            accept=".pdf,.docx"
            style={{ display: 'none' }}
          />

          {currentCv && (
            <button
              type="button"
              className="btn-trigger-analyze"
              onClick={() => onAnalyzeCv(currentCv.id)}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang phân tích...</span>
                </>
              ) : (
                <>
                  <RotateCcw size={15} />
                  <span>{isAnalyzed ? 'AI Phân tích lại' : 'Bắt đầu AI Đánh giá'}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            className="btn-analyzer-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            title="Tải lên file CV mới từ máy để AI chấm điểm"
          >
            <UploadCloud size={15} color="#0284c7" />
            <span>Tải lên file mới</span>
          </button>
        </div>
      </div>

      {/* 4. Scanning / Progress State */}
      {isAnalyzing && (
        <motion.div
          className="analyzer-scanning-card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="analyzer-scanning-status">
            <Loader2 size={18} className="animate-spin" color="#0284c7" />
            <span>{analyzeStatusText || 'AI đang xử lý dữ liệu hồ sơ...'}</span>
          </div>
          <div className="analyzer-scanning-track">
            <motion.div
              className="analyzer-scanning-bar"
              style={{ width: `${analyzeProgress}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* 5. Empty State: No CV in system */}
      {userCvs.length === 0 && !isAnalyzing && (
        <div className="analyzer-empty-card">
          <UploadCloud size={46} color="#94a3b8" />
          <h4>Kho CV của bạn hiện đang trống</h4>
          <p>
            Vui lòng tải lên CV (.PDF hoặc .DOCX) hoặc tạo CV mới bằng AI Wizard
            để hệ thống thực hiện phân tích ATS và đo lường độ sẵn sàng phỏng vấn.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn-trigger-analyze"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={16} />
              <span>Tải lên CV đầu tiên</span>
            </button>
            <button
              type="button"
              className="btn-analyzer-secondary"
              onClick={onOpenWizard}
            >
              <Sparkles size={15} color="#0284c7" />
              <span>Tạo CV bằng AI Wizard</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Evaluation Results Workspace */}
      {currentCv && !isAnalyzing && (
        <div className="analyzer-results-grid">
          {/* Hero Score Card */}
          <div className="analyzer-hero-card">
            <div className="analyzer-score-circle-group">
              <div className={`analyzer-score-badge-circle ${scoreLevelClass}`}>
                <span className="analyzer-score-num">{atsScore}</span>
                <span className="analyzer-score-label">Điểm ATS</span>
              </div>

              <div className="analyzer-hero-meta">
                <h4>{currentCv.title}</h4>
                <p>
                  Đánh giá cho vai trò <strong>{currentCv.role}</strong> • Ngành{' '}
                  <strong>{currentCv.field}</strong>
                </p>
                <div className="analyzer-hero-tags">
                  <span className="analyzer-hero-tag">
                    <ShieldCheck size={13} color="#16a34a" style={{ display: 'inline', marginRight: 4 }} />
                    {atsScore >= 80 ? 'Chuẩn ATS Xuất Sắc' : atsScore >= 60 ? 'Đạt chuẩn cơ bản' : 'Cần tối ưu thêm'}
                  </span>
                  <span className="analyzer-hero-tag">
                    Kinh nghiệm: {currentCv.exp}
                  </span>
                </div>
              </div>
            </div>

            <div className="analyzer-hero-actions">
              <button
                type="button"
                className="btn-analyzer-interview"
                onClick={() => onNavigateInterview(currentCv)}
              >
                <Video size={16} />
                <span>Luyện phỏng vấn với CV này</span>
              </button>

              <button
                type="button"
                className="btn-analyzer-secondary"
                onClick={() => onNavigateMatch(currentCv.id)}
              >
                <Target size={15} color="#0284c7" />
                <span>So khớp với JD tuyển dụng</span>
              </button>
            </div>
          </div>

          {/* 4 Pillars of ATS */}
          <div className="analyzer-pillars-grid">
            {/* Pillar 1 */}
            <div className="analyzer-pillar-card">
              <div className="pillar-header">
                <span className="pillar-title">Định dạng &amp; Bố cục</span>
                <span className="pillar-score" style={{ color: '#16a34a' }}>
                  {formatScore}/100
                </span>
              </div>
              <div className="pillar-bar-track">
                <div
                  className="pillar-bar-fill"
                  style={{
                    width: `${formatScore}%`,
                    background: '#16a34a',
                  }}
                />
              </div>
              <p className="pillar-desc">
                Phông chữ tiêu chuẩn, tiêu đề rõ ràng, không chứa bảng lồng nhau gây lỗi bot quét ATS.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="analyzer-pillar-card">
              <div className="pillar-header">
                <span className="pillar-title">Mật độ Từ khóa</span>
                <span className="pillar-score" style={{ color: '#0284c7' }}>
                  {keywordsScore}/100
                </span>
              </div>
              <div className="pillar-bar-track">
                <div
                  className="pillar-bar-fill"
                  style={{
                    width: `${keywordsScore}%`,
                    background: '#0284c7',
                  }}
                />
              </div>
              <p className="pillar-desc">
                Tần suất từ khóa chuyên ngành ({currentCv.role}) và các công nghệ cốt lõi đã được tối ưu.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="analyzer-pillar-card">
              <div className="pillar-header">
                <span className="pillar-title">Tính dễ đọc (Readability)</span>
                <span className="pillar-score" style={{ color: '#d97706' }}>
                  {readabilityScore}/100
                </span>
              </div>
              <div className="pillar-bar-track">
                <div
                  className="pillar-bar-fill"
                  style={{
                    width: `${readabilityScore}%`,
                    background: '#d97706',
                  }}
                />
              </div>
              <p className="pillar-desc">
                Các câu mô tả ngắn gọn, cấu trúc dạng bullet points giúp nhà tuyển dụng nắm bắt thông tin trong 6 giây.
              </p>
            </div>

          </div>

          {/* Strengths & Weaknesses / Suggestions */}
          <div className="analyzer-insights-grid">
            {/* Strengths */}
            <div className="analyzer-insight-card">
              <div className="insight-card-header">
                <div className="insight-icon-box green">
                  <CheckCircle2 size={18} />
                </div>
                <h5>Điểm mạnh đã đạt chuẩn ATS</h5>
              </div>
              <ul className="insight-items-list">
                <li className="insight-item">
                  <span className="insight-bullet-dot green" />
                  <span>
                    Bố cục phân đoạn tiêu đề mạch lạc (Thông tin cá nhân, Học vấn, Kinh nghiệm, Kỹ năng).
                  </span>
                </li>
                <li className="insight-item">
                  <span className="insight-bullet-dot green" />
                  <span>
                    Kỹ năng cốt lõi (
                    {currentCv.skills && currentCv.skills.length > 0
                      ? currentCv.skills.slice(0, 4).join(', ')
                      : 'Kỹ năng chuyên ngành'}
                    ) được liệt kê chuẩn danh pháp quốc tế.
                  </span>
                </li>
                <li className="insight-item">
                  <span className="insight-bullet-dot green" />
                  <span>
                    Trình bày dòng thời gian quá trình làm việc/học tập theo thứ tự giảm dần khoa học.
                  </span>
                </li>
              </ul>
            </div>

            {/* Weaknesses & AI Suggestions */}
            <div className="analyzer-insight-card">
              <div className="insight-card-header">
                <div className="insight-icon-box amber">
                  <AlertTriangle size={18} />
                </div>
                <h5>Khuyến nghị tối ưu từ AI Coach</h5>
              </div>
              <ul className="insight-items-list">
                {parsedSuggestions.length > 0 ? (
                  parsedSuggestions.map((sug, idx) => (
                    <li key={idx} className="insight-item">
                      <span className="insight-bullet-dot amber" />
                      <span>{sug}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="insight-item">
                      <span className="insight-bullet-dot amber" />
                      <span>
                        Nên bổ sung thêm các số liệu định lượng (metrics, % tăng trưởng, số người dùng phục vụ) trong các dự án thực tế.
                      </span>
                    </li>
                    <li className="insight-item">
                      <span className="insight-bullet-dot amber" />
                      <span>
                        Kiểm tra lại độ dài mô tả công việc, giữ ở mức 3–5 bullet points cho mỗi vị trí để tối ưu độ tương tác.
                      </span>
                    </li>
                    <li className="insight-item">
                      <span className="insight-bullet-dot amber" />
                      <span>
                        Sử dụng tính năng <strong>So khớp JD</strong> để bổ sung các từ khóa đặc thù mà nhà tuyển dụng yêu cầu.
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* AI Coach Action Footer */}
          <div className="analyzer-ai-coach-card">
            <div className="ai-coach-text-group">
              <div className="ai-coach-icon">
                <Sparkles size={22} />
              </div>
              <div>
                <h5>Hồ sơ của bạn đã sẵn sàng cho buổi phỏng vấn AI!</h5>
                <p>
                  AI Coach sẽ dựa trên các kỹ năng và kinh nghiệm trong bản CV này để
                  tạo bộ câu hỏi phỏng vấn mô phỏng chuẩn xác nhất.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-analyzer-interview"
              onClick={() => onNavigateInterview(currentCv)}
            >
              <Video size={16} />
              <span>Bắt đầu phỏng vấn ngay</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
