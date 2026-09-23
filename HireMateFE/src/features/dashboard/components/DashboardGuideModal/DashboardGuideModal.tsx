import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Folder,
  Target,
  Mail,
  Video,
  Layers,
  Lightbulb,
  Check,
  Maximize2,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './css/DashboardGuideModal.css';

export interface GuideStepData {
  id: number;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  purpose: string;
  imageSrc?: string;
  imageAlt?: string;
  targetModule: string;
  requiredFields: {
    name: string;
    desc: string;
    required: boolean;
  }[];
  aiTips: string[];
}

export const GUIDE_STEPS: GuideStepData[] = [
  {
    id: 1,
    badge: 'BƯỚC 1: KHỞI TẠO & KÍCH HOẠT CV (QUAN TRỌNG NHẤT)',
    badgeColor: '#0284c7',
    icon: <Sparkles size={20} color="#0284c7" />,
    title: 'Khởi Tạo CV & Kích Hoạt Hồ Sơ Phỏng Vấn',
    subtitle: '4 thao tác chuẩn chỉ để AI sẵn sàng luyện phỏng vấn và so khớp JD chuẩn xác',
    purpose:
      'Điền thông tin CV theo vị trí ứng tuyển mong muốn. HireMate AI sẽ hỗ trợ rà soát, tính toán độ sẵn sàng (Career Readiness) và may đo bộ câu hỏi phỏng vấn chuẩn STAR.',
    imageSrc: '/assets/guide/guide_profile_tutorial.png',
    imageAlt: 'Sơ đồ hướng dẫn 4 bước khởi tạo và kích hoạt CV phỏng vấn',
    targetModule: 'Bảng điều khiển ➔ Tab Tạo CV & Kho CV',
    requiredFields: [
      {
        name: '① Điền thông tin vị trí & học vấn',
        desc: 'Chọn vị trí ứng tuyển, mẫu CV và điền các mục cốt lõi. Bạn có thể nhấn "Điền mẫu nhanh" để lấy dữ liệu mẫu tức thì.',
        required: true,
      },
      {
        name: '② Bấm "Xem trước & Tối ưu bằng AI"',
        desc: 'Nhấn nút ở cuối form để AI rà soát lỗi chính tả, tối ưu từ khóa ATS và hoàn thiện CV.',
        required: true,
      },
      {
        name: '③ Điểm Career Readiness (Độ sẵn sàng ATS)',
        desc: 'Hệ thống tự động chấm điểm độ sẵn sàng nghề nghiệp từ 0 - 100 và phân tích điểm mạnh, điểm yếu hồ sơ.',
        required: true,
      },
      {
        name: '④ Nhấn "Luyện phỏng vấn nâng điểm"',
        desc: 'Bắt đầu phiên phỏng vấn đối thoại với AI Coach theo đúng kinh nghiệm trong CV để nâng điểm.',
        required: true,
      },
    ],
    aiTips: [
      'Bạn có thể bấm trực tiếp vào ảnh minh họa bên trái để phóng to xem chi tiết từng mũi tên chỉ dẫn.',
      'Sử dụng nút "Điền mẫu nhanh" ở góc trên nếu bạn muốn xem nhanh bố cục chuẩn mà không mất thời gian nhập tay.',
    ],
  },
  {
    id: 2,
    badge: 'BƯỚC 2: QUẢN LÝ KHO CV',
    badgeColor: '#0ea5e9',
    icon: <Folder size={20} color="#0ea5e9" />,
    title: 'Kho CV Cá Nhân & Quản Lý Đa Hồ Sơ',
    subtitle: 'Lưu trữ linh hoạt nhiều CV cho từng vị trí ứng tuyển khác nhau',
    purpose:
      'Một ứng viên có thể ứng tuyển nhiều vị trí (Frontend, Backend, Fullstack, PM...). Kho CV cho phép bạn lưu trữ không giới hạn các bản CV và chuyển đổi linh hoạt CV nào sẽ dùng để phỏng vấn hay so khớp JD.',
    targetModule: 'Bảng điều khiển ➔ Tab: Kho CV cá nhân',
    requiredFields: [
      {
        name: 'Quản lý đa CV cho từng vị trí',
        desc: 'Lưu trữ riêng biệt CV lập trình viên, CV quản lý dự án hay CV thực tập sinh trong cùng 1 tài khoản.',
        required: false,
      },
      {
        name: 'Đổi mẫu giao diện (Template Picker)',
        desc: 'Chuyển đổi giao diện CV tức thì giữa các mẫu Modern 01, Modern 02 mà không mất dữ liệu đã điền.',
        required: false,
      },
      {
        name: 'Xem trước thực tế & Tải PDF chuẩn',
        desc: 'Bấm biểu tượng con mắt để xem trước CV và tải file PDF chính thức để gửi trực tiếp cho nhà tuyển dụng.',
        required: false,
      },
      {
        name: 'Lưu làm mẫu tùy chỉnh (Custom Template)',
        desc: 'Lưu bố cục và phong cách CV bạn ưng ý thành mẫu cá nhân để tái sử dụng cho các lần sau.',
        required: false,
      },
    ],
    aiTips: [
      'Luôn chỉ có 1 CV được kích hoạt làm hồ sơ chính tại một thời điểm.',
      'Khi muốn đổi vị trí ứng tuyển để luyện phỏng vấn, chỉ cần bấm "Chọn làm CV phỏng vấn" ở CV tương ứng trong Kho.',
    ],
  },
  {
    id: 3,
    badge: 'BƯỚC 3: SO KHỚP JD TUYỂN DỤNG',
    badgeColor: '#10b981',
    icon: <Target size={20} color="#10b981" />,
    title: 'So Khớp CV & Mô Tả Công Việc (JD Matcher)',
    subtitle: 'Đo lường độ phù hợp và phát hiện từ khóa còn thiếu trước khi nộp đơn',
    purpose:
      'Dán bản mô tả công việc (Job Description) từ nhà tuyển dụng vào hệ thống. AI sẽ so sánh chuyên sâu từng yêu cầu trong JD với CV của bạn, đưa ra % phù hợp, chỉ rõ điểm mạnh và kỹ năng còn thiếu.',
    targetModule: 'Bảng điều khiển ➔ Tab: So khớp JD',
    requiredFields: [
      {
        name: 'Dán nội dung JD tuyển dụng',
        desc: 'Sao chép và dán toàn bộ bài đăng tuyển dụng từ TopCV, VietnamWorks, LinkedIn hoặc ITviec.',
        required: true,
      },
      {
        name: 'Chọn CV đối sánh',
        desc: 'Mặc định dùng CV đang kích hoạt, hoặc chọn CV khác trong kho phù hợp nhất với JD đó.',
        required: true,
      },
      {
        name: 'Báo cáo từ khóa còn thiếu (Keyword Gaps)',
        desc: 'Xem danh sách công nghệ và kỹ năng mà JD yêu cầu nhưng CV bạn chưa nhắc đến để bổ sung kịp thời.',
        required: false,
      },
      {
        name: 'Gợi ý nâng cấp kinh nghiệm chuẩn STAR',
        desc: 'AI chỉ dẫn cách diễn đạt lại các dự án thực tế để tăng tối đa điểm số lọc hồ sơ tự động của HR.',
        required: false,
      },
    ],
    aiTips: [
      'Nên bổ sung các từ khóa còn thiếu vào CV trong Kho CV rồi bấm "So khớp lại" để đạt trên 80% trước khi nộp việc.',
      'Bạn có thể lưu lại các JD tiềm năng để theo dõi tiến độ ứng tuyển.',
    ],
  },
  {
    id: 4,
    badge: 'BƯỚC 4: THƯ ỨNG TUYỂN AI',
    badgeColor: '#8b5cf6',
    icon: <Mail size={20} color="#8b5cf6" />,
    title: 'Soạn Thảo Thư Ứng Tuyển & Email Bằng AI',
    subtitle: 'Tạo Cover Letter, thư cảm ơn và thư theo dõi chuyên nghiệp trong 5 giây',
    purpose:
      'Không còn lo lắng về việc viết email ứng tuyển dài dòng hoặc vụng về. HireMate AI tự động kết hợp thông tin CV và vị trí ứng tuyển để tạo nên những bức thư ứng tuyển chỉn chu, thuyết phục theo nhiều phong cách.',
    targetModule: 'Bảng điều khiển ➔ Tab: Thư AI',
    requiredFields: [
      {
        name: 'Cover Letter (Thư xin việc)',
        desc: 'Lá thư ứng tuyển mở đầu làm nổi bật thế mạnh, kinh nghiệm cốt lõi và lý do công ty nên chọn bạn.',
        required: true,
      },
      {
        name: 'Thank You Email (Thư cảm ơn)',
        desc: 'Gửi ngay trong vòng 24 giờ sau buổi phỏng vấn để tạo ấn tượng về sự chuyên nghiệp và nhiệt huyết.',
        required: false,
      },
      {
        name: 'Follow-up Email (Thư theo dõi)',
        desc: 'Hỏi thăm kết quả ứng tuyển lịch sự sau khi hết hạn phản hồi đã hẹn.',
        required: false,
      },
      {
        name: 'Lựa chọn phong cách viết',
        desc: 'Lựa chọn giữa các tông giọng: Chuyên nghiệp (Professional), Tự tin (Confident) hoặc Nhiệt huyết (Passionate).',
        required: false,
      },
    ],
    aiTips: [
      'Bấm nút "Sao chép thư" để dán trực tiếp vào Gmail hoặc hệ thống nộp hồ sơ trực tuyến.',
      'Hãy điền chính xác tên công ty và người nhận để email mang tính cá nhân hóa cao nhất.',
    ],
  },
  {
    id: 5,
    badge: 'BƯỚC 5: PHÒNG PHỎNG VẤN AI',
    badgeColor: '#f59e0b',
    icon: <Video size={20} color="#f59e0b" />,
    title: 'Luyện Phỏng Vấn Giọng Nói 1-1 Chuẩn STAR',
    subtitle: 'Rèn luyện phản xạ đối thoại tiếng Việt thời gian thực với AI Coach',
    purpose:
      'AI đóng vai trò nhà tuyển dụng thực tế: đặt câu hỏi bằng giọng nói tự nhiên, lắng nghe bạn trả lời qua micro và chấm điểm chi tiết 4 tiêu chí STAR (Situation - Task - Action - Result) kèm lời khuyên cải thiện.',
    targetModule: 'Menu chính ➔ Phỏng vấn AI (Interview Room)',
    requiredFields: [
      {
        name: 'Cấp quyền Micro trình duyệt',
        desc: 'Cho phép hệ thống sử dụng micro để AI nhận diện giọng nói tiếng Việt chuẩn xác theo thời gian thực.',
        required: true,
      },
      {
        name: 'Cấu hình phòng phỏng vấn',
        desc: 'Tùy chỉnh số lượng câu hỏi (3 - 5 câu), độ khó và phong cách phỏng vấn viên.',
        required: true,
      },
      {
        name: 'Chấm điểm cấu trúc STAR từng câu',
        desc: 'Phân tích chi tiết: Bối cảnh (S), Nhiệm vụ (T), Hành động bạn thực hiện (A) và Kết quả đạt được (R).',
        required: false,
      },
      {
        name: 'Báo cáo phân tích chuyên sâu',
        desc: 'Nhận feedback về lỗi lặp từ ("à, ừm"), tốc độ nói và gợi ý câu trả lời mẫu xuất sắc hơn.',
        required: false,
      },
    ],
    aiTips: [
      'Dành 60% thời lượng câu trả lời cho phần Action (Bạn đã làm gì) và Result (Kết quả có số liệu) để đạt điểm cao nhất.',
      'Duy trì luyện tập đều đặn để tích lũy điểm Career Readiness và thăng hạng trên Bảng vàng.',
    ],
  },
];

interface DashboardGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountKey?: string;
}

export const DashboardGuideModal: React.FC<DashboardGuideModalProps> = ({
  isOpen,
  onClose,
  accountKey = 'default_user',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<number, boolean>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset step index when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setLightboxOpen(false);
    }
  }, [isOpen]);

  // Handle ESC and Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else if (isOpen) {
          handleClose();
        }
      } else if (e.key === 'ArrowRight' && isOpen && !lightboxOpen) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && isOpen && !lightboxOpen) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxOpen, currentStepIndex]);

  const handleClose = () => {
    localStorage.setItem(`hm_tutorial_seen_${accountKey}`, 'true');
    localStorage.setItem('hm_tutorial_seen_global', 'true');
    onClose();
  };

  const handleNext = () => {
    if (currentStepIndex < GUIDE_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const currentStep = GUIDE_STEPS[currentStepIndex];
  const hasImage = Boolean(currentStep.imageSrc);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="guide-modal-overlay" onClick={handleClose}>
          <motion.div
            className={`guide-modal-card ${!hasImage ? 'no-image-layout' : ''}`}
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="guide-modal-header">
              <div className="guide-header-title-wrap">
                <div className="guide-header-icon-circle">
                  <BookOpen size={20} color="#0284c7" />
                </div>
                <div>
                  <h3 className="guide-header-title">Cẩm Nang Hướng Dẫn Sử Dụng HireMate</h3>
                  <p className="guide-header-sub">
                    Nắm rõ quy trình 4 bước khởi tạo CV và khai thác tối đa sức mạnh AI
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="guide-close-btn"
                onClick={handleClose}
                aria-label="Đóng hướng dẫn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Stepper Indicator */}
            <div className="guide-stepper-bar">
              {GUIDE_STEPS.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`guide-step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => setCurrentStepIndex(idx)}
                  >
                    <div className="guide-step-node-num">
                      {isCompleted ? <Check size={12} strokeWidth={3} /> : idx + 1}
                    </div>
                    <span className="guide-step-node-title">
                      {step.id === 1 ? 'Khởi tạo CV' : step.title.split(' ')[0] + ' ' + (step.title.split(' ')[1] || '')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div className={`guide-modal-body ${!hasImage ? 'single-column-body' : ''}`}>
              {/* Left Column: Image Illustration (Only for steps with image) */}
              {hasImage && (
                <div className="guide-media-column">
                  <div
                    className="guide-image-container"
                    onClick={() => !imageError[currentStep.id] && setLightboxOpen(true)}
                    title="Nhấn để phóng to ảnh chỉ dẫn chi tiết"
                  >
                    {!imageError[currentStep.id] ? (
                      <>
                        <img
                          src={currentStep.imageSrc}
                          alt={currentStep.imageAlt}
                          className="guide-step-image"
                          onError={() =>
                            setImageError((prev) => ({ ...prev, [currentStep.id]: true }))
                          }
                        />

                        {/* Interactive Visual Overlay with Arrows & Callout Badges */}
                        <div className="guide-tutorial-overlay">
                          <svg className="guide-arrows-svg" viewBox="0 0 1024 647">
                            <defs>
                              <marker id="guide-arrow-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#0284c7" />
                              </marker>
                              <marker id="guide-arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                              </marker>
                            </defs>
                            {/* Path 1 -> 2: Form to 'Xem trước & Tối ưu bằng AI' */}
                            <path
                              d="M 260,260 C 260,390 380,430 410,480"
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="3.5"
                              strokeDasharray="6,4"
                              markerEnd="url(#guide-arrow-blue)"
                            />
                            {/* Path 2 -> 3: 'Xem trước & Tối ưu AI' to 'Career Readiness' */}
                            <path
                              d="M 480,490 C 600,480 635,260 670,145"
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="3.5"
                              strokeDasharray="6,4"
                              markerEnd="url(#guide-arrow-blue)"
                            />
                            {/* Path 3 -> 4: 'Career Readiness' to 'Luyện phỏng vấn nâng điểm' */}
                            <path
                              d="M 695,155 C 695,175 695,190 695,205"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3.5"
                              markerEnd="url(#guide-arrow-green)"
                            />
                          </svg>

                          {/* Pin 1 */}
                          <div className="guide-pin-badge pin-1" style={{ top: '24%', left: '12%' }}>
                            <span className="guide-pin-num">1</span>
                            <span className="guide-pin-text">Điền thông tin CV</span>
                          </div>

                          {/* Pin 2 */}
                          <div className="guide-pin-badge pin-2" style={{ top: '76%', left: '36%' }}>
                            <span className="guide-pin-num">2</span>
                            <span className="guide-pin-text">Xem trước & Tối ưu AI</span>
                          </div>

                          {/* Pin 3 */}
                          <div className="guide-pin-badge pin-3" style={{ top: '16%', left: '67%' }}>
                            <span className="guide-pin-num">3</span>
                            <span className="guide-pin-text">Career Readiness</span>
                          </div>

                          {/* Pin 4 */}
                          <div className="guide-pin-badge pin-4 green" style={{ top: '33%', left: '64%' }}>
                            <span className="guide-pin-num green">4</span>
                            <span className="guide-pin-text green">Luyện phỏng vấn AI</span>
                          </div>
                        </div>

                        <div className="guide-image-zoom-badge">
                          <Maximize2 size={13} /> Phóng to xem sơ đồ
                        </div>
                      </>
                    ) : (
                      <div className="guide-image-placeholder">
                        <div className="guide-placeholder-icon">
                          {currentStep.icon}
                        </div>
                        <div className="guide-placeholder-caption">
                          {currentStep.title}
                        </div>
                      </div>
                    )}

                    <div className="guide-module-locator">
                      <Layers size={13} color="#0284c7" />
                      <span>{currentStep.targetModule}</span>
                    </div>
                  </div>

                  {/* AI Tip Box */}
                  <div className="guide-ai-tip-box">
                    <div className="guide-tip-header">
                      <Lightbulb size={16} color="#eab308" />
                      <span>Mẹo hữu ích từ AI:</span>
                    </div>
                    <ul className="guide-tip-list">
                      {currentStep.aiTips.map((tip, tIdx) => (
                        <li key={tIdx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Right Column / Full Width: Step Info & Purpose & Fields */}
              <div className={`guide-info-column ${!hasImage ? 'full-width-info' : ''}`}>
                {/* Step Badge & Title */}
                <div className="guide-step-header">
                  <span
                    className="guide-step-badge"
                    style={{
                      background: `${currentStep.badgeColor}15`,
                      color: currentStep.badgeColor,
                      borderColor: `${currentStep.badgeColor}35`,
                    }}
                  >
                    <Sparkles size={13} /> {currentStep.badge}
                  </span>
                  <h4 className="guide-step-title">{currentStep.title}</h4>
                  <p className="guide-step-subtitle">{currentStep.subtitle}</p>
                </div>

                {/* Purpose Section */}
                <div className="guide-section-block">
                  <h5 className="guide-block-heading">
                    <Target size={15} color="#0284c7" /> Mục đích của tính năng này:
                  </h5>
                  <p className="guide-purpose-desc">{currentStep.purpose}</p>
                </div>

                {/* Required Fields Section */}
                <div className="guide-section-block">
                  <h5 className="guide-block-heading">
                    <CheckCircle2 size={15} color="#10b981" /> Hướng dẫn thao tác & Chi tiết tính năng:
                  </h5>
                  <div className={`guide-fields-list ${!hasImage ? 'two-column-fields' : ''}`}>
                    {currentStep.requiredFields.map((f, fIdx) => (
                      <div key={fIdx} className="guide-field-item">
                        <div className="guide-field-header">
                          <span className="guide-field-name">{f.name}</span>
                          {f.required && <span className="guide-field-req-tag">Bắt buộc</span>}
                        </div>
                        <p className="guide-field-desc">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Tip Box for steps without image */}
                {!hasImage && (
                  <div className="guide-ai-tip-box" style={{ marginTop: 8 }}>
                    <div className="guide-tip-header">
                      <Lightbulb size={16} color="#eab308" />
                      <span>Mẹo hữu ích từ AI:</span>
                    </div>
                    <ul className="guide-tip-list">
                      {currentStep.aiTips.map((tip, tIdx) => (
                        <li key={tIdx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="guide-modal-footer">
              <div className="guide-footer-left">
                <span>
                  Bước <strong>{currentStepIndex + 1}</strong> / {GUIDE_STEPS.length}
                </span>
                <span className="guide-footer-note">
                  (Popup tự động cho tài khoản mới. Bạn có thể bấm nút &quot;Tutorial&quot; để xem lại bất cứ lúc nào)
                </span>
              </div>

              <div className="guide-footer-actions">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    className="guide-nav-btn secondary"
                    onClick={handlePrev}
                  >
                    <ChevronLeft size={16} /> Quay lại
                  </button>
                )}

                <button
                  type="button"
                  className="guide-nav-btn primary"
                  onClick={handleNext}
                >
                  {currentStepIndex === GUIDE_STEPS.length - 1 ? (
                    <>
                      <Check size={16} /> Bắt đầu sử dụng ngay
                    </>
                  ) : (
                    <>
                      Bước tiếp theo <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Image Lightbox Modal */}
          {lightboxOpen && currentStep.imageSrc && (
            <div
              className="guide-lightbox-overlay"
              onClick={() => setLightboxOpen(false)}
            >
              <div
                className="guide-lightbox-content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="guide-lightbox-header">
                  <div className="guide-lightbox-title">
                    <Sparkles size={16} color="#0284c7" />
                    <span>Sơ đồ 4 bước khởi tạo và kích hoạt CV</span>
                  </div>
                  <button
                    type="button"
                    className="guide-lightbox-close"
                    onClick={() => setLightboxOpen(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="guide-lightbox-image-wrap">
                  <img
                    src={currentStep.imageSrc}
                    alt={currentStep.imageAlt}
                    className="guide-lightbox-img"
                  />
                  {/* Overlay inside lightbox */}
                  <div className="guide-tutorial-overlay lightbox-overlay">
                    <svg className="guide-arrows-svg" viewBox="0 0 1024 647">
                      <defs>
                        <marker id="lb-arrow-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#0284c7" />
                        </marker>
                        <marker id="lb-arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                        </marker>
                      </defs>
                      {/* Path 1 -> 2: Form to 'Xem trước & Tối ưu bằng AI' */}
                      <path
                        d="M 260,260 C 260,390 380,430 410,480"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="3.5"
                        strokeDasharray="6,4"
                        markerEnd="url(#lb-arrow-blue)"
                      />
                      {/* Path 2 -> 3: 'Xem trước & Tối ưu AI' to 'Career Readiness' */}
                      <path
                        d="M 480,490 C 600,480 635,260 670,145"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="3.5"
                        strokeDasharray="6,4"
                        markerEnd="url(#lb-arrow-blue)"
                      />
                      {/* Path 3 -> 4: 'Career Readiness' to 'Luyện phỏng vấn nâng điểm' */}
                      <path
                        d="M 695,155 C 695,175 695,190 695,205"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        markerEnd="url(#lb-arrow-green)"
                      />
                    </svg>

                    <div className="guide-pin-badge pin-1" style={{ top: '24%', left: '12%' }}>
                      <span className="guide-pin-num">1</span>
                      <span className="guide-pin-text">Điền thông tin CV</span>
                    </div>

                    <div className="guide-pin-badge pin-2" style={{ top: '76%', left: '36%' }}>
                      <span className="guide-pin-num">2</span>
                      <span className="guide-pin-text">Xem trước & Tối ưu AI</span>
                    </div>

                    <div className="guide-pin-badge pin-3" style={{ top: '16%', left: '67%' }}>
                      <span className="guide-pin-num">3</span>
                      <span className="guide-pin-text">Career Readiness</span>
                    </div>

                    <div className="guide-pin-badge pin-4 green" style={{ top: '33%', left: '64%' }}>
                      <span className="guide-pin-num green">4</span>
                      <span className="guide-pin-text green">Luyện phỏng vấn AI</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};
