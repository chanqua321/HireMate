import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Check, CheckCircle2 } from 'lucide-react';
import { TextMaskReveal } from '../TextMaskReveal';
import { InteractiveTiltCard } from './HomeCommon';
import './HomeStorySection.css';

export const HomeStorySection: React.FC = () => {
  return (
    <section className="hm-story-layered-section">
      <div className="hm-container">
        {/* Row 1: Gamified Streak */}
        <div className="hm-story-row">
          <motion.div
            className="story-visual-col"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <InteractiveTiltCard
              className="streak-demo-card"
              glowColor="rgba(249, 115, 22, 0.15)"
            >
              <div className="streak-header-banner">
                <div className="streak-flame-wrap">
                  <Flame size={32} color="#ea580c" />
                </div>
                <div>
                  <div className="streak-title">Chuỗi Streak 7 Ngày Liên Tiếp!</div>
                  <div className="streak-subtitle">
                    +350 XP • Duy trì phong độ đỉnh cao
                  </div>
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
                  <strong>Huy hiệu Luyện Phản Xạ:</strong> Bạn đã hoàn thành 12
                  buổi phỏng vấn mô phỏng và giảm 45% thời gian ngập ngừng khi đối
                  thoại.
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
              <h2>
                Biến áp lực phỏng vấn thành thói quen rèn luyện 10 phút mỗi ngày
              </h2>
            </TextMaskReveal>
            <p>
              Không còn cảm giác hoang mang sợ hãi khi đối diện hội đồng tuyển
              dụng. HireMate áp dụng cơ chế gamification chuẩn Duolingo, biến việc
              chuẩn bị thành những phiên thử thách ngắn 5-10 phút đầy hứng khởi.
            </p>
            <div className="hm-story-bullets">
              <div className="story-bullet-item">
                <div className="bullet-icon-circ">
                  <CheckCircle2 size={18} color="#0284c7" />
                </div>
                <div>
                  <strong>Theo dõi chuỗi Streak & Điểm thưởng XP:</strong> Tạo
                  động lực kỷ luật duy trì mỗi ngày trước ngày phỏng vấn thật.
                </div>
              </div>
              <div className="story-bullet-item">
                <div className="bullet-icon-circ">
                  <CheckCircle2 size={18} color="#0284c7" />
                </div>
                <div>
                  <strong>Phân tích giọng điệu & tốc độ nói:</strong> Nhận diện
                  các từ đệm ậm ừ, giúp bạn phát biểu gãy gọn và đĩnh đạc.
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Row 2: Before vs After STAR */}
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
              <h2>
                Phương pháp khoa học được 100% tập đoàn hàng đầu thế giới áp dụng
              </h2>
            </TextMaskReveal>
            <p>
              Cố vấn AI phân tích từng câu chữ trong câu trả lời của bạn, loại bỏ
              thói quen nói chung chung, thiếu số liệu và định hình lại theo công
              thức STAR chuẩn quốc tế.
            </p>
            <div className="hm-story-bullets">
              <div className="story-bullet-item">
                <div className="bullet-icon-circ">
                  <CheckCircle2 size={18} color="#10b981" />
                </div>
                <div>
                  <strong>Situation & Task:</strong> Nêu rõ bối cảnh quy mô dự án
                  và chỉ tiêu mục tiêu định lượng cụ thể.
                </div>
              </div>
              <div className="story-bullet-item">
                <div className="bullet-icon-circ">
                  <CheckCircle2 size={18} color="#10b981" />
                </div>
                <div>
                  <strong>Action & Result:</strong> Đi sâu vào quyết định kỹ thuật
                  cá nhân và chứng minh tác động bằng số liệu % kinh doanh.
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
            <InteractiveTiltCard
              className="comparison-container"
              glowColor="rgba(16, 185, 129, 0.15)"
            >
              <div className="comparison-box before">
                <div className="comp-header">
                  <span className="comp-label">❌ Chưa chuẩn STAR (Bản năng)</span>
                  <span className="comp-score-bad">48/100</span>
                </div>
                <p className="comp-desc">
                  "Dạ đợt đó dự án web của công ty em hơi chậm nên team em cùng
                  nhau tối ưu code lại và sửa một số lỗi cho nhanh hơn ạ."
                </p>
                <div className="comp-tag-bad">
                  Thiếu số liệu • Thiếu vai trò cá nhân • Rất mơ hồ
                </div>
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
                  "[S]: Web đạt 150k DAU tải chậm 4.2s. [T]: Tôi nhận nhiệm vụ
                  giảm tải dưới 1.5s trong 4 tuần. [A]: Tôi áp dụng Vite
                  code-splitting, nén WebP và cache Service Worker. [R]: Tốc độ đạt
                  1.1s (tăng 73%), giảm 18% bỏ giỏ hàng."
                </p>
                <div className="comp-tag-good">
                  Rõ bối cảnh • Chi tiết kỹ thuật • Số liệu % ấn tượng
                </div>
              </div>
            </InteractiveTiltCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
