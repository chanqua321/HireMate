import React, { useState, useMemo, useEffect } from 'react';
import { QUESTION_BANK } from '../../data/questionBank';
import { Search, Sparkles, ChevronDown, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { interviewService } from '../../services/interview.service';

type QItem = { cat: string; q: string; hint: string };

export const Questions: React.FC = () => {
  const [activeCat, setActiveCat] = useState<string>('Tất cả');
  const [search, setSearch] = useState<string>('');
  const [openHintIdx, setOpenHintIdx] = useState<number | null>(null);
  const [bank, setBank] = useState<QItem[]>(QUESTION_BANK);
  const [source, setSource] = useState<'api' | 'local'>('local');

  useEffect(() => {
    interviewService.getQuestionBank().then((res) => {
      if (res.ok && Array.isArray(res.data) && res.data.length) {
        setBank(
          res.data.map((item: any) => ({
            cat: item.cat || item.category || 'Khác',
            q: item.q || item.content || '',
            hint: item.hint || '',
          }))
        );
        setSource('api');
      }
    }).catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(bank.map((q) => q.cat)));
    return ['Tất cả', ...unique];
  }, [bank]);

  const filteredQuestions = useMemo(() => {
    return bank.filter((q) => {
      const matchCat = activeCat === 'Tất cả' || q.cat === activeCat;
      const matchSearch =
        !search.trim() ||
        q.q.toLowerCase().includes(search.toLowerCase()) ||
        (q.hint || '').toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCat, search, bank]);

  const toggleHint = (idx: number) => {
    setOpenHintIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="section container" style={{ maxWidth: '960px', margin: '30px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div className="icon-chip" style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}>
          <BookOpen size={24} />
        </div>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>
          <Sparkles size={16} /> Ngân hàng câu hỏi {source === 'api' ? '(API)' : '(local fallback)'}
        </span>
        <h2>Danh sách câu hỏi phỏng vấn chuẩn STAR</h2>
        <p className="muted">Tổng hợp câu hỏi theo chuyên ngành · {bank.length} câu.</p>
      </div>

      <div style={{ position: 'relative', maxWidth: '560px', margin: '0 auto 24px' }}>
        <Search
          size={20}
          style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
          }}
        />
        <input
          type="text"
          className="form-control"
          placeholder="Tìm kiếm câu hỏi hoặc từ khóa STAR..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '46px', height: '48px', borderRadius: '999px' }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`btn ${activeCat === cat ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveCat(cat)}
            style={{ borderRadius: 999 }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredQuestions.map((q, idx) => (
          <motion.div key={`${q.q}-${idx}`} className="card" style={{ padding: 20 }} layout>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <span className="badge" style={{ marginBottom: 8 }}>{q.cat}</span>
                <div style={{ fontWeight: 600 }}>{q.q}</div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => toggleHint(idx)}>
                Gợi ý <ChevronDown size={16} />
              </button>
            </div>
            <AnimatePresence>
              {openHintIdx === idx && (
                <motion.p
                  className="muted"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: 12 }}
                >
                  {q.hint || 'Chưa có gợi ý.'}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
