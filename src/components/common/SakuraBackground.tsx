import React, { useEffect, useRef } from 'react';
import './SakuraBackground.css';

export const SakuraBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    class Petal {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      speedY: number = 0;
      speedX: number = 0;
      angle: number = 0;
      spin: number = 0;
      color: string = '';

      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : Math.random() * -height;
        // Kích thước cánh hoa tự nhiên
        this.size = Math.random() * 7 + 5;
        // Tốc độ chậm thực tế ~5cm/s (khoảng 0.25 - 0.45 px/frame ở 60fps)
        this.speedY = Math.random() * 0.2 + 0.25;
        // Độ trôi lượn theo gió nhẹ nhàng
        this.speedX = Math.random() * 0.3 - 0.15;
        this.angle = Math.random() * 360;
        // Độ xoay nhẹ
        this.spin = Math.random() * 0.008 - 0.004;
        // Màu hồng anh đào tự nhiên (Sakura pink mềm mại)
        this.color =
          Math.random() > 0.3
            ? 'rgba(255, 183, 197, 0.78)'
            : 'rgba(255, 213, 229, 0.85)';
      }

      update() {
        this.y += this.speedY;
        this.x += Math.sin(this.y / 45) * 0.4 + this.speedX;
        this.angle += this.spin;

        if (this.y > height + 20) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const petals = Array.from({ length: 35 }, () => new Petal());

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      petals.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="sakura-canvas" aria-hidden="true" />;
};

export default SakuraBackground;
