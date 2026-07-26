import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  Save,
  Check,
  Play,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { DashboardCharts } from './DashboardCharts';

export const Dashboard: React.FC = () => {
  const { profile, updateProfile, history, lastResult } = useApp();

  const [name, setName] = useState(profile.name || '');
  const [role, setRole] = useState(profile.role || 'Lập trình viên Frontend');
  const [field, setField] = useState(profile.field || 'Công nghệ thông tin');
  const [bio, setBio] = useState(profile.bio || '');
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      role: role.trim(),
      field: field.trim(),
      bio: bio.trim(),
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2200);
  };

  const avgScore =
    history.length > 0
      ? Math.round(
          history.reduce((acc, cur) => acc + cur.score, 0) / history.length
        )
      : 82;

  const latestScore = lastResult?.overall || (history.length ? history[history.length - 1].score : 85);

  const displayHistory = [...history].reverse().slice(0, 10);

  return (
    <div className="section container" style={{ maxWidth: '1080px', margin: '20px auto' }}>
      {/* Top Welcome Bar */}
      <div
        className="card"
        style={{
          padding: '28px 32px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <span className="eyebrow" style={{ marginBottom: '6px' }}>
            <Sparkles size={16} /> Bảng điều khiển cá nhân
          </span>
          <h2 style={{ marginBottom: '6px' }}>
            Xin chào, <span>{profile.name || 'Ứng viên HireMate'}</span>!
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Mục tiêu: <strong>{profile.role || '—'}</strong>
            {profile.field ? ` · ${profile.field}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/interview-setup"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Play size={16} /> Luyện phỏng vấn mới
          </Link>
          <Link
            to="/questions"
            className="btn btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FileText size={16} /> Ngân hàng câu hỏi
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-3" style={{ gap: '20px', marginBottom: '32px' }}>
        <div className="card stat" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="icon-chip" style={{ width: '38px', height: '38px' }}>
              <Calendar size={18} />
            </div>
            <span className="muted" style={{ fontWeight: 600 }}>
              Buổi luyện tập
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--ink)' }}>
            <AnimatedCounter value={history.length || 3} />
          </div>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            Trong tháng này
          </span>
        </div>

        <div className="card stat" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="icon-chip" style={{ width: '38px', height: '38px' }}>
              <TrendingUp size={18} />
            </div>
            <span className="muted" style={{ fontWeight: 600 }}>
              Điểm trung bình
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
            <AnimatedCounter value={avgScore} />
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>/100</span>
          </div>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            Phương pháp STAR
          </span>
        </div>

        <div className="card stat" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="icon-chip" style={{ width: '38px', height: '38px' }}>
              <Award size={18} />
            </div>
            <span className="muted" style={{ fontWeight: 600 }}>
              Điểm gần nhất
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22C55E' }}>
            <AnimatedCounter value={latestScore} />
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>/100</span>
          </div>
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            Lần phỏng vấn mới nhất
          </span>
        </div>
      </div>

      {/* Progress Charts Section */}
      <DashboardCharts history={history} lastResult={lastResult} />

      <div className="grid grid-2" style={{ gap: '28px', alignItems: 'flex-start' }}>
        {/* History Table Column */}
        <div className="card" style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0 }}>Lịch sử luyện tập</h3>
            <span className="badge badge--success">
              {displayHistory.length} buổi gần nhất
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid var(--border)',
                    color: 'var(--muted)',
                    fontSize: '0.85rem',
                  }}
                >
                  <th style={{ padding: '10px 8px' }}>Ngày</th>
                  <th style={{ padding: '10px 8px' }}>Vị trí phỏng vấn</th>
                  <th style={{ padding: '10px 8px' }}>Điểm</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {displayHistory.map((h, index) => {
                  const good = h.score >= 65;
                  return (
                    <tr
                      key={`${h.date}-${index}`}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '12px 8px', fontSize: '0.9rem' }}>
                        {new Date(h.date).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                        {h.role}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span
                          className={`badge ${
                            good ? 'badge--success' : 'badge--warning'
                          }`}
                        >
                          {h.score}/100
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <Link
                          to="/feedback"
                          style={{
                            color: 'var(--primary)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}
                        >
                          Xem phản hồi
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {displayHistory.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--muted)',
                      }}
                    >
                      Chưa có dữ liệu phỏng vấn. Hãy bắt đầu buổi luyện tập đầu tiên!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profile Settings Column */}
        <div className="card" style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0 }}>Hồ sơ & Cài đặt</h3>
            <AnimatePresence>
              {savedMsg && (
                <motion.span
                  className="badge badge--success"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Check size={14} /> Đã lưu thành công
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                Họ và tên
              </label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                Ngành nghề mục tiêu
              </label>
              <input
                type="text"
                className="form-control"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="Công nghệ thông tin"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                Vị trí ứng tuyển
              </label>
              <input
                type="text"
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Lập trình viên Frontend"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px' }}>
                Giới thiệu bản thân (Bio)
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Chia sẻ kinh nghiệm hoặc mục tiêu..."
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Save size={16} /> Lưu cập nhật hồ sơ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
