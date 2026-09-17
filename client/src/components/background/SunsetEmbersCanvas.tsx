import React, { useEffect, useRef } from 'react';

interface EmberParticle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  twinkleSpeed: number;
  phase: number;
}

interface SunsetEmbersCanvasProps {
  intensity?: 'gentle' | 'breeze' | 'gust';
}

export const SunsetEmbersCanvas: React.FC<SunsetEmbersCanvasProps> = ({ intensity = 'breeze' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const particleCount = intensity === 'gentle' ? 50 : intensity === 'breeze' ? 85 : 130;
    const speedMult = intensity === 'gentle' ? 0.6 : intensity === 'breeze' ? 1.0 : 1.8;

    const particles: EmberParticle[] = [];
    const emberColors = [
      'rgba(255, 220, 140, ', // Warm gold
      'rgba(255, 170, 70, ',  // Sunset amber
      'rgba(255, 120, 50, ',  // Sunset orange
      'rgba(255, 245, 200, ', // Sunlit dust mote
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.6 + 0.8,
        speedX: (Math.random() * 1.2 + 0.4) * speedMult,
        speedY: (Math.sin(Math.random() * Math.PI) * 0.4 - 0.2) * speedMult,
        opacity: Math.random() * 0.65 + 0.25,
        color: emberColors[Math.floor(Math.random() * emberColors.length)],
        twinkleSpeed: Math.random() * 0.05 + 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.02;

      // Soft wind oscillation
      const windWave = Math.sin(time * 0.4) * 0.6 + 1.0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.speedX * windWave;
        p.y += p.speedY + Math.sin(time + p.phase) * 0.35;
        p.phase += p.twinkleSpeed;

        // Wrap around borders
        if (p.x > width + 15) {
          p.x = -15;
          p.y = Math.random() * height;
        }
        if (p.y > height + 15) {
          p.y = -15;
        } else if (p.y < -15) {
          p.y = height + 15;
        }

        const currentOpacity = p.opacity * (0.65 + 0.35 * Math.sin(p.phase));

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${currentOpacity})`;

        // Embers subtle glowing bloom
        ctx.shadowColor = 'rgba(255, 160, 50, 0.7)';
        ctx.shadowBlur = p.size * 2.5;

        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
      style={{ opacity: 0.9 }}
    />
  );
};
