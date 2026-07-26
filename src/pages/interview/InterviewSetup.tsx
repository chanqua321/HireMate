import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { INDUSTRY_ROLES } from '../../data/questionBank';
import { Settings, Mic, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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

  return (
    <div className="section container" style={{ maxWidth: '680px', margin: '30px auto' }}>
      <motion.div
        className="card"
        style={{ padding: '36px' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="icon-chip"
            style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}
          >
            <Settings size={24} />
          </div>
          <span className="eyebrow" style={{ justifyContent: 'center' }}>
            <Sparkles size={16} /> Chuẩn bị phòng phỏng vấn
          </span>
          <h2>Thiết lập phỏng vấn AI</h2>
          <p className="muted">
            Cấu hình ngành nghề, độ khó và hình thức phỏng vấn trước khi bắt đầu.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Field Selector */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="field" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Ngành nghề
            </label>
            <select
              id="field"
              className="form-control"
              value={field}
              onChange={(e) => setField(e.target.value)}
              required
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selector */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="pos" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Vị trí ứng tuyển
            </label>
            <select
              id="pos"
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              {currentRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Segmented Control */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px' }}>
              Độ khó câu hỏi
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                background: 'var(--card, #F1F5F9)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              {(['Dễ', 'Trung bình', 'Khó'] as const).map((level) => {
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: active ? '#ffffff' : 'transparent',
                      color: active ? 'var(--primary)' : 'var(--muted)',
                      fontWeight: active ? 700 : 500,
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '6px' }}>
              * Độ khó quyết định thời gian suy nghĩ và tính chất hóc búa của câu hỏi STAR.
            </p>
          </div>

          {/* Mode Segmented Control */}
          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px' }}>
              Hình thức trả lời
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: 'var(--card, #F1F5F9)',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
              }}
            >
              {[
                { id: 'Text', label: 'Văn bản (Gõ câu trả lời)', icon: <MessageSquare size={16} /> },
                { id: 'Voice', label: 'Giọng nói (Microphone)', icon: <Mic size={16} /> },
              ].map((item) => {
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id as 'Text' | 'Voice')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: active ? '#ffffff' : 'transparent',
                      color: active ? 'var(--primary)' : 'var(--muted)',
                      fontWeight: active ? 700 : 500,
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Vào phòng phỏng vấn <ArrowRight size={18} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
