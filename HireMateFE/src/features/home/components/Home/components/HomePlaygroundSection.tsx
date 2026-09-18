import React, { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Cpu, HelpCircle, Zap, CheckCircle2 } from 'lucide-react';
import { TextMaskReveal } from '../TextMaskReveal';
import './HomePlaygroundSection.css';

export interface PlaygroundTrack {
  id: string;
  name: string;
  tag: string;
  question: string;
  answerSnippet: string;
  starBreakdown: {
    s: { title: string; score: number; desc: string };
    t: { title: string; score: number; desc: string };
    a: { title: string; score: number; desc: string };
    r: { title: string; score: number; desc: string };
  };
}

export const PLAYGROUND_TRACKS: PlaygroundTrack[] = [
  {
    id: 'frontend',
    name: '💻 Lập trình viên Frontend',
    tag: 'Công nghệ & Kỹ thuật',
    question:
      'Hãy kể về một lần bạn giải quyết vấn đề hiệu năng tải trang phức tạp hoặc tối ưu kiến trúc ứng dụng?',
    answerSnippet:
      '[Bối cảnh]: Dự án e-commerce của công ty đạt 150k DAU khiến trang tải chậm 4.2s... [Nhiệm vụ]: Tôi nhận nhiệm vụ giảm thời gian tải dưới 1.5s trong 4 tuần... [Hành động]: Tôi áp dụng Vite code-splitting theo từng route, tối ưu hóa asset WebP và cache Service Worker... [Kết quả]: Tốc độ tải trang đạt 1.1s (tăng 73%), tỷ lệ bỏ giỏ hàng giảm 18%.',
    starBreakdown: {
      s: {
        title: 'Bối cảnh (Situation)',
        score: 92,
        desc: 'Nêu rõ quy mô 150k DAU và tính cấp thiết của vấn đề tải chậm.',
      },
      t: {
        title: 'Nhiệm vụ (Task)',
        score: 88,
        desc: 'Mục tiêu định lượng giảm dưới 1.5s trong thời hạn 4 tuần rõ ràng.',
      },
      a: {
        title: 'Hành động (Action)',
        score: 96,
        desc: 'Giải pháp kỹ thuật chuyên sâu: Vite code-splitting, WebP, Service Worker.',
      },
      r: {
        title: 'Kết quả (Result)',
        score: 95,
        desc: 'Minh chứng số liệu 1.1s (tăng 73%) và giảm 18% bỏ giỏ hàng.',
      },
    },
  },
  {
    id: 'data',
    name: '📊 Data / Business Analyst',
    tag: 'Dữ liệu & Phân tích',
    question:
      'Hãy chia sẻ một tình huống bạn phát hiện bất thường trong dữ liệu và đưa ra đề xuất cho ban giám đốc?',
    answerSnippet:
      '[Bối cảnh]: Trong phân tích hành vi khách hàng quý 2, tôi phát hiện tỷ lệ hủy đơn tăng đột biến 22%... [Nhiệm vụ]: Trách nhiệm của tôi là tìm ra nguyên nhân gốc rễ và đề xuất phương án khắc phục... [Hành động]: Tôi phân khúc dữ liệu theo cổng thanh toán và phát hiện lỗi timeout ở cổng thanh toán mới... [Kết quả]: Đề xuất sửa đổi giúp cứu vãn 1.2 tỷ VNĐ doanh thu tháng.',
    starBreakdown: {
      s: {
        title: 'Bối cảnh (Situation)',
        score: 90,
        desc: 'Xác định rõ vấn đề tỷ lệ hủy đơn tăng bất thường 22%.',
      },
      t: {
        title: 'Nhiệm vụ (Task)',
        score: 87,
        desc: 'Phân định rõ trách nhiệm tìm nguyên nhân gốc rễ cho ban lãnh đạo.',
      },
      a: {
        title: 'Hành động (Action)',
        score: 94,
        desc: 'Phương pháp phân đoạn dữ liệu logic theo cổng thanh toán.',
      },
      r: {
        title: 'Kết quả (Result)',
        score: 96,
        desc: 'Giá trị quy đổi 1.2 tỷ VNĐ doanh thu bảo vệ thành công.',
      },
    },
  },
  {
    id: 'marketing',
    name: '🎯 Digital Marketing Specialist',
    tag: 'Marketing & Tăng trưởng',
    question:
      'Hãy mô tả một chiến dịch ra mắt sản phẩm mới mà bạn đã triển khai thành công với ngân sách giới hạn?',
    answerSnippet:
      '[Bối cảnh]: Sản phẩm ứng dụng giáo dục mới ra mắt với ngân sách marketing chỉ 50 triệu... [Nhiệm vụ]: Đạt 10.000 lượt tải ứng dụng trong 30 ngày đầu tiên... [Hành động]: Tôi tập trung chiến lược User-Generated Content trên TikTok kết hợp Referral Bonus... [Kết quả]: Đạt 14.500 lượt tải (vượt 45% KPI) với CAC giảm 30%.',
    starBreakdown: {
      s: {
        title: 'Bối cảnh (Situation)',
        score: 89,
        desc: 'Nêu rõ thách thức ngân sách giới hạn 50 triệu.',
      },
      t: {
        title: 'Nhiệm vụ (Task)',
        score: 91,
        desc: 'Chỉ tiêu 10k lượt tải/30 ngày cụ thể, đo lường được.',
      },
      a: {
        title: 'Hành động (Action)',
        score: 95,
        desc: 'Chiến lược UGC & Viral Referral thông minh và tiết kiệm.',
      },
      r: {
        title: 'Kết quả (Result)',
        score: 95,
        desc: 'Vượt 45% KPI (14.5k lượt tải) và giảm 30% chi phí CAC.',
      },
    },
  },
];

export const HomePlaygroundSection: React.FC = () => {
  const [selectedPlaygroundTrack, setSelectedPlaygroundTrack] =
    useState<PlaygroundTrack>(PLAYGROUND_TRACKS[0]);
  const [isGrading, setIsGrading] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const handleTestGrading = () => {
    setIsGrading(true);
    setIsGraded(false);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGrading(false);
          setIsGraded(true);

          try {
            confetti({
              particleCount: 85,
              spread: 70,
              origin: { y: 0.65 },
              colors: ['#03bfff', '#10b981', '#f59e0b', '#8b5cf6'],
            });
          } catch (e) {}

          return 100;
        }
        return prev + 12;
      });
    }, 60);
  };

  return (
    <section className="hm-playground-layered-section">
      <div className="hm-container">
        <div className="hm-section-title-wrap">
          <span className="hm-section-tag">Trải nghiệm tương tác 10 giây</span>
          <TextMaskReveal>
            <h2 className="hm-section-heading">
              Xem AI bóc tách cấu trúc STAR thời gian thực
            </h2>
          </TextMaskReveal>
          <p className="hm-section-desc">
            Chọn ngành nghề bên dưới và nhấn nút để xem công nghệ AI của HireMate
            quét và chấm điểm từng phần Bối cảnh, Nhiệm vụ, Hành động và Kết quả ngay
            lập tức.
          </p>
        </div>

        <div className="playground-card-studio">
          {/* Terminal Header Bar */}
          <div className="studio-console-bar">
            <div className="console-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <div className="console-title">
              <Cpu size={14} />
              <span>HIREMATE STAR EVALUATION ENGINE v2.4 • REALTIME ANALYZER</span>
            </div>
            <div className="console-status">
              <span className="pulse-indicator" />
              <span>ONLINE</span>
            </div>
          </div>

          <div className="studio-card-body">
            {/* Role Select Tabs */}
            <div className="playground-tabs">
              {PLAYGROUND_TRACKS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`playground-tab-btn ${
                    selectedPlaygroundTrack.id === t.id ? 'active' : ''
                  }`}
                  onClick={() => {
                    setSelectedPlaygroundTrack(t);
                    setIsGraded(false);
                    setIsGrading(false);
                    setScanProgress(0);
                  }}
                  data-cursor="Chọn ngành 🎯"
                >
                  <span>{t.name}</span>
                  {selectedPlaygroundTrack.id === t.id && (
                    <motion.div
                      className="playground-tab-active-pill"
                      layoutId="activePlaygroundTab"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Question box */}
            <div className="playground-question-box">
              <div className="playground-q-tag">
                <HelpCircle size={15} />
                <span>
                  Câu hỏi phỏng vấn thực tế ({selectedPlaygroundTrack.tag}):
                </span>
              </div>
              <h3 className="playground-q-text">
                {selectedPlaygroundTrack.question}
              </h3>
            </div>

            {/* Answer Snippet with interactive laser scan */}
            <div className="playground-answer-preview">
              <div className="playground-ans-header">
                <span className="ans-label">CÂU TRẢ LỜI MẪU CỦA ỨNG VIÊN:</span>
                <span className="ans-status">
                  {isGrading
                    ? '🔍 AI đang quét laser...'
                    : isGraded
                    ? '✅ Đã phân tích xong'
                    : 'Chưa phân tích'}
                </span>
              </div>

              <div className="playground-ans-body-wrap">
                <div className="playground-ans-text">
                  {selectedPlaygroundTrack.answerSnippet}
                </div>

                {/* Laser scan line */}
                {isGrading && (
                  <motion.div
                    className="playground-laser-scan-line"
                    style={{ top: `${scanProgress}%` }}
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 0.2, repeat: Infinity }}
                  />
                )}
              </div>
            </div>

            {/* Interactive Action Button */}
            {!isGraded ? (
              <button
                type="button"
                className="hm-btn hm-btn--primary playground-action-btn"
                onClick={handleTestGrading}
                disabled={isGrading}
                data-cursor="Quét AI ⚡"
              >
                {isGrading ? (
                  <div className="btn-scanning-content">
                    <span className="spinner-scan" />
                    <span>AI đang bóc tách STAR... ({scanProgress}%)</span>
                  </div>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Nhấn để AI chấm điểm cấu trúc STAR ngay lập tức</span>
                  </>
                )}
              </button>
            ) : (
              <motion.div
                className="playground-eval-result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="eval-result-header">
                  <div className="eval-result-title">
                    <CheckCircle2 size={24} color="#16a34a" />
                    <div>
                      <strong>
                        Đánh giá hoàn tất: Câu trả lời đạt chuẩn 94/100 STAR!
                      </strong>
                      <div className="eval-result-subtitle">
                        Đầy đủ 4 thành tố, lập luận logic, kỹ thuật chi tiết và
                        số liệu định lượng ấn tượng.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="eval-retry-btn"
                    onClick={() => {
                      setIsGraded(false);
                      setScanProgress(0);
                    }}
                    data-cursor="Thử lại 🔄"
                  >
                    Thử lại
                  </button>
                </div>

                <div className="eval-score-bar-grid">
                  <motion.div
                    className="eval-pill eval-s"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="eval-pill-header">
                      <strong>
                        {selectedPlaygroundTrack.starBreakdown.s.title}
                      </strong>
                      <span className="score-num">
                        {selectedPlaygroundTrack.starBreakdown.s.score}/100
                      </span>
                    </div>
                    <div className="eval-progress-track">
                      <motion.div
                        className="eval-progress-fill s-fill"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${selectedPlaygroundTrack.starBreakdown.s.score}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.15 }}
                      />
                    </div>
                    <p className="eval-pill-desc">
                      {selectedPlaygroundTrack.starBreakdown.s.desc}
                    </p>
                  </motion.div>

                  <motion.div
                    className="eval-pill eval-t"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="eval-pill-header">
                      <strong>
                        {selectedPlaygroundTrack.starBreakdown.t.title}
                      </strong>
                      <span className="score-num">
                        {selectedPlaygroundTrack.starBreakdown.t.score}/100
                      </span>
                    </div>
                    <div className="eval-progress-track">
                      <motion.div
                        className="eval-progress-fill t-fill"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${selectedPlaygroundTrack.starBreakdown.t.score}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.25 }}
                      />
                    </div>
                    <p className="eval-pill-desc">
                      {selectedPlaygroundTrack.starBreakdown.t.desc}
                    </p>
                  </motion.div>

                  <motion.div
                    className="eval-pill eval-a"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="eval-pill-header">
                      <strong>
                        {selectedPlaygroundTrack.starBreakdown.a.title}
                      </strong>
                      <span className="score-num">
                        {selectedPlaygroundTrack.starBreakdown.a.score}/100
                      </span>
                    </div>
                    <div className="eval-progress-track">
                      <motion.div
                        className="eval-progress-fill a-fill"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${selectedPlaygroundTrack.starBreakdown.a.score}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.35 }}
                      />
                    </div>
                    <p className="eval-pill-desc">
                      {selectedPlaygroundTrack.starBreakdown.a.desc}
                    </p>
                  </motion.div>

                  <motion.div
                    className="eval-pill eval-r"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="eval-pill-header">
                      <strong>
                        {selectedPlaygroundTrack.starBreakdown.r.title}
                      </strong>
                      <span className="score-num">
                        {selectedPlaygroundTrack.starBreakdown.r.score}/100
                      </span>
                    </div>
                    <div className="eval-progress-track">
                      <motion.div
                        className="eval-progress-fill r-fill"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${selectedPlaygroundTrack.starBreakdown.r.score}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.45 }}
                      />
                    </div>
                    <p className="eval-pill-desc">
                      {selectedPlaygroundTrack.starBreakdown.r.desc}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
