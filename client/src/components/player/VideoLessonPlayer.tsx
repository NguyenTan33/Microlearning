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
  Tv,
  Flag,
  Bookmark,
} from 'lucide-react';
import { getVideoStreamUrl } from '../../services/mediaService';
import { progressApi } from '../../services/progressApi';
import { mediaBookmarkService, formatBookmarkTime } from '../../services/mediaBookmarkService';
import type { MediaBookmark } from '../../types/mediaBookmark.types';
import { MediaBookmarkPanel } from './MediaBookmarkPanel';

interface VideoLessonPlayerProps {
  mediaId: number;
  lessonId: number;
  lessonTitle: string;
  onProgressSaved?: () => void;
}

export const VideoLessonPlayer: React.FC<VideoLessonPlayerProps> = ({
  mediaId,
  lessonId,
  lessonTitle,
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
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [initialSeekDone, setInitialSeekDone] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<MediaBookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(true);

  const lastSavedPercentRef = useRef<number>(0);

  // 1. Tải URL phát trực tuyến HTTP 206 & nạp danh sách cắm cờ
  useEffect(() => {
    setInitialSeekDone(false);
    setIsPlaying(false);
    setVideoSrc(getVideoStreamUrl(mediaId));
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

  // 3. Xử lý cắm cờ mốc thời gian (Thêm điểm đánh dấu)
  const handleAddBookmark = useCallback(
    (title: string, note?: string) => {
      const curTime = videoRef.current ? videoRef.current.currentTime : currentTime;
      const newBm = mediaBookmarkService.addBookmark({
        lessonId,
        mediaId,
        timestamp: curTime,
        title,
        note,
      });
      setBookmarks(mediaBookmarkService.getBookmarks(lessonId));
      setSaveNotice(`Đã cắm cờ lúc ${newBm.formattedTime}`);
      setTimeout(() => setSaveNotice(null), 3000);
    },
    [lessonId, mediaId, currentTime]
  );

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
      {/* Badge trạng thái phát & Thông báo lưu */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-lg">
          <Tv className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-cyan-400" />
          <span>Trực tuyến HD • HTTP 206</span>
        </span>

        {saveNotice && (
          <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 text-[11px] sm:text-xs font-medium backdrop-blur-md shadow-lg animate-fadeIn">
            <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-indigo-400" />
            <span>{saveNotice}</span>
          </span>
        )}
      </div>

      {/* Video Screen Area */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {videoSrc ? (
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
              const fallbackUrl = '/videos/test.mp4';
              if (videoSrc !== fallbackUrl) {
                setVideoSrc(fallbackUrl);
              }
            }}
          />
        ) : (
          <div className="text-slate-500 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Đang chuẩn bị luồng video trực tuyến...</span>
          </div>
        )}

        {/* Nút Play trung tâm lớn khi tạm dừng */}
        {!isPlaying && (
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
              onClick={() => handleAddBookmark(`Mốc đánh dấu lúc ${formatBookmarkTime(currentTime)}`)}
              title={`Cắm cờ đánh dấu mốc thời gian này (${formatBookmarkTime(currentTime)})`}
              className="p-1.5 sm:p-2 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
            >
              <Flag className="w-3.5 h-3.5 fill-cyan-400/40" />
              <span className="hidden sm:inline">Cắm cờ</span>
            </button>

            {/* Nút Bật/Tắt Mục Đánh Dấu */}
            <button
              onClick={() => setShowBookmarks((prev) => !prev)}
              title="Bật/Tắt hiển thị Mục đánh dấu video"
              className={`p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                showBookmarks
                  ? 'bg-indigo-600/90 border-indigo-400/60 text-white shadow-sm'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mục đánh dấu</span>
              {bookmarks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-bold">
                  {bookmarks.length}
                </span>
              )}
            </button>

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

    {/* Mục đánh dấu & Mốc quan trọng (Bookmarks & Timeline Points) */}
    {showBookmarks && (
      <MediaBookmarkPanel
        lessonId={lessonId}
        mediaId={mediaId}
        currentTime={currentTime}
        bookmarks={bookmarks}
        onSeekTo={handleSeekToBookmark}
        onAddBookmark={handleAddBookmark}
        onDeleteBookmark={handleDeleteBookmark}
      />
    )}
  </div>
);
};
