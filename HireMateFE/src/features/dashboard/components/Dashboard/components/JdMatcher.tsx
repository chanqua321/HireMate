import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Folder, Target, Sparkles, Loader2, Plus, Archive, History } from 'lucide-react';
import { UserCvCard } from '../Dashboard';
import { jdService, type JobDescriptionSummary } from '../../../../../shared/services/jd.service';
import { matchService, type MatchResultDto } from '../../../../../shared/services/match.service';
import './JdMatcher.css';

export interface JdMatchViewModel {
  overallScore?: number | null;
  matchScore?: number | null;
  matchingSkills?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  experienceGaps?: string[];
  keywordGaps?: string[];
  strengths?: string[];
  recommendations?: string[];
  aiProvider?: string;
  jdTitle?: string | null;
  cvFileName?: string | null;
  createdAt?: string;
}

interface JdMatcherProps {
  userCvs: UserCvCard[];
  activeCvId: string;
  selectedMatchCvId: string;
  setSelectedMatchCvId: (id: string) => void;
  jdText: string;
  setJdText: (text: string) => void;
  isMatching: boolean;
  matchResult: JdMatchViewModel | null;
  onMatch: (e: React.FormEvent, opts: { jobDescriptionId?: string; saveJd: boolean; jdTitle: string }) => void;
  quotaRemaining?: number;
  quotaLimit?: number;
}

export const JdMatcher: React.FC<JdMatcherProps> = ({
  userCvs,
  activeCvId,
  selectedMatchCvId,
  setSelectedMatchCvId,
  jdText,
  setJdText,
  isMatching,
  matchResult,
  onMatch,
  quotaRemaining,
  quotaLimit,
}) => {
  const blocked = typeof quotaRemaining === 'number' && quotaRemaining <= 0;
  const noActiveCv = !activeCvId && userCvs.length === 0;
  const upgradeHint =
    quotaLimit === 0
      ? 'Gói Miễn phí: JD Match = 0. Nâng cấp Tiêu chuẩn (15) hoặc Cao cấp (50).'
      : 'Quota exceeded — hết hạn mức so khớp JD tháng này. Nâng cấp gói hoặc đợi chu kỳ mới.';

  const [savedJds, setSavedJds] = useState<JobDescriptionSummary[]>([]);
  const [selectedJdId, setSelectedJdId] = useState('');
  const [jdTitle, setJdTitle] = useState('');
  const [saveJd, setSaveJd] = useState(true);
  const [history, setHistory] = useState<MatchResultDto[]>([]);
  const [loadingJds, setLoadingJds] = useState(false);
  const [mode, setMode] = useState<'paste' | 'saved'>('paste');

  const refreshJds = useCallback(async () => {
    setLoadingJds(true);
    try {
      const res = await jdService.list(false);
      if (res.ok && Array.isArray(res.data)) setSavedJds(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoadingJds(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await matchService.getHistory();
      if (res.ok && Array.isArray(res.data)) setHistory(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshJds();
    void refreshHistory();
  }, [refreshJds, refreshHistory]);

  const handleSelectSaved = async (id: string) => {
    setSelectedJdId(id);
    setMode('saved');
    if (!id) return;
    try {
      const res = await jdService.get(id);
      if (res.ok && res.data) {
        setJdText(res.data.content);
        setJdTitle(res.data.title);
        setSaveJd(false);
      }
    } catch {
      /* ignore */
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Lưu trữ JD này? Lịch sử match vẫn được giữ.')) return;
    try {
      await jdService.archive(id);
      if (selectedJdId === id) {
        setSelectedJdId('');
        setMode('paste');
      }
      await refreshJds();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Không lưu trữ được JD.');
    }
  };

  const canSubmit =
    !isMatching &&
    !blocked &&
    !noActiveCv &&
    (mode === 'saved' ? Boolean(selectedJdId) : jdText.trim().length >= 30);

  const matched =
    matchResult?.matchedSkills || matchResult?.matchingSkills || [];
  const missing = matchResult?.missingSkills || [];

  return (
    <motion.div
      key="match-tab"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="match-tab-content"
    >
      {typeof quotaRemaining === 'number' && (
        <div className={`match-quota-banner ${blocked ? 'blocked' : ''}`}>
          <Sparkles size={16} />
          <span>
            Hạn mức JD Match: <strong>{quotaRemaining}</strong>
            {typeof quotaLimit === 'number' ? ` / ${quotaLimit}` : ''} còn lại tháng này
            {blocked ? ` — ${upgradeHint}` : ''}
          </span>
        </div>
      )}

      {noActiveCv && (
        <div className="match-warning-banner">
          <Folder size={16} />
          <span>Chưa có CV nào được kích hoạt. Vui lòng kích hoạt một CV trong Kho CV trước khi so khớp JD.</span>
        </div>
      )}

      <form
        onSubmit={(e) =>
          onMatch(e, {
            jobDescriptionId: mode === 'saved' && selectedJdId ? selectedJdId : undefined,
            saveJd: mode === 'paste' && saveJd,
            jdTitle: jdTitle.trim() || 'JD đã lưu',
          })
        }
        className="match-form"
      >
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">
            <Folder size={15} />
            <span>Chọn CV để so khớp (mặc định Active CV):</span>
          </label>
          <select
            className="custom-form-select"
            value={selectedMatchCvId}
            onChange={(e) => setSelectedMatchCvId(e.target.value)}
            disabled={blocked || noActiveCv}
          >
            {userCvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === activeCvId
                  ? `🎯 [Active] ${c.title} — (${c.role})`
                  : `${c.title} — (${c.role})`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">
            <Target size={15} />
            <span>JD đã lưu</span>
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <button
              type="button"
              className="btn-report-ghost"
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
              onClick={() => {
                setMode('paste');
                setSelectedJdId('');
                setSaveJd(true);
              }}
            >
              <Plus size={14} /> Dán JD mới
            </button>
            <button
              type="button"
              className="btn-report-ghost"
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
              onClick={() => void refreshJds()}
              disabled={loadingJds}
            >
              {loadingJds ? 'Đang tải…' : 'Làm mới danh sách'}
            </button>
          </div>
          <select
            className="custom-form-select"
            value={selectedJdId}
            onChange={(e) => void handleSelectSaved(e.target.value)}
            disabled={blocked}
          >
            <option value="">— Chọn JD đã lưu (hoặc dán mới bên dưới) —</option>
            {savedJds.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
                {j.companyName ? ` · ${j.companyName}` : ''}
                {j.latestMatchScore != null ? ` · ${j.latestMatchScore}%` : ''}
              </option>
            ))}
          </select>
          {selectedJdId ? (
            <button
              type="button"
              onClick={() => void handleArchive(selectedJdId)}
              style={{
                marginTop: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                color: '#B45309',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <Archive size={14} /> Lưu trữ JD này
            </button>
          ) : null}
        </div>

        {mode === 'paste' && (
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Tiêu đề JD (khi lưu)</label>
            <input
              className="custom-form-input"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
              placeholder="VD: Backend Intern — Công ty X"
              disabled={blocked}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: '0.88rem' }}>
              <input type="checkbox" checked={saveJd} onChange={(e) => setSaveJd(e.target.checked)} />
              Lưu JD vào kho của tôi khi so khớp
            </label>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">
            <Target size={15} />
            <span>Nội dung Job Description</span>
          </label>
          <textarea
            className="custom-form-textarea"
            rows={6}
            placeholder="Dán toàn bộ nội dung JD (tối thiểu 30 ký tự)..."
            value={jdText}
            onChange={(e) => {
              setJdText(e.target.value);
              if (mode === 'saved') {
                setMode('paste');
                setSelectedJdId('');
                setSaveJd(true);
              }
            }}
            required={mode === 'paste'}
            disabled={blocked || (mode === 'saved' && Boolean(selectedJdId))}
          />
        </div>

        <button
          type="submit"
          className="save-profile-btn"
          style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          disabled={!canSubmit}
        >
          {isMatching ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>AI đang phân tích & so khớp...</span>
            </>
          ) : blocked ? (
            <>
              <Sparkles size={16} />
              <span>Quota exceeded — Nâng cấp gói</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>So khớp JD với CV đã chọn</span>
            </>
          )}
        </button>
      </form>

      {matchResult && (
        <motion.div
          className="match-result-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="match-result-top">
            <h4 className="match-result-title">Kết quả đánh giá độ tương thích</h4>
            <div className="match-score-badge">
              {matchResult.overallScore ?? matchResult.matchScore ?? '—'}% Phù hợp
            </div>
          </div>

          <div className="match-skills-block">
            <span className="match-skills-label-success">✓ Matched skills / đã đáp ứng:</span>
            <div className="match-chips-row">
              {matched.length === 0 ? (
                <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Không có dữ liệu</span>
              ) : (
                matched.map((s) => (
                  <span key={s} className="match-chip-green">
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="match-skills-block">
            <span className="match-skills-label-warning">
              ⚡ Missing / Not evidenced in CV (không đồng nghĩa bạn không có skill):
            </span>
            <div className="match-chips-row">
              {missing.length === 0 ? (
                <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Không có</span>
              ) : (
                missing.map((s) => (
                  <span key={s} className="match-chip-amber">
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>

          {(matchResult.experienceGaps?.length ?? 0) > 0 && (
            <div className="match-skills-block">
              <span className="match-skills-label-warning">Experience gaps:</span>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: '0.88rem', color: '#475569' }}>
                {matchResult.experienceGaps!.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {(matchResult.keywordGaps?.length ?? 0) > 0 && (
            <div className="match-skills-block">
              <span className="match-skills-label-warning">Keyword gaps (literal):</span>
              <div className="match-chips-row">
                {matchResult.keywordGaps!.map((s) => (
                  <span key={s} className="match-chip-amber">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(matchResult.strengths?.length ?? 0) > 0 && (
            <div className="match-skills-block">
              <span className="match-skills-label-success">Strengths:</span>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: '0.88rem' }}>
                {matchResult.strengths!.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {matchResult.recommendations && matchResult.recommendations.length > 0 && (
            <div className="match-recommendations-box">
              <strong>💡 Recommendations:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                {matchResult.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginTop: '2px' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <History size={16} /> Lịch sử so khớp gần đây
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {history.slice(0, 8).map((h) => (
              <li
                key={h.id}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  marginBottom: 8,
                  fontSize: '0.88rem',
                  color: '#334155',
                }}
              >
                <strong>{h.overallScore ?? '—'}%</strong>
                {' · '}
                {h.jdTitle || 'JD paste'}
                {' · '}
                {h.cvFileName || 'CV đã bị xóa'}
                {h.createdAt ? ` · ${new Date(h.createdAt).toLocaleDateString('vi-VN')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};
