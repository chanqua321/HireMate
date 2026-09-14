import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useInView,
} from 'framer-motion';
import Lenis from 'lenis';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  Flame,
  Mic,
  Bot,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Award,
  Zap,
  TrendingUp,
  ShieldCheck,
  Target,
  Code,
  LineChart,
  Palette,
  DollarSign,
  Building,
  Star,
  Play,
  Volume2,
  VolumeX,
  Compass,
  Check,
  ChevronRight,
  Layers,
  Lightbulb,
  MessageSquare,
  HelpCircle,
  X,
  MousePointer2,
  ChevronDown,
  Quote,
  Activity,
  CheckCircle,
  AlertCircle,
  Sliders,
  Cpu,
} from 'lucide-react';

import { ThreeCanvasBackground } from './ThreeCanvasBackground';
import { CustomCursor } from './CustomCursor';
import { ScrollWordHighlight } from './ScrollWordHighlight';
import { TextMaskReveal } from './TextMaskReveal';
import { PinnedStarScrollSection } from './PinnedStarScrollSection';
import {
  playVietnameseSpeech,
  stopVietnameseSpeech,
} from '../../../../shared/utils/vietnameseSpeech';
import { publicService } from '../../../../shared/services';
import './css/Home.css';

// --- Data Types ---
interface PlaygroundTrack {
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

const PLAYGROUND_TRACKS: PlaygroundTrack[] = [
  {
    id: 'frontend',
    name: '💻 Lập trình viên Frontend',
    tag: 'Công nghệ & Kỹ thuật',
    question: 'Hãy kể về một lần bạn giải quyết vấn đề hiệu năng tải trang phức tạp hoặc tối ưu kiến trúc ứng dụng?',
    answerSnippet:
      '[Bối cảnh]: Dự án e-commerce của công ty đạt 150k DAU khiến trang tải chậm 4.2s... [Nhiệm vụ]: Tôi nhận nhiệm vụ giảm thời gian tải dưới 1.5s trong 4 tuần... [Hành động]: Tôi áp dụng Vite code-splitting theo từng route, tối ưu hóa asset WebP và cache Service Worker... [Kết quả]: Tốc độ tải trang đạt 1.1s (tăng 73%), tỷ lệ bỏ giỏ hàng giảm 18%.',
    starBreakdown: {
      s: { title: 'Bối cảnh (Situation)', score: 92, desc: 'Nêu rõ quy mô 150k DAU và tính cấp thiết của vấn đề tải chậm.' },
      t: { title: 'Nhiệm vụ (Task)', score: 88, desc: 'Mục tiêu định lượng giảm dưới 1.5s trong thời hạn 4 tuần rõ ràng.' },
      a: { title: 'Hành động (Action)', score: 96, desc: 'Giải pháp kỹ thuật chuyên sâu: Vite code-splitting, WebP, Service Worker.' },
      r: { title: 'Kết quả (Result)', score: 95, desc: 'Minh chứng số liệu 1.1s (tăng 73%) và giảm 18% bỏ giỏ hàng.' },
    },
  },
  {
    id: 'data',
    name: '📊 Data / Business Analyst',
    tag: 'Dữ liệu & Phân tích',
    question: 'Hãy chia sẻ một tình huống bạn phát hiện bất thường trong dữ liệu và đưa ra đề xuất cho ban giám đốc?',
    answerSnippet:
      '[Bối cảnh]: Trong phân tích hành vi khách hàng quý 2, tôi phát hiện tỷ lệ hủy đơn tăng đột biến 22%... [Nhiệm vụ]: Trách nhiệm của tôi là tìm ra nguyên nhân gốc rễ và đề xuất phương án khắc phục... [Hành động]: Tôi phân khúc dữ liệu theo cổng thanh toán và phát hiện lỗi timeout ở cổng thanh toán mới... [Kết quả]: Đề xuất sửa đổi giúp cứu vãn 1.2 tỷ VNĐ doanh thu tháng.',
    starBreakdown: {
      s: { title: 'Bối cảnh (Situation)', score: 90, desc: 'Xác định rõ vấn đề tỷ lệ hủy đơn tăng bất thường 22%.' },
      t: { title: 'Nhiệm vụ (Task)', score: 87, desc: 'Phân định rõ trách nhiệm tìm nguyên nhân gốc rễ cho ban lãnh đạo.' },
      a: { title: 'Hành động (Action)', score: 94, desc: 'Phương pháp phân đoạn dữ liệu logic theo cổng thanh toán.' },
      r: { title: 'Kết quả (Result)', score: 96, desc: 'Giá trị quy đổi 1.2 tỷ VNĐ doanh thu bảo vệ thành công.' },
    },
  },
  {
    id: 'marketing',
    name: '🎯 Digital Marketing Specialist',
    tag: 'Marketing & Tăng trưởng',
    question: 'Hãy mô tả một chiến dịch ra mắt sản phẩm mới mà bạn đã triển khai thành công với ngân sách giới hạn?',
    answerSnippet:
      '[Bối cảnh]: Sản phẩm ứng dụng giáo dục mới ra mắt với ngân sách marketing chỉ 50 triệu... [Nhiệm vụ]: Đạt 10.000 lượt tải ứng dụng trong 30 ngày đầu tiên... [Hành động]: Tôi tập trung chiến lược User-Generated Content trên TikTok kết hợp Referral Bonus... [Kết quả]: Đạt 14.500 lượt tải (vượt 45% KPI) với CAC giảm 30%.',
    starBreakdown: {
      s: { title: 'Bối cảnh (Situation)', score: 89, desc: 'Nêu rõ thách thức ngân sách giới hạn 50 triệu.' },
      t: { title: 'Nhiệm vụ (Task)', score: 91, desc: 'Chỉ tiêu 10k lượt tải/30 ngày cụ thể, đo lường được.' },
      a: { title: 'Hành động (Action)', score: 95, desc: 'Chiến lược UGC & Viral Referral thông minh và tiết kiệm.' },
      r: { title: 'Kết quả (Result)', score: 95, desc: 'Vượt 45% KPI (14.5k lượt tải) và giảm 30% chi phí CAC.' },
    },
  },
];

const CAREER_TRACKS = [
  {
    icon: <Code size={24} />,
    color: '#0284c7',
    iconBg: '#e0f2fe',
    badgeBg: '#f0f9ff',
    badgeBorder: '#bae6fd',
    title: 'Công nghệ & Lập trình',
    desc: 'Frontend, Backend, Fullstack, Mobile, DevOps, QA/QC Automation...',
    questionsCount: '350+ kịch bản',
    hotBadge: 'Phổ biến 🔥',
  },
  {
    icon: <LineChart size={24} />,
    color: '#059669',
    iconBg: '#dcfce7',
    badgeBg: '#f0fdf4',
    badgeBorder: '#bbf7d0',
    title: 'Dữ liệu & AI Analysis',
    desc: 'Data Analyst, Data Engineer, Machine Learning, Business Analyst...',
    questionsCount: '240+ kịch bản',
    hotBadge: 'Lương cao 💎',
  },
  {
    icon: <Target size={24} />,
    color: '#d97706',
    iconBg: '#fef3c7',
    badgeBg: '#fffbeb',
    badgeBorder: '#fde68a',
    title: 'Marketing & Tăng trưởng',
    desc: 'Digital Marketing, Performance, Content, SEO, Brand Specialist...',
    questionsCount: '210+ kịch bản',
    hotBadge: 'Đột phá 🚀',
  },
  {
    icon: <DollarSign size={24} />,
    color: '#7c3aed',
    iconBg: '#ede9fe',
    badgeBg: '#faf5ff',
    badgeBorder: '#e9d5ff',
    title: 'Tài chính & Ngân hàng',
    desc: 'Financial Analyst, Kế toán, Kiểm toán, Quản trị rủi ro tín dụng...',
    questionsCount: '180+ kịch bản',
    hotBadge: 'Chuyên sâu 💼',
  },
  {
    icon: <Building size={24} />,
    color: '#db2777',
    iconBg: '#fce7f3',
    badgeBg: '#fdf2f8',
    badgeBorder: '#fbcfe8',
    title: 'Quản trị & Kinh doanh',
    desc: 'Sales B2B, Account Executive, Business Development, Project Manager...',
    questionsCount: '260+ kịch bản',
    hotBadge: 'Nhu cầu lớn 📈',
  },
  {
    icon: <Palette size={24} />,
    color: '#0891b2',
    iconBg: '#cffafe',
    badgeBg: '#ecfeff',
    badgeBorder: '#a5f3fc',
    title: 'Thiết kế UI/UX & Product',
    desc: 'UI/UX Designer, Product Designer, Design System, Interaction...',
    questionsCount: '190+ kịch bản',
    hotBadge: 'Sáng tạo ✨',
  },
];

// --- 3D Interactive Tilt Card Component ---
const InteractiveTiltCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}> = ({ children, className = '', glowColor = 'rgba(3, 191, 255, 0.15)' }) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -6;
    const rY = ((x - centerX) / centerX) * 6;

    setRotateX(rX);
    setRotateY(rY);
    setGlowPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`hm-tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX,
        rotateY,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      <div
        className="hm-tilt-glow-overlay"
        style={{
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, ${glowColor} 0%, transparent 60%)`,
        }}
      />
      <div style={{ transform: 'translateZ(15px)', width: '100%', height: '100%' }}>
        {children}
      </div>
    </motion.div>
  );
};

// --- Animated Counter Hook/Component ---
const AnimatedCounter: React.FC<{
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}> = ({ target, suffix = '', prefix = '', duration = 1.5 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;
    let startTime: number | null = null;
    const startVal = 0;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startVal + easeProgress * (target - startVal)));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(step);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

export const Home: React.FC = () => {
  // 1. Initialize Lenis Smooth Scroll (Scoped to Home unmount)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let animationId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationId = requestAnimationFrame(raf);
    }
    animationId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(animationId);
      lenis.destroy();
      document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped');
      document.body.classList.remove('lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped');
      stopVietnameseSpeech();
    };
  }, []);

  // 2. Global Scroll Progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  const heroParallaxY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroCardParallaxY = useTransform(scrollYProgress, [0, 0.3], [0, 60]);

  // Interactive Playground State
  const [selectedPlaygroundTrack, setSelectedPlaygroundTrack] = useState<PlaygroundTrack>(
    PLAYGROUND_TRACKS[0]
  );
  const [isGraded, setIsGraded] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Audio teaser state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Floating Mascot State
  const [mascotDialogue, setMascotDialogue] = useState(
    'Chào bạn! Sẵn sàng chinh phục phỏng vấn cùng HireMate chưa? 🚀'
  );
  const [isMascotVisible, setIsMascotVisible] = useState(true);
  const [mascotBouncing, setMascotBouncing] = useState(false);

  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      if (latest < 0.15) {
        setMascotDialogue('Sẵn sàng luyện phản xạ chuẩn STAR cùng AI chưa? 🚀');
      } else if (latest >= 0.15 && latest < 0.35) {
        setMascotDialogue('Nghe thử giọng nói AI ở nút Voice Reel nhé! 🎧');
      } else if (latest >= 0.35 && latest < 0.6) {
        setMascotDialogue('Cuộn chuột để xem từng trụ cột S-T-A-R được giữ lại trên màn hình! ✨');
      } else if (latest >= 0.6 && latest < 0.8) {
        setMascotDialogue('Thử chấm điểm câu trả lời trên sandbox AI bên dưới xem sao! ⚡');
      } else {
        setMascotDialogue('Bắt đầu buổi luyện tập miễn phí ngay hôm nay nhé! 🎯');
      }
    });
  }, [scrollYProgress]);

  // Audio teaser player (Vietnamese TTS)
  const playSampleVoice = () => {
    if (isAudioPlaying) {
      stopVietnameseSpeech();
      setIsAudioPlaying(false);
      return;
    }

    const sampleText =
      'Chào bạn! Tôi là Cố vấn AI của HireMate. Hãy cùng tôi luyện tập trả lời phỏng vấn theo phương pháp STAR để chinh phục nhà tuyển dụng nhé!';

    playVietnameseSpeech(sampleText, {
      onStart: () => setIsAudioPlaying(true),
      onEnd: () => setIsAudioPlaying(false),
      onError: () => setIsAudioPlaying(false),
    });
  };


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

  const triggerMascotBounce = () => {
    setMascotBouncing(true);
    setTimeout(() => setMascotBouncing(false), 800);
  };

  // Waitlist / Early Access Subscription
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setIsSubmittingWaitlist(true);
    try {
      const res = await publicService.joinWaitlist({
        email: waitlistEmail.trim(),
      });
      if (res.ok) {
        setWaitlistSuccess(true);
        setWaitlistEmail('');
        try {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.8 },
          });
        } catch {}
      } else {
        setWaitlistSuccess(true);
      }
    } catch {
      setWaitlistSuccess(true);
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  return (
    <div className="hm-homepage lusion-architecture">
      {/* LAYER 0: CUSTOM MAGNETIC GLOWING CURSOR */}
      <CustomCursor />

      {/* LAYER 1: WEBGL 3D THREE.JS PARTICLE TUNNEL BACKGROUND */}
      <ThreeCanvasBackground />

      {/* TOP SCROLL PROGRESS BAR */}
      <motion.div className="hm-scroll-progress-bar" style={{ scaleX }} />

      {/* LAYER 2: DOM HTML CONTENT WITH RICH LAYERED BACKGROUND CONTAINERS */}

      {/* ===================== SECTION 1: HERO SECTION ===================== */}
      <section className="hm-hero-section">
        <div className="hm-container hm-hero-grid">
          {/* Left Column: Kinetic Headline & CTA */}
          <motion.div className="hm-hero-left" style={{ y: heroParallaxY }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <div
                className="hm-hero-pill-badge"
                data-cursor="Mới nhất ✨"
              >
                <Flame size={18} color="#f97316" className="hm-flame-icon" />
                <span>Trợ lý luyện phỏng vấn AI số 1 theo phương pháp STAR</span>
              </div>
            </motion.div>

            <motion.h1
              className="hm-hero-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
            >
              Luyện phỏng vấn thông minh.
            </motion.h1>

            <motion.h1
              className="hm-hero-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
            >
              Nhận việc làm <span className="hm-gradient-text">mơ ước</span>.
            </motion.h1>

            <motion.p
              className="hm-hero-desc"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.35 }}
            >
              HireMate là người bạn đồng hành ảo 1-1 giúp bạn rèn luyện phản xạ đối thoại giọng nói
              tiếng Việt chân thực, bóc tách câu trả lời theo chuẩn <strong>STAR</strong> và tự tin
              chinh phục mọi nhà tuyển dụng.
            </motion.p>

            <motion.div
              className="hm-hero-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45 }}
            >
              <Link
                to="/interview-setup"
                className="hm-btn hm-btn--primary hm-btn--lg"
                data-cursor="Bắt đầu 🚀"
              >
                <Sparkles size={18} />
                <span>Bắt đầu luyện tập miễn phí</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/dashboard"
                className="hm-btn hm-btn--outline hm-btn--lg"
                data-cursor="Bảng điều khiển 📊"
              >
                <BarChart3 size={18} />
                <span>Bảng điều khiển</span>
              </Link>
            </motion.div>

            {/* Trust badge */}
            <motion.div
              className="hm-hero-trust"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.55 }}
            >
              <div className="hm-trust-avatars">
                <div className="hm-trust-avatar" style={{ background: '#0284c7' }}>H</div>
                <div className="hm-trust-avatar" style={{ background: '#10b981' }}>M</div>
                <div className="hm-trust-avatar" style={{ background: '#8b5cf6' }}>A</div>
                <div className="hm-trust-avatar" style={{ background: '#f59e0b' }}>T</div>
                <div className="hm-trust-avatar" style={{ background: '#09182d', fontSize: '0.75rem' }}>+10k</div>
              </div>
              <div className="hm-trust-text">
                <div className="hm-trust-stars">
                  {'★'.repeat(5)}{' '}
                  <strong>
                    <AnimatedCounter target={4.9} suffix="/5" duration={1} /> Điểm hài lòng
                  </strong>
                </div>
                <span>
                  Được tin dùng bởi hơn{' '}
                  <strong>
                    <AnimatedCounter target={10000} suffix="+" duration={1.2} />
                  </strong>{' '}
                  lượt phỏng vấn từ các trường ĐH & doanh nghiệp hàng đầu
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: 3D Holographic Simulated Interview Room Card */}
          <motion.div
            className="hm-hero-visual-col"
            style={{ y: heroCardParallaxY }}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <InteractiveTiltCard className="hm-hero-preview-card" glowColor="rgba(3, 191, 255, 0.2)">
              <motion.div
                className="floating-badge top-right"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame size={16} color="#f97316" />
                <span>Streak: 7 ngày 🔥 (+350 XP)</span>
              </motion.div>

              <motion.div
                className="floating-badge bottom-left"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <Award size={16} color="#0284c7" />
                <span>Top 5% Ứng viên xuất sắc</span>
              </motion.div>

              <div className="preview-card-header">
                <div className="preview-bot-info">
                  <div className={`preview-bot-icon ${isAudioPlaying ? 'speaking' : ''}`}>
                    <Bot size={24} />
                    {isAudioPlaying && <span className="preview-bot-pulse-ring" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>
                      Cố vấn AI HireMate
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Phòng Phỏng vấn Ảo 1-1 • Giọng nói thời gian thực
                    </div>
                  </div>
                </div>

                <div className={`preview-status-pill ${isAudioPlaying ? 'active' : ''}`}>
                  <span className="preview-pulse-dot" />
                  <span>{isAudioPlaying ? 'AI đang nói...' : 'Đang kết nối'}</span>
                </div>
              </div>

              {/* Soundwave equalizer */}
              <div className="preview-soundwave-container">
                <div className="preview-waveform-bars">
                  {[40, 75, 95, 60, 85, 45, 90, 65, 30, 80, 50, 70].map((h, i) => (
                    <span
                      key={i}
                      className={`preview-wave-bar ${isAudioPlaying ? 'animated' : ''}`}
                      style={{
                        height: isAudioPlaying ? `${h}%` : '20%',
                        animationDelay: `${(i % 5) * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className={`preview-listen-btn ${isAudioPlaying ? 'playing' : ''}`}
                  onClick={playSampleVoice}
                  data-cursor={isAudioPlaying ? 'Dừng ⏸️' : 'Nghe 🎧'}
                >
                  {isAudioPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  <span>{isAudioPlaying ? 'Dừng nghe' : 'Nghe giọng AI'}</span>
                </button>
              </div>

              <div className="preview-dialog-bubble">
                <MessageSquare size={16} className="dialog-bubble-icon" />
                <span>
                  "Chào bạn! Hãy kể cho tôi nghe về một dự án gần nhất mà bạn đã tối ưu hóa hiệu năng
                  hoặc giải quyết sự cố kỹ thuật phức tạp theo phương pháp STAR?"
                </span>
              </div>

              <div className="preview-star-score-row">
                <div className="preview-score-left">
                  <span className="preview-score-number">94/100</span>
                  <span className="preview-score-label">ĐIỂM CHUẨN STAR</span>
                </div>
                <div className="preview-score-tag">
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span>⭐ Xuất sắc (Rất thuyết phục)</span>
                </div>
              </div>
            </InteractiveTiltCard>
          </motion.div>
        </div>

        <div className="hm-scroll-explore-indicator">
          <span className="explore-text">Cuộn chuột để khám phá chiều sâu</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="explore-mouse-icon"
          >
            <ChevronDown size={20} />
          </motion.div>
        </div>
      </section>

      {/* ===================== SECTION 2: LUSION-STYLE KINETIC STATEMENT & REEL ===================== */}
      <section className="hm-statement-section">
        <div className="hm-container">
          <div className="hm-statement-grid">
            <div className="hm-statement-left">
              <span className="hm-section-tag">Đột phá công nghệ</span>
              <ScrollWordHighlight
                className="hm-statement-scrub-text"
                text="HireMate là nền tảng luyện phỏng vấn 1-1 tiên phong tại Việt Nam, ứng dụng mô hình AI đa phương thức để bóc tách từng câu chữ, chuẩn hóa tư duy trả lời và giúp bạn tự tin làm chủ mọi vòng phỏng vấn chuyên môn."
              />
            </div>

            <div className="hm-statement-right">
              <motion.div
                className="hm-magnetic-reel-btn"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={playSampleVoice}
                data-cursor="Play 🎧"
              >
                <div className="reel-rotating-border">
                  <svg viewBox="0 0 100 100" className="rotating-text-svg">
                    <path
                      id="circlePath"
                      d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                      fill="none"
                    />
                    <text fontSize="8.2" fill="#03bfff" fontWeight="700" letterSpacing="1.5">
                      <textPath href="#circlePath">
                        • HIREMATE AI VOICE REEL • NGHE THỬ GIỌNG NÓI
                      </textPath>
                    </text>
                  </svg>
                </div>
                <div className="reel-center-icon">
                  <Play size={24} color="#ffffff" fill="#ffffff" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 3: PINNED SCROLL-HOLDING STAR 4-STEP REVEAL ===================== */}
      {/* Scroll is pinned while user scrolls through to experience S -> T -> A -> R sequentially */}
      <PinnedStarScrollSection />

      {/* ===================== SECTION 4: 10-SECOND INTERACTIVE STAR PLAYGROUND ===================== */}
      <section className="hm-playground-layered-section">
        <div className="hm-container">
          <div className="hm-section-title-wrap">
            <span className="hm-section-tag">Trải nghiệm tương tác 10 giây</span>
            <TextMaskReveal>
              <h2 className="hm-section-heading">Xem AI bóc tách cấu trúc STAR thời gian thực</h2>
            </TextMaskReveal>
            <p className="hm-section-desc">
              Chọn ngành nghề bên dưới và nhấn nút để xem công nghệ AI của HireMate quét và chấm điểm
              từng phần Bối cảnh, Nhiệm vụ, Hành động và Kết quả ngay lập tức.
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
                  <span>Câu hỏi phỏng vấn thực tế ({selectedPlaygroundTrack.tag}):</span>
                </div>
                <h3 className="playground-q-text">{selectedPlaygroundTrack.question}</h3>
              </div>

              {/* Answer Snippet with interactive laser scan */}
              <div className="playground-answer-preview">
                <div className="playground-ans-header">
                  <span className="ans-label">CÂU TRẢ LỜI MẪU CỦA ỨNG VIÊN:</span>
                  <span className="ans-status">
                    {isGrading ? '🔍 AI đang quét laser...' : isGraded ? '✅ Đã phân tích xong' : 'Chưa phân tích'}
                  </span>
                </div>

                <div className="playground-ans-body-wrap">
                  <div className="playground-ans-text">{selectedPlaygroundTrack.answerSnippet}</div>

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
                        <strong>Đánh giá hoàn tất: Câu trả lời đạt chuẩn 94/100 STAR!</strong>
                        <div className="eval-result-subtitle">
                          Đầy đủ 4 thành tố, lập luận logic, kỹ thuật chi tiết và số liệu định lượng ấn tượng.
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
                        <strong>{selectedPlaygroundTrack.starBreakdown.s.title}</strong>
                        <span className="score-num">
                          {selectedPlaygroundTrack.starBreakdown.s.score}/100
                        </span>
                      </div>
                      <div className="eval-progress-track">
                        <motion.div
                          className="eval-progress-fill s-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedPlaygroundTrack.starBreakdown.s.score}%` }}
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
                        <strong>{selectedPlaygroundTrack.starBreakdown.t.title}</strong>
                        <span className="score-num">
                          {selectedPlaygroundTrack.starBreakdown.t.score}/100
                        </span>
                      </div>
                      <div className="eval-progress-track">
                        <motion.div
                          className="eval-progress-fill t-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedPlaygroundTrack.starBreakdown.t.score}%` }}
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
                        <strong>{selectedPlaygroundTrack.starBreakdown.a.title}</strong>
                        <span className="score-num">
                          {selectedPlaygroundTrack.starBreakdown.a.score}/100
                        </span>
                      </div>
                      <div className="eval-progress-track">
                        <motion.div
                          className="eval-progress-fill a-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedPlaygroundTrack.starBreakdown.a.score}%` }}
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
                        <strong>{selectedPlaygroundTrack.starBreakdown.r.title}</strong>
                        <span className="score-num">
                          {selectedPlaygroundTrack.starBreakdown.r.score}/100
                        </span>
                      </div>
                      <div className="eval-progress-track">
                        <motion.div
                          className="eval-progress-fill r-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedPlaygroundTrack.starBreakdown.r.score}%` }}
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

      {/* ===================== SECTION 5: GAMIFIED STREAK & BEFORE/AFTER ===================== */}
      <section className="hm-story-layered-section">
        <div className="hm-container">
          <div className="hm-story-row">
            <motion.div
              className="story-visual-col"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <InteractiveTiltCard className="streak-demo-card" glowColor="rgba(249, 115, 22, 0.15)">
                <div className="streak-header-banner">
                  <div className="streak-flame-wrap">
                    <Flame size={32} color="#ea580c" />
                  </div>
                  <div>
                    <div className="streak-title">Chuỗi Streak 7 Ngày Liên Tiếp!</div>
                    <div className="streak-subtitle">+350 XP • Duy trì phong độ đỉnh cao</div>
                  </div>
                </div>

                <div className="streak-calendar-days">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                    <motion.div
                      key={day}
                      className="day-box active"
                      whileHover={{ scale: 1.15, y: -4 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <span className="day-name">{day}</span>
                      <div className="day-check-circle">
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="streak-achievement-box">
                  <div className="achieve-icon">🏆</div>
                  <div className="achieve-text">
                    <strong>Huy hiệu Luyện Phản Xạ:</strong> Bạn đã hoàn thành 12 buổi phỏng vấn mô
                    phỏng và giảm 45% thời gian ngập ngừng khi đối thoại.
                  </div>
                </div>
              </InteractiveTiltCard>
            </motion.div>

            <motion.div
              className="hm-story-content"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="hm-section-tag">Vui nhộn & Bền bỉ</span>
              <TextMaskReveal>
                <h2>Biến áp lực phỏng vấn thành thói quen rèn luyện 10 phút mỗi ngày</h2>
              </TextMaskReveal>
              <p>
                Không còn cảm giác hoang mang sợ hãi khi đối diện hội đồng tuyển dụng. HireMate áp dụng
                cơ chế gamification chuẩn Duolingo, biến việc chuẩn bị thành những phiên thử thách ngắn
                5-10 phút đầy hứng khởi.
              </p>
              <div className="hm-story-bullets">
                <div className="story-bullet-item">
                  <div className="bullet-icon-circ">
                    <CheckCircle2 size={18} color="#0284c7" />
                  </div>
                  <div>
                    <strong>Theo dõi chuỗi Streak & Điểm thưởng XP:</strong> Tạo động lực kỷ luật duy
                    trì mỗi ngày trước ngày phỏng vấn thật.
                  </div>
                </div>
                <div className="story-bullet-item">
                  <div className="bullet-icon-circ">
                    <CheckCircle2 size={18} color="#0284c7" />
                  </div>
                  <div>
                    <strong>Phân tích giọng điệu & tốc độ nói:</strong> Nhận diện các từ đệm ậm ừ,
                    giúp bạn phát biểu gãy gọn và đĩnh đạc.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Row 2: Left Content, Right Visual (Before vs After STAR) */}
          <div className="hm-story-row hm-story-row--reverse">
            <motion.div
              className="hm-story-content"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="hm-section-tag">Chuẩn hóa STAR</span>
              <TextMaskReveal>
                <h2>Phương pháp khoa học được 100% tập đoàn hàng đầu thế giới áp dụng</h2>
              </TextMaskReveal>
              <p>
                Cố vấn AI phân tích từng câu chữ trong câu trả lời của bạn, loại bỏ thói quen nói
                chung chung, thiếu số liệu và định hình lại theo công thức STAR chuẩn quốc tế.
              </p>
              <div className="hm-story-bullets">
                <div className="story-bullet-item">
                  <div className="bullet-icon-circ">
                    <CheckCircle2 size={18} color="#10b981" />
                  </div>
                  <div>
                    <strong>Situation & Task:</strong> Nêu rõ bối cảnh quy mô dự án và chỉ tiêu mục
                    tiêu định lượng cụ thể.
                  </div>
                </div>
                <div className="story-bullet-item">
                  <div className="bullet-icon-circ">
                    <CheckCircle2 size={18} color="#10b981" />
                  </div>
                  <div>
                    <strong>Action & Result:</strong> Đi sâu vào quyết định kỹ thuật cá nhân và chứng
                    minh tác động bằng số liệu % kinh doanh.
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="story-visual-col"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <InteractiveTiltCard className="comparison-container" glowColor="rgba(16, 185, 129, 0.15)">
                <div className="comparison-box before">
                  <div className="comp-header">
                    <span className="comp-label">❌ Chưa chuẩn STAR (Bản năng)</span>
                    <span className="comp-score-bad">48/100</span>
                  </div>
                  <p className="comp-desc">
                    "Dạ đợt đó dự án web của công ty em hơi chậm nên team em cùng nhau tối ưu code lại
                    và sửa một số lỗi cho nhanh hơn ạ."
                  </p>
                  <div className="comp-tag-bad">Thiếu số liệu • Thiếu vai trò cá nhân • Rất mơ hồ</div>
                </div>

                <div className="comparison-divider-line">
                  <span className="comp-vs-badge">VS</span>
                </div>

                <div className="comparison-box after">
                  <div className="comp-header">
                    <span className="comp-label comp-label--good">
                      ✅ Đạt chuẩn STAR cùng HireMate
                    </span>
                    <span className="comp-score-good">94/100</span>
                  </div>
                  <p className="comp-desc">
                    "[S]: Web đạt 150k DAU tải chậm 4.2s. [T]: Tôi nhận nhiệm vụ giảm tải dưới 1.5s
                    trong 4 tuần. [A]: Tôi áp dụng Vite code-splitting, nén WebP và cache Service
                    Worker. [R]: Tốc độ đạt 1.1s (tăng 73%), giảm 18% bỏ giỏ hàng."
                  </p>
                  <div className="comp-tag-good">Rõ bối cảnh • Chi tiết kỹ thuật • Số liệu % ấn tượng</div>
                </div>
              </InteractiveTiltCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===================== SECTION 6: CAREER TRACKS 6-GRID (CLEAN & BRIGHT) ===================== */}
      <section className="hm-tracks-layered-section">
        <div className="hm-container">
          <div className="hm-section-title-wrap">
            <span className="hm-section-tag">Đa dạng chuyên ngành</span>
            <TextMaskReveal>
              <h2 className="hm-section-heading">Kịch bản phỏng vấn theo đúng vị trí của bạn</h2>
            </TextMaskReveal>
            <p className="hm-section-desc">
              Ngân hàng câu hỏi được cập nhật liên tục theo chuẩn Job Description (JD) thực tế của các
              tập đoàn công nghệ và doanh nghiệp hàng đầu.
            </p>
          </div>

          <div className="tracks-grid-6">
            {CAREER_TRACKS.map((track, idx) => (
              <motion.div
                key={idx}
                className="track-card-wrap"
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.15 }}
                transition={{ duration: 0.45, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to="/interview-setup"
                  className="track-card-clean"
                  data-cursor="Luyện tập 👉"
                >
                  <div className="track-top-row">
                    <div
                      className="track-icon-box-clean"
                      style={{ background: track.iconBg, color: track.color }}
                    >
                      {track.icon}
                    </div>
                    <span
                      className="track-hot-badge-clean"
                      style={{
                        color: track.color,
                        background: track.badgeBg,
                        borderColor: track.badgeBorder,
                      }}
                    >
                      {track.hotBadge}
                    </span>
                  </div>

                  <h3 className="track-title">{track.title}</h3>
                  <p className="track-desc">{track.desc}</p>

                  <div className="track-footer">
                    <span className="track-badge-count">{track.questionsCount}</span>
                    <div className="track-arrow-circle" style={{ color: track.color }}>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SECTION 7: GIANT KINETIC CTA (CLEAN & HIGH CONTRAST) ===================== */}
      <section className="hm-cta-section">
        <div className="hm-container">
          <motion.div
            className="hm-cta-banner-box"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="cta-sparkle-blob" />
            <TextMaskReveal>
              <h2 className="cta-banner-title">
                Sẵn sàng bứt phá sự nghiệp của bạn?
              </h2>
            </TextMaskReveal>
            <p className="cta-banner-desc">
              Tham gia cùng hàng ngàn sinh viên và ứng viên đang bứt phá sự nghiệp với trợ lý phỏng
              vấn AI hàng đầu. Miễn phí hoàn toàn cho buổi luyện tập đầu tiên!
            </p>
            <div className="cta-banner-actions">
              <Link
                to="/interview-setup"
                className="hm-btn hm-btn--primary hm-btn--lg"
                style={{ background: '#ffffff', color: '#09182d !important' }}
                data-cursor="Bắt đầu 🎯"
              >
                <Sparkles size={18} color="#09182d" />
                <span style={{ color: '#09182d', fontWeight: 800 }}>Bắt đầu luyện tập ngay</span>
                <ArrowRight size={18} color="#09182d" />
              </Link>
              <Link
                to="/pricing"
                className="hm-btn hm-btn--outline hm-btn--lg"
                style={{
                  background: 'transparent',
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
                data-cursor="Gói Pro ⭐"
              >
                <span style={{ color: '#ffffff' }}>Xem các gói Pro</span>
              </Link>
            </div>

            {/* Newsletter / Waitlist form */}
            <div style={{ marginTop: '36px', maxWidth: '480px', margin: '36px auto 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '12px' }}>
                Hoặc đăng ký nhận trọn bộ bí kíp phỏng vấn & tính năng AI mới nhất:
              </p>
              {waitlistSuccess ? (
                <div
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid #22C55E',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    color: '#86EFAC',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  }}
                >
                  ✓ Đăng ký thành công! HireMate sẽ gửi thông tin cập nhật sớm nhất cho bạn.
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    placeholder="Nhập email của bạn..."
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingWaitlist}
                    className="hm-btn"
                    style={{
                      background: '#03BFFF',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isSubmittingWaitlist ? 'Đang gửi...' : 'Đăng ký'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== 8. FLOATING INTERACTIVE MASCOT BOT ===================== */}
      <AnimatePresence>
        {isMascotVisible && (
          <motion.div
            className="hm-floating-mascot-widget"
            initial={{ opacity: 0, y: 40, scale: 0.8 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{ opacity: 0, y: 40, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <motion.div
              className="mascot-speech-bubble"
              key={mascotDialogue}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <p>{mascotDialogue}</p>
              <button
                type="button"
                className="mascot-close-btn"
                onClick={() => setIsMascotVisible(false)}
                title="Đóng trợ lý"
              >
                <X size={12} />
              </button>
            </motion.div>

            <motion.button
              type="button"
              className="mascot-avatar-btn"
              onClick={triggerMascotBounce}
              animate={mascotBouncing ? { y: [-15, 0, -8, 0], rotate: [0, -10, 10, 0] } : {}}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              data-cursor="Mate Bot 🤖"
            >
              <div className="mascot-avatar-inner">
                <Bot size={26} color="#ffffff" />
              </div>
              <span className="mascot-online-dot" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
