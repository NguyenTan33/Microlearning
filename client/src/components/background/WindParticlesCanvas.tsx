import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  type: 'dust' | 'leaf' | 'sparkle';
}

interface WindParticlesCanvasProps {
  intensity?: 'gentle' | 'breeze' | 'gust';
}

export const WindParticlesCanvas: React.FC<WindParticlesCanvasProps> = ({ intensity = 'breeze' }) => {
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
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const particleCount = intensity === 'gentle' ? 45 : intensity === 'breeze' ? 75 : 120;
    const speedMultiplier = intensity === 'gentle' ? 0.7 : intensity === 'breeze' ? 1.2 : 2.0;

    const particles: Particle[] = [];
    const colors = [
      'rgba(255, 223, 137, ', // Golden sunlight dust
      'rgba(245, 197, 84, ',  // Rich gold
      'rgba(255, 248, 220, ', // Warm cream
      'rgba(120, 180, 85, ',  // Leaf green
      'rgba(180, 140, 60, ',  // Golden autumn leaf
    ];

    for (let i = 0; i < particleCount; i++) {
      const isLeaf = Math.random() > 0.75;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: isLeaf ? Math.random() * 7 + 4 : Math.random() * 2.5 + 0.8,
        speedX: (Math.random() * 1.5 + 0.8) * speedMultiplier,
        speedY: (Math.sin(Math.random() * Math.PI) * 0.6 - 0.2) * speedMultiplier,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 2.5,
        type: isLeaf ? 'leaf' : Math.random() > 0.4 ? 'dust' : 'sparkle',
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.015;

      // Global wind gust oscillation
      const windGust = Math.sin(time * 0.5) * 0.8 + 1.2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply wind physics
        p.x += p.speedX * windGust;
        p.y += p.speedY + Math.sin(time + p.x * 0.005) * 0.5;
        p.rotation += p.rotationSpeed;

        // Wrap around boundaries seamlessly
        if (p.x > width + 20) {
          p.x = -20;
          p.y = Math.random() * height;
        }
        if (p.y > height + 20) {
          p.y = -20;
        } else if (p.y < -20) {
          p.y = height + 20;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.type === 'leaf') {
          // Render floating organic leaf
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.6, p.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.opacity * 0.75})`;
          ctx.fill();

          // Leaf vein
          ctx.beginPath();
          ctx.moveTo(-p.size * 1.4, 0);
          ctx.lineTo(p.size * 1.4, 0);
          ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.35})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        } else if (p.type === 'sparkle') {
          // Render shimmering star sparkle
          const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(time * 4 + p.x));
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${currentOpacity})`;
          ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
          ctx.shadowBlur = 6;
          ctx.fill();
        } else {
          // Golden floating sun dust mote
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.opacity * 0.65})`;
          ctx.fill();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
      style={{ opacity: 0.85 }}
    />
  );
};
