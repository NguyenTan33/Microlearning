import React, { useEffect, useRef } from 'react';

export const AnimatedBaDinhFlag: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    const width = (canvas.width = 90);
    const height = (canvas.height = 60);

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
      ctx.fillStyle = '#FFE500';
      ctx.shadowColor = 'rgba(255, 230, 0, 0.75)';
      ctx.shadowBlur = 3;
      ctx.fill();
    };

    const render = () => {
      time += 0.048;
      ctx.clearRect(0, 0, width, height);

      const slices = 24;
      const sliceWidth = width / slices;

      for (let i = 0; i < slices; i++) {
        const x = i * sliceWidth;
        // Evening wind flutter calculation
        const wave = Math.sin(time * 3.2 - (i / slices) * 5.5) * (i / slices) * 5.5;
        const waveY = Math.cos(time * 2.8 - (i / slices) * 4.5) * (i / slices) * 2.5;

        // Sunset rim lighting on cloth
        const slope = Math.cos(time * 3.2 - (i / slices) * 5.5);
        const sunsetWarmth = 0.88 + slope * 0.26;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, 4 + wave + waveY, sliceWidth + 0.8, height - 8);
        ctx.clip();

        // Base red cloth tinted with warm sunset orange
        const redTone = Math.min(255, Math.floor(215 * sunsetWarmth));
        const greenTone = Math.min(255, Math.floor(32 * sunsetWarmth + 15)); // sunset warm tint
        const blueTone = Math.min(255, Math.floor(25 * sunsetWarmth));
        ctx.fillStyle = `rgb(${redTone}, ${greenTone}, ${blueTone})`;
        ctx.fillRect(x, 0, sliceWidth + 1, height);

        // Center Gold Star
        const centerX = width * 0.46;
        const centerY = height * 0.5 + wave * 0.4;
        const starDist = Math.abs(x - centerX);

        if (starDist < 24) {
          drawStar(centerX, centerY, 5, 12, 5);
        }

        // Sunset sheen highlights
        const grad = ctx.createLinearGradient(x, 0, x + sliceWidth, 0);
        if (slope > 0) {
          grad.addColorStop(0, `rgba(255, 215, 140, ${0.22 * slope})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          grad.addColorStop(0, `rgba(40, 10, 10, ${0.3 * -slope})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, 4 + wave + waveY, sliceWidth + 0.8, height - 8);

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
    <div className="absolute top-[28.5%] left-[86.4%] pointer-events-none z-20 scale-[0.7] sm:scale-[0.85] md:scale-[1] origin-top-left">
      <div className="relative inline-block animate-flag-wave origin-left">
        <canvas
          ref={canvasRef}
          width={90}
          height={60}
          className="rounded-r-sm drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
        />
      </div>
    </div>
  );
};
