import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Gauge,
  CheckCircle,
  Sparkles,
  Flag,
  Bookmark,
  BookMarked,
  X,
  Info,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { getVideoStreamUrl, getOfflineVideoBlob } from '../../services/mediaService';
import { progressApi } from '../../services/progressApi';
import { mediaBookmarkService, formatBookmarkTime } from '../../services/mediaBookmarkService';
import type { MediaBookmark } from '../../types/mediaBookmark.types';

interface VideoLessonPlayerProps {
  mediaId: number;
  lessonId: number;
  lessonTitle: string;
  courseId?: number;
  courseTitle?: string;
  initialSeekTime?: number | null;
  onOpenNotebookView?: () => void;
  onOpenBookmarksView?: () => void;
  onProgressSaved?: () => void;
}

export const VideoLessonPlayer: React.FC<VideoLessonPlayerProps> = ({
  mediaId,
  lessonId,
  lessonTitle,
  courseId,
  courseTitle,
  initialSeekTime,
  onOpenNotebookView,
  onOpenBookmarksView,
  onProgressSaved,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [initialSeekDone, setInitialSeekDone] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<MediaBookmark[]>([]);
  const [isAddFlagModalOpen, setIsAddFlagModalOpen] = useState<boolean>(false);
  const [flagTitleInput, setFlagTitleInput] = useState<string>('');
  const [flagNoteInput, setFlagNoteInput] = useState<string>('');
  const [flagTimestamp, setFlagTimestamp] = useState<number>(0);

  const lastSavedPercentRef = useRef<number>(0);

  // 1. Tải URL phát trực tuyến HTTP 206 (hoặc phát từ Offline Blob) & nạp danh sách cắm cờ
  useEffect(() => {
    let objectUrl: string | null = null;
    let isCancelled = false;

    setInitialSeekDone(false);
    setIsPlaying(false);
    setVideoError(null);

    // Kiểm tra xem đã có bản tải ngoại tuyến trong IndexedDB chưa
    getOfflineVideoBlob(mediaId)
      .then((blob) => {
        if (isCancelled) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setVideoSrc(objectUrl);
        } else {
          setVideoSrc(getVideoStreamUrl(mediaId));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setVideoSrc(getVideoStreamUrl(mediaId));
        }
      });

    setBookmarks(mediaBookmarkService.getBookmarks(lessonId));

    // Khôi phục mốc thời gian học viên đã học trước đó
    progressApi
      .getLessonProgress(lessonId)
      .then((prog) => {
        if (prog && prog.watchedSeconds > 0 && videoRef.current) {
          lastSavedPercentRef.current = Number(prog.percent);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaId, lessonId]);

  // 2. Lưu tiến độ trực tuyến lên hệ thống
  const handleSaveProgress = useCallback(
    async (time: number, total: number, forceSave: boolean = false) => {
      if (total <= 0) return;
      const percent = Math.min(100, (time / total) * 100);

      // Lưu khi đạt mốc tăng >= 10% hoặc hoàn thành bài hoặc khi học viên tạm dừng (forceSave)
      const diff = percent - lastSavedPercentRef.current;
      if (diff >= 10 || (percent >= 90 && lastSavedPercentRef.current < 90) || (forceSave && diff > 1)) {
        lastSavedPercentRef.current = percent;

        try {
          await progressApi.saveProgress(lessonId, time, percent);
          setSaveNotice(`Đã lưu tiến độ: ${percent.toFixed(0)}%`);
          setTimeout(() => setSaveNotice(null), 3000);
          if (onProgressSaved) onProgressSaved();
        } catch {
          // Bỏ qua lỗi mạng tức thời
        }
      }
    },
    [lessonId, onProgressSaved]
  );

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      handleSaveProgress(videoRef.current.currentTime, videoRef.current.duration, true);
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleRetryStream = () => {
    setVideoError(null);
    setIsPlaying(false);
    setVideoSrc(`${getVideoStreamUrl(mediaId)}?retry=${Date.now()}`);
  };

  const handleUseDemoFallback = () => {
    setVideoError(null);
    setIsPlaying(false);
    setVideoSrc('/videos/test.mp4');
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    handleSaveProgress(cur, dur, false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Nhảy tới mốc cắm cờ nếu được truyền từ bên ngoài (Mục Đánh Dấu)
  useEffect(() => {
    if (initialSeekTime !== undefined && initialSeekTime !== null && initialSeekTime > 0 && videoRef.current) {
      videoRef.current.currentTime = initialSeekTime;
      setCurrentTime(initialSeekTime);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setSaveNotice(`Đã chuyển tới mốc cắm cờ lúc ${formatBookmarkTime(initialSeekTime)}`);
      setTimeout(() => setSaveNotice(null), 3000);
    }
  }, [initialSeekTime]);

  // 3. Xử lý cắm cờ mốc thời gian (Thêm điểm đánh dấu)
  const handleAddBookmark = useCallback(
    (title: string, note?: string) => {
      const curTime = videoRef.current ? videoRef.current.currentTime : currentTime;
      const newBm = mediaBookmarkService.addBookmark({
        lessonId,
        mediaId,
        courseId,
        courseTitle,
        lessonTitle,
        timestamp: curTime,
        title,
        note,
      });
      setBookmarks(mediaBookmarkService.getBookmarks(lessonId));
      setSaveNotice(`Đã cắm cờ lúc ${newBm.formattedTime}`);
      setTimeout(() => setSaveNotice(null), 3000);
    },
    [lessonId, mediaId, courseId, courseTitle, lessonTitle, currentTime]
  );

  const handleOpenAddFlagModal = () => {
    const curTime = videoRef.current ? videoRef.current.currentTime : currentTime;
    setFlagTimestamp(curTime);
    setFlagTitleInput(lessonTitle || 'Mốc ghi nhớ');
    setFlagNoteInput('');
    setIsAddFlagModalOpen(true);
  };

  const handleConfirmSaveFlag = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddBookmark(flagTitleInput, flagNoteInput);
    setIsAddFlagModalOpen(false);
  };

  // 4. Xử lý xóa mốc cắm cờ (Không có chức năng sửa theo yêu cầu)
  const handleDeleteBookmark = useCallback(
    (id: string) => {
      const updated = mediaBookmarkService.deleteBookmark(lessonId, id);
      setBookmarks(updated);
      setSaveNotice('Đã xóa mốc đánh dấu');
      setTimeout(() => setSaveNotice(null), 2500);
    },
    [lessonId]
  );

  // 5. Xử lý nhảy tới mốc cắm cờ (Seek to flag)
  const handleSeekToBookmark = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setSaveNotice(`Đã chuyển tới ${formatBookmarkTime(timestamp)}`);
      setTimeout(() => setSaveNotice(null), 2500);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="w-full rounded-2xl bg-[#090D1A] border border-white/10 overflow-hidden shadow-2xl relative group select-none"
      >
      {/* Thông báo lưu / chuyển mốc đánh dấu */}
      {saveNotice && (
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none">
          <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 text-[11px] sm:text-xs font-medium backdrop-blur-md shadow-lg animate-fadeIn">
            <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-indigo-400" />
            <span>{saveNotice}</span>
          </span>
        </div>
      )}

      {/* Video Screen Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {videoError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md space-y-3 z-10 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Không thể phát luồng video bài giảng</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {videoError}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRetryStream}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-indigo-600/30 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>
              <button
                type="button"
                onClick={handleUseDemoFallback}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer border border-white/10 active:scale-95"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Xem video demo (test.mp4)</span>
              </button>
            </div>
          </div>
        ) : videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration || 0);
                if (!initialSeekDone && lastSavedPercentRef.current > 0) {
                  const resumeTime = (lastSavedPercentRef.current / 100) * (videoRef.current.duration || 0);
                  if (resumeTime > 2) {
                    videoRef.current.currentTime = resumeTime;
                    setCurrentTime(resumeTime);
                  }
                  setInitialSeekDone(true);
                }
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (videoRef.current) handleSaveProgress(videoRef.current.duration, videoRef.current.duration, true);
            }}
            onError={() => {
              setIsPlaying(false);
              setVideoError('Không thể tải luồng video bài giảng. Tệp video chưa được đồng bộ lên kho lưu trữ Azure Blob Storage hoặc kết nối mạng bị gián đoạn.');
            }}
          />
        ) : (
          <div className="text-slate-500 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Đang chuẩn bị luồng video trực tuyến...</span>
          </div>
        )}

        {/* Nút Play trung tâm lớn khi tạm dừng */}
        {!isPlaying && !videoError && (
          <button
            onClick={togglePlay}
            aria-label="Phát bài giảng"
            className="absolute z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 p-[1.5px] shadow-2xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-full h-full bg-[#080D1A]/90 hover:bg-[#080D1A]/60 rounded-full flex items-center justify-center transition-colors">
              <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Thanh điều khiển Video thông minh */}
      <div className="p-3 sm:p-4 bg-gradient-to-t from-[#060A14] to-[#0A0F1F] border-t border-white/5 space-y-2.5">
        {/* Scrubber tua video kèm các điểm cắm cờ (Flag Pins) */}
        <div className="relative w-full flex items-center py-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Tua thời gian video"
            className="w-full h-1.5 sm:h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 relative z-0"
          />

          {/* Các mốc cắm cờ (Flag Pins) trực quan trên thanh scrubber */}
          {duration > 0 &&
            bookmarks.map((bm) => {
              const percent = Math.min(100, Math.max(0, (bm.timestamp / duration) * 100));
              return (
                <button
                  key={bm.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeekToBookmark(bm.timestamp);
                  }}
                  title={`${bm.formattedTime} • ${bm.title}`}
                  style={{ left: `${percent}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-cyan-400 border border-slate-900 shadow-md shadow-cyan-400/50 hover:scale-150 active:scale-95 transition-transform z-10 cursor-pointer"
                >
                  <span className="sr-only">{bm.title}</span>
                </button>
              );
            })}
        </div>

        {/* Cụm công cụ điều khiển thanh phát */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-white transition-all cursor-pointer"
              title={isPlaying ? 'Tạm dừng (Space)' : 'Phát (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Lùi 10s */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }
              }}
              title="Lùi 10 giây"
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Tiến 10s */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                }
              }}
              title="Tua tới 10 giây"
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Mute/Unmute */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            </button>

            {/* Thời gian xem */}
            <span className="font-mono text-slate-400 text-[10px] sm:text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Nút Cắm cờ tại thời điểm hiện tại */}
            <button
              onClick={handleOpenAddFlagModal}
              title={`Cắm cờ đánh dấu mốc thời gian này (${formatBookmarkTime(currentTime)})`}
              className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 text-[11px] shadow-sm shadow-cyan-600/30 active:scale-95 shrink-0"
            >
              <Flag className="w-3.5 h-3.5 fill-white" />
              <span className="hidden sm:inline">Cắm cờ ({formatBookmarkTime(currentTime)})</span>
            </button>

            {/* Nút Xem NoteBook AI (Đứng phía trước Mục đánh dấu) */}
            {onOpenNotebookView && (
              <button
                onClick={onOpenNotebookView}
                title="Mở Sổ tay AI NoteBook của bài giảng này"
                className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/40 text-purple-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0 shadow-sm active:scale-95"
              >
                <BookMarked className="w-3.5 h-3.5 text-purple-300" />
                <span className="hidden md:inline">NoteBook</span>
              </button>
            )}

            {/* Nút Xem Mục Đánh Dấu Toàn Bộ */}
            {onOpenBookmarksView && (
              <button
                onClick={onOpenBookmarksView}
                title="Mở thư viện toàn bộ các mốc đánh dấu bài học"
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
              >
                <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Mục đánh dấu</span>
                {bookmarks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-bold">
                    {bookmarks.length}
                  </span>
                )}
              </button>
            )}

            {/* Bộ chọn tốc độ phát */}
            <button
              onClick={cycleSpeed}
              title="Thay đổi tốc độ phát"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-300 transition-all cursor-pointer text-[11px] sm:text-xs font-semibold"
            >
              <Gauge className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-cyan-400" />
              <span>{playbackSpeed}x</span>
            </button>

            {/* Nút phóng to toàn màn hình */}
            <button
              onClick={handleToggleFullscreen}
              title="Toàn màn hình (F)"
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <Maximize className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Modal / Dialog Nhập Tiêu Đề Cắm Cờ Nhanh */}
    {isAddFlagModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div className="w-full max-w-sm bg-[#0D1429] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
              <h3 className="text-sm font-bold text-white">
                Cắm Cờ Mốc Thời Gian: <span className="text-cyan-400 font-mono">{formatBookmarkTime(flagTimestamp)}</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddFlagModalOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleConfirmSaveFlag} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Tên bài học hoặc ghi chú mốc đánh dấu *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Đoạn giải thích trọng tâm, bài học..."
                value={flagTitleInput}
                onChange={(e) => setFlagTitleInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Ghi chú bổ sung (Tùy chọn)</label>
              <textarea
                rows={2}
                placeholder="Ghi chú thêm về nội dung cần nhớ..."
                value={flagNoteInput}
                onChange={(e) => setFlagNoteInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-start gap-2 text-[11px] text-cyan-200">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                Mốc cắm cờ sẽ được lưu vào <strong>Mục Đánh Dấu</strong>. Bạn có thể mở lại bất kỳ lúc nào để nhảy đến giây thứ <strong className="font-mono text-cyan-300">{Math.round(flagTimestamp)}s</strong>.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsAddFlagModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
              >
                <Flag className="w-3.5 h-3.5 fill-white" />
                <span>Lưu mốc cờ</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
);
};
