import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Award, RotateCcw, Home, LayoutDashboard, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { useConfetti } from '../../hooks/useConfetti';

export const Feedback: React.FC = () => {
  const { lastResult } = useApp();
  const { triggerConfetti } = useConfetti();

  const r = lastResult || {
    overall: 85,
    role: 'Lập trình viên Frontend',
    clarity: 82,
    subs: { S: 88, T: 85, A: 80, R: 87 },
    date: new Date().toLocaleDateString('vi-VN'),
  };

  useEffect(() => {
    if (r.overall >= 80) {
      triggerConfetti();
    }
  }, [r.overall, triggerConfetti]);

  const getMessage = (score: number) => {
    if (score >= 80) {
      return 'Kết quả xuất sắc! Bạn đã thể hiện rất tốt theo cấu trúc STAR.';
    }
    if (score >= 65) {
      return 'Kết quả tốt! Bạn đang tiến bộ, hãy chú ý phần Hành động và Kết quả.';
    }
    return 'Khởi đầu ổn! Hãy luyện tập thêm để trình bày chi tiết và có số liệu hơn.';
  };

  const starItems = [
    {
      k: 'S',
      label: 'Bối cảnh (S)',
      score: r.subs.S,
      goodNote: 'Bối cảnh được mô tả rõ ràng, dễ hình dung.',
      warnNote: 'Hãy nêu bối cảnh cụ thể hơn (thời gian, vai trò).',
    },
    {
      k: 'T',
      label: 'Nhiệm vụ (T)',
      score: r.subs.T,
      goodNote: 'Nhiệm vụ được trình bày mạch lạc.',
      warnNote: 'Cần làm rõ trách nhiệm cá nhân của bạn.',
    },
    {
      k: 'A',
      label: 'Hành động (A)',
      score: r.subs.A,
      goodNote: 'Hành động cụ thể, có tính thuyết phục.',
      warnNote: 'Nên trình bày chi tiết các bước hành động hơn.',
    },
    {
      k: 'R',
      label: 'Kết quả (R)',
      score: r.subs.R,
      goodNote: 'Kết quả có số liệu, rất tốt.',
      warnNote: 'Nên bổ sung kết quả đo lường được (số liệu).',
    },
  ];

  return (
    <div className="section container" style={{ maxWidth: '960px', margin: '30px auto' }}>
      {/* Top Banner with Circular Score */}
      <motion.div
        className="card"
        style={{
          padding: '36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '32px',
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <span className="eyebrow" style={{ marginBottom: '8px' }}>
            <Sparkles size={16} /> Báo cáo đánh giá năng lực AI
          </span>
          <h2 style={{ marginBottom: '12px' }}>
            Phản hồi phỏng vấn — <span>{r.role}</span>
          </h2>
          <p className="muted" style={{ marginBottom: '20px', fontSize: '1.05rem' }}>
            {getMessage(r.overall)}
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/interview-setup"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RotateCcw size={16} /> Luyện tập lại
            </Link>
            <Link
              to="/dashboard"
              className="btn btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <LayoutDashboard size={16} /> Bảng điều khiển
            </Link>
          </div>
        </div>

        {/* SVG Circular Ring Score */}
        <div
          style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="180" height="180" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="var(--border, #E2E8F0)"
              strokeWidth="10"
              fill="none"
            />
            {/* Animated Score Progress */}
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              stroke="var(--primary)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 40}
              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
              animate={{
                strokeDashoffset:
                  2 * Math.PI * 40 * (1 - r.overall / 100),
              }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
            />
          </svg>

          <div
            style={{
              position: 'absolute',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Award size={24} color="var(--primary)" />
            <span style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.1 }}>
              <AnimatedCounter value={r.overall} />
            </span>
            <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              ĐIỂM STAR
            </span>
          </div>
        </div>
      </motion.div>

      {/* STAR 4 Cards Grid */}
      <h3 style={{ marginBottom: '20px' }}>Phân tích chi tiết 4 yếu tố STAR</h3>
      <div className="grid grid-2" style={{ gap: '20px', marginBottom: '36px' }}>
        {starItems.map((item, idx) => {
          const good = item.score >= 70;
          return (
            <motion.div
              key={item.k}
              className={`card star-item ${good ? 'good' : 'warn'}`}
              style={{ padding: '24px' }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.1 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {good ? (
                    <CheckCircle2 size={20} color="#22C55E" />
                  ) : (
                    <AlertCircle size={20} color="#F59E0B" />
                  )}
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{item.label}</h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    className={`badge ${
                      good ? 'badge--success' : 'badge--warning'
                    }`}
                  >
                    {good ? 'Tốt' : 'Cần cải thiện'}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>
                    {item.score}/100
                  </span>
                </div>
              </div>

              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
                {good ? item.goodNote : item.warnNote}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Subscores Animated Bars */}
      <div className="card" style={{ padding: '32px' }}>
        <h3 style={{ marginBottom: '24px' }}>Bảng điểm thành phần</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { name: 'Bối cảnh (S)', val: r.subs.S, color: '#03BFFF' },
            { name: 'Nhiệm vụ (T)', val: r.subs.T, color: '#5B6BFF' },
            { name: 'Hành động (A)', val: r.subs.A, color: '#22C55E' },
            { name: 'Kết quả (R)', val: r.subs.R, color: '#F59E0B' },
            { name: 'Sự rõ ràng & Mạch lạc', val: r.clarity, color: '#FF6B9A' },
          ].map((bar, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <span style={{ width: '180px', fontWeight: 600, fontSize: '0.95rem' }}>
                {bar.name}
              </span>
              <div
                style={{
                  flex: 1,
                  background: 'var(--border, #E2E8F0)',
                  height: '10px',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    background: bar.color,
                    borderRadius: '999px',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.val}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.1 }}
                />
              </div>
              <span style={{ width: '48px', textAlign: 'right', fontWeight: 700 }}>
                {bar.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
