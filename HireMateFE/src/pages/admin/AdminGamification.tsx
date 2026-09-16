import React, { useState, useEffect } from 'react';
import { Award, Trophy, Medal, Star, RefreshCw, AlertCircle, Users, CheckCircle, Flame } from 'lucide-react';
import { adminService } from '../../shared/services/admin.service';
import './admin.css';

export interface BadgeItem {
  code: string;
  name: string;
  description: string;
  earned?: boolean;
  earnedAt?: string | null;
}

export interface LeaderboardItem {
  fullName: string;
  averageScore: number;
  sessions: number;
}

const AdminGamification: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges'>('leaderboard');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [badgesRes, lbRes] = await Promise.allSettled([
        adminService.getGamificationBadges(),
        adminService.getGamificationLeaderboard(),
      ]);

      if (badgesRes.status === 'fulfilled' && badgesRes.value?.ok && Array.isArray(badgesRes.value.data)) {
        setBadges(badgesRes.value.data);
      } else {
        setBadges([]);
      }

      if (lbRes.status === 'fulfilled' && lbRes.value?.ok && Array.isArray(lbRes.value.data)) {
        setLeaderboard(lbRes.value.data);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.warn('Gamification API fetch error:', err);
      setBadges([]);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const topScore = leaderboard.length > 0 ? Math.max(...leaderboard.map(l => l.averageScore)) : 0;
  const avgTopScore = leaderboard.length > 0 
    ? (leaderboard.reduce((acc, cur) => acc + cur.averageScore, 0) / leaderboard.length).toFixed(1)
    : '0.0';

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="admin-page-title">🏆 Gamification & Leaderboard</h1>
          <p className="admin-page-subtitle">
            Theo dõi hệ thống thành tích, danh hiệu kỹ năng và bảng xếp hạng thành tích ứng viên từ CSDL.
          </p>
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

      {/* Stats Summary */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon purple"><Trophy size={22} /></div>
          <div className="admin-stat-value">{leaderboard.length}</div>
          <div className="admin-stat-label">Ứng viên trên BXH</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon green"><Medal size={22} /></div>
          <div className="admin-stat-value">{badges.length}</div>
          <div className="admin-stat-label">Huy hiệu hệ thống</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon orange"><Flame size={22} /></div>
          <div className="admin-stat-value">{topScore > 0 ? topScore.toFixed(1) : '0.0'}/100</div>
          <div className="admin-stat-label">Điểm số cao nhất</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon blue"><Star size={22} /></div>
          <div className="admin-stat-value">{avgTopScore}/100</div>
          <div className="admin-stat-label">Điểm TB toàn bảng</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--admin-border)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('leaderboard')}
          style={{
            background: activeTab === 'leaderboard' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'leaderboard' ? '#00F2FE' : 'var(--admin-text-muted)',
            border: activeTab === 'leaderboard' ? '1px solid #00F2FE' : '1px solid transparent',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <Trophy size={16} /> Bảng xếp hạng ứng viên ({leaderboard.length})
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          style={{
            background: activeTab === 'badges' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'badges' ? '#00F2FE' : 'var(--admin-text-muted)',
            border: activeTab === 'badges' ? '1px solid #00F2FE' : '1px solid transparent',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <Medal size={16} /> Hệ thống Huy hiệu ({badges.length})
        </button>
      </div>

      {/* Tab 1: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} color="#f59e0b" /> Top 20 Ứng Viên Xuất Sắc Nhất
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
              Dữ liệu xếp hạng tính trên các phiên phỏng vấn đã hoàn thành
            </span>
          </div>
          <div className="admin-card-body" style={{ padding: 0 }}>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Hạng</th>
                    <th>Họ và tên ứng viên</th>
                    <th style={{ textAlign: 'center' }}>Điểm trung bình</th>
                    <th style={{ textAlign: 'center' }}>Số phiên đã thi</th>
                    <th>Đánh giá năng lực</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--admin-text-muted)' }}>
                        Chưa có ứng viên nào đạt điều kiện lên bảng xếp hạng (cần hoàn thành ít nhất 1 phiên phỏng vấn).
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((item, index) => {
                      const rank = index + 1;
                      const badgeIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                      const isTop3 = rank <= 3;
                      const scoreNorm = item.averageScore > 10 ? item.averageScore : item.averageScore * 10;
                      
                      return (
                        <tr key={index} style={{ background: rank === 1 ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
                          <td style={{ textAlign: 'center', fontSize: isTop3 ? '1.25rem' : '0.9rem', fontWeight: 800 }}>
                            {badgeIcon}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="admin-avatar" style={{ background: isTop3 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : undefined }}>
                                {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--admin-text)', fontSize: '0.9rem' }}>
                                  {item.fullName || 'Ứng viên ẩn danh'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>
                                  Ứng viên chính thức
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              fontSize: '1.1rem', 
                              fontWeight: 800, 
                              color: scoreNorm >= 80 ? '#10b981' : scoreNorm >= 60 ? '#38bdf8' : scoreNorm >= 50 ? '#fbbf24' : '#ef4444' 
                            }}>
                              {item.averageScore.toFixed(1)}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>/100</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--admin-text)' }}>
                            {item.sessions} phiên
                          </td>
                          <td>
                            {scoreNorm >= 85 ? (
                              <span className="admin-badge success"><CheckCircle size={11} /> Xuất sắc (Ready to Hire)</span>
                            ) : scoreNorm >= 70 ? (
                              <span className="admin-badge info">Đạt chuẩn (Qualified)</span>
                            ) : scoreNorm >= 50 ? (
                              <span className="admin-badge warning">Cần rèn luyện thêm</span>
                            ) : (
                              <span className="admin-badge danger">Chưa đạt yêu cầu</span>
                            )}
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
      )}

      {/* Tab 2: Badges */}
      {activeTab === 'badges' && (
        <div>
          <div className="admin-card" style={{ marginBottom: '1.5rem', background: 'rgba(3, 191, 255, 0.04)', borderColor: 'rgba(3, 191, 255, 0.25)' }}>
            <div className="admin-card-body" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                <strong style={{ color: '#E2E8F0' }}>Lưu ý quản trị:</strong> Danh mục huy hiệu hiện được đồng bộ tự động từ bảng CSDL <code style={{ color: '#00F2FE' }}>Badges</code>. Tính năng tạo và tùy chỉnh tiêu chí huy hiệu mới qua giao diện Admin đang chờ Backend cung cấp API <code style={{ color: '#00F2FE' }}>POST /api/Admin/badges</code> (chi tiết đã ghi trong báo cáo API gap).
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {badges.length === 0 ? (
              <div className="admin-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '1rem', margin: '0' }}>
                  Chưa có huy hiệu nào trong cơ sở dữ liệu.
                </p>
              </div>
            ) : (
              badges.map((b, idx) => (
                <div key={idx} className="admin-card" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div className="admin-card-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.2))',
                        border: '1px solid rgba(0, 242, 254, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                      }}>
                        🎖️
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--admin-text)' }}>
                          {b.name}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                          {b.code}
                        </div>
                      </div>
                      <span className="admin-badge success">
                        Hệ thống
                      </span>
                    </div>
                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                      {b.description || 'Huy hiệu thành tích phỏng vấn.'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGamification;
