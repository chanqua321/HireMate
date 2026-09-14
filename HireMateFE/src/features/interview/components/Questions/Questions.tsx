import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QUESTION_BANK } from '../../../../shared/data/questionBank';
import { interviewService } from '../../api/interview.service';
import { Question } from '../../../../shared/types';
import {
  Search,
  Sparkles,
  ChevronDown,
  BookOpen,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Target,
  Flame,
  Lightbulb,
  X,
  HelpCircle,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './css/Questions.css';

export const Questions: React.FC = () => {
  const [activeCat, setActiveCat] = useState<string>('Tất cả');
  const [search, setSearch] = useState<string>('');
  const [openHintIdx, setOpenHintIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [questionsList, setQuestionsList] = useState<Question[]>(QUESTION_BANK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBank = async () => {
      setLoading(true);
      try {
        const res = await interviewService.getQuestionBank();
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: Question[] = res.data.map((item: any) => ({
            q: item.content || item.q || '',
            cat: item.category || item.cat || 'Chuyên môn',
            hint:
              item.hint ||
              item.starGuideline ||
              'Hướng dẫn trả lời theo STAR: Nêu rõ Bối cảnh (Situation), Nhiệm vụ (Task), Hành động cụ thể (Action) và Kết quả đo lường được (Result).',
          }));
          setQuestionsList(mapped);
        }
      } catch (e) {
        // Fallback to local QUESTION_BANK
      } finally {
        setLoading(false);
      }
    };
    fetchBank();
  }, []);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(questionsList.map((q) => q.cat)));
    return ['Tất cả', ...unique];
  }, [questionsList]);

  // Count questions per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tất cả': questionsList.length };
    questionsList.forEach((q) => {
      counts[q.cat] = (counts[q.cat] || 0) + 1;
    });
    return counts;
  }, [questionsList]);

  const filteredQuestions = useMemo(() => {
    return questionsList.filter((q) => {
      const matchCat = activeCat === 'Tất cả' || q.cat === activeCat;
      const matchSearch =
        !search.trim() ||
        q.q.toLowerCase().includes(search.toLowerCase()) ||
        q.hint.toLowerCase().includes(search.toLowerCase()) ||
        q.cat.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [questionsList, activeCat, search]);

  const toggleHint = (idx: number) => {
    setOpenHintIdx((prev) => (prev === idx ? null : idx));
  };

  const handleCopyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Helper to format category color
  const getCatStyle = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'chuyên môn':
      case 'frontend':
      case 'backend':
        return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'tình huống':
      case 'star':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'hành vi':
      case 'behavioral':
        return { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' };
      case 'lãnh đạo':
      case 'leadership':
        return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div className="qb-page-container">
      {/* 1. Hero Header */}
      <motion.div
        className="qb-hero-section"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="qb-hero-badge">
          <Sparkles size={14} />
          <span>BỘ ĐỀ PHỎNG VẤN CHUẨN QUỐC TẾ • CẬP NHẬT 2026</span>
        </div>
        <h1 className="qb-hero-title">Ngân hàng câu hỏi phỏng vấn chuẩn STAR</h1>
        <p className="qb-hero-subtitle">
          Khám phá hơn <strong>{questionsList.length} câu hỏi tuyển dụng thực tế</strong> kèm hướng dẫn bóc tách câu trả lời theo 4 bước Situation - Task - Action - Result.
        </p>

        {/* Quick Stats Row */}
        <div className="qb-stats-row">
          <div className="qb-stat-pill">
            <BookOpen size={15} />
            <span><strong>{questionsList.length}</strong> Câu hỏi chọn lọc</span>
          </div>
          <div className="qb-stat-pill">
            <Award size={15} />
            <span><strong>{categories.length - 1}</strong> Lĩnh vực chuyên môn</span>
          </div>
          <div className="qb-stat-pill">
            <Sparkles size={15} />
            <span><strong>100%</strong> Có gợi ý khung STAR</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Search & Category Filters Bar */}
      <div className="qb-controls-wrapper">
        {/* Search Box */}
        <div className="qb-search-box">
          <Search size={20} className="qb-search-icon" />
          <input
            type="text"
            className="qb-search-input"
            placeholder="Tìm kiếm câu hỏi theo từ khóa, chuyên ngành hoặc cấu trúc STAR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="qb-search-clear"
              onClick={() => setSearch('')}
              title="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="qb-category-scroll">
          {categories.map((cat) => {
            const active = activeCat === cat;
            const count = categoryCounts[cat] || 0;
            return (
              <button
                key={cat}
                type="button"
                className={`qb-cat-pill ${active ? 'active' : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                <span>{cat}</span>
                <span className="qb-cat-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Results Header Bar */}
      <div className="qb-results-bar">
        <div className="qb-results-text">
          Đang hiển thị <strong>{filteredQuestions.length}</strong> câu hỏi trong mục <strong>"{activeCat}"</strong>
        </div>

        {search && (
          <button
            type="button"
            className="qb-reset-filter-btn"
            onClick={() => {
              setSearch('');
              setActiveCat('Tất cả');
            }}
          >
            <X size={14} />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      {/* 4. Questions List */}
      <div className="qb-questions-stack">
        {loading ? (
          <div className="qb-loading-state">
            <Loader2 size={32} className="spin" color="#0284c7" />
            <span>Đang tải bộ câu hỏi từ máy chủ HireMate...</span>
          </div>
        ) : (
          <AnimatePresence>
            {filteredQuestions.map((q, idx) => {
              const isOpen = openHintIdx === idx;
              const isCopied = copiedIdx === idx;
              const catStyle = getCatStyle(q.cat);

              return (
                <motion.div
                  key={`${q.cat}-${idx}-${q.q.substring(0, 15)}`}
                  className={`qb-question-card ${isOpen ? 'is-expanded' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.2) }}
                >
                  {/* Card Main Row */}
                  <div className="qb-card-main">
                    <div className="qb-card-content">
                      <div className="qb-card-meta-row">
                        <span
                          className="qb-cat-tag"
                          style={{
                            backgroundColor: catStyle.bg,
                            color: catStyle.color,
                            borderColor: catStyle.border,
                          }}
                        >
                          {q.cat}
                        </span>

                        <span className="qb-number-tag">Câu #{idx + 1}</span>
                      </div>

                      <h3 className="qb-question-text">{q.q}</h3>
                    </div>

                    {/* Card Actions Right */}
                    <div className="qb-card-actions">
                      <button
                        type="button"
                        className="qb-action-copy-btn"
                        onClick={() => handleCopyQuestion(q.q, idx)}
                        title="Sao chép nội dung câu hỏi"
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} color="#16a34a" />
                            <span style={{ color: '#16a34a' }}>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`qb-action-hint-btn ${isOpen ? 'active' : ''}`}
                        onClick={() => toggleHint(idx)}
                      >
                        <Sparkles size={14} />
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
                  </div>

                  {/* Accordion: STAR Guidance */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        className="qb-hint-accordion"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="qb-hint-body">
                          <div className="qb-hint-header">
                            <Lightbulb size={18} color="#0284c7" />
                            <strong>💡 Hướng dẫn chiến lược trả lời chuẩn cấu trúc STAR:</strong>
                          </div>

                          <p className="qb-hint-text">{q.hint}</p>

                          {/* 4 Steps STAR Micro Breakdown Grid */}
                          <div className="qb-star-pillars-grid">
                            <div className="qb-star-pillar-card p-situation">
                              <span className="pillar-badge">S • Situation</span>
                              <p>Bối cảnh dự án, quy mô công ty hoặc thách thức bạn đối mặt.</p>
                            </div>

                            <div className="qb-star-pillar-card p-task">
                              <span className="pillar-badge">T • Task</span>
                              <p>Nhiệm vụ trọng tâm và mục tiêu cụ thể bạn cần hoàn thành.</p>
                            </div>

                            <div className="qb-star-pillar-card p-action">
                              <span className="pillar-badge">A • Action</span>
                              <p>Giải pháp & hành động thực tế bạn trực tiếp triển khai giải quyết.</p>
                            </div>

                            <div className="qb-star-pillar-card p-result">
                              <span className="pillar-badge">R • Result</span>
                              <p>Kết quả định lượng đạt được (số liệu %, doanh thu, hiệu suất).</p>
                            </div>
                          </div>

                          {/* CTA to Practice with this Question */}
                          <div className="qb-hint-footer">
                            <span className="qb-hint-footnote">
                              Tập dượt trả lời câu này với AI để nhận phản hồi phân tích thời gian thực!
                            </span>

                            <Link
                              to="/interview-setup"
                              className="qb-practice-now-btn"
                            >
                              <span>Luyện câu hỏi này cùng AI</span>
                              <ArrowRight size={15} />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Empty State */}
        {!loading && filteredQuestions.length === 0 && (
          <motion.div
            className="qb-empty-card"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="qb-empty-icon">
              <HelpCircle size={36} />
            </div>
            <h3>Không tìm thấy câu hỏi phù hợp</h3>
            <p>
              Không có kết quả nào khớp với từ khóa <strong>"{search}"</strong> trong danh mục <strong>"{activeCat}"</strong>.
            </p>
            <button
              type="button"
              className="qb-empty-reset-btn"
              onClick={() => {
                setSearch('');
                setActiveCat('Tất cả');
              }}
            >
              Xem tất cả {questionsList.length} câu hỏi
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
