import React, { useState, useEffect } from 'react';
import { Briefcase, Clock, Star, TrendingUp, CheckCircle, XCircle, RefreshCw, Award } from 'lucide-react';
import { adminService, AdminInterviewStats } from '../../shared/services/admin.service';
import './admin.css';

import { interviewService } from '../../features/interview/api/interview.service';

const scoreColor = (score: number) => score >= 8 ? '#34d399' : score >= 6 ? '#fbbf24' : '#f87171';

export interface TopPositionItem {
  position: string;
  count: number;
  avgScore: number;
}

const AdminInterviews: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminInterviewStats | null>(null);
  const [completionRate, setCompletionRate] = useState<number>(0);
  const [positions, setPositions] = useState<TopPositionItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [intRes, anaRes, hisRes] = await Promise.allSettled([
        adminService.getInterviews(),
        adminService.getAnalytics(),
        interviewService.getHistory(),
      ]);

      if (intRes.status === 'fulfilled' && intRes.value?.ok && intRes.value.data) {
        setStats(intRes.value.data);
        if (Array.isArray(intRes.value.data.popularPositions) && intRes.value.data.popularPositions.length > 0) {
          setPositions(intRes.value.data.popularPositions.map(p => ({
            position: p.position || 'Chuyên viên',
            count: p.count,
            avgScore: Number(p.avg.toFixed(1)) || 0,
          })));
        } else {
          setPositions([]);
        }
      }

      if (anaRes.status === 'fulfilled' && anaRes.value?.ok && anaRes.value.data) {
        setCompletionRate(anaRes.value.data.interviewCompletionRate ?? 0);
      }

      if (hisRes.status === 'fulfilled' && hisRes.value?.ok && Array.isArray(hisRes.value.data)) {
        setRecentSessions(hisRes.value.data);
      } else {
        setRecentSessions([]);
      }
    } catch (err) {
      console.warn('Real interviews stats API call error:', err);
      setPositions([]);
      setRecentSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInterviews = stats?.total ?? 0;
  const avgStarScore = stats?.avgStar ? (stats.avgStar > 10 ? (stats.avgStar / 10).toFixed(1) : stats.avgStar.toFixed(1)) : '0.0';
  const maxCount = Math.max(...positions.map(p => p.count), 1);

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="admin-page-title">🎙️ Thống kê phỏng vấn AI</h1>
          <p className="admin-page-subtitle">Theo dõi hiệu suất hệ thống phỏng vấn AI và kết quả ứng viên theo phương pháp STAR.</p>
        </div>
        <button 
          className="admin-btn admin-btn-secondary admin-btn-sm" 
          onClick={fetchData} 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Đang tải...' : 'Làm mới API'}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue"><Briefcase size={22} /></div>
          <div className="admin-stat-value">{totalInterviews.toLocaleString()}</div>
          <div className="admin-stat-label">Tổng phiên phỏng vấn ({stats ? 'Real-time' : 'Hệ thống'})</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green"><CheckCircle size={22} /></div>
          <div className="admin-stat-value">{Math.round(totalInterviews * (completionRate / 100)).toLocaleString()}</div>
          <div className="admin-stat-label">Hoàn thành ({completionRate}%)</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon orange"><XCircle size={22} /></div>
          <div className="admin-stat-value">{(totalInterviews - Math.round(totalInterviews * (completionRate / 100))).toLocaleString()}</div>
          <div className="admin-stat-label">Bỏ dở / Chưa xong</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple"><Star size={22} /></div>
          <div className="admin-stat-value">{avgStarScore}/10</div>
          <div className="admin-stat-label">Điểm STAR trung bình</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon teal"><Clock size={22} /></div>
          <div className="admin-stat-value">~15p</div>
          <div className="admin-stat-label">Thời gian TB / phiên</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon pink"><TrendingUp size={22} /></div>
          <div className="admin-stat-value">{completionRate}%</div>
          <div className="admin-stat-label">Tỷ lệ hoàn thành</div>
        </div>
      </div>

      {/* Phân Tích Kỹ Năng STAR Toàn Sàn */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(3, 191, 255, 0.04), rgba(99, 102, 241, 0.04))', borderColor: 'rgba(3, 191, 255, 0.25)' }}>
        <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem' }}>
          <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#03bffd" /> Phân Tích Kỹ Năng STAR Toàn Sàn
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
            Điểm trung bình chuẩn hóa (Thang 10) từ CSDL
          </span>
        </div>
        <div className="admin-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'S — Situation (Mô tả tình huống)', score: stats?.avgS || 0, color: '#03bffd' },
            { label: 'T — Task (Xác định mục tiêu/nhiệm vụ)', score: stats?.avgT || 0, color: '#3b82f6' },
            { label: 'A — Action (Hành động triển khai)', score: stats?.avgA || 0, color: '#8b5cf6' },
            { label: 'R — Result (Định lượng kết quả)', score: stats?.avgR || 0, color: '#10b981' },
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '1rem', background: 'var(--admin-card-bg)', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '6px', fontWeight: 600 }}>{item.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color }}>{item.score > 0 ? (item.score > 10 ? (item.score / 10).toFixed(1) : item.score.toFixed(1)) : '0.0'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>/ 10.0</span>
              </div>
              <div className="admin-progress" style={{ height: '6px' }}>
                <div className="admin-progress-bar" style={{ width: `${Math.min(100, (item.score > 10 ? item.score : item.score * 10))}%`, background: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-charts-grid">
        {/* Top Positions */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🏆 Vị trí phỏng vấn phổ biến nhất</h3>
          </div>
          <div className="admin-card-body">
            {positions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--admin-text-muted)' }}>
                Chưa có dữ liệu vị trí phỏng vấn từ CSDL.
              </div>
            ) : (
              positions.map((p, i) => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--admin-text)' }}>
                      {p.position}
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--admin-text-muted)' }}>{p.count.toLocaleString()} phiên</span>
                      <span style={{ color: scoreColor(p.avgScore), fontWeight: 700 }}>⭐ {p.avgScore}</span>
                    </div>
                  </div>
                  <div className="admin-progress">
                    <div className="admin-progress-bar" style={{ width: `${(p.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Score Distribution */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">📊 Phân bổ điểm số ({recentSessions.length} phiên đã lưu)</h3>
          </div>
          <div className="admin-card-body">
            {(() => {
              const totalSess = recentSessions.length || 1;
              const calcCount = (min: number, max: number) => 
                recentSessions.filter(s => {
                  const sc = (s.overallScore ?? 0) > 10 ? s.overallScore / 10 : (s.overallScore ?? 0);
                  return sc >= min && (max >= 10 ? sc <= max : sc < max);
                }).length;

              const dist = [
                { range: '8.5 - 10 (Xuất sắc)', count: calcCount(8.5, 10), color: '#059669' },
                { range: '7.0 - 8.4 (Tốt)', count: calcCount(7.0, 8.5), color: '#0284c7' },
                { range: '5.0 - 6.9 (Trung bình)', count: calcCount(5.0, 7.0), color: '#d97706' },
                { range: '< 5.0 (Cần cải thiện)', count: calcCount(0, 5.0), color: '#dc2626' },
              ].map(item => ({
                ...item,
                pct: recentSessions.length > 0 ? Math.round((item.count / totalSess) * 100) : 0
              }));

              return (
                <>
                  {dist.map((s, i) => (
                    <div key={i} style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: s.color }}>{s.range}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{s.count.toLocaleString()} ({s.pct}%)</span>
                      </div>
                      <div className="admin-progress">
                        <div className="admin-progress-bar" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(3, 191, 255, 0.05)', borderRadius: 12, border: '1px solid rgba(3, 191, 255, 0.2)' }}>
                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', margin: '0 0 0.5rem', fontWeight: 600 }}>Hoàn thành vs Bỏ dở</p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ flex: completionRate, height: 12, background: 'linear-gradient(90deg, #10b981, #03bffd)', borderRadius: '4px 0 0 4px' }} />
                      <div style={{ flex: Math.max(0, 100 - completionRate), height: 12, background: '#ef4444', borderRadius: '0 4px 4px 0' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <span style={{ color: '#059669' }}>✓ Hoàn thành {completionRate}%</span>
                      <span style={{ color: '#dc2626' }}>✗ Bỏ dở {Math.max(0, 100 - completionRate)}%</span>
                    </div>
                  </div>
                </>
              );
            })()}
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
                  <th>Lĩnh vực</th>
                  <th>Vị trí</th>
                  <th>Điểm số</th>
                  <th>Độ khó</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--admin-text-muted)' }}>
                      Chưa có phiên phỏng vấn nào được ghi nhận trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  recentSessions.map((s: any) => {
                    const normalizedScore = (s.overallScore ?? 0) > 10 ? (s.overallScore / 10).toFixed(1) : Number(s.overallScore ?? 0).toFixed(1);
                    return (
                      <tr key={s.id}>
                        <td style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 600 }}>{s.id ? s.id.slice(0, 8) : '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--admin-text)' }}>{s.industry || 'Chung'}</td>
                        <td style={{ color: 'var(--admin-text)', fontSize: '0.85rem' }}>{s.position || '—'}</td>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: scoreColor(Number(normalizedScore)) }}>
                            {normalizedScore}
                          </span>
                          <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem' }}>/10</span>
                        </td>
                        <td style={{ color: 'var(--admin-text-muted)' }}>{s.difficulty || 'Trung bình'}</td>
                        <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                          {s.startedAt ? new Date(s.startedAt).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td>
                          {s.status === 'Completed' || s.status === 'completed'
                            ? <span className="admin-badge success"><CheckCircle size={11} /> Hoàn thành</span>
                            : <span className="admin-badge danger"><XCircle size={11} /> {s.status || 'Chưa hoàn thành'}</span>
                          }
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInterviews;
