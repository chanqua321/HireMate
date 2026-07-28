import React, { useState } from 'react';
import { Briefcase, Clock, Star, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import './admin.css';

// ---- Fake data ----
const interviewStats = {
  total: 12340,
  completed: 10820,
  abandoned: 1520,
  avgScore: 7.4,
  avgDuration: 18.5,
  passRate: 68.2,
};

const topPositions = [
  { position: 'Frontend Developer', count: 2840, avgScore: 7.8 },
  { position: 'Backend Developer', count: 2310, avgScore: 7.5 },
  { position: 'Data Analyst', count: 1820, avgScore: 7.1 },
  { position: 'Product Manager', count: 1540, avgScore: 6.9 },
  { position: 'UX/UI Designer', count: 1230, avgScore: 7.6 },
  { position: 'DevOps Engineer', count: 980, avgScore: 8.1 },
  { position: 'QA Engineer', count: 820, avgScore: 7.2 },
];

const recentSessions = [
  { id: 'INT-9021', user: 'Nguyễn Văn An', position: 'Frontend Developer', score: 8.5, duration: '22 phút', date: '2026-07-27', status: 'completed' },
  { id: 'INT-9020', user: 'Trần Thị Bích', position: 'Product Manager', score: 6.2, duration: '15 phút', date: '2026-07-27', status: 'abandoned' },
  { id: 'INT-9019', user: 'Lê Minh Cường', position: 'Backend Developer', score: 9.1, duration: '28 phút', date: '2026-07-26', status: 'completed' },
  { id: 'INT-9018', user: 'Tô Minh Khoa', position: 'Data Analyst', score: 7.8, duration: '20 phút', date: '2026-07-26', status: 'completed' },
  { id: 'INT-9017', user: 'Đặng Văn Giang', position: 'DevOps Engineer', score: 8.9, duration: '25 phút', date: '2026-07-25', status: 'completed' },
  { id: 'INT-9016', user: 'Vũ Thị Fong', position: 'UX/UI Designer', score: 5.5, duration: '10 phút', date: '2026-07-25', status: 'abandoned' },
];

const scoreColor = (score: number) => score >= 8 ? '#34d399' : score >= 6 ? '#fbbf24' : '#f87171';

const AdminInterviews: React.FC = () => {
  const maxCount = Math.max(...topPositions.map(p => p.count));

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">🎙️ Thống kê phỏng vấn AI</h1>
        <p className="admin-page-subtitle">Theo dõi hiệu suất hệ thống phỏng vấn AI và kết quả người dùng.</p>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue"><Briefcase size={22} /></div>
          <div className="admin-stat-value">{interviewStats.total.toLocaleString()}</div>
          <div className="admin-stat-label">Tổng phiên phỏng vấn</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green"><CheckCircle size={22} /></div>
          <div className="admin-stat-value">{interviewStats.completed.toLocaleString()}</div>
          <div className="admin-stat-label">Hoàn thành</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon orange"><XCircle size={22} /></div>
          <div className="admin-stat-value">{interviewStats.abandoned.toLocaleString()}</div>
          <div className="admin-stat-label">Bỏ giữa chừng</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple"><Star size={22} /></div>
          <div className="admin-stat-value">{interviewStats.avgScore}/10</div>
          <div className="admin-stat-label">Điểm trung bình</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon teal"><Clock size={22} /></div>
          <div className="admin-stat-value">{interviewStats.avgDuration}p</div>
          <div className="admin-stat-label">Thời gian TB</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon pink"><TrendingUp size={22} /></div>
          <div className="admin-stat-value">{interviewStats.passRate}%</div>
          <div className="admin-stat-label">Tỷ lệ đạt</div>
        </div>
      </div>

      <div className="admin-charts-grid">
        {/* Top Positions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🏆 Vị trí phỏng vấn phổ biến nhất</h3>
          </div>
          <div className="admin-card-body">
            {topPositions.map((p, i) => (
              <div key={i} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>
                    {p.position}
                  </span>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.65)' }}>{p.count.toLocaleString()} phiên</span>
                    <span style={{ color: scoreColor(p.avgScore), fontWeight: 700 }}>⭐ {p.avgScore}</span>
                  </div>
                </div>
                <div className="admin-progress">
                  <div className="admin-progress-bar" style={{ width: `${(p.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">📊 Phân bổ điểm số</h3>
          </div>
          <div className="admin-card-body">
            {[
              { range: '9-10 (Xuất sắc)', count: 1823, pct: 17, color: '#34d399' },
              { range: '7-8 (Tốt)', count: 4312, pct: 40, color: '#4facfe' },
              { range: '5-6 (Trung bình)', count: 3246, pct: 30, color: '#fbbf24' },
              { range: '< 5 (Yếu)', count: 1439, pct: 13, color: '#f87171' },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: s.color }}>{s.range}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>{s.count.toLocaleString()} ({s.pct}%)</span>
                </div>
                <div className="admin-progress">
                  <div className="admin-progress-bar" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Hoàn thành vs Bỏ giữa chừng</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 87.7, height: 12, background: 'linear-gradient(90deg, #34d399, #4facfe)', borderRadius: '4px 0 0 4px' }} />
                <div style={{ flex: 12.3, height: 12, background: 'rgba(239,68,68,0.5)', borderRadius: '0 4px 4px 0' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                <span style={{ color: '#34d399' }}>✓ Hoàn thành 87.7%</span>
                <span style={{ color: '#f87171' }}>✗ Bỏ 12.3%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">🕐 Phiên phỏng vấn gần đây</h3>
        </div>
        <div className="admin-card-body" style={{ padding: 0 }}>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Người dùng</th>
                  <th>Vị trí</th>
                  <th>Điểm</th>
                  <th>Thời gian</th>
                  <th>Ngày</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', color: '#93c5fd', fontWeight: 600 }}>{s.id}</td>
                    <td style={{ fontWeight: 600 }}>{s.user}</td>
                    <td style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>{s.position}</td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: scoreColor(s.score) }}>
                        {s.score}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>/10</span>
                    </td>
                    <td style={{ color: 'rgba(255,255,255,0.7)' }}>{s.duration}</td>
                    <td style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{s.date}</td>
                    <td>
                      {s.status === 'completed'
                        ? <span className="admin-badge success"><CheckCircle size={11} /> Hoàn thành</span>
                        : <span className="admin-badge danger"><XCircle size={11} /> Bỏ giữa chừng</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInterviews;
