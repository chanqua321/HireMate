import React from 'react';
import { Settings, MessageSquare, Award, Check } from 'lucide-react';
import './css/InterviewStepper.css';

interface InterviewStepperProps {
  currentStep: 1 | 2 | 3;
}

export const InterviewStepper: React.FC<InterviewStepperProps> = ({ currentStep }) => {
  const steps = [
    {
      step: 1,
      title: 'Thiết lập & Mục tiêu',
      subtitle: 'Chọn ngành & định chuẩn STAR',
      icon: <Settings size={18} />,
    },
    {
      step: 2,
      title: 'Phòng phỏng vấn AI',
      subtitle: 'Luyện tập STAR & Voice/Text',
      icon: <MessageSquare size={18} />,
    },
    {
      step: 3,
      title: 'Báo cáo & Đánh giá STAR',
      subtitle: 'Phân tích năng lực 4 yếu tố',
      icon: <Award size={18} />,
    },
  ];

  return (
    <div className="interview-stepper-container">
      <div className="interview-stepper-track">
        {steps.map((item, index) => {
          const isCompleted = item.step < currentStep;
          const isCurrent = item.step === currentStep;

          return (
            <React.Fragment key={item.step}>
              {index > 0 && (
                <div
                  className={`stepper-line ${
                    item.step <= currentStep ? 'active' : ''
                  }`}
                />
              )}
              <div
                className={`stepper-node ${isCurrent ? 'is-current' : ''} ${
                  isCompleted ? 'is-completed' : ''
                }`}
              >
                <div className="stepper-icon-circle">
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : item.icon}
                </div>
                <div className="stepper-text-content">
                  <span className="stepper-step-number">BƯỚC 0{item.step}</span>
                  <span className="stepper-step-title">{item.title}</span>
                  <span className="stepper-step-subtitle">{item.subtitle}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
