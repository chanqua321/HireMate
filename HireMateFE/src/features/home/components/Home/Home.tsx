import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import Lenis from 'lenis';
import confetti from 'canvas-confetti';

import { ThreeCanvasBackground } from './ThreeCanvasBackground';
import { CustomCursor } from './CustomCursor';
import { PinnedStarScrollSection } from './PinnedStarScrollSection';
import {
  playVietnameseSpeech,
  stopVietnameseSpeech,
} from '../../../../shared/utils/vietnameseSpeech';
import { publicService } from '../../../../shared/services';
import {
  HomeHeroSection,
  HomeStatementSection,
  HomePlaygroundSection,
  HomeStorySection,
  HomeTracksSection,
  HomeCtaSection,
  HomeMascotBot,
} from './components';
import './css/Home.css';

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
      document.documentElement.classList.remove(
        'lenis',
        'lenis-smooth',
        'lenis-scrolling',
        'lenis-stopped'
      );
      document.body.classList.remove(
        'lenis',
        'lenis-smooth',
        'lenis-scrolling',
        'lenis-stopped'
      );
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
        setMascotDialogue(
          'Cuộn chuột để xem từng trụ cột S-T-A-R được giữ lại trên màn hình! ✨'
        );
      } else if (latest >= 0.6 && latest < 0.8) {
        setMascotDialogue(
          'Thử chấm điểm câu trả lời trên sandbox AI bên dưới xem sao! ⚡'
        );
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
      

      {/* LAYER 1: WEBGL 3D THREE.JS PARTICLE TUNNEL BACKGROUND */}
      <ThreeCanvasBackground />

      {/* TOP SCROLL PROGRESS BAR */}
      <motion.div className="hm-scroll-progress-bar" style={{ scaleX }} />

      {/* SECTION 1: HERO SECTION */}
      <HomeHeroSection
        heroParallaxY={heroParallaxY}
        heroCardParallaxY={heroCardParallaxY}
        isAudioPlaying={isAudioPlaying}
        onPlaySampleVoice={playSampleVoice}
      />

      {/* SECTION 2: LUSION-STYLE KINETIC STATEMENT & REEL */}
      <HomeStatementSection onPlaySampleVoice={playSampleVoice} />

      {/* SECTION 3: PINNED SCROLL-HOLDING STAR 4-STEP REVEAL */}
      <PinnedStarScrollSection />

      {/* SECTION 4: 10-SECOND INTERACTIVE STAR PLAYGROUND */}
      <HomePlaygroundSection />

      {/* SECTION 5: GAMIFIED STREAK & BEFORE/AFTER */}
      <HomeStorySection />

      {/* SECTION 6: CAREER TRACKS 6-GRID */}
      <HomeTracksSection />

      {/* SECTION 7: GIANT KINETIC CTA */}
      <HomeCtaSection
        waitlistEmail={waitlistEmail}
        setWaitlistEmail={setWaitlistEmail}
        waitlistSuccess={waitlistSuccess}
        isSubmittingWaitlist={isSubmittingWaitlist}
        onSubmitWaitlist={handleWaitlistSubmit}
      />

      {/* SECTION 8: FLOATING INTERACTIVE MASCOT BOT */}
      <HomeMascotBot
        isMascotVisible={isMascotVisible}
        mascotDialogue={mascotDialogue}
        mascotBouncing={mascotBouncing}
        onClose={() => setIsMascotVisible(false)}
        onTriggerBounce={triggerMascotBounce}
      />
    </div>
  );
};
