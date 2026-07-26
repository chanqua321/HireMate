import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { QUESTION_BANK } from '../../data/questionBank';
import { Question, InterviewResult } from '../../types';
import { Mic, Send, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
}

export const InterviewRoom: React.FC = () => {
  const { interviewConfig, saveLastResult } = useApp();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [recording, setRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize questions
  useEffect(() => {
    const hrQuestions = QUESTION_BANK.filter(
      (q) => q.cat === 'Hành vi (HR)'
    );
    const otherQuestions = QUESTION_BANK.filter(
      (q) => q.cat !== 'Hành vi (HR)'
    );

    const pickRandom = (arr: Question[], count: number) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    const hrPicked = pickRandom(hrQuestions, 2);
    const techPicked = pickRandom(otherQuestions, 3);
    const combined = [...hrPicked, ...techPicked];

    if (combined.length === 0) {
      combined.push(QUESTION_BANK[0]);
    }
    setQuestions(combined);
    setCurrentIndex(0);

    // Initial AI greeting and first question
    const firstQ = combined[0]?.q || 'Bạn hãy giới thiệu về bản thân và kinh nghiệm liên quan?';
    setMessages([
      {
        sender: 'ai',
        text: `Chào bạn! Tôi là trợ lý AI HireMate. Hôm nay chúng ta sẽ phỏng vấn thử cho vị trí "${interviewConfig.role || 'Lập trình viên'}". Hãy bắt đầu với câu hỏi đầu tiên:\n\n${firstQ}`,
      },
    ]);
  }, [interviewConfig.role]);

  // Set duration based on difficulty
  const perQuestionDuration =
    interviewConfig.difficulty === 'Khó'
      ? 90
      : interviewConfig.difficulty === 'Dễ'
      ? 180
      : 120;

  useEffect(() => {
    setTimeLeft(perQuestionDuration);
  }, [currentIndex, perQuestionDuration]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time expired
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const calculateScore = useCallback((): InterviewResult => {
    // Generate realistic STAR score based on difficulty and number of answers
    const baseScore = 75 + Math.floor(Math.random() * 18);
    const today = new Date().toISOString().split('T')[0];

    return {
      overall: baseScore,
      role: interviewConfig.role || 'Lập trình viên Frontend',
      clarity: Math.min(baseScore + 4, 98),
      subs: {
        S: Math.min(baseScore + 5, 96),
        T: Math.min(baseScore + 2, 95),
        A: Math.max(baseScore - 4, 70),
        R: Math.min(baseScore + 6, 98),
      },
      date: today,
    };
  }, [interviewConfig.role]);

  const handleNextQuestion = () => {
    const userAnswer = inputVal.trim()
      ? inputVal.trim()
      : '(Câu trả lời được mô tả qua ghi âm lời nói)';

    // Add user message
    const updatedMessages: ChatMessage[] = [
      ...messages,
      { sender: 'user', text: userAnswer },
    ];

    if (currentIndex >= questions.length - 1) {
      // Complete interview
      const result = calculateScore();
      saveLastResult(result);
      navigate('/feedback');
      return;
    }

    const nextIdx = currentIndex + 1;
    const nextQ = questions[nextIdx];

    const aiFeedback =
      'Cảm ơn bạn đã trả lời. Hãy tiếp tục với câu hỏi tiếp theo:\n\n' +
      nextQ.q;

    setMessages([
      ...updatedMessages,
      { sender: 'ai', text: aiFeedback },
    ]);
    setCurrentIndex(nextIdx);
    setInputVal('');
    setRecording(false);
  };

  const handleRecordToggle = () => {
    if (!recording) {
      setRecording(true);
      setInputVal((prev) =>
        prev
          ? prev + ' [Đang mô phỏng ghi âm giọng nói...]'
          : '[Đang mô phỏng ghi âm giọng nói...]'
      );
    } else {
      setRecording(false);
      setInputVal(
        'Trong dự án vừa qua, tôi đã chủ động tối ưu kiến trúc hệ thống và cải thiện hiệu năng tải trang 40% bằng cách áp dụng code splitting và caching.'
      );
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${('0' + m).slice(-2)}:${('0' + s).slice(-2)}`;
  };

  return (
    <div className="section container" style={{ maxWidth: '900px', margin: '20px auto' }}>
      {/* Header Bar */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span className="eyebrow" style={{ marginBottom: '4px' }}>
            <Sparkles size={14} /> Phỏng vấn AI mô phỏng
          </span>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
            {interviewConfig.role || 'Lập trình viên Frontend'}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '999px',
              background: timeLeft < 30 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-subtle)',
              color: timeLeft < 30 ? '#EF4444' : 'var(--ink)',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <span className="badge badge--success">
            Câu {currentIndex + 1} / {questions.length || 5}
          </span>
        </div>
      </div>

      {/* Chat Messages Box */}
      <div
        className="card"
        style={{
          padding: '24px',
          height: '460px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '20px',
          background: 'var(--bg-subtle, #F8FAFC)',
        }}
      >
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                background:
                  msg.sender === 'user'
                    ? 'var(--primary)'
                    : '#ffffff',
                color: msg.sender === 'user' ? '#ffffff' : 'var(--ink)',
                padding: '16px 20px',
                borderRadius: '16px',
                borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '16px',
                boxShadow: '0 4px 12px rgba(16,24,40,0.08)',
                border: msg.sender === 'ai' ? '1px solid var(--border)' : 'none',
                whiteSpace: 'pre-line',
                lineHeight: 1.6,
              }}
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* Input / Controls */}
      <div>
        <div className="interview-input-wrap">
          <textarea
            className="interview-textarea"
            rows={3}
            placeholder="Nhập câu trả lời theo chuẩn STAR (Bối cảnh -> Nhiệm vụ -> Hành động -> Kết quả)..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />

          <div className="interview-input-toolbar">
            <div className="interview-toolbar-hint">
              <Sparkles size={16} color="#03BFFF" />
              <span>Cố vấn AI: Mở đầu bằng Bối cảnh (S) & kết thúc bằng Kết quả (R)</span>
            </div>

            <div className="interview-toolbar-actions">
              <button
                type="button"
                onClick={handleRecordToggle}
                className={`btn-record-pill ${recording ? 'is-recording' : ''}`}
                title="Ghi âm câu trả lời qua micro"
              >
                <Mic size={18} />
                <span>{recording ? 'Đang ghi âm...' : 'Giọng nói'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="btn-send-pill"
              >
                <span>
                  {currentIndex === (questions.length || 5) - 1
                    ? 'Hoàn tất & Chấm điểm'
                    : 'Câu tiếp theo'}
                </span>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Current question hint tooltip */}
        {questions[currentIndex]?.hint && (
          <div className="star-hint-card">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(3, 191, 255, 0.16)',
                color: '#03BFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <b style={{ color: '#03BFFF', marginRight: '6px' }}>Gợi ý STAR từ trợ lý AI:</b>
              <span>{questions[currentIndex].hint}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
