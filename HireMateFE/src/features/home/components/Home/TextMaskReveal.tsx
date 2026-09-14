import React from 'react';
import { motion } from 'framer-motion';

interface TextMaskRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const TextMaskReveal: React.FC<TextMaskRevealProps> = ({
  children,
  delay = 0,
  className = '',
}) => {
  return (
    <div className={`hm-text-mask-wrapper ${className}`} style={{ overflow: 'hidden' }}>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
