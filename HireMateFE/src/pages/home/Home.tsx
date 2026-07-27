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
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0 }}>
          <strong>HireMate</strong> là nền tảng AI phỏng vấn giả định thế hệ mới, được thiết kế chuyên sâu để mô phỏng chính xác áp lực và bối cảnh phòng phỏng vấn 1-1 thực tế tại các công ty hàng đầu.
        </p>
        <div style={{ display: 'grid', gap: '8px', paddingLeft: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#03BFFF', flexShrink: 0, marginTop: '3px' }} />
            <span><strong>Bước 1 - Tùy biến đề thi:</strong> Chọn ngành nghề, cấp bậc ứng tuyển và hình thức trả lời (Văn bản hoặc Giọng nói).</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#03BFFF', flexShrink: 0, marginTop: '3px' }} />
            <span><strong>Bước 2 - Phỏng vấn cùng AI:</strong> AI đóng vai nhà tuyển dụng, linh hoạt điều hướng câu hỏi dựa theo bối cảnh câu trả lời của bạn.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#03BFFF', flexShrink: 0, marginTop: '3px' }} />
            <span><strong>Bước 3 - Nhận báo cáo chi tiết:</strong> Hệ thống chấm điểm tự động theo mô hình STAR và chỉ ra điểm mạnh, điểm cần cải thiện ngay sau khi kết thúc.</span>
          </div>
        </div>
        <div style={{ background: 'rgba(3, 191, 255, 0.08)', borderLeft: '3px solid #03BFFF', padding: '12px 16px', borderRadius: '8px', fontSize: '0.92rem', color: 'var(--primary-strong)' }}>
          💡 <strong>Mẹo nhỏ:</strong> Bạn có thể sử dụng HireMate trước mỗi đợt phỏng vấn thật để khởi động phản xạ tâm lý và tối ưu ngôn từ!
        </div>
      </div>
    ),
  },
  {
    q: 'Phương pháp STAR là gì?',
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0 }}>
          <strong>STAR</strong> là phương pháp trả lời phỏng vấn hành vi chuẩn mực toàn cầu (được áp dụng tại Amazon, Google, Microsoft...), giúp ứng viên cấu trúc câu trả lời mạch lạc, chặt chẽ và thuyết phục nhất.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '4px' }}>
          <div style={{ background: 'var(--surface-subtle, #F8FAFC)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#03BFFF', marginBottom: '4px' }}>S - Situation (Tình huống)</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Bối cảnh, thách thức hoặc vấn đề ban đầu bạn phải đối mặt.</div>
          </div>
          <div style={{ background: 'var(--surface-subtle, #F8FAFC)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#03BFFF', marginBottom: '4px' }}>T - Task (Nhiệm vụ)</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Trách nhiệm cụ thể và mục tiêu cần đạt được trong tình huống đó.</div>
          </div>
          <div style={{ background: 'var(--surface-subtle, #F8FAFC)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#03BFFF', marginBottom: '4px' }}>A - Action (Hành động)</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Các bước hành động thực tế và giải pháp <strong>bạn đã làm</strong> để giải quyết.</div>
          </div>
          <div style={{ background: 'var(--surface-subtle, #F8FAFC)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, color: '#03BFFF', marginBottom: '4px' }}>R - Result (Kết quả)</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>Thành quả định lượng bằng con số (KPI, thời gian, doanh thu) & bài học rút ra.</div>
          </div>
        </div>
        <div style={{ background: 'rgba(3, 191, 255, 0.08)', borderLeft: '3px solid #03BFFF', padding: '12px 16px', borderRadius: '8px', fontSize: '0.92rem', color: 'var(--primary-strong)' }}>
          🎯 <strong>Tiêu chuẩn HireMate:</strong> AI sẽ tự động kiểm tra xem câu trả lời của bạn đã đủ 4 yếu tố STAR chưa và chỉ ra yếu tố nào đang bị thiếu hụt!
        </div>
      </div>
    ),
  },
  {
    q: 'Tôi có thể dùng thử miễn phí không?',
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0 }}>
          <strong>Hoàn toàn miễn phí!</strong> HireMate cung cấp gói dùng thử không yêu cầu thẻ tín dụng để bạn tự do khám phá và đánh giá năng lực của mình.
        </p>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#10B981', flexShrink: 0 }} />
            <span><strong>Đăng ký 5 giây:</strong> Đăng nhập nhanh bằng tài khoản Google hoặc LinkedIn.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#10B981', flexShrink: 0 }} />
            <span><strong>Đầy đủ tính năng:</strong> Trải nghiệm phòng phỏng vấn thực tế và nhận báo cáo điểm số chi tiết.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#10B981', flexShrink: 0 }} />
            <span><strong>Nâng cấp linh hoạt:</strong> Khi cần luyện tập cường độ cao, bạn có thể nâng cấp gói chuyên sâu bất kỳ lúc nào.</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    q: 'HireMate hỗ trợ những ngành nghề nào?',
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0 }}>
          Hệ thống AI của HireMate được đào tạo trên hàng vạn mô tả công việc (JD) thực tế từ hơn <strong>25+ khối ngành nghề</strong> hiện đại:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
          {['Công nghệ thông tin (IT/Software)', 'Kinh doanh & Sales B2B', 'Marketing & Brand Manager', 'Thiết kế UI/UX & Product Design', 'Tài chính & Ngân hàng', 'Quản trị Nhân sự (HR/Talent)', 'Quản lý Dự án & Agile/Scrum', 'Chuyên viên Dữ liệu (Data Analyst)'].map((tag, i) => (
            <span key={i} style={{ background: 'rgba(3, 191, 255, 0.1)', color: 'var(--primary-strong)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.84rem', fontWeight: 600, border: '1px solid rgba(3, 191, 255, 0.25)' }}>
              {tag}
            </span>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--muted)' }}>
          * Ngoài ra, bạn có thể dán trực tiếp <strong>Mô tả công việc (JD)</strong> bất kỳ để AI tạo bộ câu hỏi dành riêng cho vị trí đó!
        </p>
      </div>
    ),
  },
  {
    q: 'Tôi có thể ghi âm câu trả lời bằng giọng nói không?',
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0 }}>
          <strong>Có!</strong> HireMate hỗ trợ công nghệ chuyển đổi giọng nói thành văn bản (Speech-to-Text) thông minh cho cả <strong>Tiếng Việt</strong> và <strong>Tiếng Anh</strong>.
        </p>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#03BFFF', flexShrink: 0, marginTop: '2px' }} />
            <span><strong>Phản xạ âm thanh thực tế:</strong> Rèn luyện nhịp độ nói, cách ngắt nghỉ và ngữ điệu tự tin trước nhà tuyển dụng.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CheckCircle size={18} style={{ color: '#03BFFF', flexShrink: 0, marginTop: '2px' }} />
            <span><strong>Tự động gỡ băng (Transcript):</strong> AI chuyển giọng nói thành văn bản để bóc tách từ khóa và cấu trúc STAR vô cùng chính xác.</span>
          </div>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10B981', padding: '12px 16px', borderRadius: '8px', fontSize: '0.92rem', color: '#065F46' }}>
          🎧 <strong>Khuyến nghị:</strong> Hãy sử dụng tai nghe có micro ở không gian yên tĩnh để thu âm đạt chất lượng tốt nhất!
        </div>
      </div>
    ),
  },
  {
    q: 'Hệ thống AI chấm điểm có khách quan và chuẩn xác không?',
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0 }}>
          HireMate sử dụng các mô hình ngôn ngữ lớn tiên tiến kết hợp bộ tiêu chí chấm điểm tuyển dụng chuyên nghiệp, đảm bảo tính khách quan và nhất quán 100%.
        </p>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <span><strong>Đánh giá đa chiều:</strong> Chấm điểm từ vựng, tính logic, sự bám sát đề và dẫn chứng định lượng.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <span><strong>Gợi ý câu trả lời mẫu:</strong> Ngay sau báo cáo điểm, AI đưa ra phiên bản câu trả lời tối ưu để bạn học hỏi ngay lập tức.</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    q: 'Làm thế nào để bắt đầu buổi phỏng vấn đầu tiên?',
    a: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0 }}>
          Bạn có thể bắt đầu ngay chỉ trong chưa đầy 1 phút với 3 bước đơn giản:
        </p>
        <div style={{ display: 'grid', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#03BFFF', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>1</span>
            <span>Đăng nhập hoặc Đăng ký tài khoản miễn phí tại nút <strong>Đăng ký ngay</strong>.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#03BFFF', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>2</span>
            <span>Vào mục <strong>Tạo phỏng vấn</strong> trên Dashboard, chọn ngành nghề và vị trí bạn muốn thử sức.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#03BFFF', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>3</span>
            <span>Bắt đầu trả lời câu hỏi và nhận báo cáo STAR toàn diện!</span>
          </div>
        </div>
      </div>
    ),
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
