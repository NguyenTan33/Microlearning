import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Wifi, HardDrive } from 'lucide-react';
import { getVideoStreamUrl, getOfflineVideoBlob } from '../../services/mediaService';
import { queueLessonProgress } from '../../services/syncService';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSource, setPlaybackSource] = useState<'ONLINE_STREAM' | 'OFFLINE_BLOB'>('ONLINE_STREAM');
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const lastSavedPercentRef = useRef<number>(0);

  // 1. Khởi tạo nguồn phát (Ưu tiên Offline Blob nếu đã tải về, nếu không thì dùng Online Stream)
  useEffect(() => {
    let activeBlobUrl: string | null = null;

    async function loadSource() {
      try {
        const offlineBlob = await getOfflineVideoBlob(mediaId);
        if (offlineBlob) {
          activeBlobUrl = URL.createObjectURL(offlineBlob);
          setVideoSrc(activeBlobUrl);
          setPlaybackSource('OFFLINE_BLOB');
        } else {
          setVideoSrc(getVideoStreamUrl(mediaId));
          setPlaybackSource('ONLINE_STREAM');
        }
      } catch {
        setVideoSrc(getVideoStreamUrl(mediaId));
        setPlaybackSource('ONLINE_STREAM');
      }
    }

    loadSource();

    return () => {
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [mediaId]);

  // 2. Tự động lưu tiến độ vào Outbox khi đạt các mốc (25%, 50%, 75%, 95%) hoặc tạm dừng
  const handleSaveProgress = async (time: number, total: number) => {
    if (total <= 0) return;
    const percent = Math.min(100, (time / total) * 100);

    // Chỉ lưu nếu tiến độ tăng thêm ít nhất 15% hoặc hoàn thành bài
    if (percent - lastSavedPercentRef.current >= 15 || (percent >= 95 && lastSavedPercentRef.current < 95)) {
      lastSavedPercentRef.current = percent;
      await queueLessonProgress(lessonId, time, percent);
      setSaveNotice(`Đã lưu tiến độ ${percent.toFixed(0)}% vào Outbox!`);
      setTimeout(() => setSaveNotice(null), 3000);
      if (onProgressSaved) onProgressSaved();
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      handleSaveProgress(videoRef.current.currentTime, videoRef.current.duration);
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 overflow-hidden shadow-2xl relative group">
      {/* Badge trạng thái phát */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {playbackSource === 'OFFLINE_BLOB' ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-lg">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            Phát Ngoại Tuyến (Offline Blob)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold backdrop-blur-md shadow-lg">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            HTTP 206 Range Stream
          </span>
        )}

        {saveNotice && (
          <span className="px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 text-xs font-medium backdrop-blur-md animate-fadeIn">
            {saveNotice}
          </span>
        )}
      </div>

      {/* Video Element */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) setDuration(videoRef.current.duration || 0);
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (videoRef.current) handleSaveProgress(videoRef.current.duration, videoRef.current.duration);
            }}
          />
        ) : (
          <div className="text-slate-500 text-sm">Đang tải luồng video...</div>
        )}

        {/* Nút Play to đè giữa video khi Pause */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute z-10 w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 p-[1.5px] shadow-2xl hover:scale-110 transition-transform cursor-pointer"
          >
            <div className="w-full h-full bg-[#080D1A]/90 hover:bg-[#080D1A]/60 rounded-full flex items-center justify-center transition-colors">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Thanh điều khiển video tuỳ biến */}
      <div className="p-4 bg-gradient-to-t from-[#060A14] to-[#0A0F1F] border-t border-white/5 space-y-3">
        {/* Thanh trượt tua thời gian (Scrubber) */}
        <div className="relative w-full flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Cụm nút điều khiển bên dưới */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }
              }}
              title="Lùi 10 giây"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-slate-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 truncate max-w-xs">{lessonTitle}</span>
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    videoRef.current.requestFullscreen();
                  }
                }
              }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
