import React, { useState, useMemo } from 'react';
import { QUESTION_BANK } from '../../data/questionBank';
import { Search, Sparkles, ChevronDown, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Questions: React.FC = () => {
  const [activeCat, setActiveCat] = useState<string>('Tất cả');
  const [search, setSearch] = useState<string>('');
  const [openHintIdx, setOpenHintIdx] = useState<number | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(QUESTION_BANK.map((q) => q.cat)));
    return ['Tất cả', ...unique];
  }, []);

  const filteredQuestions = useMemo(() => {
    return QUESTION_BANK.filter((q) => {
      const matchCat = activeCat === 'Tất cả' || q.cat === activeCat;
      const matchSearch =
        !search.trim() ||
        q.q.toLowerCase().includes(search.toLowerCase()) ||
        q.hint.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCat, search]);

  const toggleHint = (idx: number) => {
    setOpenHintIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="section container" style={{ maxWidth: '960px', margin: '30px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          className="icon-chip"
          style={{ margin: '0 auto 16px', width: '48px', height: '48px' }}
        >
          <BookOpen size={24} />
        </div>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>
          <Sparkles size={16} /> Ngân hàng câu hỏi chuyên sâu
        </span>
        <h2>Danh sách câu hỏi phỏng vấn chuẩn STAR</h2>
        <p className="muted">
          Tổng hợp câu hỏi theo từng chuyên ngành cùng gợi ý cách trả lời ghi điểm.
        </p>
      </div>

      {/* Search Input */}
      <div
        style={{
          position: 'relative',
          maxWidth: '560px',
          margin: '0 auto 24px',
        }}
      >
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

      {/* Category Filter Chips */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          marginBottom: '28px',
        }}
      >
        {categories.map((cat) => {
          const active = activeCat === cat;
          return (
            <button
              key={cat}
              type="button"
              className={`btn ${active ? 'btn-primary' : 'btn-ghost'} qb-chip`}
              onClick={() => setActiveCat(cat)}
              style={{
                borderRadius: '999px',
                padding: '8px 18px',
                fontSize: '0.9rem',
                fontWeight: active ? 700 : 500,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Count Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <span className="muted" style={{ fontWeight: 600 }}>
          Hiển thị <b>{filteredQuestions.length}</b> câu hỏi
        </span>

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            Xóa tìm kiếm
          </button>
        )}
      </div>

      {/* Question Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <AnimatePresence>
          {filteredQuestions.map((q, idx) => {
            const isOpen = openHintIdx === idx;
            return (
              <motion.div
                key={`${q.cat}-${q.q}`}
                className="card"
                style={{ padding: '24px' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(3, 191, 255, 0.1)',
                        color: 'var(--primary)',
                        marginBottom: '8px',
                        display: 'inline-block',
                      }}
                    >
                      {q.cat}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', lineHeight: 1.5 }}>
                      {q.q}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleHint(idx)}
                    className="btn btn-ghost"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.85rem',
                      padding: '6px 12px',
                    }}
                  >
                    <Sparkles size={14} color="var(--primary)" />
                    <span>{isOpen ? 'Ẩn gợi ý' : 'Gợi ý STAR'}</span>
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          marginTop: '16px',
                          padding: '16px',
                          background: 'var(--bg-subtle, #F8FAFC)',
                          borderRadius: '10px',
                          borderLeft: '4px solid var(--primary)',
                          color: 'var(--muted)',
                          fontSize: '0.95rem',
                          lineHeight: 1.6,
                        }}
                      >
                        <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                          Hướng dẫn trả lời theo STAR:
                        </strong>
                        {q.hint}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredQuestions.length === 0 && (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <p className="muted">Không tìm thấy câu hỏi nào phù hợp với từ khóa tìm kiếm của bạn.</p>
          </div>
        )}
      </div>
    </div>
  );
};
