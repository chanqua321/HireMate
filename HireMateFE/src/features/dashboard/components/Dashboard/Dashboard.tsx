import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../../../app/context/AppContext';
import {
  Video,
  FileText,
  TrendingUp,
  Star,
  MessageSquare,
  Sparkles,
  Calendar,
  Lightbulb,
  Bot,
  ArrowRight,
  UserCheck,
  Check,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './css/Dashboard.css';

export const Dashboard: React.FC = () => {
  const { profile, updateProfile, history, lastResult } = useApp();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(profile.name || 'Minh Anh');
  const [role, setRole] = useState(profile.role || 'Data Analyst');
  const [field, setField] = useState(profile.field || 'Công nghệ thông tin');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fallback / dynamic scores
  const score = lastResult?.overall || (history.length ? history[history.length - 1].score : 75);
  const totalInterviews = history.length > 0 ? history.length : 12;

  // Donut Gauge calculations
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: name.trim(),
      role: role.trim(),
      field: field.trim(),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsEditingProfile(false);
    }, 1200);
  };

  return (
    <div className="dashboard-vibe-container">
      {/* 1. Top Hero Section */}
      <motion.div
        className="dashboard-hero-row"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="dashboard-hero-text">
          <h1>
            Welcome back, {profile.name || name}! 👋
          </h1>
          <p className="dashboard-hero-subtitle">
            Your AI profile is 85% complete. Finish your skill assessment to unlock Tier 1 recommendations.
          </p>
        </div>

        <div className="pro-member-pill">
          <Star size={15} fill="#0284c7" color="#0284c7" />
          <span>Pro Member</span>
        </div>
      </motion.div>

      {/* 2. Quick Action Cards (3 Grid) */}
      <motion.div
        className="quick-actions-grid"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        {/* Card 1: Mock Interview */}
        <Link to="/interview-setup" className="quick-action-card card-teal">
          <div className="card-content-left">
            <span className="card-tag">Interactive</span>
            <h3 className="card-title">Mock Interview</h3>
          </div>
          <div className="card-icon-right">
            <Video size={22} />
          </div>
        </Link>

        {/* Card 2: Optimize CV */}
        <Link to="/onboarding/profile" className="quick-action-card card-navy">
          <div className="card-content-left">
            <span className="card-tag">AI Scan</span>
            <h3 className="card-title">Optimize CV</h3>
          </div>
          <div className="card-icon-right">
            <FileText size={22} />
          </div>
        </Link>

        {/* Card 3: Industry Insights */}
        <Link to="/questions" className="quick-action-card card-white">
          <div className="card-content-left">
            <span className="card-tag">Research</span>
            <h3 className="card-title">Industry Insights</h3>
          </div>
          <div className="card-icon-right">
            <TrendingUp size={22} />
          </div>
        </Link>
      </motion.div>

      {/* 3. Main 2-Column Grid */}
      <div className="dashboard-main-grid">
        {/* Left Column: Recent Activity */}
        <motion.div
          className="recent-activity-card"
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <div className="activity-header">
            <h2>Recent Activity</h2>
            <Link to="/feedback" className="view-all-link">
              View All
            </Link>
          </div>

          <div className="activity-list">
            {/* Item 1: Behavioral Mock Interview */}
            <div className="activity-item">
              <div className="activity-left">
                <div className="activity-icon-box blue">
                  <MessageSquare size={19} />
                </div>
                <div className="activity-meta">
                  <div className="activity-title">Behavioral Mock Interview</div>
                  <div className="activity-desc">
                    Completed • <strong>Score: {score}/100</strong>
                  </div>
                </div>
              </div>
              <div className="activity-time">2h ago</div>
            </div>

            {/* Item 2: Resume Score Improved */}
            <div className="activity-item">
              <div className="activity-left">
                <div className="activity-icon-box teal">
                  <Sparkles size={19} />
                </div>
                <div className="activity-meta">
                  <div className="activity-title">Resume Score Improved</div>
                  <div className="activity-desc">
                    Keywords optimized for <strong>'{profile.role || 'Data Analyst'}'</strong>
                  </div>
                </div>
              </div>
              <div className="activity-time">Yesterday</div>
            </div>

            {/* Item 3: Upcoming Tech Round */}
            <div className="activity-item">
              <div className="activity-left">
                <div className="activity-icon-box amber">
                  <Calendar size={19} />
                </div>
                <div className="activity-meta">
                  <div className="activity-title">Upcoming: Tech Round Prep</div>
                  <div className="activity-desc">
                    Scheduled for Tomorrow, 10:00 AM
                  </div>
                </div>
              </div>
              <span className="activity-badge-scheduled">Scheduled</span>
            </div>
          </div>

          {/* Inline Profile quick edit toggle */}
          <div className="profile-edit-toggle">
            <button
              type="button"
              onClick={() => setIsEditingProfile((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <Edit3 size={15} />
              {isEditingProfile ? 'Đóng chỉnh sửa hồ sơ' : 'Chỉnh sửa thông tin ứng viên'}
            </button>

            <AnimatePresence>
              {isEditingProfile && (
                <motion.form
                  onSubmit={handleSave}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: '16px', overflow: 'hidden' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Vị trí mục tiêu
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                    {savedSuccess && (
                      <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Đã cập nhật!
                      </span>
                    )}
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }}
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Column: Career Readiness & AI Coach & Metrics */}
        <div className="right-column-stack">
          {/* 1. Career Readiness Card */}
          <motion.div
            className="career-readiness-card"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
          >
            <div className="readiness-label">Career Readiness</div>

            {/* Donut Progress Gauge */}
            <div className="donut-gauge-wrapper">
              <svg className="donut-gauge-svg" viewBox="0 0 140 140">
                <circle
                  className="donut-gauge-track"
                  cx="70"
                  cy="70"
                  r={radius}
                />
                <circle
                  className="donut-gauge-progress"
                  cx="70"
                  cy="70"
                  r={radius}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="donut-gauge-center">
                <span className="donut-score-number">{score}</span>
                <span className="donut-score-max">of 100</span>
              </div>
            </div>

            <p className="readiness-summary-text">
              You're in the <strong>Top 15%</strong> of entry-level candidates this week.
            </p>

            <Link to="/interview-setup" className="improve-score-btn">
              Improve Score
            </Link>
          </motion.div>

          {/* 2. HireMate AI Coach Card */}
          <motion.div
            className="ai-coach-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.26 }}
          >
            <div className="coach-top-row">
              <div className="coach-badge">
                <Bot size={18} />
                <span>HireMate AI Coach</span>
              </div>
              <div className="coach-lightbulb">
                <Lightbulb size={20} />
              </div>
            </div>

            <h3 className="coach-heading">Master the STAR technique</h3>
            <p className="coach-quote">
              "When answering behavioral questions, use Situation, Task, Action, and Result. You currently focus 70% on Situation – try to spend more time on your specific Action."
            </p>
          </motion.div>

          {/* 3. Metric Tiles Row */}
          <motion.div
            className="metric-tiles-row"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.32 }}
          >
            <div className="metric-tile">
              <span className="metric-tile-label">Interviews</span>
              <span className="metric-tile-value">{totalInterviews}</span>
            </div>
            <div className="metric-tile">
              <span className="metric-tile-label">Applications</span>
              <span className="metric-tile-value">4</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
