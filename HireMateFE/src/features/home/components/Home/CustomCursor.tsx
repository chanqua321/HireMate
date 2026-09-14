import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const CustomCursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [hoverText, setHoverText] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only enable custom cursor on non-touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const onMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const onMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = target.closest('button, a, input, textarea, .hm-tilt-card, [data-cursor]');
      if (interactiveEl) {
        setIsHovered(true);
        const text = interactiveEl.getAttribute('data-cursor') || '';
        setHoverText(text);
      } else {
        setIsHovered(false);
        setHoverText('');
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseover', handleMouseOver);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* 1. Sharp Inner Dot */}
      <motion.div
        className="hm-custom-cursor-dot"
        animate={{
          x: mousePosition.x - 4,
          y: mousePosition.y - 4,
          scale: isHovered ? 0 : 1,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 1000, damping: 50 }}
      />

      {/* 2. Lagging Magnetic Aura / Lens */}
      <motion.div
        className={`hm-custom-cursor-follower ${isHovered ? 'hovered' : ''}`}
        animate={{
          x: mousePosition.x - (isHovered ? 36 : 18),
          y: mousePosition.y - (isHovered ? 36 : 18),
          width: isHovered ? 72 : 36,
          height: isHovered ? 72 : 36,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      >
        {hoverText && <span className="cursor-hover-label">{hoverText}</span>}
      </motion.div>
    </>
  );
};
