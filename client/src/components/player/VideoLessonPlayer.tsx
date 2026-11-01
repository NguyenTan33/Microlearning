import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume1,
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
  Globe,
  ExternalLink,
  PictureInPicture,
  Presentation,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getVideoStreamUrl, getLessonVideoStreamUrl, getOfflineVideoBlob } from '../../services/mediaService';
import { catalogApi } from '../../services/catalogApi';
import { parseVideoUrl, type LessonMediaInfo } from '../../types/media.types';
import { progressApi } from '../../services/progressApi';
import { mediaBookmarkService, formatBookmarkTime } from '../../services/mediaBookmarkService';
import type { MediaBookmark } from '../../types/mediaBookmark.types';
import { LessonAttachmentsTab } from './LessonAttachmentsTab';

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YTPlayerEvent {
  target: YTPlayerInstance;
  data: number;
}

interface YTPlayerOptions {
  videoId?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: {
    enablejsapi?: number;
    rel?: number;
    modestbranding?: number;
    playsinline?: number;
    origin?: string;
    autoplay?: number;
    controls?: number;
  };
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void;
    onStateChange?: (event: YTPlayerEvent) => void;
    onError?: (event: { target: YTPlayerInstance; data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (
    elementId: string | HTMLElement,
    options: YTPlayerOptions
  ) => YTPlayerInstance;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

const loadYouTubeIframeApi = (): Promise<YTNamespace> => {
  return new Promise((resolve) => {
    const win = window as unknown as { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
    if (win.YT && win.YT.Player) {
      resolve(win.YT);
      return;
    }

    const prevReady = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      if (prevReady) {
        try {
          prevReady();
        } catch {}
      }
      if (win.YT) {
        resolve(win.YT);
      }
    };

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  });
};

interface VideoLessonPlayerProps {
  mediaId: number;
  lessonId: number;
  lessonTitle: string;
  courseId?: number;
  courseTitle?: string;
  slideUrl?: string | null;
  slideType?: string | null;
  initialSeekTime?: number | null;
  onOpenNotebookView?: () => void;
  onOpenBookmarksView?: () => void;
  onProgressSaved?: (isCompleted: boolean) => void;
  onWatchedPercentChange?: (percent: number) => void;
}

export const VideoLessonPlayer: React.FC<VideoLessonPlayerProps> = ({
  mediaId,
  lessonId,
  lessonTitle,
  courseId,
  courseTitle,
  slideUrl,
  slideType,
  initialSeekTime,
  onOpenNotebookView,
  onOpenBookmarksView,
  onProgressSaved,
  onWatchedPercentChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [prevVolume, setPrevVolume] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [videoError, setVideoError] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<LessonMediaInfo | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const initialSeekDoneRef = useRef<boolean>(false);
  const [bookmarks, setBookmarks] = useState<MediaBookmark[]>([]);
  const [isAddFlagModalOpen, setIsAddFlagModalOpen] = useState<boolean>(false);
  const [flagTitleInput, setFlagTitleInput] = useState<string>('');
  const [flagNoteInput, setFlagNoteInput] = useState<string>('');
  const [flagTimestamp, setFlagTimestamp] = useState<number>(0);

  // Slide Presentation state (Feature 4: Canva & PowerPoint)
  const effectiveSlideUrl =
    slideUrl ||
    mediaInfo?.slideUrl ||
    ((mediaInfo?.sourceType as string)?.toLowerCase() === 'presentation' ||
     (mediaInfo?.sourceType as string)?.toLowerCase() === 'canva'
      ? (mediaInfo?.externalUrl || mediaInfo?.streamUrl)
      : null);

  const effectiveSlideType =
    slideType ||
    mediaInfo?.slideType ||
    (effectiveSlideUrl?.includes('canva.com') ? 'Canva' : 'Presentation');

  const [contentMode, setContentMode] = useState<'video' | 'slide'>('video');
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [totalSlides, setTotalSlides] = useState<number>(12);
  const [isAutoPlaySlide, setIsAutoPlaySlide] = useState<boolean>(false);
  const [slideFullscreen, setSlideFullscreen] = useState<boolean>(false);

  // Tự động chuyển sang chế độ Slide nếu bài học có Slide và không có video riêng được tải lên
  useEffect(() => {
    if (effectiveSlideUrl) {
      if (!mediaInfo || !mediaInfo.mediaId || mediaInfo.sourceType === 'demo' || mediaInfo.sourceType === 'presentation' || mediaInfo.sourceType === 'canva') {
        setContentMode('slide');
      }
    }
  }, [effectiveSlideUrl, mediaInfo]);

  // Auto-play slideshow timer (tu dong chuyen trang sau moi 4 giay)
  useEffect(() => {
    if (!isAutoPlaySlide || contentMode !== 'slide') return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = prev >= totalSlides ? 1 : prev + 1;
        const pct = Math.min(100, Math.round((next / totalSlides) * 100));
        if (onWatchedPercentChange) onWatchedPercentChange(pct);
        if (pct >= 60 && onProgressSaved && !isCompletionNotifiedRef.current) {
          isCompletionNotifiedRef.current = true;
          onProgressSaved(true);
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isAutoPlaySlide, contentMode, totalSlides, onWatchedPercentChange, onProgressSaved]);

  const handleSlideChange = (newSlide: number) => {
    const clamped = Math.max(1, Math.min(totalSlides, newSlide));
    setCurrentSlide(clamped);
    const pct = Math.min(100, Math.round((clamped / totalSlides) * 100));
    if (onWatchedPercentChange) onWatchedPercentChange(pct);
    if (pct >= 60 && onProgressSaved && !isCompletionNotifiedRef.current) {
      isCompletionNotifiedRef.current = true;
      onProgressSaved(true);
    }
  };

  const getCanvaEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('/view?embed')) return url;
    if (url.includes('/view')) return url.replace('/view', '/view?embed');
    return url.includes('?') ? url + '&embed=true' : url + '?embed=true';
  };

  const getOfficeViewerUrl = (url: string) => {
    if (!url) return '';
    const full = url.startsWith('http') ? url : window.location.origin + url;
    return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(full);
  };

  // Anti-cheat Interval Union tracking (Feature 2) & Bottom Tabs (Feature 1)
  const [antiCheatWarning, setAntiCheatWarning] = useState<string | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'info' | 'attachments'>('info');
  const watchedIntervalsRef = useRef<Array<{ start: number; end: number }>>([]);
  const segmentStartRef = useRef<number | null>(null);

  const lastSavedPercentRef = useRef<number>(0);
  const isCompletionNotifiedRef = useRef<boolean>(false);

  // 1. Tải URL phát trực tuyến HTTP 206 (hoặc phát từ Offline Blob) & nạp danh sách cắm cờ
  useEffect(() => {
    let objectUrl: string | null = null;
    let isCancelled = false;

    initialSeekDoneRef.current = false;
    pendingSeekTimeRef.current = null;
    isCompletionNotifiedRef.current = false;
    setIsPlaying(false);
    setVideoError(null);
    setAntiCheatWarning(null);
    watchedIntervalsRef.current = [];
    segmentStartRef.current = null;
    setCurrentTime(0);
    setDuration(0);
    lastSavedPercentRef.current = 0;

    const streamTargetId = lessonId || mediaId;

    // Lấy thông tin nguồn video chi tiết (Azure, YouTube, Vimeo, Direct URL)
    catalogApi.getLessonMediaInfo(streamTargetId)
      .then((info) => {
        if (isCancelled) return;
        setMediaInfo(info);
        if (info.sourceType === 'youtube' || info.sourceType === 'vimeo') {
          setVideoSrc(''); // Iframe sẽ tự phát
        } else if (info.sourceType === 'canva' || info.sourceType === 'presentation') {
          setVideoSrc('');
          setContentMode('slide');
        } else if (info.sourceType === 'direct_url' && info.externalUrl) {
          setVideoSrc(info.externalUrl);
        } else if (info.sourceType === 'demo' && (slideUrl || info.slideUrl)) {
          setVideoSrc('');
          setContentMode('slide');
        } else {
          setVideoSrc(info.streamUrl || getLessonVideoStreamUrl(streamTargetId));
        }
      })
      .catch(() => {
        // Dự phòng kiểm tra Offline Blob nếu có trong IndexedDB
        getOfflineVideoBlob(streamTargetId)
          .then((blob) => {
            if (isCancelled) return;
            if (blob) {
              objectUrl = URL.createObjectURL(blob);
              setVideoSrc(objectUrl);
            } else {
              setVideoSrc(getLessonVideoStreamUrl(streamTargetId));
            }
          })
          .catch(() => {
            if (!isCancelled) {
              setVideoSrc(getLessonVideoStreamUrl(streamTargetId));
            }
          });
      });

    setBookmarks(mediaBookmarkService.getBookmarks(lessonId));
    mediaBookmarkService.syncCloudBookmarks().then(() => {
      if (!isCancelled) {
        setBookmarks(mediaBookmarkService.getBookmarks(lessonId));
      }
    }).catch(() => {});

    // Khôi phục mốc thời gian học viên đã học trước đó
    progressApi
      .getLessonProgress(lessonId)
      .then((prog) => {
        if (isCancelled) return;
        const currentP = prog ? Number(prog.percent) || 0 : 0;
        lastSavedPercentRef.current = currentP;
        if (prog && prog.watchedSeconds > 2 && currentP < 90) {
          pendingSeekTimeRef.current = prog.watchedSeconds;
        }
      })
      .catch(() => {
        if (isCancelled) return;
        lastSavedPercentRef.current = 0;
      });

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaId, lessonId]);

  // 2. Lưu tiến độ trực tuyến lên hệ thống (Tích hợp Interval Union Anti-Cheat)
  const handleSaveProgress = useCallback(
    async (time: number, total: number, forceSave: boolean = false) => {
      if (total <= 0) return;
      // Không tự ý lưu tiến độ khi video chưa được phát (tránh lưu đè khi vừa tải video hoặc vừa chuyển bài)
      if (!isPlaying && !forceSave) return;
      const percent = Math.min(100, (time / total) * 100);

      // Ghi nhận đoạn đang xem liên tục vào intervals
      if (segmentStartRef.current === null) {
        segmentStartRef.current = time;
      } else if (time > segmentStartRef.current) {
        watchedIntervalsRef.current.push({
          start: Math.round(segmentStartRef.current * 10) / 10,
          end: Math.round(time * 10) / 10,
        });
        segmentStartRef.current = time;
      }

      // Lưu khi đạt mốc tăng >= 10% hoặc hoàn thành bài hoặc khi học viên tạm dừng (forceSave)
      const diff = percent - lastSavedPercentRef.current;
      if (diff >= 10 || (percent >= 90 && lastSavedPercentRef.current < 90) || (forceSave && diff > 1)) {
        lastSavedPercentRef.current = percent;

        try {
          // Gọi API kiểm tra độ phủ dải xem chống tua (Interval Union Anti-cheat)
          const coverageRes = await progressApi.recordVideoCoverage(
            lessonId,
            total,
            time,
            watchedIntervalsRef.current
          );

          if (!coverageRes.isEligibleForCompletion && coverageRes.skippedRatio > 0.2) {
            setAntiCheatWarning(
              `⚠️ Cảnh báo chống tua: Bạn đã tua bỏ qua ${(coverageRes.skippedRatio * 100).toFixed(0)}% thời lượng video. Bài học yêu cầu xem thực tế tối thiểu 80% để tính hoàn thành. Hãy xem đầy đủ nội dung nhé!`
            );
          } else {
            setAntiCheatWarning(null);
          }

          if (coverageRes.isCompleted) {
            setSaveNotice('🎉 Chúc mừng! Bạn đã hoàn thành bài học này.');
            window.dispatchEvent(new Event('lesson-progress-updated'));
            if (!isCompletionNotifiedRef.current) {
              isCompletionNotifiedRef.current = true;
              if (onProgressSaved) onProgressSaved(true);
            }
          } else {
            setSaveNotice(`Đã lưu tiến độ: ${percent.toFixed(0)}% (Xem thực: ${coverageRes.watchedCoveragePercent.toFixed(0)}%)`);
            if (onProgressSaved) onProgressSaved(false);
          }

          setTimeout(() => setSaveNotice(null), 3000);
        } catch {
          // Fallback lưu cơ bản nếu coverage API tạm gián đoạn
          try {
            await progressApi.saveProgress(lessonId, time, percent);
            setSaveNotice(`Đã lưu tiến độ: ${percent.toFixed(0)}%`);
            setTimeout(() => setSaveNotice(null), 3000);
            if (percent >= 90) {
              if (!isCompletionNotifiedRef.current) {
                isCompletionNotifiedRef.current = true;
                if (onProgressSaved) onProgressSaved(true);
              }
            } else {
              if (onProgressSaved) onProgressSaved(false);
            }
          } catch {
            // Bỏ qua lỗi mạng tức thời
          }
        }
      }
    },
    [lessonId, onProgressSaved]
  );

  const handleSaveProgressRef = useRef(handleSaveProgress);
  handleSaveProgressRef.current = handleSaveProgress;

  const onProgressSavedRef = useRef(onProgressSaved);
  onProgressSavedRef.current = onProgressSaved;

  const onWatchedPercentChangeRef = useRef(onWatchedPercentChange);
  onWatchedPercentChangeRef.current = onWatchedPercentChange;

  const getCurrentPlayerTime = useCallback((): number => {
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        const t = ytPlayerRef.current.getCurrentTime();
        if (!isNaN(t) && t >= 0) return t;
      } catch {}
    }
    if (videoRef.current) {
      return videoRef.current.currentTime;
    }
    return currentTime;
  }, [mediaInfo, currentTime]);

  const togglePlay = () => {
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
          const cur = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          handleSaveProgress(cur, dur, true);
          segmentStartRef.current = null;
        } else {
          try {
            segmentStartRef.current = ytPlayerRef.current.getCurrentTime();
          } catch {}
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch {}
      return;
    }

    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (segmentStartRef.current !== null && videoRef.current.currentTime > segmentStartRef.current) {
        watchedIntervalsRef.current.push({
          start: Math.round(segmentStartRef.current * 10) / 10,
          end: Math.round(videoRef.current.currentTime * 10) / 10,
        });
        segmentStartRef.current = null;
      }
      handleSaveProgress(videoRef.current.currentTime, videoRef.current.duration, true);
    } else {
      segmentStartRef.current = videoRef.current.currentTime;
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleRewind10 = () => {
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        const cur = ytPlayerRef.current.getCurrentTime();
        const target = Math.max(0, cur - 10);
        ytPlayerRef.current.seekTo(target, true);
        setCurrentTime(target);
      } catch {}
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const handleForward10 = () => {
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        const cur = ytPlayerRef.current.getCurrentTime();
        const dur = ytPlayerRef.current.getDuration();
        const target = Math.min(dur || duration, cur + 10);
        ytPlayerRef.current.seekTo(target, true);
        setCurrentTime(target);
      } catch {}
      return;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const handleToggleMute = () => {
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        if (isMuted) {
          ytPlayerRef.current.unMute();
          const restore = prevVolume > 0 ? prevVolume : 1;
          ytPlayerRef.current.setVolume(restore * 100);
          setVolume(restore);
          setIsMuted(false);
        } else {
          setPrevVolume(volume > 0 ? volume : 1);
          ytPlayerRef.current.mute();
          setVolume(0);
          setIsMuted(true);
        }
      } catch {}
      return;
    }
    if (videoRef.current) {
      if (isMuted) {
        const restore = prevVolume > 0 ? prevVolume : 1;
        videoRef.current.muted = false;
        videoRef.current.volume = restore;
        setVolume(restore);
        setIsMuted(false);
      } else {
        setPrevVolume(volume > 0 ? volume : 1);
        videoRef.current.muted = true;
        setVolume(0);
        setIsMuted(true);
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);

    if (clamped === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      setPrevVolume(clamped);
    }

    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        if (clamped === 0) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(clamped * 100);
        }
      } catch {}
      return;
    }

    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
  };

  const handleRetryStream = () => {
    setVideoError(null);
    setIsPlaying(false);
    const streamTargetId = lessonId || mediaId;
    setVideoSrc(`${getLessonVideoStreamUrl(streamTargetId)}?retry=${Date.now()}`);
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
    if (dur > 0 && onWatchedPercentChange) {
      onWatchedPercentChange(Math.min(100, (cur / dur) * 100));
    }
    handleSaveProgress(cur, dur, false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(targetTime, true);
        setCurrentTime(targetTime);
      } catch {}
      return;
    }
    if (videoRef.current) {
      if (segmentStartRef.current !== null && videoRef.current.currentTime > segmentStartRef.current) {
        watchedIntervalsRef.current.push({
          start: Math.round(segmentStartRef.current * 10) / 10,
          end: Math.round(videoRef.current.currentTime * 10) / 10,
        });
      }
      segmentStartRef.current = targetTime;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setPlaybackRate(nextSpeed);
      } catch {}
      return;
    }
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

  const handleTogglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Picture-in-Picture error:', err);
    }
  };

  // Nhảy tới mốc cắm cờ nếu được truyền từ bên ngoài (Mục Đánh Dấu / Bookmark Library)
  useEffect(() => {
    if (initialSeekTime !== undefined && initialSeekTime !== null && initialSeekTime > 0) {
      pendingSeekTimeRef.current = initialSeekTime;

      // 1. YouTube Player
      if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
        try {
          ytPlayerRef.current.seekTo(initialSeekTime, true);
          ytPlayerRef.current.playVideo();
          setCurrentTime(initialSeekTime);
          setIsPlaying(true);
          setSaveNotice(`Đã chuyển tới mốc cắm cờ lúc ${formatBookmarkTime(initialSeekTime)}`);
          setTimeout(() => setSaveNotice(null), 3000);
          pendingSeekTimeRef.current = null;
          initialSeekDoneRef.current = true;
        } catch {}
        return;
      }

      // 2. HTML5 Video Player
      if (videoRef.current && videoRef.current.readyState >= 1) {
        videoRef.current.currentTime = initialSeekTime;
        setCurrentTime(initialSeekTime);
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
        setSaveNotice(`Đã chuyển tới mốc cắm cờ lúc ${formatBookmarkTime(initialSeekTime)}`);
        setTimeout(() => setSaveNotice(null), 3000);
        pendingSeekTimeRef.current = null;
        initialSeekDoneRef.current = true;
      }
    }
  }, [initialSeekTime, mediaInfo]);

  // Khởi tạo YouTube IFrame API và điều khiển video YouTube an toàn (chống xung đột React DOM removeChild)
  const youtubeEmbedUrl =
    mediaInfo && mediaInfo.sourceType === 'youtube'
      ? mediaInfo.embedUrl || mediaInfo.externalUrl || mediaInfo.streamUrl || ''
      : null;

  useEffect(() => {
    if (!mediaInfo || mediaInfo.sourceType !== 'youtube' || !youtubeEmbedUrl) {
      return;
    }

    const container = youtubeContainerRef.current;
    if (!container) return;

    let isCancelled = false;
    let timerId: number | null = null;
    let playerInstance: YTPlayerInstance | null = null;

    // Trích xuất videoId từ URL
    const parsed = parseVideoUrl(youtubeEmbedUrl);
    const videoId = parsed.videoId;

    // Làm sạch DOM nội bộ của container mà không đụng chạm Virtual DOM của React
    container.innerHTML = '';

    const mountDiv = document.createElement('div');
    const mountId = `yt-player-target-${lessonId}-${Date.now()}`;
    mountDiv.id = mountId;
    mountDiv.className = 'w-full h-full aspect-video';
    container.appendChild(mountDiv);

    const initYT = async () => {
      try {
        const YT = await loadYouTubeIframeApi();
        if (isCancelled || !document.getElementById(mountId)) return;

        playerInstance = new YT.Player(mountId, {
          videoId: videoId || undefined,
          width: '100%',
          height: '100%',
          playerVars: {
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (isCancelled) return;
              ytPlayerRef.current = event.target;
              try {
                const dur = event.target.getDuration();
                if (dur > 0) setDuration(dur);

                if (pendingSeekTimeRef.current !== null && pendingSeekTimeRef.current > 0) {
                  const targetTime = Math.min(Math.max(0, dur - 2), pendingSeekTimeRef.current);
                  event.target.seekTo(targetTime, true);
                  setCurrentTime(targetTime);
                  event.target.playVideo();
                  setIsPlaying(true);
                  setSaveNotice(`Đã chuyển tới mốc cắm cờ lúc ${formatBookmarkTime(targetTime)}`);
                  setTimeout(() => setSaveNotice(null), 3000);
                  pendingSeekTimeRef.current = null;
                  initialSeekDoneRef.current = true;
                } else if (!initialSeekDoneRef.current && lastSavedPercentRef.current > 0 && lastSavedPercentRef.current < 90) {
                  const resumeTime = (lastSavedPercentRef.current / 100) * dur;
                  if (resumeTime > 2 && resumeTime < dur - 5) {
                    event.target.seekTo(resumeTime, true);
                    setCurrentTime(resumeTime);
                  }
                  initialSeekDoneRef.current = true;
                } else {
                  event.target.seekTo(0, true);
                  setCurrentTime(0);
                  initialSeekDoneRef.current = true;
                }
              } catch {}
            },
            onStateChange: (event) => {
              if (isCancelled) return;
              if (event.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                try {
                  segmentStartRef.current = event.target.getCurrentTime();
                } catch {}
              } else if (event.data === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                try {
                  const cur = event.target.getCurrentTime();
                  const dur = event.target.getDuration();
                  handleSaveProgressRef.current(cur, dur, true);
                  segmentStartRef.current = null;
                } catch {}
              } else if (event.data === YT.PlayerState.ENDED) {
                setIsPlaying(false);
                try {
                  const dur = event.target.getDuration();
                  handleSaveProgressRef.current(dur, dur, true);
                  segmentStartRef.current = null;
                  if (!isCompletionNotifiedRef.current) {
                    isCompletionNotifiedRef.current = true;
                    if (onProgressSavedRef.current) {
                      onProgressSavedRef.current(true);
                    }
                  }
                } catch {}
              }
            },
          },
        });
        ytPlayerRef.current = playerInstance;
      } catch (err) {
        console.warn('Lỗi khởi tạo YouTube API, dùng iframe thuần dự phòng:', err);
        if (!isCancelled && container) {
          container.innerHTML = '';
          const fallbackIframe = document.createElement('iframe');
          fallbackIframe.src = youtubeEmbedUrl;
          fallbackIframe.className = 'w-full h-full border-0 aspect-video';
          fallbackIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
          fallbackIframe.allowFullscreen = true;
          container.appendChild(fallbackIframe);
        }
      }
    };

    initYT();

    // Polling định kỳ đồng bộ thời gian và thanh tua khi xem video YouTube
    timerId = window.setInterval(() => {
      if (ytPlayerRef.current) {
        try {
          const cur = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (!isNaN(cur) && cur >= 0) {
            setCurrentTime(cur);
            if (dur > 0) {
              setDuration(dur);
              const watchedPct = Math.min(100, (cur / dur) * 100);
              if (onWatchedPercentChangeRef.current) {
                onWatchedPercentChangeRef.current(watchedPct);
              }
            }
            handleSaveProgressRef.current(cur, dur, false);
          }
        } catch {}
      }
    }, 500);

    return () => {
      isCancelled = true;
      if (timerId) clearInterval(timerId);
      try {
        if (playerInstance) {
          playerInstance.destroy();
        }
      } catch {}
      ytPlayerRef.current = null;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [lessonId, mediaInfo?.sourceType, youtubeEmbedUrl]);

  // 3. Xử lý cắm cờ mốc thời gian (Thêm điểm đánh dấu)
  const handleAddBookmark = useCallback(
    (title: string, note?: string) => {
      const curTime = getCurrentPlayerTime();
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
    [getCurrentPlayerTime, lessonId, mediaId, courseId, courseTitle, lessonTitle]
  );

  const handleOpenAddFlagModal = () => {
    const curTime = getCurrentPlayerTime();
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
    if (mediaInfo?.sourceType === 'youtube' && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(timestamp, true);
        ytPlayerRef.current.playVideo();
        setCurrentTime(timestamp);
        setIsPlaying(true);
        setSaveNotice(`Đã chuyển tới ${formatBookmarkTime(timestamp)}`);
        setTimeout(() => setSaveNotice(null), 2500);
        return;
      } catch {}
    }

    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setSaveNotice(`Đã chuyển tới ${formatBookmarkTime(timestamp)}`);
      setTimeout(() => setSaveNotice(null), 2500);
    } else {
      pendingSeekTimeRef.current = timestamp;
      setCurrentTime(timestamp);
      setSaveNotice(`Đã chuyển tới ${formatBookmarkTime(timestamp)}`);
      setTimeout(() => setSaveNotice(null), 2500);
    }
  }, [mediaInfo]);

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

            {/* Tab Switcher: Slide vs Video (Hiện khi bài học có Slide) */}
      {effectiveSlideUrl && (
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#060913] border-b border-white/10 z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setContentMode('slide');
                setIsPlaying(false);
                if (videoRef.current) videoRef.current.pause();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                contentMode === 'slide'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Slide Trình Chiếu ({effectiveSlideType === 'Canva' ? 'Canva' : 'PowerPoint'})</span>
            </button>
            <button
              type="button"
              onClick={() => setContentMode('video')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                contentMode === 'video'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Video Bài Giảng</span>
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            {contentMode === 'slide' ? (
              <span className="flex items-center gap-1.5 text-indigo-300 font-medium bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Đạt 60% trang slide để mở bài kiểm tra
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Slide Screen Area vs Video Screen Area */}
      {contentMode === 'slide' && effectiveSlideUrl ? (
        <div className="relative aspect-video bg-[#050811] flex flex-col items-center justify-center overflow-hidden">
          {effectiveSlideType === 'Canva' || effectiveSlideUrl.includes('canva.com') ? (
            <iframe
              src={getCanvaEmbedUrl(effectiveSlideUrl)}
              title={lessonTitle}
              className="w-full h-full border-0 aspect-video"
              allowFullScreen
              allow="fullscreen"
            />
          ) : effectiveSlideUrl.toLowerCase().endsWith('.pdf') ? (
            <iframe
              src={effectiveSlideUrl.startsWith('http') ? effectiveSlideUrl : window.location.origin + effectiveSlideUrl}
              title={lessonTitle}
              className="w-full h-full border-0 aspect-video"
            />
          ) : (
            <iframe
              src={getOfficeViewerUrl(effectiveSlideUrl)}
              title={lessonTitle}
              className="w-full h-full border-0 aspect-video"
              allowFullScreen
              allow="fullscreen"
            />
          )}

          {/* Slide Control Bar Overlay at bottom */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSlideChange(currentSlide - 1)}
                disabled={currentSlide <= 1}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white transition-all cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-white px-2.5 py-1 rounded-lg bg-black/60 border border-white/15">
                Trang {currentSlide} / {totalSlides}
              </span>
              <button
                type="button"
                onClick={() => handleSlideChange(currentSlide + 1)}
                disabled={currentSlide >= totalSlides}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white transition-all cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

                        {/* Tiến độ % slide */}
            <div className="flex items-center gap-3">
              <div className="w-24 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((currentSlide / totalSlides) * 100))}%` }}
                />
              </div>
              <span className="text-xs font-bold text-cyan-300">
                {Math.min(100, Math.round((currentSlide / totalSlides) * 100))}%
              </span>

              <button
                type="button"
                onClick={() => setIsAutoPlaySlide(!isAutoPlaySlide)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isAutoPlaySlide
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 animate-pulse'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white'
                }`}
                title="Tự động lướt chuyển slide mỗi 4 giây"
              >
                {isAutoPlaySlide ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isAutoPlaySlide ? 'Đang tự chạy' : 'Tự chạy slide'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {mediaInfo && mediaInfo.sourceType === 'youtube' && mediaInfo.embedUrl ? (
          <div className="w-full h-full aspect-video bg-black flex items-center justify-center relative">
            <div
              ref={youtubeContainerRef}
              className="w-full h-full aspect-video flex items-center justify-center overflow-hidden"
            />
            {/* Badge hiển thị nguồn nhúng ngoài */}
            <div className="absolute top-3 right-3 pointer-events-none z-10">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold shadow-lg">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>YouTube Video</span>
              </span>
            </div>
          </div>
        ) : mediaInfo && mediaInfo.sourceType === 'vimeo' && mediaInfo.embedUrl ? (
          <div className="w-full h-full aspect-video bg-black flex items-center justify-center relative">
            <iframe
              src={mediaInfo.embedUrl}
              title={lessonTitle}
              className="w-full h-full border-0 aspect-video"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            {/* Badge hiển thị nguồn nhúng ngoài */}
            <div className="absolute top-3 right-3 pointer-events-none z-10">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold shadow-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Vimeo Video</span>
              </span>
            </div>
          </div>
        ) : videoError ? (
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
                const dur = videoRef.current.duration || 0;
                setDuration(dur);
                if (pendingSeekTimeRef.current !== null && pendingSeekTimeRef.current > 0) {
                  const targetTime = Math.min(Math.max(0, dur - 2), pendingSeekTimeRef.current);
                  videoRef.current.currentTime = targetTime;
                  setCurrentTime(targetTime);
                  videoRef.current.play().catch(() => {});
                  setIsPlaying(true);
                  setSaveNotice(`Đã chuyển tới mốc cắm cờ lúc ${formatBookmarkTime(targetTime)}`);
                  setTimeout(() => setSaveNotice(null), 3000);
                  pendingSeekTimeRef.current = null;
                  initialSeekDoneRef.current = true;
                } else if (!initialSeekDoneRef.current && lastSavedPercentRef.current > 0 && lastSavedPercentRef.current < 90) {
                  const resumeTime = (lastSavedPercentRef.current / 100) * dur;
                  if (resumeTime > 2 && resumeTime < dur - 5) {
                    videoRef.current.currentTime = resumeTime;
                    setCurrentTime(resumeTime);
                  }
                  initialSeekDoneRef.current = true;
                } else {
                  // Mặc định bài mới bắt đầu từ 0:00
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                  initialSeekDoneRef.current = true;
                }
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              if (videoRef.current) {
                handleSaveProgress(videoRef.current.duration, videoRef.current.duration, true);
              }
              if (!isCompletionNotifiedRef.current) {
                isCompletionNotifiedRef.current = true;
                if (onProgressSaved) {
                  onProgressSaved(true);
                }
              }
            }}
            onError={() => {
              if (effectiveSlideUrl) {
                setContentMode('slide');
                return;
              }
              if (videoSrc && !videoSrc.includes('test.mp4')) {
                setVideoSrc('/videos/test.mp4');
              } else {
                setIsPlaying(false);
                setVideoError('Không thể tải luồng video bài giảng. Vui lòng kiểm tra lại kết nối mạng.');
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
        {!isPlaying && !videoError && (!mediaInfo || (mediaInfo.sourceType !== 'youtube' && mediaInfo.sourceType !== 'vimeo')) && (
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
      )}

      {/* Thanh điều khiển Video thông minh */}
      {contentMode !== 'slide' && (
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
              onClick={handleRewind10}
              title="Lùi 10 giây"
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Tiến 10s */}
            <button
              onClick={handleForward10}
              title="Tua tới 10 giây"
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Thanh điều khiển Âm lượng (Kéo từ lớn đến tắt + Mute toggle) */}
            <div className="flex items-center gap-1 sm:gap-1.5 group/vol">
              <button
                type="button"
                onClick={handleToggleMute}
                title={isMuted || volume === 0 ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-cyan-400" />
                ) : (
                  <Volume2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-cyan-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                className="w-14 sm:w-20 h-1.5 accent-cyan-400 bg-slate-700/80 hover:bg-slate-600 rounded-lg cursor-pointer transition-all appearance-none"
              />
            </div>

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

            {/* Nút Thu nhỏ hình trong hình (Picture-in-Picture) */}
            {(!mediaInfo || (mediaInfo.sourceType !== 'youtube' && mediaInfo.sourceType !== 'vimeo')) && (
              <button
                type="button"
                onClick={handleTogglePiP}
                title="Thu nhỏ ra ngoài (Hình trong hình - PiP)"
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
              >
                <PictureInPicture className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
            )}

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
      )}

      {/* Cảnh báo Chống Gian Lận Tua Video (> 30%) */}
      {antiCheatWarning && (
        <div className="mx-3 my-2 p-3 bg-amber-950/80 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-center gap-2 animate-fadeIn shadow-md">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{antiCheatWarning}</span>
        </div>
      )}

      {/* Tabs Bên Dưới Video: Tổng quan vs Tài liệu đính kèm */}
      <div className="p-4 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            type="button"
            onClick={() => setActiveBottomTab('info')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeBottomTab === 'info'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Thông tin bài học
          </button>
          <button
            type="button"
            onClick={() => setActiveBottomTab('attachments')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeBottomTab === 'attachments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📁 Tài liệu đính kèm (Word/PDF)</span>
          </button>
        </div>

        {activeBottomTab === 'attachments' && (
          <div className="pt-1 animate-fadeIn">
            <LessonAttachmentsTab lessonId={lessonId} />
          </div>
        )}
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
