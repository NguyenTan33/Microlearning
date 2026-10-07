import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Sparkles, ArrowUpRight, Zap, Check } from 'lucide-react';

export interface DuolingoStreakCelebrationModalProps {
  isOpen: boolean;
  targetStreak: number;
  message?: string;
  onClose: () => void;
}

export const DuolingoStreakCelebrationModal: React.FC<DuolingoStreakCelebrationModalProps> = ({
  isOpen,
  targetStreak,
  message,
  onClose,
}) => {
  // Các giai đoạn diễn hoạt: SPINNING (xoay bùng cháy) -> IGNITED (tăng số đếm) -> FLYING (bay vào header)
  const [stage, setStage] = useState<'SPINNING' | 'IGNITED' | 'FLYING'>('SPINNING');
  const [displayNumber, setDisplayNumber] = useState<number>(() => Math.max(0, targetStreak - 1));
  const [isCountingPopped, setIsCountingPopped] = useState<boolean>(false);
  
  // Tọa độ bay đến Header Streak
  const [flyDelta, setFlyDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const flameRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef<boolean>(false);

  // Khởi động chuỗi hoạt họa khi mở Modal
  useEffect(() => {
    if (!isOpen) {
      setStage('SPINNING');
      setDisplayNumber(Math.max(0, targetStreak - 1));
      setIsCountingPopped(false);
      isClosingRef.current = false;
      return;
    }

    setStage('SPINNING');
    setDisplayNumber(Math.max(0, targetStreak - 1));
    isClosingRef.current = false;

    // Giai đoạn 1: Ngọn lửa xoay tròn 720 độ và bùng cháy trong 1.1s
    const igniteTimer = setTimeout(() => {
      setStage('IGNITED');
      // Giai đoạn 2: Bùng số đếm tăng +1 với hiệu ứng Scale Pop
      setDisplayNumber(targetStreak);
      setIsCountingPopped(true);
    }, 1100);

    return () => {
      clearTimeout(igniteTimer);
    };
  }, [isOpen, targetStreak]);

  // Kích hoạt chuyến bay Duolingo: Ngọn lửa bay vào đúng vị trí của Header Streak Badge
  const triggerFlightToHeader = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Tìm vị trí của huy hiệu Streak trên Header (cả desktop hoặc mobile)
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-streak-target="header-streak-badge"]')
    );
    const visibleTarget = targets.find((el) => el.offsetParent !== null) || targets[0];

    if (visibleTarget && flameRef.current) {
      const targetRect = visibleTarget.getBoundingClientRect();
      const flameRect = flameRef.current.getBoundingClientRect();

      const deltaX = targetRect.left + targetRect.width / 2 - (flameRect.left + flameRect.width / 2);
      const deltaY = targetRect.top + targetRect.height / 2 - (flameRect.top + flameRect.height / 2);

      setFlyDelta({ x: deltaX, y: deltaY });
    } else {
      // Fallback bay lên góc trên bên phải màn hình
      setFlyDelta({ x: window.innerWidth * 0.35, y: -window.innerHeight * 0.45 });
    }

    setStage('FLYING');

    // Sau khi bay tới nơi (700ms), kích hoạt sự kiện hạ cánh trên Header và đóng modal
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('streak-flame-landed'));
      }
      onClose();
    }, 720);
  };

  // Lắng nghe phím nhấn (Space, Enter, Escape) để cho phép kích hoạt thu gom ngay
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerFlightToHeader();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={triggerFlightToHeader}
      className={`fixed inset-0 z-[9999] flex items-center justify-center select-none transition-colors duration-500 cursor-pointer ${
        stage === 'FLYING' ? 'bg-transparent pointer-events-none' : 'bg-black/80 backdrop-blur-md'
      }`}
    >
      {/* Hào quang nền radial lung linh */}
      {stage !== 'FLYING' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-amber-600/30 via-orange-500/20 to-yellow-400/20 blur-3xl animate-flame-halo" />
        </div>
      )}

      {/* Container chính của hiệu ứng ăn mừng */}
      <div className="relative flex flex-col items-center justify-center px-6 py-8 max-w-sm w-full mx-auto text-center pointer-events-auto">
        {/* NGỌN LỬA CHÍNH (BIẾN HÌNH & BAY ĐẾN HEADER) */}
        <div
          ref={flameRef}
          style={
            stage === 'FLYING'
              ? {
                  transform: `translate(${flyDelta.x}px, ${flyDelta.y}px) scale(0.25)`,
                  opacity: 0.9,
                  transition: 'transform 0.72s cubic-bezier(0.2, 0.9, 0.3, 1.1), opacity 0.72s ease-in',
                }
              : undefined
          }
          className={`relative z-20 flex items-center justify-center transition-all duration-300 ${
            stage === 'SPINNING' ? 'animate-flame-spin-ignite' : ''
          }`}
        >
          {/* Hào quang bùng cháy nhiều tầng quanh ngọn lửa */}
          <div className="absolute -inset-4 rounded-full bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-300 opacity-60 blur-xl animate-pulse" />
          <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-red-600 via-amber-600 to-yellow-400 opacity-35 blur-2xl animate-flame-halo" />

          {/* Biểu tượng ngọn lửa thần kỳ */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-amber-400 via-orange-500 to-red-600 p-1 shadow-2xl shadow-orange-500/70 border border-yellow-200/50 flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-gradient-to-b from-[#2A1102] via-[#1A0801] to-[#0A0300] flex items-center justify-center relative overflow-hidden">
              {/* Tia sáng quét lấp lánh */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />

              <Flame className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-300 fill-amber-400 filter drop-shadow-[0_0_18px_rgba(251,191,36,0.9)] animate-bounce" />

              {/* Ngôi sao lấp lánh điểm xuyết */}
              <Sparkles className="absolute top-2 right-2 w-5 h-5 text-yellow-200 animate-pulse" />
              <Zap className="absolute bottom-2 left-2 w-4 h-4 text-amber-300 opacity-80" />
            </div>
          </div>

          {/* Huy hiệu +1 bay lên khi số đếm tăng */}
          {stage === 'IGNITED' && (
            <div className="absolute -top-3 -right-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-xs shadow-lg shadow-amber-400/50 border border-white/60 animate-bounce">
              +1 🔥
            </div>
          )}
        </div>

        {/* NỘI DUNG VĂN BẢN & SỐ ĐẾM (MỜ DẦN KHI BAY) */}
        <div
          className={`mt-6 space-y-3 transition-all duration-300 ${
            stage === 'FLYING' ? 'opacity-0 scale-90 translate-y-4 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        >
          {/* Số đếm Streak tăng từ X-1 lên X như Duolingo */}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`text-5xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-300 to-orange-500 drop-shadow-md ${
                isCountingPopped ? 'animate-count-pop' : ''
              }`}
            >
              {displayNumber}
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-200 uppercase tracking-wider self-end mb-2">
              Ngày
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase drop-shadow">
              CHUỖI HỌC TẬP HÔM NAY!
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 font-medium max-w-xs leading-relaxed">
              {message || 'Tuyệt vời! Bạn đã hoàn thành bài học và duy trì ngọn lửa học tập bùng cháy.'}
            </p>
          </div>

          {/* Cụm nút bấm tiếp tục (Click để thu gom Streak) */}
          <div className="pt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFlightToHeader();
              }}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-sm shadow-xl shadow-orange-500/40 border border-amber-300/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Tiếp tục học tập</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-400 font-medium">
              Chạm bất kỳ đâu hoặc bấm Space/Enter để tiếp tục
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
