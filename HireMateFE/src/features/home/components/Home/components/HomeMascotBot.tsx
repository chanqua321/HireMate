import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import './HomeMascotBot.css';

interface HomeMascotBotProps {
  isMascotVisible: boolean;
  mascotDialogue: string;
  mascotBouncing: boolean;
  onClose: () => void;
  onTriggerBounce: () => void;
}

export const HomeMascotBot: React.FC<HomeMascotBotProps> = ({
  isMascotVisible,
  mascotDialogue,
  mascotBouncing,
  onClose,
  onTriggerBounce,
}) => {
  return (
    <AnimatePresence>
      {isMascotVisible && (
        <motion.div
          className="hm-floating-mascot-widget"
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{ opacity: 0, y: 40, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="mascot-speech-bubble"
            key={mascotDialogue}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <p>{mascotDialogue}</p>
            <button
              type="button"
              className="mascot-close-btn"
              onClick={onClose}
              title="Đóng trợ lý"
            >
              <X size={12} />
            </button>
          </motion.div>

          <motion.button
            type="button"
            className="mascot-avatar-btn"
            onClick={onTriggerBounce}
            animate={
              mascotBouncing
                ? { y: [-15, 0, -8, 0], rotate: [0, -10, 10, 0] }
                : {}
            }
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            data-cursor="Mate Bot 🤖"
          >
            <div className="mascot-avatar-inner">
              <Bot size={26} color="#ffffff" />
            </div>
            <span className="mascot-online-dot" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
