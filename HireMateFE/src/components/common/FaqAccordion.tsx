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
    <div
      className="faq-list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className={`faq-item ${isOpen ? 'open' : ''}`}
            style={{
              border: isOpen
                ? '1px solid var(--primary)'
                : '1px solid var(--border)',
              borderRadius: '16px',
              background: 'var(--surface)',
              boxShadow: isOpen
                ? 'var(--sh-md)'
                : '0 2px 8px rgba(16, 24, 40, 0.04)',
              overflow: 'hidden',
              transition: 'all 0.25s ease',
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
                color: isOpen ? 'var(--primary-strong)' : 'var(--secondary)',
                cursor: 'pointer',
                padding: '20px 28px',
                gap: '16px',
                transition: 'color 0.2s ease',
              }}
            >
              <span>{item.q}</span>
              <motion.span
                className={`accordion-arrow ${isOpen ? 'open' : ''}`}
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: isOpen ? 'var(--primary-strong)' : 'var(--muted)',
                  flexShrink: 0,
                }}
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
                  <p
                    className="faq-a"
                    style={{
                      margin: 0,
                      padding: '0 28px 24px 28px',
                      color: 'var(--muted)',
                      lineHeight: 1.7,
                      fontSize: '0.98rem',
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
