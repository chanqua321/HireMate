import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Award,
  Clock,
  ShieldCheck,
  MessageSquare,
  BarChart3,
  Target,
} from 'lucide-react';
import { AnimatedCounter } from '../../components/common/AnimatedCounter';
import { FaqAccordion } from '../../components/common/FaqAccordion';
import { SakuraBackground } from '../../components/common/SakuraBackground';

const FAQ_ITEMS = [
  {
    q: 'HireMate là gì và hoạt động như thế nào?',
    a: 'HireMate là trợ lý AI giúp bạn luyện tập phỏng vấn theo định dạng thực tế. AI sẽ đóng vai nhà tuyển dụng, đưa ra câu hỏi, phân tích câu trả lời của bạn theo mô hình STAR (Situation, Task, Action, Result) và chấm điểm chi tiết.',
  },
  {
    q: 'Phương pháp STAR là gì?',
    a: 'STAR là từ viết tắt của Situation (Tình huống), Task (Nhiệm vụ), Action (Hành động) và Result (Kết quả). Đây là phương pháp trả lời phỏng vấn hành vi chuẩn quốc tế giúp trình bày câu chuyện mạch lạc, thuyết phục.',
  },
  {
    q: 'Tôi có thể dùng thử miễn phí không?',
    a: 'Có! HireMate cung cấp gói dùng thử miễn phí không cần thẻ tín dụng, cho phép bạn trải nghiệm phỏng vấn mô phỏng và nhận phản hồi tức thì.',
  },
  {
    q: 'HireMate hỗ trợ những ngành nghề nào?',
    a: 'Chúng tôi hỗ trợ ngân hàng câu hỏi chuyên sâu cho hơn 20+ ngành nghề bao gồm Công nghệ thông tin, Kinh doanh & Marketing, Thiết kế UI/UX, Tài chính, Quản lý sản phẩm và Nhân sự.',
  },
  {
    q: 'Tôi có thể ghi âm câu trả lời bằng giọng nói không?',
    a: 'Hoàn toàn được! Bạn có thể chọn hình thức trả lời bằng văn bản (Text) hoặc trả lời bằng giọng nói (Voice) trong thiết lập phỏng vấn.',
  },
];

const FEATURES = [
  {
    icon: <MessageSquare className="text-primary" size={24} />,
    title: 'Phỏng vấn AI mô phỏng thực tế',
    desc: 'Trải nghiệm phòng phỏng vấn 1-1 với AI, câu hỏi linh hoạt theo đúng ngành nghề và vị trí ứng tuyển của bạn.',
  },
  {
    icon: <BarChart3 className="text-primary" size={24} />,
    title: 'Phân tích & chấm điểm STAR',
    desc: 'Hệ thống AI tự động bóc tách câu trả lời theo 4 yếu tố S-T-A-R, đánh giá độ rõ ràng và đưa ra nhận xét chi tiết.',
  },
  {
    icon: <TrendingUp className="text-primary" size={24} />,
    title: 'Theo dõi tiến bộ rõ rệt',
    desc: 'Lưu trữ toàn bộ lịch sử luyện tập, trực quan hóa biểu đồ tăng trưởng điểm số và xác định kỹ năng cần cải thiện.',
  },
];

export const Home: React.FC = () => {
  return (
    <div className="home-page" style={{ position: 'relative' }}>
      <SakuraBackground />
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <motion.span
              className="eyebrow reveal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Sparkles size={16} />
              Cố vấn nghề nghiệp AI 24/7
            </motion.span>

            <motion.h1
              className="reveal d1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Luyện phỏng vấn{' '}
              <span className="text-gradient">thông minh cùng AI</span> – Tự tin
              chinh phục công việc mơ ước.
            </motion.h1>

            <motion.p
              className="lead reveal d2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              HireMate là trợ lý AI giúp bạn luyện phỏng vấn, nhận phản hồi theo
              phương pháp STAR và cải thiện kỹ năng để sẵn sàng cho các cơ hội
              nghề nghiệp.
            </motion.p>

            <motion.div
              className="hero-cta reveal d3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link className="btn btn-primary btn-lg" to="/register">
                Bắt đầu miễn phí
                <ArrowRight size={18} />
              </Link>
              <Link className="btn btn-ghost btn-lg" to="/pricing">
                Xem bảng giá
              </Link>
            </motion.div>

            <motion.div
              className="hero-stats reveal d4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="stat">
                <strong>
                  <AnimatedCounter value={10000} suffix="+" />
                </strong>
                <span>Buổi luyện tập</span>
              </div>
              <div className="stat">
                <strong>
                  <AnimatedCounter value={95} suffix="%" />
                </strong>
                <span>Người dùng tự tin hơn</span>
              </div>
              <div className="stat">
                <strong>24/7</strong>
                <span>AI luôn sẵn sàng</span>
              </div>
            </motion.div>
          </div>

          {/* Chat / interview mock visual */}
          <motion.div
            className="hero-visual reveal d2 parallax"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="chat-mock">
              <div className="mock-head">
                <span className="dot" style={{ background: '#EF4444' }}></span>
                <span className="dot" style={{ background: '#F59E0B' }}></span>
                <span className="dot" style={{ background: '#22C55E' }}></span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: '.8rem',
                    fontWeight: 600,
                    color: 'var(--muted)',
                  }}
                >
                  HireMate · Phỏng vấn thử
                </span>
              </div>
              <div className="bubble ai">
                Bạn hãy kể về một dự án bạn tự hào nhất nhé?
              </div>
              <div className="bubble user">
                Trong dự án X, tôi phụ trách tối ưu quy trình và giảm 30% thời gian
                xử lý...
              </div>
              <div className="bubble ai">
                Rất tốt! Bạn đã nêu rõ bối cảnh và hành động. Hãy bổ sung kết quả
                cụ thể.
              </div>
              <div className="score-pill">
                <Award size={20} color="#03BFFF" />
                Điểm STAR <b>85</b>
                <span style={{ color: '#93a1bd', fontSize: '.85rem' }}>
                  /100
                </span>
              </div>
              <motion.div
                className="float-card tl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span
                  className="icon-chip"
                  style={{ width: 34, height: 34 }}
                >
                  <CheckCircle size={18} />
                </span>
                Phản hồi tức thì
              </motion.div>
              <motion.div
                className="float-card br"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
              >
                <span
                  className="icon-chip icon-chip--navy"
                  style={{ width: 34, height: 34 }}
                >
                  <TrendingUp size={18} />
                </span>
                Tiến bộ rõ rệt
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head">
            <h2>Mọi thứ bạn cần để sẵn sàng phỏng vấn</h2>
            <p className="lead">
              Từ luyện tập 1-1 với AI đến đánh giá chi tiết theo tiêu chuẩn của
              các nhà tuyển dụng hàng đầu.
            </p>
          </div>

          <div className="grid grid-3">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                className="card feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
              >
                <div className="icon-chip">{feat.icon}</div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STAR METHODOLOGY ============ */}
      <section
        className="section"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(3,191,255,0.03))',
        }}
      >
        <div className="container">
          <div className="section-head">
            <h2>Làm chủ cấu trúc phỏng vấn STAR</h2>
            <p className="lead">
              Phương pháp chuẩn quốc tế được nhà tuyển dụng đánh giá cao nhất
              trong các buổi phỏng vấn hành vi.
            </p>
          </div>

          <div className="grid grid-4" style={{ gap: '24px' }}>
            {[
              {
                letter: 'S',
                title: 'Situation — Bối cảnh',
                desc: 'Mô tả bối cảnh hoặc tình huống bạn gặp phải.',
              },
              {
                letter: 'T',
                title: 'Task — Nhiệm vụ',
                desc: 'Nhiệm vụ cụ thể bạn cần giải quyết là gì.',
              },
              {
                letter: 'A',
                title: 'Action — Hành động',
                desc: 'Hành động cụ thể bạn đã thực hiện để vượt qua.',
              },
              {
                letter: 'R',
                title: 'Result — Kết quả',
                desc: 'Kết quả đo lường được từ hành động đó.',
              },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                className="card star-step-card"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                style={{ position: 'relative', padding: '24px' }}
              >
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    marginBottom: '12px',
                  }}
                >
                  {step.letter}
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
                  {step.title}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ SECTION ============ */}
      <section className="section faq-sec">
        <div className="container" style={{ maxWidth: '840px' }}>
          <div className="section-head">
            <h2>Câu hỏi thường gặp</h2>
            <p className="lead">
              Mọi thắc mắc về cách luyện phỏng vấn và đánh giá STAR tại
              HireMate.
            </p>
          </div>

          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ============ CTA BANNER ============ */}
      <section className="section">
        <div className="container">
          <motion.div
            className="cta-banner"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2>Sẵn sàng cho buổi phỏng vấn tiếp theo?</h2>
            <p>
              Đăng ký miễn phí ngay hôm nay và trải nghiệm phòng luyện phỏng
              vấn AI 1-1 chuyên sâu.
            </p>
            <Link className="btn btn-primary btn-lg" to="/register">
              Đăng ký miễn phí
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
