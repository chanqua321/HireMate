import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export const useConfetti = () => {
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#03BFFF', '#5B6BFF', '#22C55E', '#F59E0B', '#FF6B9A'],
      });
    } catch (e) {
      // Ignore if canvas-confetti fails in test environments
    }
  }, []);

  const triggerFireworks = useCallback(() => {
    try {
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      let interval: ReturnType<typeof setInterval> = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
        });
      }, 250);
    } catch (e) {
      // Ignore
    }
  }, []);

  return { triggerConfetti, triggerFireworks };
};
