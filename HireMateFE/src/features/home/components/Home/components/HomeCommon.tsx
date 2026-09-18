import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// --- 3D Interactive Magnetic Tilt Card ---
interface InteractiveTiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const InteractiveTiltCard: React.FC<InteractiveTiltCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(3, 191, 255, 0.25)',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

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

// --- Animated Counter Component ---
export const AnimatedCounter: React.FC<{
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
