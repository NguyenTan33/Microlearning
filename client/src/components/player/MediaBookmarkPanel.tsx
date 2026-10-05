import React, { useState } from 'react';
import {
  Flag,
  Bookmark,
  Play,
  Trash2,
  Plus,
  Clock,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import type { MediaBookmark } from '../../types/mediaBookmark.types';
import { formatBookmarkTime } from '../../services/mediaBookmarkService';

interface MediaBookmarkPanelProps {
  lessonId: number;
  mediaId: number;
  currentTime: number;
  bookmarks: MediaBookmark[];
  onSeekTo: (timestamp: number) => void;
  onAddBookmark: (title: string, note?: string) => void;
  onDeleteBookmark: (id: string) => void;
}

export const MediaBookmarkPanel: React.FC<MediaBookmarkPanelProps> = ({
  currentTime,
  bookmarks,
  onSeekTo,
  onAddBookmark,
  onDeleteBookmark,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [bookmarkTitle, setBookmarkTitle] = useState<string>('');
  const [bookmarkNote, setBookmarkNote] = useState<string>('');
  const [targetTimestamp, setTargetTimestamp] = useState<number>(0);

  const handleOpenAddModal = () => {
    const time = currentTime;
    setTargetTimestamp(time);
    setBookmarkTitle('');
    setBookmarkNote('');
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onAddBookmark(
      bookmarkTitle.trim() || 'Mốc ghi nhớ',
      bookmarkNote.trim() || undefined
    );
    setIsAddModalOpen(false);
    setBookmarkTitle('');
    setBookmarkNote('');
  };

  const handleDelete = (bm: MediaBookmark) => {
    const label = bm.lessonTitle || bm.title;
    if (confirm(`Bạn có chắc muốn xóa điểm cờ "${label}" lúc ${bm.formattedTime}?`)) {
      onDeleteBookmark(bm.id);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header Mục đánh dấu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Mục Đánh Dấu Video (Bookmarks)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                {bookmarks.length} điểm
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Lưu trữ metadata các mốc cắm cờ để tua nhanh đến nội dung trọng tâm
            </p>
          </div>
        </div>

        {/* Nút Cắm cờ tại thời điểm hiện tại */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          title={`Cắm cờ tại vị trí đang phát (${formatBookmarkTime(currentTime)})`}
        >
          <Flag className="w-3.5 h-3.5 fill-white" />
          <span>Cắm cờ lúc {formatBookmarkTime(currentTime)}</span>
        </button>
      </div>

      {/* Danh sách các mốc đánh dấu */}
      {bookmarks.length === 0 ? (
        <div className="py-8 text-center rounded-xl bg-slate-950/40 border border-white/5 p-6 space-y-2">
          <Flag className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-300">Chưa có điểm đánh dấu nào trong bài giảng này</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Trong lúc theo dõi video, bạn có thể bấm nút "Cắm cờ" để lưu lại các mốc kiến thức quan trọng cần xem lại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="p-3 rounded-xl bg-slate-900/70 border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  {/* Badge Mốc thời gian (Bấm để nhảy tới video) */}
                  <button
                    type="button"
                    onClick={() => onSeekTo(bm.timestamp)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-300 hover:text-white transition-all text-xs font-mono font-bold cursor-pointer"
                    title={`Chuyển tới mốc ${bm.formattedTime}`}
                  >
                    <Play className="w-3 h-3 fill-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>{bm.formattedTime}</span>
                  </button>

                  {/* Nút Xóa điểm cờ (Không có chức năng sửa theo yêu cầu) */}
                  <button
                    type="button"
                    onClick={() => handleDelete(bm)}
                    className="p-1 rounded-lg hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Xóa điểm đánh dấu này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tiêu đề bài học / mốc cắm cờ (Click để nhảy tới) */}
                <h4
                  onClick={() => onSeekTo(bm.timestamp)}
                  className="font-bold text-white text-xs hover:text-cyan-300 transition-colors cursor-pointer line-clamp-1 mt-1"
                  title="Nhấp để phát video từ mốc này"
                >
                  {bm.lessonTitle || bm.title}
                </h4>

                {/* Ghi chú hoặc nội dung thêm */}
                {bm.note ? (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {bm.note}
                  </p>
                ) : (bm.title && !bm.title.toLowerCase().startsWith('mốc') && bm.title !== bm.lessonTitle) ? (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {bm.title}
                  </p>
                ) : null}
              </div>

              {/* Ngày tạo */}
              <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-2 border-t border-white/5 mt-2">
                <Clock className="w-3 h-3 text-slate-600" />
                <span>Đã lưu {new Date(bm.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Dialog Nhập Tiêu Đề Cắm Cờ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0D1429] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
                <h3 className="text-sm font-bold text-white">
                  Cắm Cờ Mốc Thời Gian: <span className="text-cyan-400 font-mono">{formatBookmarkTime(targetTimestamp)}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Tiêu đề mốc đánh dấu *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đoạn giải thích kiến thức quan trọng"
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Ghi chú bổ sung (Tùy chọn)</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về nội dung bài giảng tại mốc này..."
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-start gap-2 text-[11px] text-cyan-200">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  Sau khi lưu, bạn có thể nhấp vào mốc cờ để nhảy ngay đến giây thứ <strong className="font-mono text-cyan-300">{Math.round(targetTimestamp)}s</strong> của video.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
                >
                  <Flag className="w-3.5 h-3.5 fill-white" />
                  <span>Lưu điểm cờ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
