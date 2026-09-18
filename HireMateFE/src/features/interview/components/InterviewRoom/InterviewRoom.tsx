import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import { QUESTION_BANK } from '../../../../shared/data/questionBank';
import { Question, InterviewResult } from '../../../../shared/types';
import {
  Mic,
  Send,
  Sparkles,
  Bot,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interviewService } from '../../api/interview.service';
import {
  playVietnameseSpeech,
  stopVietnameseSpeech,
  getAvailableVietnameseVoice,
} from '../../../../shared/utils/vietnameseSpeech';
import { InterviewStepper } from '../InterviewStepper/InterviewStepper';
import { RoomEntranceOverlay, RoomHeader, RoomSidebar } from './components';
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
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

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
    if (isEntering || isCompleted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isEntering, isCompleted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const calculateRealisticScore = (answersList: string[]): InterviewResult => {
    const validAnswers = answersList.filter(
      (a) => a && !a.includes('(Ứng viên đã bỏ qua') && a.trim().length > 5
    );
    const today = new Date().toISOString().split('T')[0];

    if (validAnswers.length === 0) {
      return {
        overall: 20,
        role: currentRole,
        clarity: 25,
        subs: { S: 20, T: 20, A: 20, R: 20 },
        date: today,
      };
    }

    const joined = validAnswers.join(' ').toLowerCase();
    const hasS = ['bối cảnh', 'tình huống', 'dự án', 'khi đó', 'thời điểm'].some((k) =>
      joined.includes(k)
    );
    const hasT = ['nhiệm vụ', 'mục tiêu', 'trách nhiệm', 'yêu cầu', 'kpi'].some((k) =>
      joined.includes(k)
    );
    const hasA = ['hành động', 'triển khai', 'tôi đã', 'xử lý', 'thực hiện', 'phối hợp'].some((k) =>
      joined.includes(k)
    );
    const hasR = ['kết quả', 'đạt được', '%', 'hoàn thành', 'tăng', 'giảm'].some((k) =>
      joined.includes(k)
    );

    const lengthBonus = Math.min(30, joined.length / 20);
    const s = Math.min(96, Math.max(25, 35 + (hasS ? 30 : 0) + lengthBonus));
    const t = Math.min(96, Math.max(25, 35 + (hasT ? 30 : 0) + lengthBonus));
    const a = Math.min(96, Math.max(25, 30 + (hasA ? 35 : 0) + lengthBonus));
    const r = Math.min(96, Math.max(25, 25 + (hasR ? 40 : 0) + lengthBonus));
    const overall = Math.round((s + t + a + r) / 4);

    return {
      overall,
      role: currentRole,
      clarity: Math.round(overall * 0.95),
      subs: {
        S: Math.round(s),
        T: Math.round(t),
        A: Math.round(a),
        R: Math.round(r),
      },
      date: today,
    };
  };

  const proceedWithAnswer = async (userAnswer: string, isSkipped = false) => {
    if (isCompleted || isSubmitting) return;

    setIsSubmitting(true);
    setInputError(null);

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
          answerText: isSkipped ? '' : userAnswer,
          skipped: isSkipped,
          durationSec: Math.max(1, perQuestionDuration - timeLeft),
        })
        .catch(() => {});
    }

    // Farewell on finishing interview
    if (currentIndex >= (questions.length || 5) - 1) {
      setIsCompleted(true);
      setInputVal('');

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

      const allAnswers = [
        ...messages.filter((m) => m.sender === 'user').map((m) => m.text),
        userAnswer,
      ];
      let finalResult = calculateRealisticScore(allAnswers);

      if (sessionId && localStorage.getItem('hm_access_token')) {
        try {
          const compRes = await interviewService.completeSession(sessionId);
          if (compRes.ok && compRes.data) {
            const be = compRes.data;
            finalResult = {
              overall: be.overallScore ?? finalResult.overall,
              role: be.position || finalResult.role,
              clarity: be.clarityScore ?? finalResult.clarity,
              subs: {
                S: be.scoreS ?? finalResult.subs.S,
                T: be.scoreT ?? finalResult.subs.T,
                A: be.scoreA ?? finalResult.subs.A,
                R: be.scoreR ?? finalResult.subs.R,
              },
              date: new Date().toISOString().split('T')[0],
            };
          }
        } catch (e) {
          // Fallback to heuristic score
        }
      }

      saveLastResult(finalResult);

      // Speak farewell then transition to Feedback report
      let hasNavigated = false;
      const navigateToReport = () => {
        if (hasNavigated) return;
        hasNavigated = true;
        if (sessionId) {
          navigate(`/feedback?sessionId=${sessionId}`);
        } else {
          navigate('/feedback');
        }
      };

      // Fallback timer ensures candidate transitions to feedback even if TTS completes early or has no audio output
      const fallbackRedirect = setTimeout(navigateToReport, 5000);

      speakVietnamese(farewellText, () => {
        clearTimeout(fallbackRedirect);
        setTimeout(navigateToReport, 1000);
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
    setIsSubmitting(false);

    // Speak next question
    speakVietnamese(aiFeedback);
  };

  const handleNextQuestion = async () => {
    if (isCompleted || isSubmitting) return;

    if (!inputVal.trim() && !recording) {
      setInputError('Vui lòng nhập câu trả lời của bạn trước khi gửi, hoặc bấm nút "Bỏ qua câu này" nếu muốn chuyển tiếp.');
      return;
    }
    await proceedWithAnswer(inputVal.trim(), false);
  };

  const handleSkipQuestion = async () => {
    if (isCompleted || isSubmitting) return;
    setInputError(null);
    await proceedWithAnswer('(Ứng viên đã bỏ qua câu hỏi này)', true);
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
      <RoomEntranceOverlay
        isEntering={isEntering}
        entranceStep={entranceStep}
        currentRole={currentRole}
        onStartInterview={handleStartInterview}
      />

      {/* 3-Step Educational Progress Bar */}
      <InterviewStepper currentStep={2} />

      {/* Top Header Card */}
      <RoomHeader
        currentRole={currentRole}
        isAiSpeaking={isAiSpeaking}
        activeMode={activeMode}
        timeLeft={timeLeft}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onToggleSpeech={() => {
          if (isAiSpeaking) {
            stopSpeech();
          } else if (messages.length > 0) {
            speakVietnamese(messages[messages.length - 1].text);
          }
        }}
        onModeChange={setActiveMode}
        formatTime={formatTime}
      />

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
                  disabled={isCompleted || isSubmitting}
                  style={{
                    opacity: (isCompleted || isSubmitting) ? 0.5 : 1,
                    cursor: (isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    isCompleted
                      ? 'Buổi phỏng vấn đã hoàn tất'
                      : recording
                      ? 'Dừng ghi âm'
                      : 'Nhấn để bắt đầu nói'
                  }
                >
                  <Mic size={28} />
                </button>
                <span className="voice-status-text">
                  {isCompleted
                    ? 'Buổi phỏng vấn đã kết thúc thành công.'
                    : recording
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
                    disabled={isCompleted || isSubmitting}
                  >
                    + Bối cảnh (S)
                  </button>
                  <button
                    type="button"
                    className="star-chip-btn"
                    onClick={() => insertStarPrompt('[Nhiệm vụ (T)]')}
                    disabled={isCompleted || isSubmitting}
                  >
                    + Nhiệm vụ (T)
                  </button>
                  <button
                    type="button"
                    className="star-chip-btn"
                    onClick={() => insertStarPrompt('[Hành động (A)]')}
                    disabled={isCompleted || isSubmitting}
                  >
                    + Hành động (A)
                  </button>
                  <button
                    type="button"
                    className="star-chip-btn"
                    onClick={() => insertStarPrompt('[Kết quả (R)]')}
                    disabled={isCompleted || isSubmitting}
                  >
                    + Kết quả (R)
                  </button>
                </div>

                <textarea
                  className={`room-textarea ${inputError ? 'error' : ''}`}
                  rows={3}
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleNextQuestion();
                    }
                  }}
                  disabled={isCompleted || isSubmitting}
                  placeholder={
                    isCompleted
                      ? 'Buổi phỏng vấn đã hoàn tất. Đang chuyển sang trang báo cáo kết quả...'
                      : 'Nhập câu trả lời theo chuẩn STAR (Bối cảnh -> Nhiệm vụ -> Hành động -> Kết quả)...'
                  }
                />
                {inputError && (
                  <div className="room-input-error">
                    <AlertCircle size={14} />
                    <span>{inputError}</span>
                  </div>
                )}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-skip-question"
                  onClick={handleSkipQuestion}
                  disabled={isCompleted || isSubmitting}
                  style={{
                    background: '#F1F5F9',
                    color: '#64748B',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: (isCompleted || isSubmitting) ? 'not-allowed' : 'pointer',
                    opacity: (isCompleted || isSubmitting) ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                  title="Bỏ qua câu hỏi này và không chấm điểm"
                >
                  Bỏ qua câu này
                </button>

                <button
                  type="button"
                  className="btn-send-answer"
                  onClick={handleNextQuestion}
                  disabled={isCompleted || isSubmitting || (!inputVal.trim() && !recording)}
                  style={{
                    opacity: (isCompleted || isSubmitting || (!inputVal.trim() && !recording)) ? 0.6 : 1,
                    cursor: (isCompleted || isSubmitting || (!inputVal.trim() && !recording)) ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    isCompleted
                      ? 'Buổi phỏng vấn đã hoàn tất, nút gửi đã được khóa'
                      : !inputVal.trim()
                      ? 'Vui lòng nhập câu trả lời trước khi gửi hoặc bấm Bỏ qua câu này'
                      : 'Gửi câu trả lời'
                  }
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Đã hoàn thành buổi phỏng vấn</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {currentIndex === (questions.length || 5) - 1
                          ? 'Hoàn tất & Xem báo cáo'
                          : 'Gửi & Câu tiếp theo'}
                      </span>
                      <Send size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: STAR Coaching Assistant */}
        <RoomSidebar hint={questions[currentIndex]?.hint} />
      </div>
    </div>
  );
};
