import React, { useState, useEffect } from 'react';
import { favoriteSubjectApi, type FavoriteSubject } from '../../services/favoriteSubjectApi';

interface FavoriteSubjectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSubject: (courseId: number, subjectId: number) => void;
}

export const FavoriteSubjectsDrawer: React.FC<FavoriteSubjectsDrawerProps> = ({
  isOpen,
  onClose,
  onSelectSubject,
}) => {
  const [favorites, setFavorites] = useState<FavoriteSubject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = async () => {
    setIsLoading(true);
    try {
      const list = await favoriteSubjectApi.getMyFavorites();
      setFavorites(list);
    } catch (err) {
      console.warn('Lỗi khi tải môn học yêu thích:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen]);

  const handleRemoveFavorite = async (e: React.MouseEvent, subjectId: number) => {
    e.stopPropagation();
    try {
      await favoriteSubjectApi.toggleFavorite(subjectId);
      setFavorites((prev) => prev.filter((f) => f.subjectId !== subjectId));
      window.dispatchEvent(new CustomEvent('favorite-subjects-updated', { detail: { subjectId, isFavorite: false } }));
    } catch (err) {
      console.error('Lỗi khi bỏ yêu thích môn học:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm sm:max-w-md bg-[#0D1429] shadow-2xl border-l border-white/10 flex flex-col transform transition-transform ease-in-out duration-300">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/40">
            <div className="flex items-center gap-2.5">
              <span className="text-xl animate-bounce">❤️</span>
              <div>
                <h3 className="text-base font-bold text-white">
                  Môn Học Yêu Thích
                </h3>
                <p className="text-xs text-slate-400">
                  {favorites.length} môn học đã lưu để truy cập nhanh
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Đang tải danh sách yêu thích...</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-3 opacity-60">🤍</div>
                <h4 className="text-sm font-bold text-slate-300">
                  Chưa có môn học yêu thích
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Hãy bấm vào icon trái tim ❤️ cạnh tiêu đề môn học trong danh sách bài giảng để ghim vào menu truy cập nhanh này!
                </p>
              </div>
            ) : (
              favorites.map((fav) => (
                <div
                  key={fav.subjectId}
                  onClick={() => {
                    onSelectSubject(fav.courseId, fav.subjectId);
                    onClose();
                  }}
                  className="p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-rose-500/40 rounded-2xl cursor-pointer transition group shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-indigo-400 block truncate mb-1">
                        Khóa: {fav.courseTitle}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-rose-400 transition truncate">
                        {fav.title}
                      </h4>
                      {fav.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {fav.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                        <span>📚 {fav.totalLessons} bài học</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveFavorite(e, fav.subjectId)}
                      title="Bỏ yêu thích"
                      className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/40 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
