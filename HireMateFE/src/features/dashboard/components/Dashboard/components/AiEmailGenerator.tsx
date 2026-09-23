import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Sparkles, Briefcase, User, Loader2, Send, Check, Copy } from 'lucide-react';
import './AiEmailGenerator.css';

interface AiEmailGeneratorProps {
  emailType: string;
  setEmailType: (type: string) => void;
  emailPosition: string;
  setEmailPosition: (pos: string) => void;
  emailCompany: string;
  setEmailCompany: (comp: string) => void;
  emailTone: string;
  setEmailTone: (tone: string) => void;
  isGeneratingEmail: boolean;
  generatedEmail: any;
  copiedEmail: boolean;
  onGenerateEmail: (e: React.FormEvent) => void;
  onCopyEmail: () => void;
  quotaRemaining?: number;
  quotaLimit?: number;
}

export const AiEmailGenerator: React.FC<AiEmailGeneratorProps> = ({
  emailType,
  setEmailType,
  emailPosition,
  setEmailPosition,
  emailCompany,
  setEmailCompany,
  emailTone,
  setEmailTone,
  isGeneratingEmail,
  generatedEmail,
  copiedEmail,
  onGenerateEmail,
  onCopyEmail,
  quotaRemaining,
  quotaLimit,
}) => {
  const blocked = typeof quotaRemaining === 'number' && quotaRemaining <= 0;

  return (
    <motion.div
      key="email-tab"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="email-tab-content"
    >
      {typeof quotaRemaining === 'number' && (
        <div className={`email-quota-banner ${blocked ? 'blocked' : ''}`}>
          <Sparkles size={16} />
          <span>
            Hạn mức Email/CV AI: <strong>{quotaRemaining}</strong>
            {typeof quotaLimit === 'number' ? ` / ${quotaLimit}` : ''} còn lại tháng này
            {blocked
              ? quotaLimit === 0
                ? ' — Gói Free không hỗ trợ. Nâng cấp để mở khóa.'
                : ' — Quota exceeded. Nâng cấp hoặc đợi chu kỳ mới.'
              : ''}
          </span>
        </div>
      )}
      <form onSubmit={onGenerateEmail} className="email-form">
        <div className="form-two-col">
          <div className="form-group">
            <label className="form-label">
              <Mail size={15} />
              <span>Loại thư cần tạo</span>
            </label>
            <select
              className="custom-form-select"
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
            >
              <option value="CoverLetter">Thư ứng tuyển (Cover Letter)</option>
              <option value="ThankYou">Thư cảm ơn sau phỏng vấn (Thank-you Email)</option>
              <option value="FollowUp">Thư hỏi thăm tiến độ tuyển dụng (Follow-up)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Sparkles size={15} />
              <span>Giọng điệu thư</span>
            </label>
            <select
              className="custom-form-select"
              value={emailTone}
              onChange={(e) => setEmailTone(e.target.value)}
            >
              <option value="formal">Trang trọng, chuyên nghiệp (Formal)</option>
              <option value="confident">Tự tin, quyết đoán (Confident)</option>
              <option value="enthusiastic">Nhiệt huyết, cởi mở (Enthusiastic)</option>
            </select>
          </div>
        </div>

        <div className="form-two-col">
          <div className="form-group">
            <label className="form-label">
              <Briefcase size={15} />
              <span>Vị trí ứng tuyển</span>
            </label>
            <input
              type="text"
              className="custom-form-input"
              placeholder="VD: Senior Frontend Developer"
              value={emailPosition}
              onChange={(e) => setEmailPosition(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <User size={15} />
              <span>Tên công ty ứng tuyển</span>
            </label>
            <input
              type="text"
              className="custom-form-input"
              placeholder="VD: FPT Software, VNG, Shopee..."
              value={emailCompany}
              onChange={(e) => setEmailCompany(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="save-profile-btn"
          style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
          disabled={isGeneratingEmail || blocked}
        >
          {isGeneratingEmail ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>AI đang soạn thảo thư chuyên nghiệp...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Tạo thư tự động bằng AI</span>
            </>
          )}
        </button>
      </form>

      {generatedEmail && (
        <motion.div
          className="email-result-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="email-result-top">
            <h4 className="email-result-heading">
              {emailType === 'CoverLetter'
                ? '📄 Thư ứng tuyển đề xuất'
                : emailType === 'ThankYou'
                ? '💌 Thư cảm ơn đề xuất'
                : '📬 Thư Follow-up đề xuất'}
            </h4>
            <button
              type="button"
              onClick={onCopyEmail}
              className="email-copy-btn"
              style={{
                background: copiedEmail ? '#DCFCE7' : '#FFFFFF',
                color: copiedEmail ? '#16A34A' : '#0284C7',
                borderColor: copiedEmail ? '#86EFAC' : '#BAE6FD',
              }}
            >
              {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedEmail ? 'Đã sao chép!' : 'Sao chép thư'}</span>
            </button>
          </div>

          {generatedEmail.subject && (
            <div className="email-subject-box">
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>Tiêu đề Email:</span>
              <strong style={{ fontSize: '0.9rem', color: '#0F172A' }}>{generatedEmail.subject}</strong>
            </div>
          )}

          <div className="email-body-box">
            {generatedEmail.body || generatedEmail.email || generatedEmail.emailText}
          </div>

          {generatedEmail.tips && generatedEmail.tips.length > 0 && (
            <div className="email-tips-box">
              <strong>💡 Lưu ý quan trọng:</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                {generatedEmail.tips.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
