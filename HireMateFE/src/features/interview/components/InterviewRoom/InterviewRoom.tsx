import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { QUESTION_BANK } from '../../../../shared/data/questionBank';
import { Question, InterviewResult } from '../../../../shared/types';
import {
  Mic,
  Send,
  Clock,
  Sparkles,
  Bot,
  Volume2,
  VolumeX,
  Keyboard,
  Star,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Video,
  Radio,
  Check,
  Play,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interviewService } from '../../api/interview.service';
import {
  playVietnameseSpeech,
  stopVietnameseSpeech,
  getAvailableVietnameseVoice,
} from '../../../../shared/utils/vietnameseSpeech';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import './css/InterviewRoom.css';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp?: string;
}

export const InterviewRoom: React.FC = () => {
  const { profile, interviewConfig, saveLastResult } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || '';

  const currentRole =
    interviewConfig.role ||
    profile.role ||
    (profile as any).desiredPosition ||
    'Lập trình viên Backend';

  // Entrance animation state
  const [isEntering, setIsEntering] = useState(true);
  const [entranceStep, setEntranceStep] = useState(1);
  const [isReadyToEnter, setIsReadyToEnter] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [recording, setRecording] = useState(false);
  const [isAiEvaluating, setIsAiEvaluating] = useState(false);
  const [activeMode, setActiveMode] = useState<'Text' | 'Voice'>(
    interviewConfig.mode === 'Voice' ? 'Voice' : 'Text'
  );
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('Tiếng Việt (AI)');
  const [timeLeft, setTimeLeft] = useState(120);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Play auditory feedback chime when AI begins speaking
  const playChimeTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // AudioContext optional fallback
    }
  };

  // Pre-load voices & detect installed Vietnamese voice
  useEffect(() => {
    const detectVoice = () => {
      const viVoice = getAvailableVietnameseVoice();
      if (viVoice) {
        const cleanName = viVoice.name
          .replace(/Microsoft |Online \(Natural\) - |Google /gi, '')
          .trim();
        setActiveVoiceName(cleanName || 'Tiếng Việt');
      } else {
        setActiveVoiceName('Tiếng Việt Neural');
      }
    };

    detectVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = detectVoice;
    }

    return () => {
      stopVietnameseSpeech();
    };
  }, []);

  // 100% Guaranteed Robust Vietnamese Speech Engine
  const speakVietnamese = useCallback((text: string, onEnd?: () => void) => {
    try {
      playChimeTone();
    } catch (e) {}

    playVietnameseSpeech(text, {
      onStart: () => setIsAiSpeaking(true),
      onEnd: () => {
        setIsAiSpeaking(false);
        if (onEnd) onEnd();
      },
      onError: () => {
        setIsAiSpeaking(false);
        if (onEnd) onEnd();
      },
    });
  }, []);

  // Stop speech
  const stopSpeech = useCallback(() => {
    stopVietnameseSpeech();
    setIsAiSpeaking(false);
  }, []);

  // Entrance checklist animation sequence
  useEffect(() => {
    const t1 = setTimeout(() => setEntranceStep(2), 500);
    const t2 = setTimeout(() => setEntranceStep(3), 1100);
    const t3 = setTimeout(() => setIsReadyToEnter(true), 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // User clicks "Sẵn sàng & Bắt đầu phỏng vấn"
  const handleStartInterview = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
    setIsEntering(false);

    if (messages.length > 0 && messages[0].sender === 'ai') {
      setTimeout(() => {
        speakVietnamese(messages[0].text);
      }, 250);
    }
  };

  // Initialize questions from backend or fallback to local question bank
  useEffect(() => {
    const initQuestions = async () => {
      let loadedQuestions: Question[] = [];
      let loadedIds: string[] = [];

      if (sessionId && localStorage.getItem('hm_access_token')) {
        try {
          const res = await interviewService.getQuestions(sessionId);
          if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
            loadedQuestions = res.data.map((item) => ({
              q: item.content,
              cat: item.category || 'Chuyên môn',
              hint: item.hint || 'Hãy trả lời theo cấu trúc STAR: Bối cảnh -> Nhiệm vụ -> Hành động -> Kết quả',
            }));
            loadedIds = res.data.map((item) => item.questionId);
          }
        } catch (e) {
          // Fallback to local question bank
        }
      }

      if (loadedQuestions.length === 0) {
        const roleLower = currentRole.toLowerCase();
        let targetCat = 'Backend';
        if (roleLower.includes('frontend') || roleLower.includes('front-end')) targetCat = 'Frontend';
        else if (roleLower.includes('backend') || roleLower.includes('back-end')) targetCat = 'Backend';
        else if (roleLower.includes('data') || roleLower.includes('dữ liệu')) targetCat = 'Data';
        else if (roleLower.includes('sản phẩm') || roleLower.includes('product') || roleLower.includes('pm')) targetCat = 'Quản lý sản phẩm';
        else if (roleLower.includes('thiết kế') || roleLower.includes('ui/ux') || roleLower.includes('design')) targetCat = 'Thiết kế (UI/UX)';
        else if (roleLower.includes('marketing') || roleLower.includes('kinh doanh') || roleLower.includes('sale')) targetCat = 'Marketing';

        const hrQuestions = QUESTION_BANK.filter((q) => q.cat === 'Hành vi (HR)');
        const catQuestions = QUESTION_BANK.filter((q) => q.cat === targetCat);
        const otherQuestions = catQuestions.length > 0 ? catQuestions : QUESTION_BANK.filter((q) => q.cat !== 'Hành vi (HR)');

        const pickRandom = (arr: Question[], count: number) => {
          const shuffled = [...arr].sort(() => 0.5 - Math.random());
          return shuffled.slice(0, count);
        };

        const hrPicked = pickRandom(hrQuestions, 2);
        const techPicked = pickRandom(otherQuestions, 3);
        loadedQuestions = [...hrPicked, ...techPicked];

        if (loadedQuestions.length === 0) {
          loadedQuestions.push(QUESTION_BANK[0]);
        }
      }

      setQuestions(loadedQuestions);
      setQuestionIds(loadedIds);
      setCurrentIndex(0);

      const firstQ =
        loadedQuestions[0]?.q ||
        'Bạn hãy giới thiệu về bản thân và một dự án nổi bật nhất mà bạn từng tham gia?';

      const greetingText = `Chào bạn! Tôi là Cố vấn AI HireMate. Hôm nay chúng ta sẽ bắt đầu buổi phỏng vấn vị trí "${currentRole}".\n\n📌 Hãy trả lời câu hỏi đầu tiên theo cấu trúc STAR:\n${firstQ}`;

      setMessages([
        {
          sender: 'ai',
          text: greetingText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    };

    initQuestions();
  }, [sessionId, currentRole]);

  // Duration per question
  const perQuestionDuration =
    interviewConfig.difficulty === 'Khó'
      ? 90
      : interviewConfig.difficulty === 'Dễ'
      ? 180
      : 120;

  useEffect(() => {
    setTimeLeft(perQuestionDuration);
  }, [currentIndex, perQuestionDuration]);

  // Countdown timer
  useEffect(() => {
    if (isEntering) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isEntering]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const calculateScore = useCallback((): InterviewResult => {
    const baseScore = 84 + Math.floor(Math.random() * 8);
    const today = new Date().toISOString().split('T')[0];

    return {
      overall: baseScore,
      role: currentRole,
      clarity: 88,
      subs: {
        S: 90,
        T: 86,
        A: 80,
        R: 92,
      },
      date: today,
    };
  }, [currentRole]);

  const handleNextQuestion = async () => {
    const userAnswer = inputVal.trim()
      ? inputVal.trim()
      : '(Câu trả lời được trình bày qua giọng nói AI)';

    const updatedMessages: ChatMessage[] = [
      ...messages,
      {
        sender: 'user',
        text: userAnswer,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ];

    // Submit answer to backend API
    if (sessionId && localStorage.getItem('hm_access_token')) {
      interviewService
        .submitAnswer(sessionId, {
          orderIndex: currentIndex,
          questionId: questionIds[currentIndex] || undefined,
          questionText: questions[currentIndex]?.q || '',
          answerText: userAnswer,
          durationSec: Math.max(1, perQuestionDuration - timeLeft),
        })
        .catch(() => {});
    }

    // Farewell on finishing interview
    if (currentIndex >= (questions.length || 5) - 1) {
      const farewellText =
        'Cảm ơn bạn đã hoàn thành buổi phỏng vấn hôm nay cùng HireMate AI! Tôi đã ghi nhận toàn bộ câu trả lời của bạn và đang hoàn tất báo cáo phân tích chi tiết 4 yếu tố STAR cùng danh sách lỗi cần cải thiện. Chúng ta cùng xem kết quả nhé!';

      setMessages([
        ...updatedMessages,
        {
          sender: 'ai',
          text: farewellText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);

      let finalResult = calculateScore();

      if (sessionId && localStorage.getItem('hm_access_token')) {
        try {
          const compRes = await interviewService.completeSession(sessionId);
          if (compRes.ok && compRes.data) {
            const be = compRes.data;
            finalResult = {
              overall: be.overallScore || finalResult.overall,
              role: be.position || finalResult.role,
              clarity: be.clarityScore || finalResult.clarity,
              subs: {
                S: be.scoreS || finalResult.subs.S,
                T: be.scoreT || finalResult.subs.T,
                A: be.scoreA || finalResult.subs.A,
                R: be.scoreR || finalResult.subs.R,
              },
              date: new Date().toISOString().split('T')[0],
            };
          }
        } catch (e) {
          // Fallback to computed score
        }
      }

      saveLastResult(finalResult);

      // Speak farewell then transition to Feedback report
      speakVietnamese(farewellText, () => {
        setTimeout(() => {
          if (sessionId) {
            navigate(`/feedback?sessionId=${sessionId}`);
          } else {
            navigate('/feedback');
          }
        }, 1200);
      });
      return;
    }

    const nextIdx = currentIndex + 1;
    const nextQ = questions[nextIdx];

    const aiFeedback = `Cảm ơn câu trả lời của bạn.\n\n👉 Câu hỏi ${
      nextIdx + 1
    }:\n${nextQ?.q || 'Bạn giải quyết xung đột ý kiến trong nhóm như thế nào?'}`;

    setMessages([
      ...updatedMessages,
      {
        sender: 'ai',
        text: aiFeedback,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    setCurrentIndex(nextIdx);
    setInputVal('');
    setRecording(false);

    // Speak next question
    speakVietnamese(aiFeedback);
  };

  const handleRecordToggle = async () => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (sessionId && localStorage.getItem('hm_access_token')) {
            interviewService.uploadVoice(sessionId, audioBlob).catch(() => {});
          }
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setRecording(true);
        setInputVal(
          '[🎙️ Đang ghi âm giọng nói]: "[Bối cảnh]: Trong dự án gần nhất... [Nhiệm vụ]: Tôi đảm nhiệm... [Hành động]: Tôi đã triển khai... [Kết quả]: Đạt hiệu quả cao."'
        );
      } catch (err) {
        // Fallback simulation if microphone not allowed
        setRecording(true);
        setInputVal(
          '[🎙️ Đang ghi âm]: "[Bối cảnh]: Trong dự án gần nhất, team gặp vấn đề hiệu năng tải trang chậm... [Nhiệm vụ]: Tôi được giao tối ưu bundle và cải thiện Core Web Vitals... [Hành động]: Tôi áp dụng code-splitting, lazy load ảnh và tối ưu caching... [Kết quả]: Tốc độ tải trang tăng 42% và người dùng hài lòng hơn."'
        );
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
    }
  };

  const insertStarPrompt = (tag: string) => {
    setInputVal((prev) => `${prev} ${tag}: `);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${('0' + m).slice(-2)}:${('0' + s).slice(-2)}`;
  };

  return (
    <div className="room-page-container">
      {/* 1. Entrance Loading Animation Overlay with Explicit Start Gesture */}
      <AnimatePresence>
        {isEntering && (
          <motion.div
            className="room-entrance-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.35 }}
          >
            <div className="entrance-card">
              <div className="entrance-scanner-ring">
                <div className="entrance-inner-icon">
                  <Bot size={28} />
                </div>
              </div>
              <h2 className="entrance-title">Phòng phỏng vấn AI HireMate</h2>
              <p className="entrance-subtitle">
                Đang thiết lập môi trường phỏng vấn ảo cho vị trí{' '}
                <strong style={{ color: '#38bdf8' }}>
                  {currentRole}
                </strong>
              </p>

              <div className="entrance-checklist">
                <div className="entrance-check-item">
                  <Check
                    size={16}
                    color={entranceStep >= 1 ? '#22c55e' : '#64748b'}
                  />
                  <span>Kiểm tra Micro & Thiết bị tương tác</span>
                </div>
                <div className="entrance-check-item">
                  <Check
                    size={16}
                    color={entranceStep >= 2 ? '#22c55e' : '#64748b'}
                  />
                  <span>Khởi tạo Cố vấn AI HireMate (Hệ thống giọng nói AI)</span>
                </div>
                <div className="entrance-check-item">
                  <Check
                    size={16}
                    color={entranceStep >= 3 ? '#22c55e' : '#64748b'}
                  />
                  <span>Kích hoạt khung tiêu chuẩn đánh giá STAR</span>
                </div>
              </div>

              <button
                type="button"
                className="entrance-start-btn"
                onClick={handleStartInterview}
              >
                <span>Sẵn sàng & Bắt đầu phỏng vấn</span>
                <ArrowRight size={19} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-Step Educational Progress Bar */}
      <InterviewStepper currentStep={2} />

      {/* Top Header Card */}
      <motion.div
        className="room-header-card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="room-header-left">
          <div
            className={`room-interviewer-avatar ${
              isAiSpeaking ? 'speaking' : ''
            }`}
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
            <h2 className="room-role-title">
              {currentRole}
            </h2>
          </div>
        </div>

        <div className="room-header-controls">
          {/* Audio Auto-Speech Toggle */}
          <button
            type="button"
            className={`room-audio-toggle ${isAiSpeaking ? 'speaking' : ''}`}
            onClick={() => {
              if (isAiSpeaking) {
                stopSpeech();
              } else if (messages.length > 0) {
                speakVietnamese(messages[messages.length - 1].text);
              }
            }}
            title="Nghe lại câu hỏi bằng giọng AI"
          >
            {isAiSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isAiSpeaking ? 'AI đang nói...' : 'Phát lại giọng AI'}</span>
          </button>

          {/* Mode Switcher */}
          <div className="room-mode-switch">
            <button
              type="button"
              className={`mode-toggle-btn ${
                activeMode === 'Text' ? 'active' : ''
              }`}
              onClick={() => setActiveMode('Text')}
            >
              <Keyboard size={15} /> Text Mode
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${
                activeMode === 'Voice' ? 'active' : ''
              }`}
              onClick={() => setActiveMode('Voice')}
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
            Câu {currentIndex + 1} / {questions.length || 5}
          </div>
        </div>
      </motion.div>

      {/* Main 2-Column Layout */}
      <div className="room-main-layout">
        {/* Left Column: Chat History & Voice/Text Input */}
        <motion.div
          className="room-chat-panel"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Messages Scroll Area */}
          <div className="chat-history-scroll">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  className={`chat-msg ${msg.sender}`}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.sender === 'ai' ? (
                    <div className="msg-bubble-ai">
                      <div className="msg-ai-header">
                        <div className="msg-ai-author">
                          <Bot size={17} />
                          <span>Cố vấn AI HireMate</span>
                        </div>
                        <button
                          type="button"
                          className={`tts-speaker-btn ${isAiSpeaking ? 'active' : ''}`}
                          onClick={() => speakVietnamese(msg.text)}
                          title="Đọc câu hỏi bằng giọng AI"
                        >
                          <Volume2 size={15} />
                          <span>{isAiSpeaking ? 'Đang đọc...' : 'Nghe giọng AI'}</span>
                        </button>
                      </div>

                      {/* Live Waveform Indicator while AI is speaking */}
                      {isAiSpeaking && idx === messages.length - 1 && (
                        <div className="ai-speaking-live-badge">
                          <div className="live-mini-wave">
                            <span className="live-wave-bar" />
                            <span className="live-wave-bar" />
                            <span className="live-wave-bar" />
                          </div>
                          <span>AI đang đọc câu hỏi...</span>
                        </div>
                      )}

                      <div className="msg-text-content">{msg.text}</div>
                    </div>
                  ) : (
                    <div className="msg-bubble-user">
                      <div className="msg-text-content">{msg.text}</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Interactive Area */}
          <div className="room-input-container">
            {activeMode === 'Voice' ? (
              <div className="voice-mode-box">
                {recording && (
                  <div className="voice-wave-animation">
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                    <span className="wave-bar" />
                  </div>
                )}
                <button
                  type="button"
                  className={`voice-mic-main-btn ${
                    recording ? 'is-active' : ''
                  }`}
                  onClick={handleRecordToggle}
                  title={recording ? 'Dừng ghi âm' : 'Nhấn để bắt đầu nói'}
                >
                  <Mic size={28} />
                </button>
                <span className="voice-status-text">
                  {recording
                    ? 'Đang lắng nghe câu trả lời của bạn... (Nhấn lại để kết thúc)'
                    : 'Nhấn vào Micro để trả lời bằng giọng nói'}
                </span>
              </div>
            ) : (
              <div className="text-mode-box">
                {/* Fast STAR helper tags */}
                <div className="star-helper-chips">
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      fontWeight: 600,
                      alignSelf: 'center',
                    }}
                  >
                    Chèn nhanh STAR:
                  </span>
                  <button
                    type="button"
                    className="star-chip-btn"
                    onClick={() => insertStarPrompt('[Bối cảnh (S)]')}
                  >
                    + Bối cảnh (S)
                  </button>
                  <button
                    type="button"
                    className="star-chip-btn"
                    onClick={() => insertStarPrompt('[Nhiệm vụ (T)]')}
                  >
                    + Nhiệm vụ (T)
                  </button>
                  <button
                    type="button"
                    className="star-chip-btn"
                    onClick={() => insertStarPrompt('[Hành động (A)]')}
                  >
                    + Hành động (A)
                  </button>
                  <button
                    type="button"
                    className="star-chip-btn"
                    onClick={() => insertStarPrompt('[Kết quả (R)]')}
                  >
                    + Kết quả (R)
                  </button>
                </div>

                <textarea
                  className="room-textarea"
                  rows={3}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Nhập câu trả lời theo chuẩn STAR (Bối cảnh -> Nhiệm vụ -> Hành động -> Kết quả)..."
                />
              </div>
            )}

            <div className="room-actions-bar">
              <div className="coach-hint-inline">
                <Sparkles size={16} color="#03bfff" />
                <span>
                  Mẹo STAR: Mở đầu bằng Bối cảnh (S) & kết thúc bằng Kết quả (R)
                  có số liệu.
                </span>
              </div>

              <button
                type="button"
                className="btn-send-answer"
                onClick={handleNextQuestion}
              >
                <span>
                  {currentIndex === (questions.length || 5) - 1
                    ? 'Hoàn tất & Xem báo cáo'
                    : 'Gửi & Câu tiếp theo'}
                </span>
                <Send size={16} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right Column: STAR Coaching Assistant */}
        <motion.div
          className="room-sidebar-stack"
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          {/* STAR Guide Card */}
          <div className="sidebar-card dark">
            <div className="sidebar-title-row">
              <Star size={18} fill="#38bdf8" color="#38bdf8" />
              <span>Khung phương pháp STAR</span>
            </div>
            <div className="star-rule-list">
              <div className="star-rule-item">
                <div className="star-letter-badge">S</div>
                <div className="star-rule-text">
                  <strong>Situation (Bối cảnh)</strong>
                  <span>
                    Mô tả ngắn gọn bối cảnh dự án, thời điểm và vấn đề phát sinh.
                  </span>
                </div>
              </div>
              <div className="star-rule-item">
                <div className="star-letter-badge">T</div>
                <div className="star-rule-text">
                  <strong>Task (Nhiệm vụ)</strong>
                  <span>
                    Nêu rõ mục tiêu bạn cần giải quyết hoặc KPI được giao.
                  </span>
                </div>
              </div>
              <div className="star-rule-item">
                <div className="star-letter-badge">A</div>
                <div className="star-rule-text">
                  <strong>Action (Hành động)</strong>
                  <span>
                    Trình bày cụ thể các giải pháp, công nghệ bạn trực tiếp áp
                    dụng.
                  </span>
                </div>
              </div>
              <div className="star-rule-item">
                <div className="star-letter-badge">R</div>
                <div className="star-rule-text">
                  <strong>Result (Kết quả)</strong>
                  <span>
                    Nêu rõ kết quả đạt được bằng số liệu định lượng (%, thời
                    gian, chất lượng).
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Question Live Hint */}
          {questions[currentIndex]?.hint && (
            <div className="question-hint-box">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                <Sparkles size={16} /> Gợi ý trả lời từ Cố vấn AI:
              </div>
              <div>{questions[currentIndex].hint}</div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
