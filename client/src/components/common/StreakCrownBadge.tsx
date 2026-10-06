import React, { useState, useEffect } from 'react';
import { streakApi, type UserStreak } from '../../services/streakApi';

export const StreakCrownBadge: React.FC = () => {
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStreak() {
      try {
        const data = await streakApi.getMyStreak();
        if (isMounted) {
          setStreak(data);
        }
      } catch (err) {
        console.warn('Lỗi khi tải thông tin streak:', err);
      }
    }

    loadStreak();
    // Lắng nghe sự kiện hoàn thành bài học từ video player để cập nhật streak
    const handleProgressUpdate = () => {
      loadStreak();
    };
    window.addEventListener('lesson-progress-updated', handleProgressUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('lesson-progress-updated', handleProgressUpdate);
    };
  }, []);

  if (!streak) return null;

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Nút ngọn lửa Streak 🔥 */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`h-9 flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap ${
            streak.currentStreak > 0
              ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 shadow-amber-500/10'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/10'
          }`}
          title={`Chuỗi học tập hiện tại: ${streak.currentStreak} ngày liên tiếp`}
        >
          <span className="text-sm filter drop-shadow-sm animate-bounce" style={{ animationDuration: '2s' }}>
            🔥
          </span>
          <span className="font-extrabold">{streak.currentStreak}</span>
          <span className="hidden sm:inline font-medium text-[11px] opacity-80">ngày</span>
        </button>

        {/* Nút Vương miện Master Crown 👑 (Nếu đạt 100%) */}
        {streak.hasMasterCrown && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-9 relative flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-amber-100 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 shadow-md shadow-amber-500/20 border border-amber-400/50 hover:border-amber-400 hover:brightness-110 active:scale-95 transition-all overflow-hidden group cursor-pointer whitespace-nowrap"
            title="Vương Miện Danh Dự: Bạn đã hoàn thành 100% tất cả các khóa học!"
          >
            {/* Hiệu ứng lấp lánh (Shimmer glow) */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="text-sm filter drop-shadow animate-pulse">👑</span>
            <span className="tracking-wide uppercase text-[10px] font-extrabold text-amber-300 hidden md:inline">
              Master Crown
            </span>
          </button>
        )}
      </div>

      {/* Modal chi tiết Chuỗi Streak & Vương Miện Hoàng Gia (Dời thấp xuống khỏi Header tránh bị khuất) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-20 md:pt-24 overflow-y-auto bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0D1429] border border-white/10 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 my-auto sm:my-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              ✕
            </button>

            {/* Header Modal */}
            <div className="text-center mb-5">
              <div className="relative inline-block mb-2.5">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl mx-auto ${
                    streak.hasMasterCrown
                      ? 'bg-gradient-to-br from-amber-400/30 via-yellow-400/20 to-amber-500/30 text-amber-300 border border-yellow-400/50 animate-pulse'
                      : 'bg-gradient-to-br from-amber-500/20 to-orange-500/30 text-orange-400 border border-orange-500/30 shadow-orange-500/20'
                  }`}
                >
                  {streak.hasMasterCrown ? '👑' : '🔥'}
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                {streak.hasMasterCrown ? 'Vương Miện Hoàng Gia' : 'Chuỗi Học Tập Hàng Ngày'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {streak.statusMessage}
              </p>
            </div>

            {/* Thống kê Streak */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 bg-slate-900/70 border border-amber-500/20 rounded-2xl text-center">
                <p className="text-xs font-semibold text-amber-400">Chuỗi hiện tại</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  {streak.currentStreak} <span className="text-xs font-bold text-slate-400">ngày</span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/70 border border-indigo-500/20 rounded-2xl text-center">
                <p className="text-xs font-semibold text-indigo-400">Kỷ lục dài nhất</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  {streak.longestStreak} <span className="text-xs font-bold text-slate-400">ngày</span>
                </p>
              </div>
            </div>

            {/* Tiến độ chinh phục Vương Miện (Master Crown) */}
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/10 mb-5">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <span>👑 Tiến độ Vương Miện</span>
                </span>
                <span className="text-indigo-400 font-extrabold">
                  {streak.completedLessons} / {streak.totalEligibleLessons} bài ({streak.overallProgressPercent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 rounded-full ${
                    streak.hasMasterCrown
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, streak.overallProgressPercent)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                {streak.hasMasterCrown ? (
                  <span className="text-amber-300 font-medium">
                    ✨ Bạn đang giữ đỉnh cao tri thức! Nếu có bài học mới được cập nhật, hãy hoàn thành ngay để giữ vững vương miện danh giá này.
                  </span>
                ) : (
                  <span>
                    Hoàn thành tất cả <strong className="text-slate-200">{streak.totalEligibleLessons} bài học</strong> hợp lệ để giành lấy Vương Miện Hoàng Gia Microlearning!
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95"
            >
              Tiếp tục học tập
            </button>
          </div>
        </div>
      )}
    </>
  );
};
