import React, { useEffect, useRef } from 'react';

interface AnimatedVietnameseFlagProps {
  className?: string;
}

export const AnimatedVietnameseFlag: React.FC<AnimatedVietnameseFlagProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const width = (canvas.width = 120);
    const height = (canvas.height = 80);

    // Pre-create star path
    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fillStyle = '#FFEA00';
      ctx.shadowColor = 'rgba(255, 230, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fill();
    };

    const render = () => {
      time += 0.045;
      ctx.clearRect(0, 0, width, height);

      const slices = 28;
      const sliceWidth = width / slices;

      for (let i = 0; i < slices; i++) {
        const x = i * sliceWidth;
        // Waving wave formula
        const wave = Math.sin(time * 3 - (i / slices) * 6) * (i / slices) * 6.5;
        const waveY = Math.cos(time * 2.5 - (i / slices) * 5) * (i / slices) * 3;

        // Shadow & lighting gradient based on slope
        const slope = Math.cos(time * 3 - (i / slices) * 6);
        const brightness = 0.85 + slope * 0.28;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, 6 + wave + waveY, sliceWidth + 0.8, height - 12);
        ctx.clip();

        // Base red cloth
        const redTone = Math.min(255, Math.floor(218 * brightness));
        const darkTone = Math.min(255, Math.floor(37 * brightness));
        ctx.fillStyle = `rgb(${redTone}, ${darkTone}, ${darkTone})`;
        ctx.fillRect(x, 0, sliceWidth + 1, height);

        // Center Gold Star
        const centerX = width * 0.48;
        const centerY = height * 0.5 + wave * 0.5;
        const starXOffset = x - centerX;

        if (Math.abs(starXOffset) < 30) {
          drawStar(centerX, centerY, 5, 16, 6.5);
        }

        // Cloth highlight / shadow sheen
        const grad = ctx.createLinearGradient(x, 0, x + sliceWidth, 0);
        if (slope > 0) {
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.15 * slope})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          grad.addColorStop(0, `rgba(0, 0, 0, ${0.25 * -slope})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, 6 + wave + waveY, sliceWidth + 0.8, height - 12);

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Flagpole */}
      <div className="absolute top-0 left-0 w-[3px] h-32 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 rounded-t-full shadow-lg shadow-black/40 z-10">
        {/* Flagpole gold finial sphere */}
        <div className="absolute -top-2 -left-[3px] w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-100 shadow-md shadow-amber-500/50" />
      </div>

      {/* Dynamic Animated Flag Canvas */}
      <div className="pl-1 animate-flag-wave origin-left">
        <canvas
          ref={canvasRef}
          width={120}
          height={80}
          className="rounded-r-sm drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
        />
      </div>
    </div>
  );
};
