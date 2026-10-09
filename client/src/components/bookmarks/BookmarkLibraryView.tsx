import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bookmark,
  Flag,
  Play,
  Trash2,
  Search,
  Clock,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Layers,
  RotateCcw,
} from 'lucide-react';
import type { MediaBookmark } from '../../types/mediaBookmark.types';
import { mediaBookmarkService } from '../../services/mediaBookmarkService';

interface BookmarkLibraryViewProps {
  onSelectBookmark: (bookmark: MediaBookmark) => void;
  onGoToWorkspace?: () => void;
}

export const BookmarkLibraryView: React.FC<BookmarkLibraryViewProps> = ({
  onSelectBookmark,
  onGoToWorkspace,
}) => {
  const [bookmarks, setBookmarks] = useState<MediaBookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState<string>('ALL');

  const refreshBookmarks = useCallback(async () => {
    // 1. Hiển thị ngay từ bộ nhớ cục bộ
    const list = mediaBookmarkService.getAllBookmarks();
    setBookmarks(list);

    // 2. Đồng bộ ngầm với Azure Cloud Backend (SQL Server)
    try {
      const cloudList = await mediaBookmarkService.syncCloudBookmarks();
      if (Array.isArray(cloudList) && cloudList.length > 0) {
        setBookmarks(cloudList);
      }
    } catch {
      // offline fallback
    }
  }, []);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  // Xóa một mốc cắm cờ
  const handleDelete = (bm: MediaBookmark) => {
    const label = bm.lessonTitle || bm.title;
    if (confirm(`Bạn có chắc muốn xóa điểm đánh dấu "${label}" lúc ${bm.formattedTime}?`)) {
      mediaBookmarkService.deleteBookmark(bm.lessonId, bm.id);
      refreshBookmarks();
    }
  };

  // Xóa toàn bộ
  const handleClearAll = () => {
    if (bookmarks.length === 0) return;
    if (confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ các mốc cắm cờ trong tất cả bài học?')) {
      mediaBookmarkService.clearAllBookmarks();
      refreshBookmarks();
    }
  };

  // Danh sách các bài học có điểm đánh dấu để làm bộ lọc
  const lessonOptions = useMemo(() => {
    const map = new Map<number, string>();
    bookmarks.forEach((b) => {
      if (!map.has(b.lessonId)) {
        map.set(b.lessonId, b.lessonTitle || `Bài học #${b.lessonId}`);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [bookmarks]);

  // Lọc danh sách theo từ khóa tìm kiếm và bài học
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bm) => {
      const matchLesson =
        selectedLessonFilter === 'ALL' || String(bm.lessonId) === selectedLessonFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        bm.title.toLowerCase().includes(q) ||
        (bm.note && bm.note.toLowerCase().includes(q)) ||
        (bm.lessonTitle && bm.lessonTitle.toLowerCase().includes(q)) ||
        (bm.courseTitle && bm.courseTitle.toLowerCase().includes(q)) ||
        bm.formattedTime.includes(q);

      return matchLesson && matchQuery;
    });
  }, [bookmarks, searchQuery, selectedLessonFilter]);

  const uniqueLessonsCount = useMemo(() => {
    return new Set(bookmarks.map((b) => b.lessonId)).size;
  }, [bookmarks]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner Giới Thiệu Mục Đánh Dấu */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-[#0A0F1F] border border-white/10 shadow-xl">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Bookmark className="w-4 h-4" />
            <span>Thư Viện Mốc Cắm Cờ • Video Bookmarks</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Kho Lưu Trữ Điểm Đánh Dấu Bài Học
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Xem lại toàn bộ các mốc cắm cờ quan trọng bạn đã đánh dấu trong tất cả các bài giảng. 
            Nhấp vào bất kỳ mốc nào để chuyển ngay đến video và học tiếp từ đúng giây đó.
          </p>
        </div>

        {/* Khối Thống kê */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 shrink-0 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center">
            <Flag className="w-5 h-5 fill-cyan-400/40" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Tổng số mốc đã cắm cờ</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-white">{bookmarks.length} điểm</span>
              <span className="text-xs text-cyan-400 font-bold">({uniqueLessonsCount} bài học)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh Tìm Kiếm & Bộ Lọc */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl bg-[#090D1A] border border-white/10">
        <div className="flex flex-1 items-center gap-2">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, ghi chú, mốc thời gian (vd: 00:22)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Lọc theo bài học */}
          {lessonOptions.length > 1 && (
            <select
              value={selectedLessonFilter}
              onChange={(e) => setSelectedLessonFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer max-w-[200px]"
            >
              <option value="ALL">Tất cả bài học ({bookmarks.length})</option>
              {lessonOptions.map((opt) => (
                <option key={opt.id} value={String(opt.id)}>
                  {opt.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {bookmarks.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
            title="Xóa tất cả mốc cắm cờ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa toàn bộ</span>
          </button>
        )}
      </div>

      {/* Danh Sách Các Điểm Đánh Dấu (Grid) */}
      {bookmarks.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-slate-900/40 border border-white/5 p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Flag className="w-7 h-7 fill-cyan-400/20" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Chưa có mốc cắm cờ nào được lưu trữ</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Trong lúc đang học và theo dõi video, bạn chỉ cần bấm nút <strong>"Cắm cờ"</strong> trên thanh điều khiển của video player để lưu lại các mốc kiến thức trọng tâm.
            </p>
          </div>
          {onGoToWorkspace && (
            <button
              onClick={onGoToWorkspace}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Vào phòng học ngay</span>
            </button>
          )}
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Không tìm thấy mốc cắm cờ nào phù hợp với từ khóa "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((bm) => (
            <div
              key={bm.id}
              className="p-4 rounded-2xl bg-[#090D1A] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between group shadow-lg space-y-3"
            >
              <div className="space-y-2.5">
                {/* Header Card: Tên Khóa Học & Nút Xóa */}
                <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span
                      className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider truncate block"
                      title={bm.courseTitle || 'Kiến trúc Offline-First Mobile & Web App'}
                    >
                      {bm.courseTitle || 'Kiến trúc Offline-First Mobile & Web App'}
                    </span>
                  </div>

                  {/* Nút Xóa */}
                  <button
                    type="button"
                    onClick={() => handleDelete(bm)}
                    className="p-1.5 rounded-lg hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    title="Xóa điểm đánh dấu này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thân Card: Tên Bài Học & Ghi chú bổ sung */}
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <h3
                      onClick={() => onSelectBookmark(bm)}
                      className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors cursor-pointer line-clamp-2"
                      title={`Chuyển tới bài học: ${bm.lessonTitle || 'Monotonic Merge chống tụt lùi tiến độ'}`}
                    >
                      {bm.lessonTitle || 'Monotonic Merge chống tụt lùi tiến độ'}
                    </h3>
                  </div>

                  {/* Ghi chú hoặc nội dung cắm cờ bổ sung */}
                  {bm.note ? (
                    <p className="text-xs text-slate-400 pl-6 line-clamp-2 leading-relaxed">
                      {bm.note}
                    </p>
                  ) : (bm.title && !bm.title.toLowerCase().startsWith('mốc đánh dấu') && !bm.title.toLowerCase().startsWith('mốc quan trọng') && bm.title !== bm.lessonTitle) ? (
                    <p className="text-xs text-slate-400 pl-6 line-clamp-2 leading-relaxed">
                      {bm.title}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Footer Card: Thời gian lưu & Nút phát tới mốc thời gian */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(bm.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>

                {/* Nút Nhảy tới mốc phát (thời gian được hiển thị trực tiếp tại nút) */}
                <button
                  type="button"
                  onClick={() => onSelectBookmark(bm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/40 hover:bg-cyan-900 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-mono font-bold shadow-sm transition-all cursor-pointer group-hover:shadow-cyan-500/20"
                  title={`Phát ngay từ mốc ${bm.formattedTime}`}
                >
                  <Play className="w-3.5 h-3.5 fill-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>{bm.formattedTime}</span>
                  <ArrowRight className="w-3 h-3 ml-0.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
