import React from 'react';
import { motion } from 'framer-motion';
import { Folder, Target, Sparkles, Loader2 } from 'lucide-react';
import { UserCvCard } from '../Dashboard';
import './JdMatcher.css';

interface JdMatcherProps {
  userCvs: UserCvCard[];
  activeCvId: string;
  selectedMatchCvId: string;
  setSelectedMatchCvId: (id: string) => void;
  jdText: string;
  setJdText: (text: string) => void;
  isMatching: boolean;
  matchResult: any;
  onMatch: (e: React.FormEvent) => void;
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
}) => {
  return (
    <motion.div
      key="match-tab"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="match-tab-content"
    >
      <form onSubmit={onMatch} className="match-form">
        {/* Select which CV to match with JD */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">
            <Folder size={15} />
            <span>Chọn CV từ kho để so khớp với JD này:</span>
          </label>
          <select
            className="custom-form-select"
            value={selectedMatchCvId}
            onChange={(e) => setSelectedMatchCvId(e.target.value)}
          >
            {userCvs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === activeCvId
                  ? `[Đang kích hoạt phỏng vấn] ${c.title} — (${c.role})`
                  : `${c.title} — (${c.role})`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Target size={15} />
            <span>Dán nội dung mô tả công việc (Job Description / JD)</span>
          </label>
          <textarea
            className="custom-form-textarea"
            rows={6}
            placeholder="Dán toàn bộ nội dung JD tuyển dụng (yêu cầu kỹ thuật, trách nhiệm công việc, quyền lợi...) vào đây để AI so khớp độ tương thích với hồ sơ của bạn..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="save-profile-btn"
          style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
          disabled={isMatching || !jdText.trim()}
        >
          {isMatching ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>AI đang phân tích & so khớp tiêu chí...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} />
              <span>Bắt đầu so khớp JD với Hồ sơ của tôi</span>
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
              {matchResult.overallScore || matchResult.matchScore || 85}% Phù hợp
            </div>
          </div>

          <div className="match-skills-block">
            <span className="match-skills-label-success">
              ✓ Kỹ năng bạn đã đáp ứng tốt:
            </span>
            <div className="match-chips-row">
              {(matchResult.matchingSkills || []).map((s: string) => (
                <span key={s} className="match-chip-green">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="match-skills-block">
            <span className="match-skills-label-warning">
              ⚡ Kỹ năng JD yêu cầu bạn nên bổ sung thêm:
            </span>
            <div className="match-chips-row">
              {(matchResult.missingSkills || []).map((s: string) => (
                <span key={s} className="match-chip-amber">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {matchResult.recommendations && (
            <div className="match-recommendations-box">
              <strong>💡 Khuyến nghị cho buổi phỏng vấn:</strong>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                {matchResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} style={{ marginTop: '2px' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
