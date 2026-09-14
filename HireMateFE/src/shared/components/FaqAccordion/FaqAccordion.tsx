import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import './css/FaqAccordion.css';

export interface FaqItemData {
  q: string;
  a: React.ReactNode;
}

interface FaqAccordionProps {
  items: FaqItemData[];
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="faq-list">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} className={`faq-item ${isOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="faq-q"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <motion.span
                className={`accordion-arrow ${isOpen ? 'open' : ''}`}
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <ChevronDown size={20} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: 'auto' },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{
                    duration: 0.28,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="faq-answer-content">
                    {item.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
