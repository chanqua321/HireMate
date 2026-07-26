import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface FaqItemData {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItemData[];
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="faq-list">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className={`faq-item ${isOpen ? 'open' : ''}`}
            style={{
              borderBottom: '1px solid var(--border)',
              padding: '16px 0',
            }}
          >
            <button
              type="button"
              className="faq-q"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: 'pointer',
                padding: '8px 0',
              }}
            >
              <span>{item.q}</span>
              <span
                className={`accordion-arrow ${isOpen ? 'open' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'var(--muted)',
                }}
              >
                <ChevronDown size={20} />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: 'auto', marginTop: 12 },
                    collapsed: { opacity: 0, height: 0, marginTop: 0 },
                  }}
                  transition={{
                    duration: 0.28,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ overflow: 'hidden' }}
                >
                  <p
                    className="faq-a"
                    style={{
                      margin: 0,
                      color: 'var(--muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
