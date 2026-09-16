import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  BookOpen,
  User,
  FileSearch,
  Video,
  Compass,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  Check,
  Layers,
  Image as ImageIcon,
  Target,
  Maximize2,
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
  imageSrc: string;
  imageAlt: string;
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
    badge: 'HỒ SƠ ƯU TIÊN (QUAN TRỌNG)',
    badgeColor: '#0284c7',
    icon: <User size={20} color="#0284c7" />,
    title: 'Hướng Dẫn Điền Hồ Sơ Đạt Chuẩn 100%',
    subtitle: 'Làm theo chỉ dẫn để AI hiểu rõ năng lực và may đo câu hỏi phỏng vấn chuẩn xác',
    purpose:
      'Cần hoàn thành 100% hồ sơ để AI biết thêm về bạn và tăng tối đa độ chính xác khi so khớp CV với JD, cũng như tạo ra bộ câu hỏi phỏng vấn sát nhất với vị trí mong muốn.',
    imageSrc: '/assets/guide/guide_profile_tutorial.png',
    imageAlt: 'Hình ảnh hướng dẫn chi tiết điền hồ sơ ứng viên chuẩn 100%',
    targetModule: 'Bảng điều khiển ➔ Tab: Hồ sơ ƯU TIÊN',
    requiredFields: [
      { name: '1. Họ và tên ứng viên (*)', desc: 'Thông tin bắt buộc có dấu (*). Nhập chính xác họ tên, không để trống hoặc sai.', required: true },
      { name: '2. Vị trí ứng tuyển mục tiêu (*)', desc: 'Nhập chính xác vị trí mong muốn (hoặc chọn nhanh ở các thẻ bên dưới).', required: true },
      { name: '3. Ngành nghề & Kinh nghiệm', desc: 'Chọn đúng ngành và số năm kinh nghiệm để AI phân loại hồ sơ chuẩn xác.', required: true },
      { name: '4. Thông tin học vấn', desc: 'Nhập chính xác tên trường ĐH/CĐ và năm tốt nghiệp dự kiến hoặc chính thức.', required: true },
      { name: '5. Kỹ năng cốt lõi (Ít nhất 5)', desc: 'Dữ liệu then chốt cho AI so khớp. Sử dụng thẻ gợi ý để thêm nhanh kỹ năng phổ biến.', required: true },
      { name: '6. Mục tiêu nghề nghiệp & Giới thiệu', desc: 'Đừng để trống. Viết tóm tắt mục tiêu và mô tả bản thân.', required: true },
      { name: '7. Nhấn nút "Lưu thay đổi hồ sơ" (*)', desc: 'Sau khi nhập đủ, BẮT BUỘC PHẢI NHẤN NÚT NÀY để lưu lại và đồng bộ với AI.', required: true },
    ],
    aiTips: [
      'Điền đủ 100% mức độ hoàn thiện để kích hoạt toàn bộ tính năng AI và đề xuất việc làm.',
      'Bạn có thể bấm trực tiếp vào ảnh minh họa bên trái để phóng to xem chi tiết từng mũi tên chỉ dẫn.',
    ],
  },
  {
    id: 2,
    badge: 'BƯỚC 2: TỰ ĐỘNG HÓA CV',
    badgeColor: '#10b981',
    icon: <FileSearch size={20} color="#10b981" />,
    title: 'Quét & Bóc tách CV Thông Minh bằng AI',
    subtitle: 'Nhận diện tự động học vấn, kinh nghiệm và tính điểm chuẩn ATS',
    purpose:
      'Thay vì mất thời gian gõ lại từng mục thông tin, bạn chỉ cần tải lên file CV (PDF/Word). Bộ máy OCR AI của HireMate sẽ bóc tách cấu trúc, tự động điền vào hồ sơ cá nhân và kiểm tra mức độ tối ưu từ khóa với hệ thống tuyển dụng ATS.',
    imageSrc: '/assets/guide/step2_cv_scan.png',
    imageAlt: 'Hướng dẫn quét CV bằng trí tuệ nhân tạo',
    targetModule: 'Bảng điều khiển ➔ Tab 2: Quét CV bằng AI (Scan)',
    requiredFields: [
      { name: 'Tải lên file CV cá nhân', desc: 'Hỗ trợ định dạng PDF hoặc DOCX (dung lượng tối đa 10MB).', required: false },
      { name: 'Hoặc chọn Dùng CV mẫu', desc: 'Có sẵn CV mẫu Frontend, Backend, Data, Tester để thử nghiệm tức thì.', required: false },
      { name: 'Nút "Áp dụng vào hồ sơ"', desc: 'Bấm nút để lưu dữ liệu vừa bóc tách trực tiếp vào CSDL tài khoản.', required: true },
    ],
    aiTips: [
      'Bộ quét CV hỗ trợ song ngữ Tiếng Việt và Tiếng Anh hoàn toàn tự động.',
      'Sau khi quét xong, bạn có thể kiểm tra danh sách từ khóa ATS còn thiếu để bổ sung vào CV trước khi nộp việc.',
    ],
  },
  {
    id: 3,
    badge: 'BƯỚC 3: LUYỆN ĐỐI THOẠI',
    badgeColor: '#8b5cf6',
    icon: <Video size={20} color="#8b5cf6" />,
    title: 'Phòng Phỏng Vấn AI Giọng Nói Chuẩn STAR',
    subtitle: 'Rèn luyện phản xạ nói tiếng Việt 1-1 với chuyên gia AI',
    purpose:
      'Trải nghiệm phỏng vấn ảo chân thực như ngồi trước nhà tuyển dụng. AI đọc câu hỏi bằng giọng nói tự nhiên, lắng nghe bạn trả lời qua micro và phân tích câu trả lời theo 4 thành phần chuẩn STAR (Situation - Task - Action - Result).',
    imageSrc: '/assets/guide/step3_interview.png',
    imageAlt: 'Hướng dẫn phòng phỏng vấn ảo AI chuẩn STAR',
    targetModule: 'Menu chính ➔ Phỏng vấn AI (Interview Setup)',
    requiredFields: [
      { name: 'Cấp quyền Micro', desc: 'Cho phép trình duyệt dùng micro để AI nhận diện giọng nói tiếng Việt.', required: true },
      { name: 'Chọn phòng & số câu hỏi', desc: 'Tùy chỉnh số lượng 3 - 5 câu hỏi tình huống hành vi hoặc kỹ thuật.', required: true },
      { name: 'Cấu hình giọng AI', desc: 'Lựa chọn giọng đọc truyền cảm (Nam miền Bắc, Nữ miền Nam,...).', required: false },
    ],
    aiTips: [
      'Hãy cấu trúc câu trả lời theo đúng 4 phần: Nêu bối cảnh ➔ Trách nhiệm được giao ➔ Hành động cụ thể ➔ Kết quả đạt được.',
      'Đặc biệt lưu ý đưa số liệu định lượng vào phần Kết quả (ví dụ: "giảm 30% thời gian tải", "tăng 15% doanh số") để đạt điểm STAR tuyệt đối.',
    ],
  },
  {
    id: 4,
    badge: 'BƯỚC 4: BỨT PHÁ SỰ NGHIỆP',
    badgeColor: '#f59e0b',
    icon: <Compass size={20} color="#f59e0b" />,
    title: 'Career OS & Bảng Vàng Năng Lực',
    subtitle: 'Đo lường điểm sẵn sàng tuyển dụng và nhận diện lỗ hổng kỹ năng',
    purpose:
      'Hệ điều hành sự nghiệp toàn diện theo dõi Career Readiness Score (tổng hòa 50% điểm STAR, 25% điểm CV ATS, 25% độ tương thích JD). AI ghi nhớ những điểm yếu bạn hay mắc phải để gợi ý khóa học và bài luyện tập cải thiện trong 3-6 tháng tới.',
    imageSrc: '/assets/guide/step4_roadmap.png',
    imageAlt: 'Hướng dẫn hệ điều hành sự nghiệp Career OS và Bảng xếp hạng',
    targetModule: 'Menu chính ➔ Career OS & Bảng vàng (Leaderboard)',
    requiredFields: [
      { name: 'Biểu đồ Career Readiness', desc: 'Theo dõi điểm tổng hợp sau từng phiên phỏng vấn để thấy sự tiến bộ.', required: true },
      { name: 'AI Memory Insights', desc: 'Đọc lời khuyên từ AI về các lỗi lặp từ ("à, ừm") và kỹ năng cần rèn thêm.', required: true },
      { name: 'Bộ sưu tập Huy hiệu & Streak', desc: 'Duy trì luyện tập hằng ngày để thăng hạng trong Top 20 ứng viên xuất sắc.', required: false },
    ],
    aiTips: [
      'Duy trì luyện tập đều đặn 1 phiên mỗi ngày để giữ vững chuỗi Streak và nhận thêm lượt phỏng vấn Pro.',
      'Sử dụng mục Đối sánh chuẩn ngành (Benchmark) để biết mình đang ở đâu so với các ứng viên cùng vị trí.',
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

  // Handle ESC key press
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
    // Lưu cờ đã xem vĩnh viễn cho tài khoản này
    localStorage.setItem(`hm_tutorial_seen_${accountKey}`, 'true');
    localStorage.removeItem('hm_daily_guide_last_seen');
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="guide-modal-overlay" onClick={handleClose}>
          <motion.div
            className="guide-modal-card"
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
                    Nắm rõ mục đích từng phân hệ và cách khai thác tối đa sức mạnh AI
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
                      {step.title.split(' ')[0]} {step.title.split(' ')[1]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body: Two Column Layout */}
            <div className="guide-modal-body">
              {/* Left Column: Image Illustration Slot */}
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
                      <div className="guide-image-zoom-badge">
                        <Maximize2 size={13} /> Phóng to ảnh
                      </div>
                    </>
                  ) : (
                    /* Graphic Fallback when real image is not found */
                    <div className="guide-image-placeholder">
                      <div className="guide-placeholder-glow" />
                      <div className="guide-placeholder-icon">
                        {currentStep.icon}
                      </div>
                      <div className="guide-placeholder-badge">
                        <ImageIcon size={14} /> Khung hiển thị hình ảnh minh họa
                      </div>
                      <div className="guide-placeholder-caption">
                        {currentStep.title}
                      </div>
                      <div className="guide-placeholder-hint">
                        📁 Đường dẫn ảnh: <code>{currentStep.imageSrc}</code>
                      </div>
                    </div>
                  )}

                  {/* Target module locator pill */}
                  <div className="guide-module-locator">
                    <Layers size={13} color="#0284c7" />
                    <span>{currentStep.targetModule}</span>
                  </div>
                </div>

                {/* AI Tip Box */}
                <div className="guide-ai-tip-box">
                  <div className="guide-tip-header">
                    <Lightbulb size={16} color="#eab308" />
                    <span>Mẹo chuyên gia AI:</span>
                  </div>
                  <ul className="guide-tip-list">
                    {currentStep.aiTips.map((tip, tIdx) => (
                      <li key={tIdx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Step Info & Purpose & Fields */}
              <div className="guide-info-column">
                {/* Step Badge & Title */}
                <div className="guide-step-header">
                  <span
                    className="guide-step-badge"
                    style={{
                      background: `${currentStep.badgeColor}18`,
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
                    <Target size={15} color="#0284c7" /> Mục đích của bước này:
                  </h5>
                  <p className="guide-purpose-desc">{currentStep.purpose}</p>
                </div>

                {/* Required Fields Section */}
                <div className="guide-section-block">
                  <h5 className="guide-block-heading">
                    <CheckCircle2 size={15} color="#10b981" /> Hướng dẫn thao tác & Các trường cần nhập:
                  </h5>
                  <div className="guide-fields-list">
                    {currentStep.requiredFields.map((f, fIdx) => (
                      <div key={fIdx} className="guide-field-item">
                        <div className="guide-field-header">
                          <span className="guide-field-name">{f.name}</span>
                          {f.required ? (
                            <span className="guide-req-badge required">Bắt buộc</span>
                          ) : (
                            <span className="guide-req-badge optional">Tùy chọn</span>
                          )}
                        </div>
                        <p className="guide-field-desc">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="guide-modal-footer">
              <div className="guide-footer-account-note">
                <CheckCircle2 size={15} color="#10b981" />
                <span>Popup sẽ chỉ hiển thị 1 lần cho tài khoản mới. Bạn có thể bấm nút <strong>Tutorial</strong> để xem lại bất cứ lúc nào.</span>
              </div>

              <div className="guide-footer-actions">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    className="guide-btn-prev"
                    onClick={handlePrev}
                  >
                    <ChevronLeft size={16} /> Quay lại
                  </button>
                )}

                <button
                  type="button"
                  className="guide-btn-next"
                  onClick={handleNext}
                >
                  {currentStepIndex < GUIDE_STEPS.length - 1 ? (
                    <>
                      <span>Tiếp theo ({currentStepIndex + 1}/{GUIDE_STEPS.length})</span>
                      <ChevronRight size={16} />
                    </>
                  ) : (
                    <>
                      <span>Đã hiểu & Bắt đầu</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Lightbox Modal when user clicks image to zoom in */}
          {lightboxOpen && !imageError[currentStep.id] && (
            <div
              className="guide-lightbox-overlay"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
            >
              <div className="guide-lightbox-content" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="guide-lightbox-close"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Đóng phóng to"
                >
                  <X size={20} />
                </button>
                <img
                  src={currentStep.imageSrc}
                  alt={currentStep.imageAlt}
                  className="guide-lightbox-img"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default DashboardGuideModal;
