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
  lockMode?: boolean;
  sessionLabel?: string;
  warningText?: string | null;
  language: 'vi' | 'en';
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
  lockMode = false,
  sessionLabel,
  warningText,
  language,
}) => {
  const en = language === 'en';
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
              ? (en ? 'AI Coach is speaking...' : 'Cố vấn AI đang nói...')
              : (en ? 'HireMate AI Coach is listening' : 'Cố vấn AI HireMate đang lắng nghe')
          }
        >
          <Bot size={26} />
          <span className="avatar-online-dot" />
        </div>

        <div className="room-role-tag">
          <span className="room-eyebrow">
            <Sparkles size={13} /> {sessionLabel || (en ? 'AI mock interview' : 'Phỏng vấn AI thực chiến')}
          </span>
          <h2 className="room-role-title">{currentRole}</h2>
        </div>
      </div>

      <div className="room-header-controls">
        <button
          type="button"
          className={`room-audio-toggle ${isAiSpeaking ? 'speaking' : ''}`}
          onClick={onToggleSpeech}
          title={en ? 'Listen to the latest AI message' : 'Nghe lại nội dung AI gần nhất'}
        >
          {isAiSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span>{isAiSpeaking ? (en ? 'AI is speaking...' : 'AI đang nói...') : (en ? 'Listen again' : 'Nghe lại câu hỏi')}</span>
        </button>

        {!lockMode && (
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
        )}

        {lockMode && (
          <div className="room-mode-switch">
            <button type="button" className="mode-toggle-btn active" disabled>
              <Mic size={15} /> Voice
            </button>
          </div>
        )}

        <div className={`room-timer-badge ${timeLeft < 60 ? 'warning' : ''}`}>
          <Clock size={16} />
          <span>{formatTime(timeLeft)}{lockMode ? ' / 15:00' : ''}</span>
        </div>

        {warningText && (
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B45309' }}>{warningText}</div>
        )}

        <div className="room-question-badge">
          {en ? 'Question' : 'Câu'} {currentIndex + 1} / {totalQuestions || 5}
        </div>
      </div>
    </motion.div>
  );
};
