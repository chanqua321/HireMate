import React, { useEffect, useState } from 'react';
import { Sparkles, Languages, Maximize2, Minimize2, Loader2 } from 'lucide-react';
import { aiService, AiAssistMode } from '../../../../../shared/services/ai.service';

interface AiTextAssistBarProps {
  value: string;
  onChange: (next: string) => void;
  field?: string;
  context?: string;
  disabled?: boolean;
  /** When true, open polish flow immediately once (e.g. score < 50 CTA). */
  autoStartPolish?: boolean;
  onAutoStartConsumed?: () => void;
}

interface ProposalState {
  originalContent: string;
  proposedContent: string;
  mode: string;
}

export const AiTextAssistBar: React.FC<AiTextAssistBarProps> = ({
  value,
  onChange,
  field = 'bio',
  context,
  disabled,
  autoStartPolish,
  onAutoStartConsumed,
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [editableProposed, setEditableProposed] = useState('');

  const run = async (mode: AiAssistMode, targetLang?: 'vi' | 'en') => {
    if (disabled || busy) return;
    if ((value || '').trim().length < 8) {
      setMsg('Nhập ít nhất vài câu trước khi nhờ AI.');
      return;
    }
    const key = targetLang ? `${mode}-${targetLang}` : mode;
    setBusy(key);
    setMsg('');
    const originalSnapshot = value;
    try {
      const res = await aiService.assist({
        text: originalSnapshot,
        mode,
        targetLang,
        field,
        context,
      });
      if (!res.ok || !(res.data?.proposedContent || res.data?.text)) {
        setMsg(res.message || 'AI chưa trả được nội dung. Thử lại.');
        return;
      }
      const proposed = (res.data.proposedContent || res.data.text || '').trim();
      // CRITICAL: do NOT call onChange here — preview only until user accepts.
      setProposal({
        originalContent: res.data.originalContent || originalSnapshot,
        proposedContent: proposed,
        mode,
      });
      setEditableProposed(proposed);
      setMsg('AI đã đề xuất bản mới — xem preview bên dưới trước khi áp dụng.');
    } catch (e: any) {
      setMsg(e?.message || 'Lỗi gọi AI.');
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (autoStartPolish) {
      onAutoStartConsumed?.();
      void run('polish');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartPolish]);

  const acceptProposal = () => {
    if (!proposal) return;
    onChange(editableProposed.trim() || proposal.proposedContent);
    setProposal(null);
    setEditableProposed('');
    setMsg('Đã dùng bản AI. Nhớ lưu hồ sơ / CV để ghi nhận.');
  };

  const rejectProposal = () => {
    setProposal(null);
    setEditableProposed('');
    setMsg('Đã giữ bản cũ — nội dung hiện tại không đổi.');
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    background: active ? '#E0F2FE' : '#FFFFFF',
    color: '#0F172A',
    fontSize: '0.78rem',
    fontWeight: 650,
    cursor: disabled || busy ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          style={btnStyle(busy === 'polish')}
          disabled={!!disabled || !!busy}
          onClick={() => run('polish')}
          title="AI đề xuất diễn đạt — bạn xem preview rồi mới chấp nhận"
        >
          {busy === 'polish' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} color="#0284C7" />}
          AI diễn đạt
        </button>
        <button
          type="button"
          style={btnStyle(busy === 'expand')}
          disabled={!!disabled || !!busy}
          onClick={() => run('expand')}
        >
          {busy === 'expand' ? <Loader2 size={14} className="animate-spin" /> : <Maximize2 size={14} />}
          Mở rộng
        </button>
        <button
          type="button"
          style={btnStyle(busy === 'shorten')}
          disabled={!!disabled || !!busy}
          onClick={() => run('shorten')}
        >
          {busy === 'shorten' ? <Loader2 size={14} className="animate-spin" /> : <Minimize2 size={14} />}
          Rút gọn
        </button>
        <button
          type="button"
          style={btnStyle(busy === 'translate-en')}
          disabled={!!disabled || !!busy}
          onClick={() => run('translate', 'en')}
        >
          {busy === 'translate-en' ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
          → EN
        </button>
        <button
          type="button"
          style={btnStyle(busy === 'translate-vi')}
          disabled={!!disabled || !!busy}
          onClick={() => run('translate', 'vi')}
        >
          {busy === 'translate-vi' ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
          → VI
        </button>
      </div>

      {proposal && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            border: '1.5px solid #BAE6FD',
            background: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ fontWeight: 750, color: '#0C4A6E', marginBottom: 10, fontSize: '0.9rem' }}>
            AI đề xuất chỉnh sửa
          </div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 650, color: '#64748B', marginBottom: 4 }}>
            Bản hiện tại
          </label>
          <textarea
            readOnly
            value={proposal.originalContent}
            rows={3}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              fontSize: '0.85rem',
              lineHeight: 1.45,
              marginBottom: 10,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 650, color: '#0369A1', marginBottom: 4 }}>
            Bản AI đề xuất (có thể chỉnh trước khi dùng)
          </label>
          <textarea
            value={editableProposed}
            onChange={(e) => setEditableProposed(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #7DD3FC',
              background: '#FFFFFF',
              fontSize: '0.85rem',
              lineHeight: 1.45,
              marginBottom: 12,
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={rejectProposal}
              style={{
                ...btnStyle(false),
                border: '1px solid #CBD5E1',
                background: '#F1F5F9',
              }}
            >
              Giữ bản cũ
            </button>
            <button
              type="button"
              onClick={acceptProposal}
              style={{
                ...btnStyle(false),
                border: '1px solid #0284C7',
                background: '#0284C7',
                color: '#FFFFFF',
              }}
            >
              Dùng bản AI
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#94A3B8' }}>
            AI không tự lưu. Chỉ khi bạn chọn «Dùng bản AI» nội dung mới thay thế ô hiện tại — vẫn cần bấm Lưu hồ sơ.
          </p>
        </div>
      )}

      {msg ? (
        <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: msg.includes('Đã') || msg.includes('đề xuất') ? '#0369A1' : '#B45309' }}>
          {msg}
        </p>
      ) : (
        !proposal && (
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
            AI chỉ đề xuất — bạn xem preview rồi chọn Giữ bản cũ hoặc Dùng bản AI. Không tự ghi đè.
          </p>
        )
      )}
    </div>
  );
};
