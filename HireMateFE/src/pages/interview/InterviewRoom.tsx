import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { InterviewResult } from '../../types';
import { Mic, Send, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  interviewService,
  mapDetailToResult,
  SESSION_STORAGE_KEY,
  InterviewQuestionDto,
} from '../../services/interview.service';
import { RequirePremium } from '../../components/common/RequirePremium';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
}

export const InterviewRoomInner: React.FC = () => {
  const { interviewConfig, saveLastResult } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionId =
    searchParams.get('sessionId') || sessionStorage.getItem(SESSION_STORAGE_KEY) || '';

  const [questions, setQuestions] = useState<InterviewQuestionDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [recording, setRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const questionStartedAt = useRef<number>(Date.now());

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!sessionId) {
        setError('Thiếu session. Hãy bắt đầu từ trang thiết lập phỏng vấn.');
        setLoading(false);
        return;
      }
      if (!sessionStorage.getItem('hm_access_token')) {
        navigate(`/login?redirect=${encodeURIComponent(`/interview-room?sessionId=${sessionId}`)}`);
        return;
      }

      const res = await interviewService.getQuestions(sessionId);
      if (cancelled) return;

      if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) {
        setError(res.message || 'Không tải được câu hỏi từ API');
        setLoading(false);
        return;
      }

      const qs = [...res.data].sort((a, b) => a.orderIndex - b.orderIndex);
      setQuestions(qs);
      setCurrentIndex(0);
      questionStartedAt.current = Date.now();
      const firstQ = qs[0]?.content || 'Bạn hãy giới thiệu về bản thân?';
      setMessages([
        {
          sender: 'ai',
          text: `Chào bạn! Tôi là trợ lý AI HireMate. Hôm nay chúng ta sẽ phỏng vấn thử cho vị trí "${interviewConfig.role || 'Ứng viên'}".\n\n${firstQ}`,
        },
      ]);
      setLoading(false);
    };

    boot().catch((e) => {
      if (!cancelled) {
        setError(e?.message || 'Lỗi tải phòng phỏng vấn');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, interviewConfig.role, navigate]);

  const perQuestionDuration =
    interviewConfig.difficulty === 'Khó'
      ? 90
      : interviewConfig.difficulty === 'Dễ'
      ? 180
      : 120;

  useEffect(() => {
    setTimeLeft(perQuestionDuration);
  }, [currentIndex, perQuestionDuration]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const finishInterview = async () => {
    const complete = await interviewService.completeSession(sessionId);
    let result: InterviewResult;

    if (complete.ok && complete.data) {
      result = mapDetailToResult(complete.data);
    } else {
      const detail = await interviewService.getDetail(sessionId);
      result = detail.ok && detail.data
        ? mapDetailToResult(detail.data)
        : {
            overall: 0,
            role: interviewConfig.role || '',
            clarity: 0,
            subs: { S: 0, T: 0, A: 0, R: 0 },
            date: new Date().toISOString().slice(0, 10),
          };
    }

    saveLastResult(result);
    sessionStorage.setItem('hm_last_session_id', sessionId);
    navigate(`/feedback?sessionId=${encodeURIComponent(sessionId)}`);
  };

  const handleNextQuestion = async () => {
    if (busy || !sessionId || questions.length === 0) return;
    setBusy(true);
    setError(null);

    const userAnswer = inputVal.trim()
      ? inputVal.trim()
      : '(Câu trả lời được mô tả qua ghi âm lời nói)';

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { sender: 'user', text: userAnswer },
    ];
    setMessages(updatedMessages);

    const q = questions[currentIndex];
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - questionStartedAt.current) / 1000)
    );

    const submitRes = await interviewService.submitAnswer(sessionId, {
      orderIndex: q.orderIndex,
      questionId: q.questionId,
      questionText: q.content,
      answerText: userAnswer,
      durationSec,
    });

    if (!submitRes.ok) {
      setError(submitRes.message || 'Gửi câu trả lời thất bại');
      setBusy(false);
      return;
    }

    if (currentIndex >= questions.length - 1) {
      try {
        await finishInterview();
      } catch (e: any) {
        setError(e?.message || 'Hoàn tất phiên thất bại');
        setBusy(false);
      }
      return;
    }

    const nextIdx = currentIndex + 1;
    const nextQ = questions[nextIdx];
    setMessages([
      ...updatedMessages,
      {
        sender: 'ai',
        text: 'Cảm ơn bạn đã trả lời. Hãy tiếp tục với câu hỏi tiếp theo:\n\n' + nextQ.content,
      },
    ]);
    setCurrentIndex(nextIdx);
    setInputVal('');
    setRecording(false);
    questionStartedAt.current = Date.now();
    setBusy(false);
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
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="section container" style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center' }}>
        <p className="muted">Đang tải câu hỏi từ API…</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="section container" style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center' }}>
        <p style={{ color: '#EF4444' }}>{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/interview-setup')}>
          Quay lại thiết lập
        </button>
      </div>
    );
  }

  return (
    <div className="section container" style={{ maxWidth: '900px', margin: '20px auto' }}>
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span className="eyebrow"><Sparkles size={14} /> Phòng phỏng vấn AI</span>
            <div style={{ fontWeight: 700 }}>
              {interviewConfig.role || 'Ứng viên'} · Câu {currentIndex + 1}/{questions.length}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <Clock size={18} /> {formatTime(timeLeft)}
          </div>
        </div>
        {error && <p style={{ color: '#EF4444', marginTop: 8, marginBottom: 0 }}>{error}</p>}
      </div>

      <div className="card" style={{ padding: 20, minHeight: 420, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: m.sender === 'user' ? 'rgba(3,191,255,0.12)' : 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.sender === 'ai' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontWeight: 600, fontSize: '0.85rem' }}>
                    <CheckCircle2 size={14} color="#03BFFF" /> HireMate AI
                  </div>
                )}
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={handleRecordToggle} disabled={busy}>
            <Mic size={16} /> {recording ? 'Dừng' : 'Mic'}
          </button>
          <input
            className="form-control"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Nhập câu trả lời theo STAR…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleNextQuestion();
              }
            }}
            disabled={busy}
          />
          <button type="button" className="btn btn-primary" onClick={handleNextQuestion} disabled={busy}>
            <Send size={16} /> {busy ? '…' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const InterviewRoom: React.FC = () => (
  <RequirePremium>
    <InterviewRoomInner />
  </RequirePremium>
);
