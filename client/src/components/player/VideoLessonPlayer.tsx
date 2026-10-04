import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Wifi,
  HardDrive,
  Gauge,
  CheckCircle,
} from 'lucide-react';
import { getVideoStreamUrl, getOfflineVideoBlob } from '../../services/mediaService';
import { queueLessonProgress } from '../../services/syncService';
import { progressApi } from '../../services/progressApi';

interface VideoLessonPlayerProps {
  mediaId: number;
  lessonId: number;
  lessonTitle: string;
  isOnline: boolean;
  onProgressSaved?: () => void;
}

export const VideoLessonPlayer: React.FC<VideoLessonPlayerProps> = ({
  mediaId,
  lessonId,
  lessonTitle,
  isOnline,
  onProgressSaved,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playbackSource, setPlaybackSource] = useState<'ONLINE_STREAM' | 'OFFLINE_BLOB'>('ONLINE_STREAM');
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [initialSeekDone, setInitialSeekDone] = useState<boolean>(false);

  const lastSavedPercentRef = useRef<number>(0);

  // 1. Khởi tạo nguồn phát (Ưu tiên Offline Blob nếu đã tải về, nếu không dùng Online Stream)
  useEffect(() => {
    let activeBlobUrl: string | null = null;
    setInitialSeekDone(false);

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

      // Khôi phục mốc thời gian đã xem trước đó từ Server nếu có
      if (isOnline) {
        progressApi.getLessonProgress(lessonId).then((prog) => {
          if (prog && prog.watchedSeconds > 0 && videoRef.current) {
            lastSavedPercentRef.current = Number(prog.percent);
          }
        }).catch(() => {});
      }
    }

    loadSource();

    return () => {
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [mediaId, lessonId, isOnline]);

  // 2. Lưu tiến độ xem (Trực tuyến hoặc Hàng đợi Ngoại tuyến)
  const handleSaveProgress = useCallback(
    async (time: number, total: number, forceSave: boolean = false) => {
      if (total <= 0) return;
      const percent = Math.min(100, (time / total) * 100);

      // Lưu khi đạt mốc tăng >= 10% hoặc hoàn thành bài hoặc khi học viên tạm dừng (forceSave)
      const diff = percent - lastSavedPercentRef.current;
      if (diff >= 10 || (percent >= 90 && lastSavedPercentRef.current < 90) || (forceSave && diff > 1)) {
        lastSavedPercentRef.current = percent;

        try {
          if (isOnline) {
            await progressApi.saveProgress(lessonId, time, percent);
            setSaveNotice(`Đã lưu tiến độ: ${percent.toFixed(0)}%`);
          } else {
            await queueLessonProgress(lessonId, time, percent);
            setSaveNotice(`Đã ghi nhận ngoại tuyến: ${percent.toFixed(0)}%`);
          }
        } catch {
          await queueLessonProgress(lessonId, time, percent);
          setSaveNotice(`Đã lưu Outbox: ${percent.toFixed(0)}%`);
        }

        setTimeout(() => setSaveNotice(null), 3000);
        if (onProgressSaved) onProgressSaved();
      }
    },
    [lessonId, isOnline, onProgressSaved]
  );

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      handleSaveProgress(videoRef.current.currentTime, videoRef.current.duration, true);
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

  return (
    <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 overflow-hidden shadow-2xl relative group">
      {/* Badge trạng thái phát */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {playbackSource === 'OFFLINE_BLOB' ? (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-lg">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            Ngoại tuyến (Offline)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold backdrop-blur-md shadow-lg">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            Truyền phát trực tuyến (HTTP 206)
          </span>
        )}

        {saveNotice && (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 text-xs font-medium backdrop-blur-md shadow-lg animate-fadeIn">
            <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
            {saveNotice}
          </span>
        )}
      </div>

      {/* Video Screen */}
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
          />
        ) : (
          <div className="text-slate-500 text-xs">Đang tải nguồn video...</div>
        )}

        {/* Nút Play to chính giữa */}
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

      {/* Thanh điều khiển video */}
      <div className="p-4 bg-gradient-to-t from-[#060A14] to-[#0A0F1F] border-t border-white/5 space-y-3">
        {/* Scrubber */}
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

        {/* Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-3">
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
                  videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                }
              }}
              title="Tua tới 10 giây"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
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

            <span className="font-mono text-slate-400 text-[11px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Speed toggle */}
            <button
              onClick={cycleSpeed}
              title="Tốc độ phát"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer text-xs font-semibold"
            >
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>{playbackSpeed}x</span>
            </button>

            <span className="text-slate-400 truncate max-w-[200px] hidden sm:inline text-xs">
              {lessonTitle}
            </span>

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
