import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Volume2, VolumeX, Keyboard, Mic, Clock } from 'lucide-react';
import './RoomHeader.css';

interface RoomHeaderProps {
  currentRole: string;
  isAiSpeaking: boolean;
  activeMode: 'Text' | 'Voice';
  timeLeft: number;
  currentIndex: number;
  totalQuestions: number;
  onToggleSpeech: () => void;
  onModeChange: (mode: 'Text' | 'Voice') => void;
  formatTime: (seconds: number) => string;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  currentRole,
  isAiSpeaking,
  activeMode,
  timeLeft,
  currentIndex,
  totalQuestions,
  onToggleSpeech,
  onModeChange,
  formatTime,
}) => {
  return (
    <motion.div
      className="room-header-card"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="room-header-left">
        <div
          className={`room-interviewer-avatar ${isAiSpeaking ? 'speaking' : ''}`}
          title={
            isAiSpeaking
              ? 'Cố vấn AI đang nói...'
              : 'Cố vấn AI HireMate đang lắng nghe'
          }
        >
          <Bot size={26} />
          <span className="avatar-online-dot" />
        </div>

        <div className="room-role-tag">
          <span className="room-eyebrow">
            <Sparkles size={13} /> Phỏng vấn AI thực chiến
          </span>
          <h2 className="room-role-title">{currentRole}</h2>
        </div>
      </div>

      <div className="room-header-controls">
        {/* Audio Auto-Speech Toggle */}
        <button
          type="button"
          className={`room-audio-toggle ${isAiSpeaking ? 'speaking' : ''}`}
          onClick={onToggleSpeech}
          title="Nghe lại câu hỏi bằng giọng AI"
        >
          {isAiSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{isAiSpeaking ? 'AI đang nói...' : 'Phát lại giọng AI'}</span>
        </button>

        {/* Mode Switcher */}
        <div className="room-mode-switch">
          <button
            type="button"
            className={`mode-toggle-btn ${activeMode === 'Text' ? 'active' : ''}`}
            onClick={() => onModeChange('Text')}
          >
            <Keyboard size={15} /> Text Mode
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${activeMode === 'Voice' ? 'active' : ''}`}
            onClick={() => onModeChange('Voice')}
          >
            <Mic size={15} /> Voice Mode
          </button>
        </div>

        {/* Timer Badge */}
        <div className={`room-timer-badge ${timeLeft < 30 ? 'warning' : ''}`}>
          <Clock size={16} />
          <span>{formatTime(timeLeft)}</span>
        </div>

        {/* Question Index Pill */}
        <div className="room-question-badge">
          Câu {currentIndex + 1} / {totalQuestions || 5}
        </div>
      </div>
    </motion.div>
  );
};
