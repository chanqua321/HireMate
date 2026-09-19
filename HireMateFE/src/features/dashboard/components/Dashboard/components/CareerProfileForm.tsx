import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Target,
  Briefcase,
  Cpu,
  GraduationCap,
  Award,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import './CareerProfileForm.css';

interface CareerProfileFormProps {
  onOpenWizardModal?: () => void;
  [key: string]: any;
}

export const CareerProfileForm: React.FC<CareerProfileFormProps> = ({
  onOpenWizardModal,
}) => {
  const wizardSteps = [
    {
      step: '01',
      title: 'Mục tiêu & Chuyên ngành',
      desc: 'Xác định vị trí ứng tuyển mục tiêu và lĩnh vực chuyên môn (IT, Marketing, Fintech...).',
      icon: <Target size={18} color="#0284c7" />,
    },
    {
      step: '02',
      title: 'Kinh nghiệm thực chiến',
      desc: 'Trình bày các dự án, số năm kinh nghiệm và vai trò trách nhiệm trong công việc.',
      icon: <Briefcase size={18} color="#0284c7" />,
    },
    {
      step: '03',
      title: 'Kỹ năng chuẩn ATS',
      desc: 'Trích xuất và tối ưu hóa từ khóa kỹ năng chuyên môn phù hợp với thuật toán tuyển dụng.',
      icon: <Cpu size={18} color="#0284c7" />,
    },
    {
      step: '04',
      title: 'Học vấn & Bằng cấp',
      desc: 'Cập nhật trường đào tạo, chuyên ngành, năm tốt nghiệp và các chứng chỉ quan trọng.',
      icon: <GraduationCap size={18} color="#0284c7" />,
    },
    {
      step: '05',
      title: 'Dự án & Thành tựu nổi bật',
      desc: 'Nêu bật các bài toán kỹ thuật đã giải quyết, chỉ số đo lường hiệu quả (%, ROI, ms).',
      icon: <Award size={18} color="#0284c7" />,
    },
    {
      step: '06',
      title: 'Xuất bản CV HireMate',
      desc: 'Định dạng chuẩn HireMate ATS, tự động liên kết với hệ thống phỏng vấn AI Coach.',
      icon: <FileCheck2 size={18} color="#0284c7" />,
    },
  ];

  return (
    <motion.div
      key="only-wizard-ai-view"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="wizard-only-studio-container"
    >
      {/* 1. Main Clean Hero Banner */}
      <div className="wizard-hero-clean-card">
        <div className="wizard-hero-tag">
          <Sparkles size={14} /> TÍNH NĂNG TẠO CV BẰNG AI 
        </div>

        <h3 className="wizard-hero-heading">
          Khởi tạo CV chuyên nghiệp theo chuẩn mẫu HireMate
        </h3>

        <p className="wizard-hero-paragraph">
          Công cụ hỗ trợ ứng viên xây dựng hồ sơ năng lực hoàn chỉnh từng bước qua AI .
          Dữ liệu sau khi tạo sẽ được chuẩn hóa cấu trúc ATS và trực tiếp kết nối với phòng phỏng vấn mô phỏng của hệ thống.
        </p>

        <div className="wizard-hero-cta-area">
          <button
            type="button"
            className="wizard-hero-main-btn"
            onClick={() => onOpenWizardModal?.()}
          >
            <Sparkles size={18} />
            <span>Bắt đầu tạo CV bằng AI Wizard (10 bước)</span>
            <ArrowRight size={17} />
          </button>
          <span className="wizard-hero-time-tag">
            ⏱️ Hoàn thành trong khoảng 3 - 5 phút • Tự động lưu vào hệ thống
          </span>
        </div>
      </div>

      {/* 2. Step Breakdown Grid (Clean SaaS Style) */}
      <div className="wizard-steps-grid-section">
        <div className="steps-grid-header">
          <h4 className="steps-grid-title">Lộ trình 10 bước tạo CV với AI Wizard</h4>
          <p className="steps-grid-subtitle">
            Hệ thống sẽ đồng hành cùng bạn hoàn thiện từng đề mục để tối ưu cơ hội trúng tuyển
          </p>
        </div>

        <div className="wizard-steps-cards-grid">
          {wizardSteps.map((item, idx) => (
            <div key={idx} className="wizard-step-clean-card">
              <div className="step-card-top">
                <div className="step-card-icon-box">{item.icon}</div>
                <span className="step-number-tag">Bước {item.step}</span>
              </div>
              <h5 className="step-card-name">{item.title}</h5>
              <p className="step-card-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Value Props Clean Bar */}
      <div className="wizard-value-props-bar">
        <div className="value-prop-item">
          <CheckCircle2 size={16} color="#0284c7" />
          <span>Định dạng chuẩn ATS 100%</span>
        </div>
        <div className="value-prop-item">
          <ShieldCheck size={16} color="#0284c7" />
          <span>Tự động tối ưu từ khóa ngành nghề</span>
        </div>
        <div className="value-prop-item">
          <Zap size={16} color="#0284c7" />
          <span>Đồng bộ ngay vào phòng phỏng vấn AI</span>
        </div>
      </div>
    </motion.div>
  );
};
