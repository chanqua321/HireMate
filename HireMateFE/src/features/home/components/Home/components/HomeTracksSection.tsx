import React from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  LineChart,
  Target,
  DollarSign,
  Building,
  Palette,
  ArrowRight,
} from 'lucide-react';
import { TextMaskReveal } from '../TextMaskReveal';
import './HomeTracksSection.css';

export interface CareerTrackItem {
  icon: React.ReactNode;
  color: string;
  iconBg: string;
  badgeBg: string;
  badgeBorder: string;
  title: string;
  desc: string;
  questionsCount: string;
  hotBadge: string;
}

export const CAREER_TRACKS: CareerTrackItem[] = [
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

export const HomeTracksSection: React.FC = () => {
  return (
    <section className="hm-tracks-layered-section">
      <div className="hm-container">
        <div className="hm-section-title-wrap">
          <span className="hm-section-tag">Đa dạng chuyên ngành</span>
          <TextMaskReveal>
            <h2 className="hm-section-heading">
              Kịch bản phỏng vấn theo đúng vị trí của bạn
            </h2>
          </TextMaskReveal>
          <p className="hm-section-desc">
            Ngân hàng câu hỏi được cập nhật liên tục theo chuẩn Job Description (JD)
            thực tế của các tập đoàn công nghệ và doanh nghiệp hàng đầu.
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
              transition={{
                duration: 0.45,
                delay: idx * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="track-card-clean" style={{ cursor: 'default' }}>
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
                  <span className="track-badge-count">
                    {track.questionsCount}
                  </span>
                  <div
                    className="track-arrow-circle"
                    style={{ color: track.color, pointerEvents: 'none' }}
                  >
                    <ArrowRight size={16} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
