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
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
            streak.currentStreak > 0
              ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/15 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 hover:from-orange-500/20 hover:to-amber-500/25'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }`}
          title={`Chuỗi học tập hiện tại: ${streak.currentStreak} ngày liên tiếp`}
        >
          <span className="text-sm filter drop-shadow-sm animate-bounce" style={{ animationDuration: '2s' }}>
            🔥
          </span>
          <span>{streak.currentStreak}</span>
          <span className="hidden sm:inline font-medium text-[11px] opacity-80">ngày</span>
        </button>

        {/* Nút Vương miện Master Crown 👑 (Nếu đạt 100%) */}
        {streak.hasMasterCrown && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-md shadow-amber-500/20 border border-amber-300 dark:border-yellow-400/80 hover:brightness-105 active:scale-95 transition-all overflow-hidden group"
            title="Vương Miện Danh Dự: Bạn đã hoàn thành 100% tất cả các khóa học!"
          >
            {/* Hiệu ứng lấp lánh (Shimmer glow) */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="text-sm filter drop-shadow animate-pulse">👑</span>
            <span className="tracking-wide uppercase text-[10px] font-extrabold hidden md:inline">
              Master Crown
            </span>
          </button>
        )}
      </div>

      {/* Modal chi tiết Chuỗi Streak & Vương Miện Hoàng Gia */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              ✕
            </button>

            {/* Header Modal */}
            <div className="text-center mb-6">
              <div className="relative inline-block mb-3">
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl mx-auto ${
                    streak.hasMasterCrown
                      ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 border-4 border-yellow-200 animate-pulse'
                      : 'bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-orange-500/30'
                  }`}
                >
                  {streak.hasMasterCrown ? '👑' : '🔥'}
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {streak.hasMasterCrown ? 'Vương Miện Hoàng Gia' : 'Chuỗi Học Tập Hàng Ngày'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {streak.statusMessage}
              </p>
            </div>

            {/* Thống kê Streak */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-2xl text-center">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">Chuỗi hiện tại</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {streak.currentStreak} <span className="text-xs font-bold text-slate-400">ngày</span>
                </p>
              </div>

              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-center">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Kỷ lục dài nhất</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
                  {streak.longestStreak} <span className="text-xs font-bold text-slate-400">ngày</span>
                </p>
              </div>
            </div>

            {/* Tiến độ chinh phục Vương Miện (Master Crown) */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 mb-5">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>👑 Tiến độ Vương Miện</span>
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {streak.completedLessons} / {streak.totalEligibleLessons} bài ({streak.overallProgressPercent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 rounded-full ${
                    streak.hasMasterCrown
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                      : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, streak.overallProgressPercent)}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                {streak.hasMasterCrown ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    ✨ Bạn đang giữ đỉnh cao tri thức! Nếu có bài học mới được cập nhật, hãy hoàn thành ngay để giữ vững vương miện danh giá này.
                  </span>
                ) : (
                  <span>
                    Hoàn thành tất cả <strong>{streak.totalEligibleLessons} bài học</strong> hợp lệ để giành lấy Vương Miện Hoàng Gia Microlearning!
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              Tiếp tục học tập
            </button>
          </div>
        </div>
      )}
    </>
  );
};
