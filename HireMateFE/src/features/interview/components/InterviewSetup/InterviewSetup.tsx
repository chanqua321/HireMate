import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { INDUSTRY_ROLES } from '../../../../shared/data/questionBank';
import {
  Settings,
  Mic,
  MessageSquare,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Check,
  Briefcase,
  Award,
  Zap,
  Target,
  Flame,
  BookOpen,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import './css/InterviewSetup.css';

interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  icon: React.ReactNode;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <div className="custom-select-wrap" ref={containerRef}>
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="trigger-left">
          <div className="trigger-icon">{icon}</div>
          <div className="trigger-label">
            <span className="trigger-label-title">{label}</span>
            <span className="trigger-label-value">{value}</span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: isOpen ? '#03bfff' : '#64748b', display: 'flex' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="custom-select-menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            {options.map((opt) => {
              const selected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`custom-select-item ${selected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                >
                  <span>{opt}</span>
                  {selected && (
                    <Check size={18} style={{ color: '#0284c7', flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const InterviewSetup: React.FC = () => {
  const { profile, interviewConfig, updateInterviewConfig } = useApp();
  const navigate = useNavigate();

  const industries = Object.keys(INDUSTRY_ROLES);
  const initialField =
    interviewConfig.field || profile.field || 'Công nghệ thông tin';

  const [field, setField] = useState<string>(initialField);
  const [role, setRole] = useState<string>(() => {
    const validRoles = INDUSTRY_ROLES[initialField] || [];
    if (interviewConfig.role && validRoles.includes(interviewConfig.role)) {
      return interviewConfig.role;
    }
    if (profile.role && validRoles.includes(profile.role)) {
      return profile.role;
    }
    return validRoles[0] || 'Lập trình viên Frontend';
  });

  const [difficulty, setDifficulty] = useState<'Dễ' | 'Trung bình' | 'Khó'>(
    interviewConfig.difficulty || 'Trung bình'
  );
  const [mode, setMode] = useState<'Text' | 'Voice'>(
    interviewConfig.mode === 'Voice' || interviewConfig.mode === 'Giọng nói'
      ? 'Voice'
      : 'Text'
  );

  useEffect(() => {
    const validRoles = INDUSTRY_ROLES[field] || [];
    if (!validRoles.includes(role)) {
      setRole(validRoles[0] || '');
    }
  }, [field, role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateInterviewConfig({
      field,
      role,
      difficulty,
      mode,
    });
    navigate('/interview-room');
  };

  const currentRoles = INDUSTRY_ROLES[field] || [];

  const difficultyItems = [
    {
      id: 'Dễ' as const,
      label: 'Dễ',
      subtitle: 'Khởi động • 3 câu hỏi (180s/câu)',
      icon: <Zap size={20} />,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    {
      id: 'Trung bình' as const,
      label: 'Trung bình',
      subtitle: 'Chuẩn thực tế • 5 câu hỏi (120s/câu)',
      icon: <Target size={20} />,
      color: '#0284c7',
      bgColor: '#e0f2fe',
    },
    {
      id: 'Khó' as const,
      label: 'Khó',
      subtitle: 'Chuyên sâu • 5 câu hỏi (90s/câu)',
      icon: <Flame size={20} />,
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
  ];

  const modeItems = [
    {
      id: 'Text' as const,
      label: 'Văn bản (Text Mode)',
      subtitle: 'Gõ câu trả lời, nhận gợi ý thời gian thực chuẩn cấu trúc STAR',
      icon: <MessageSquare size={22} />,
    },
    {
      id: 'Voice' as const,
      label: 'Giọng nói (Voice Mode)',
      subtitle: 'Phỏng vấn đàm thoại bằng giọng nói Micro AI tự nhiên',
      icon: <Mic size={22} />,
    },
  ];

  return (
    <div className="setup-page-container">
      {/* 3-Step Educational Progress Bar */}
      <InterviewStepper currentStep={1} />

      <motion.div
        className="setup-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Hero Header Banner */}
        <div className="setup-header-banner">
          <div className="setup-header-badge">
            <Sparkles size={14} /> HIREMATE AI INTERVIEW ROOM
          </div>
          <h1 className="setup-header-title">Thiết lập phòng phỏng vấn AI</h1>
          <p className="setup-header-desc">
            Tùy chỉnh chuyên ngành, vị trí ứng tuyển, mức độ thử thách và hình thức phỏng vấn
            trước khi bắt đầu buổi tập luyện mô phỏng chuẩn STAR quốc tế.
          </p>
        </div>

        {/* Setup Form Body */}
        <div className="setup-body">
          <form onSubmit={handleSubmit}>
            {/* 1. Industry / Field Select */}
            <div style={{ marginBottom: '24px' }}>
              <div className="setup-section-label">
                <span className="setup-label-text">1. Chọn ngành nghề</span>
                <span className="setup-label-hint">Lĩnh vực hoạt động chuyên môn</span>
              </div>
              <CustomSelect
                label="Lĩnh vực chuyên môn"
                value={field}
                options={industries}
                onChange={(val) => setField(val)}
                icon={<Briefcase size={20} />}
              />
            </div>

            {/* 2. Target Role Select */}
            <div style={{ marginBottom: '28px' }}>
              <div className="setup-section-label">
                <span className="setup-label-text">2. Vị trí ứng tuyển</span>
                <span className="setup-label-hint">Vai trò công việc mục tiêu</span>
              </div>
              <CustomSelect
                label="Vị trí mục tiêu"
                value={role}
                options={currentRoles}
                onChange={(val) => setRole(val)}
                icon={<Award size={20} />}
              />
            </div>

            {/* 3. Difficulty Options */}
            <div style={{ marginBottom: '28px' }}>
              <div className="setup-section-label">
                <span className="setup-label-text">3. Mức độ câu hỏi phỏng vấn</span>
                <span className="setup-label-hint">Điều chỉnh độ khó và áp lực thời gian</span>
              </div>
              <div className="options-grid-3">
                {difficultyItems.map((item) => {
                  const active = difficulty === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`setup-option-card ${active ? 'is-active' : ''}`}
                      onClick={() => setDifficulty(item.id)}
                    >
                      <div
                        className="option-card-icon"
                        style={{
                          background: active ? '#03bfff' : item.bgColor,
                          color: active ? '#ffffff' : item.color,
                        }}
                      >
                        {item.icon}
                      </div>
                      <span className="option-card-title">{item.label}</span>
                      <span className="option-card-desc">{item.subtitle}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Interaction Mode Options */}
            <div style={{ marginBottom: '28px' }}>
              <div className="setup-section-label">
                <span className="setup-label-text">4. Hình thức tương tác</span>
                <span className="setup-label-hint">Chọn phương thức trả lời phỏng vấn</span>
              </div>
              <div className="options-grid-2">
                {modeItems.map((item) => {
                  const active = mode === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`setup-mode-card ${active ? 'is-active' : ''}`}
                      onClick={() => setMode(item.id)}
                    >
                      <div
                        className="option-card-icon"
                        style={{
                          background: active ? '#03bfff' : '#f0f9ff',
                          color: active ? '#ffffff' : '#0284c7',
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div className="option-card-title">{item.label}</div>
                        <div className="option-card-desc">{item.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Educational Framework Overview Box */}
            <div className="setup-educational-box">
              <div className="edu-box-header">
                <BookOpen size={18} />
                <span>Mục tiêu học tập & Bộ tiêu chuẩn đánh giá STAR</span>
              </div>
              <div className="edu-framework-grid">
                <div className="edu-pill-item">
                  <strong>⭐ S - Situation & T - Task (Bối cảnh & Nhiệm vụ)</strong>
                  <span>Mô tả rõ ràng bối cảnh dự án, quy mô thách thức và mục tiêu cụ thể bạn được giao phó.</span>
                </div>
                <div className="edu-pill-item">
                  <strong>🚀 A - Action & R - Result (Hành động & Kết quả)</strong>
                  <span>Trình bày chi tiết giải pháp kỹ thuật bạn trực tiếp triển khai và thành quả đo lường bằng số liệu.</span>
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <button type="submit" className="setup-submit-btn">
              <span>Vào phòng phỏng vấn AI ngay</span>
              <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
