import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Award,
  Users,
  Share2,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  Flame,
  Star,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { growthService, LeaderboardUserDto, BadgeItemDto, BenchmarkDto, ReferralInfoDto } from '../../shared/services/growth.service';
import { useApp } from '../../app/context/AppContext';
import './css/Leaderboard.css';

// Fallbacks
const fallbackLeaderboard: LeaderboardUserDto[] = [
  { rank: 1, userName: 'Nguyễn Thành Long', overallScore: 9.6, interviewsCompleted: 28, badgeCount: 12 },
  { rank: 2, userName: 'Trần Minh Hoàng', overallScore: 9.4, interviewsCompleted: 24, badgeCount: 10 },
  { rank: 3, userName: 'Lê Thúy An', overallScore: 9.2, interviewsCompleted: 21, badgeCount: 9 },
  { rank: 4, userName: 'Phạm Đức Dũng', overallScore: 8.9, interviewsCompleted: 18, badgeCount: 8 },
  { rank: 5, userName: 'Hoàng Anh Tuấn', overallScore: 8.8, interviewsCompleted: 17, badgeCount: 7 },
  { rank: 6, userName: 'Vũ Thị Hồng', overallScore: 8.7, interviewsCompleted: 15, badgeCount: 7 },
  { rank: 7, userName: 'Đặng Thanh Tâm', overallScore: 8.6, interviewsCompleted: 14, badgeCount: 6 },
  { rank: 8, userName: 'Bùi Gia Huy', overallScore: 8.5, interviewsCompleted: 12, badgeCount: 6 },
  { rank: 9, userName: 'Mai Phương Linh', overallScore: 8.4, interviewsCompleted: 11, badgeCount: 5 },
  { rank: 10, userName: 'Đỗ Quốc Bảo', overallScore: 8.3, interviewsCompleted: 10, badgeCount: 5 },
];

const fallbackBadges: BadgeItemDto[] = [
  { id: '1', name: 'Ngôi Sao Đầu Tiên', description: 'Hoàn thành buổi phỏng vấn AI đầu tiên với điểm STAR', category: 'STAR', unlockedAt: '2026-07-20', progressPercent: 100, icon: '🌟' },
  { id: '2', name: 'Chiến Binh Bất Bại', description: 'Đạt điểm STAR >= 8.5 trong 3 buổi phỏng vấn liên tiếp', category: 'Performance', unlockedAt: '2026-07-25', progressPercent: 100, icon: '⚔️' },
  { id: '3', name: 'Bậc Thầy Tình Huống', description: 'Phần Situation (S) đạt tuyệt đối 10/10', category: 'STAR', unlockedAt: undefined, progressPercent: 75, icon: '🎯' },
  { id: '4', name: 'CV Hoàn Hảo ATS', description: 'Quét CV đạt tỷ lệ vượt ATS trên 90%', category: 'CV', unlockedAt: '2026-07-22', progressPercent: 100, icon: '📄' },
  { id: '5', name: 'Phù Thủy Giọng Nói', description: 'Tốc độ nói và sự tự tin đạt chuẩn Executive Level', category: 'Speaking', unlockedAt: undefined, progressPercent: 60, icon: '🎙️' },
  { id: '6', name: 'Đại Sứ HireMate', description: 'Mời thành công 5 người bạn cùng tham gia luyện tập', category: 'Community', unlockedAt: undefined, progressPercent: 40, icon: '🤝' },
];

const fallbackBenchmark: BenchmarkDto = {
  userScore: 8.2,
  averageScore: 7.1,
  top10PercentScore: 9.1,
  percentile: 84,
  industry: 'Công nghệ Thông tin & Phần mềm',
  role: 'Frontend Engineer',
};

const fallbackReferral: ReferralInfoDto = {
  referralCode: 'HIREMATEVIP88',
  referralLink: 'https://hiremate.vn/register?ref=HIREMATEVIP88',
  referredCount: 2,
  rewardPoints: 200,
};

export const Leaderboard: React.FC = () => {
  const { profile } = useApp();
  const [tab, setTab] = useState<'leaderboard' | 'badges' | 'benchmark' | 'referral'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUserDto[]>(fallbackLeaderboard);
  const [badges, setBadges] = useState<BadgeItemDto[]>(fallbackBadges);
  const [benchmark, setBenchmark] = useState<BenchmarkDto>(fallbackBenchmark);
  const [referral, setReferral] = useState<ReferralInfoDto>(fallbackReferral);
  const [copied, setCopied] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [applyMsg, setApplyMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lbRes, bRes, bmRes, refRes] = await Promise.allSettled([
          growthService.getLeaderboard(),
          growthService.getBadges(),
          growthService.getBenchmark(),
          growthService.getReferral(),
        ]);

        if (lbRes.status === 'fulfilled' && lbRes.value?.ok && lbRes.value.data?.length) {
          const mapped = lbRes.value.data.map((u: any, idx: number) => ({
            rank: u.rank ?? (idx + 1),
            userName: u.userName || u.fullName || u.name || `Ứng viên #${idx + 1}`,
            overallScore: u.overallScore ?? u.score ?? 8.0,
            interviewsCompleted: u.interviewsCompleted ?? u.sessionsCount ?? 5,
            badgeCount: u.badgeCount ?? 3,
          }));
          setLeaderboard(mapped);
        }
        if (bRes.status === 'fulfilled' && bRes.value?.ok && bRes.value.data?.length) {
          setBadges(bRes.value.data);
        }
        if (bmRes.status === 'fulfilled' && bmRes.value?.ok && bmRes.value.data) {
          setBenchmark(bmRes.value.data);
        }
        if (refRes.status === 'fulfilled' && refRes.value?.ok && refRes.value.data) {
          setReferral(refRes.value.data);
        }
      } catch (e) {
        console.warn('Gamification APIs fallback:', e);
      }
    };
    fetchData();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(referral.referralLink || referral.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    try {
      const res = await growthService.applyReferral(inviteCodeInput.trim());
      if (res.ok) {
        setApplyMsg('Áp dụng mã giới thiệu thành công! Bạn nhận được +100 Điểm thưởng.');
        setInviteCodeInput('');
      } else {
        setApplyMsg(res.message || 'Mã không hợp lệ hoặc đã được sử dụng.');
      }
    } catch {
      setApplyMsg('Đã ghi nhận mã giới thiệu của bạn!');
      setInviteCodeInput('');
    }
  };

  const top3 = leaderboard.slice(0, 3);
  const restUsers = leaderboard.slice(3);

  return (
    <div className="leaderboard-container">
      {/* Header */}
      <div className="lead-hero">
        <div className="lead-badge">
          <Trophy size={16} color="#eab308" />
          <span>Bảng Vinh Danh Ứng Viên STAR Toàn Quốc</span>
        </div>
        <h1 className="lead-title">
          Thi Đua Phỏng Vấn & Mở Khóa <span className="lead-gradient">Huy Hiệu Danh Giá</span>
        </h1>
        <p className="lead-desc">
          Luyện tập phỏng vấn AI thường xuyên để tích lũy điểm STAR, thăng hạng Leaderboard và nhận chứng thực năng lực độc quyền từ HireMate.
        </p>
      </div>

      {/* Tabs */}
      <div className="lead-tabs">
        <button
          className={`lead-tab-item ${tab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setTab('leaderboard')}
        >
          <Trophy size={16} /> Bảng xếp hạng Top 20
        </button>
        <button
          className={`lead-tab-item ${tab === 'badges' ? 'active' : ''}`}
          onClick={() => setTab('badges')}
        >
          <Award size={16} /> Bộ sưu tập Huy hiệu ({badges.filter(b => b.unlockedAt).length}/{badges.length})
        </button>
        <button
          className={`lead-tab-item ${tab === 'benchmark' ? 'active' : ''}`}
          onClick={() => setTab('benchmark')}
        >
          <TrendingUp size={16} /> Đối chiếu Benchmark ngành
        </button>
        <button
          className={`lead-tab-item ${tab === 'referral' ? 'active' : ''}`}
          onClick={() => setTab('referral')}
        >
          <Share2 size={16} /> Giới thiệu bạn bè (Referral)
        </button>
      </div>

      {/* Tab 1: Leaderboard */}
      {tab === 'leaderboard' && (
        <div>
          {/* Top 3 Podium */}
          <div className="lead-podium-wrap">
            {/* Rank 2 */}
            {top3[1] && (
              <div className="podium-card silver">
                <div className="podium-crown silver">🥈</div>
                <div className="podium-avatar-circle silver">{(top3[1].userName || 'U')[0]}</div>
                <h4 className="podium-name">{top3[1].userName}</h4>
                <div className="podium-score">⭐ {top3[1].overallScore}</div>
                <span className="podium-stats">{top3[1].interviewsCompleted} phiên • {top3[1].badgeCount} huy hiệu</span>
                <div className="podium-pedestal silver-pedestal">2</div>
              </div>
            )}

            {/* Rank 1 */}
            {top3[0] && (
              <div className="podium-card gold">
                <div className="podium-crown gold">👑</div>
                <div className="podium-avatar-circle gold">{(top3[0].userName || 'U')[0]}</div>
                <h4 className="podium-name">{top3[0].userName}</h4>
                <div className="podium-score gold-text">⭐ {top3[0].overallScore}</div>
                <span className="podium-stats">{top3[0].interviewsCompleted} phiên • {top3[0].badgeCount} huy hiệu</span>
                <div className="podium-pedestal gold-pedestal">1</div>
              </div>
            )}

            {/* Rank 3 */}
            {top3[2] && (
              <div className="podium-card bronze">
                <div className="podium-crown bronze">🥉</div>
                <div className="podium-avatar-circle bronze">{(top3[2].userName || 'U')[0]}</div>
                <h4 className="podium-name">{top3[2].userName}</h4>
                <div className="podium-score">⭐ {top3[2].overallScore}</div>
                <span className="podium-stats">{top3[2].interviewsCompleted} phiên • {top3[2].badgeCount} huy hiệu</span>
                <div className="podium-pedestal bronze-pedestal">3</div>
              </div>
            )}
          </div>

          {/* Table from rank 4+ */}
          <div className="lead-table-card">
            <table className="lead-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Thứ hạng</th>
                  <th>Ứng viên</th>
                  <th>Điểm STAR trung bình</th>
                  <th>Số phiên hoàn thành</th>
                  <th>Huy hiệu</th>
                </tr>
              </thead>
              <tbody>
                {restUsers.map((u) => (
                  <tr key={u.rank}>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#64748b' }}>#{u.rank}</td>
                    <td>
                      <div className="user-row-meta">
                        <div className="user-initials-mini">{(u.userName || 'U')[0]}</div>
                        <span className="user-name-text">{u.userName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="score-badge-table">⭐ {u.overallScore}</span>
                    </td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>{u.interviewsCompleted} buổi</td>
                    <td>
                      <span className="badge-count-pill">🏅 {u.badgeCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Badges */}
      {tab === 'badges' && (
        <div className="badges-grid">
          {badges.map((b) => {
            const isUnlocked = !!b.unlockedAt;
            return (
              <div key={b.id} className={`badge-card-item ${isUnlocked ? 'unlocked' : 'locked'}`}>
                <div className="badge-icon-box">{b.icon || '🏅'}</div>
                <div className="badge-info-box">
                  <div className="badge-header-row">
                    <span className="badge-category-tag">{b.category}</span>
                    {isUnlocked ? (
                      <span className="badge-status-unlocked">
                        <Check size={12} /> Đã mở khóa
                      </span>
                    ) : (
                      <span className="badge-status-locked">{b.progressPercent}%</span>
                    )}
                  </div>
                  <h4 className="badge-title">{b.name}</h4>
                  <p className="badge-desc">{b.description}</p>
                  {!isUnlocked && (
                    <div className="badge-progress-bar-wrap">
                      <div className="badge-progress-fill" style={{ width: `${b.progressPercent}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Benchmark */}
      {tab === 'benchmark' && (
        <div className="benchmark-card-wrap">
          <div className="benchmark-header">
            <div>
              <h3 className="bm-title">Đối Chiếu Năng Lực Chuẩn Ngành</h3>
              <p className="bm-sub">
                Ngành nghề: <strong>{benchmark.industry}</strong> • Vị trí: <strong>{benchmark.role}</strong>
              </p>
            </div>
            <div className="percentile-badge">
              <span className="pct-number">Top {100 - benchmark.percentile}%</span>
              <span className="pct-label">Cao hơn {benchmark.percentile}% ứng viên khác</span>
            </div>
          </div>

          <div className="bm-metrics-visual">
            <div className="bm-metric-col">
              <span className="bm-metric-title">Điểm của bạn</span>
              <span className="bm-metric-val user-val">{benchmark.userScore}</span>
              <span className="bm-metric-sub">Phương pháp STAR</span>
            </div>
            <div className="bm-divider-vs">VS</div>
            <div className="bm-metric-col">
              <span className="bm-metric-title">Mặt bằng chung ngành</span>
              <span className="bm-metric-val avg-val">{benchmark.averageScore}</span>
              <span className="bm-metric-sub">Dữ liệu từ 10.000+ ứng viên</span>
            </div>
            <div className="bm-divider-vs">VS</div>
            <div className="bm-metric-col">
              <span className="bm-metric-title">Nhóm Top 10% Xuất sắc</span>
              <span className="bm-metric-val top-val">{benchmark.top10PercentScore}</span>
              <span className="bm-metric-sub">Offer Level Senior+</span>
            </div>
          </div>

          <div className="bm-chart-bar-container">
            <div className="chart-bar-scale">
              <div className="scale-fill-avg" style={{ width: `${(benchmark.averageScore / 10) * 100}%` }} title="Mặt bằng chung" />
              <div className="scale-fill-user" style={{ width: `${(benchmark.userScore / 10) * 100}%` }} title="Điểm của bạn" />
              <div className="scale-marker-top" style={{ left: `${(benchmark.top10PercentScore / 10) * 100}%` }} title="Top 10%" />
            </div>
            <div className="chart-legend">
              <span>🔵 Điểm của bạn ({benchmark.userScore})</span>
              <span>⚪ Trung bình ngành ({benchmark.averageScore})</span>
              <span>⭐ Top 10% ({benchmark.top10PercentScore})</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Referral */}
      {tab === 'referral' && (
        <div className="referral-box-grid">
          <div className="referral-main-card">
            <h3 className="ref-card-title">Mời Bạn Bè, Cùng Nhận Phiên Phỏng Vấn AI Miễn Phí</h3>
            <p className="ref-card-desc">
              Khi bạn bè đăng ký và bắt đầu phỏng vấn qua link của bạn, cả hai người đều sẽ nhận ngay <strong>+100 Điểm thưởng</strong> và thêm lượt phỏng vấn không giới hạn.
            </p>

            <div className="referral-link-box">
              <input type="text" readOnly value={referral.referralLink} className="ref-input" />
              <button className="ref-copy-btn" onClick={handleCopy}>
                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                {copied ? 'Đã sao chép' : 'Sao chép link'}
              </button>
            </div>

            <div className="referral-stats-row">
              <div className="ref-stat-col">
                <span className="stat-num">{referral.referredCount}</span>
                <span className="stat-text">Bạn bè đã tham gia</span>
              </div>
              <div className="ref-stat-col">
                <span className="stat-num">{referral.rewardPoints}</span>
                <span className="stat-text">Điểm thưởng tích lũy</span>
              </div>
            </div>
          </div>

          <div className="referral-apply-card">
            <h4 className="apply-title">Bạn có mã giới thiệu từ bạn bè?</h4>
            <p className="apply-sub">Nhập mã giới thiệu để kích hoạt gói quà chào mừng.</p>
            <form onSubmit={handleApplyReferral} className="apply-form">
              <input
                type="text"
                placeholder="Nhập mã CODE..."
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
              />
              <button type="submit" className="btn-apply-code">
                Kích hoạt mã
              </button>
            </form>
            {applyMsg && <div className="apply-alert-msg">{applyMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
export default Leaderboard;
