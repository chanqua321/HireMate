import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollWordHighlightProps {
  text: string;
  className?: string;
  highlightClass?: string;
}

const Word: React.FC<{
  word: string;
  range: [number, number];
  progress: any;
}> = ({ word, range, progress }) => {
  const opacity = useTransform(progress, range, [0.18, 1]);
  const y = useTransform(progress, range, [6, 0]);
  const scale = useTransform(progress, range, [0.95, 1]);

  return (
    <span className="hm-scrub-word-wrapper">
      <motion.span
        style={{ opacity, y, scale }}
        className="hm-scrub-word"
      >
        {word}
      </motion.span>
    </span>
  );
};

export const ScrollWordHighlight: React.FC<ScrollWordHighlightProps> = ({
  text,
  className = '',
}) => {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.85', 'end 0.4'],
  });

  const words = text.split(' ');

  return (
    <p ref={containerRef} className={`hm-scrub-paragraph ${className}`}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <Word
            key={i}
            word={word}
            range={[start, end]}
            progress={scrollYProgress}
          />
        );
      })}
    </p>
  );
};
