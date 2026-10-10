import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
  Linking,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import YoutubePlayer, { YoutubeIframeRef, PLAYER_STATES } from 'react-native-youtube-iframe';
import { Maximize2, AlertCircle, PictureInPicture, Youtube, ExternalLink } from 'lucide-react-native';
import { downloadManager } from '../../services/downloadManager';
import { downloadRepository } from '../../db/repositories/downloadRepository';
import { autoSyncEngine } from '../../services/autoSyncEngine';
import { catalogApi } from '../../services/catalogApi';
import { parseVideoUrl, extractYoutubeVideoId, LessonMediaInfo } from '../../types/media.types';

interface HybridVideoPlayerProps {
  lessonId: number;
  onlineStreamUrl?: string;
  videoUrl?: string;
  mediaInfo?: LessonMediaInfo | null;
  durationSeconds?: number;
  seekTimestamp?: number;
  onCompleted?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
}

type PlayerMode = 'native' | 'youtube';

export const HybridVideoPlayer: React.FC<HybridVideoPlayerProps> = ({
  lessonId,
  onlineStreamUrl,
  videoUrl,
  mediaInfo,
  durationSeconds = 120,
  seekTimestamp,
  onCompleted,
  onProgress,
}) => {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('native');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [isYtPlaying, setIsYtPlaying] = useState<boolean>(true);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const lastRecordedTimeRef = useRef<number>(0);
  const videoViewRef = useRef<VideoView | null>(null);
  const ytPlayerRef = useRef<YoutubeIframeRef | null>(null);
  const ytProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Kích thước chuẩn 16:9 của container
  const screenWidth = Dimensions.get('window').width;
  const initialWidth = Math.max(280, screenWidth - 32);
  const initialHeight = Math.round((initialWidth * 9) / 16);

  const [playerDimensions, setPlayerDimensions] = useState<{ width: number; height: number }>({
    width: initialWidth,
    height: initialHeight,
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const layoutWidth = Math.round(event.nativeEvent.layout.width);
    if (layoutWidth > 0 && Math.abs(layoutWidth - playerDimensions.width) > 5) {
      setPlayerDimensions({
        width: layoutWidth,
        height: Math.round((layoutWidth * 9) / 16),
      });
    }
  };

  // 1. Phân giải nguồn phát: Ưu tiên YouTube -> File offline trong máy -> Azure Media Stream
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSource(true);
    setLoadError(null);
    setYtError(null);

    const resolveStream = async () => {
      try {
        // BƯỚC 1: Thu thập tất cả URL ứng viên từ props và mediaInfo đã biết
        let streamTargetUrl = onlineStreamUrl || videoUrl;
        const candidateUrls = [
          streamTargetUrl,
          mediaInfo?.externalUrl,
          mediaInfo?.embedUrl,
          mediaInfo?.streamUrl,
        ].filter(Boolean) as string[];

        // Kiểm tra xem đã có Video ID YouTube từ props hoặc mediaInfo chưa
        let detectedYtId: string | null = null;
        if (mediaInfo?.sourceType === 'youtube') {
          detectedYtId =
            extractYoutubeVideoId(mediaInfo.externalUrl || '') ||
            extractYoutubeVideoId(mediaInfo.embedUrl || '') ||
            extractYoutubeVideoId(mediaInfo.streamUrl || '');
        }

        if (!detectedYtId) {
          for (const url of candidateUrls) {
            const ytId = extractYoutubeVideoId(url);
            if (ytId) {
              detectedYtId = ytId;
              break;
            }
          }
        }

        // BƯỚC 2: Nếu chưa phát hiện YouTube và chưa có mediaInfo đầy đủ, truy vấn trực tiếp từ Backend
        let activeMediaInfo = mediaInfo;
        if (!detectedYtId && !activeMediaInfo) {
          try {
            activeMediaInfo = await catalogApi.getLessonMediaInfo(lessonId);
          } catch {
            // Bỏ qua lỗi mạng
          }
        }

        if (activeMediaInfo) {
          if (activeMediaInfo.sourceType === 'youtube') {
            detectedYtId =
              extractYoutubeVideoId(activeMediaInfo.externalUrl || '') ||
              extractYoutubeVideoId(activeMediaInfo.embedUrl || '') ||
              extractYoutubeVideoId(activeMediaInfo.streamUrl || '');
          }

          if (!detectedYtId) {
            const apiUrls = [
              activeMediaInfo.externalUrl,
              activeMediaInfo.embedUrl,
              activeMediaInfo.streamUrl,
            ].filter(Boolean) as string[];

            for (const url of apiUrls) {
              const ytId = extractYoutubeVideoId(url);
              if (ytId) {
                detectedYtId = ytId;
                break;
              }
            }
          }

          if (!streamTargetUrl) {
            streamTargetUrl = activeMediaInfo.streamUrl || activeMediaInfo.externalUrl || undefined;
          }
        }

        // BƯỚC 3: XỬ LÝ NGUỒN PHÁT
        // 3.1. NẾU LÀ YOUTUBE: Luôn luôn kích hoạt YouTube IFrame Player!
        if (detectedYtId) {
          // Xóa dọn dẹp file offline / record tải nhầm nếu trước đó từng tải test.mp4 vào máy
          downloadRepository.deleteDownloadByLessonId(lessonId).catch(() => {});

          if (isMounted) {
            setPlayerMode('youtube');
            setYoutubeVideoId(detectedYtId);
            setSourceUri(null);
            setIsLoadingSource(false);
          }
          return;
        }

        // 3.2. NẾU LÀ VIDEO TRỰC TIẾP / AZURE BLOB: Kiểm tra file ngoại tuyến đã tải trong máy (0ms)
        const offlineCheck = await downloadManager.resolvePlayableVideoUri(lessonId);
        if (offlineCheck.isOffline && offlineCheck.uri) {
          if (isMounted) {
            setPlayerMode('native');
            setYoutubeVideoId(null);
            setSourceUri(offlineCheck.uri);
            setIsLoadingSource(false);
          }
          return;
        }

        // Tự động phân giải endpoint stream Azure chuẩn nếu chưa có URL
        if (!streamTargetUrl) {
          streamTargetUrl = `https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net/api/media/lesson/${lessonId}/stream`;
        }

        const resolved = await downloadManager.resolvePlayableVideoUri(lessonId, streamTargetUrl);
        if (isMounted) {
          if (resolved.uri) {
            setPlayerMode('native');
            setYoutubeVideoId(null);
            setSourceUri(resolved.uri);
          } else {
            setLoadError('Bài học này chưa có video hoặc đang được xử lý.');
          }
          setIsLoadingSource(false);
        }
      } catch {
        if (isMounted) {
          setLoadError('Không thể nạp nguồn video bài học.');
          setIsLoadingSource(false);
        }
      }
    };

    resolveStream();

    return () => {
      isMounted = false;
    };
  }, [lessonId, onlineStreamUrl, videoUrl, mediaInfo]);

  // 2. Khởi tạo native player với expo-video (chỉ nạp URI khi playerMode === 'native')
  const nativePlayerUri = playerMode === 'native' ? sourceUri : null;
  const player = useVideoPlayer(nativePlayerUri, (p: { loop: boolean; timeUpdateEventInterval?: number }) => {
    p.loop = false;
    p.timeUpdateEventInterval = 1;
  });

  // 3. Xử lý tua video tới mốc đánh dấu cho Native Video
  useEffect(() => {
    if (playerMode !== 'native' || !player || typeof seekTimestamp !== 'number' || seekTimestamp < 0) return;

    let hasSeeked = false;
    const performSeek = () => {
      if (hasSeeked) return;
      hasSeeked = true;
      try {
        player.currentTime = seekTimestamp;
        player.play();
      } catch (err) {
        console.warn('[HybridVideoPlayer] Seek timestamp error:', err);
      }
    };

    if (player.status === 'readyToPlay' || player.duration > 0) {
      performSeek();
      return;
    }

    const statusSub = (player as unknown as { addListener: (event: string, callback: (payload: { status: string }) => void) => { remove: () => void } }).addListener('statusChange', (payload: { status: string }) => {
      if (payload?.status === 'readyToPlay') {
        performSeek();
      }
    });

    return () => {
      if (statusSub && typeof statusSub.remove === 'function') {
        statusSub.remove();
      }
    };
  }, [playerMode, player, seekTimestamp]);

  // 4. Xử lý tua video cho YouTube
  useEffect(() => {
    if (playerMode !== 'youtube' || !ytPlayerRef.current || typeof seekTimestamp !== 'number' || seekTimestamp < 0) return;
    try {
      ytPlayerRef.current.seekTo(Math.floor(seekTimestamp), true);
    } catch (err) {
      console.warn('[YouTube] Seek error:', err);
    }
  }, [playerMode, seekTimestamp]);

  // 5. Theo dõi tiến trình phát cho Native Player
  useEffect(() => {
    if (playerMode !== 'native' || !player) return;

    const playToEndSub = player.addListener('playToEnd', () => {
      const totalDur = player.duration > 0 ? Math.round(player.duration) : durationSeconds;
      autoSyncEngine.recordLessonProgress(lessonId, totalDur, totalDur).catch(() => {});
      if (onCompleted) onCompleted();
    });

    const timeUpdateSub = (player as unknown as { addListener: (event: string, callback: (payload: { currentTime: number }) => void) => { remove: () => void } }).addListener('timeUpdate', (payload: { currentTime: number }) => {
      const cur = Math.round(payload.currentTime);
      const dur = player.duration > 0 ? Math.round(player.duration) : durationSeconds;

      if (onProgress) {
        onProgress(cur, dur);
      }

      if (cur > 0 && Math.abs(cur - lastRecordedTimeRef.current) >= 5) {
        lastRecordedTimeRef.current = cur;
        autoSyncEngine.recordLessonProgress(lessonId, cur, dur).catch(() => {});
      }
    });

    return () => {
      playToEndSub.remove();
      timeUpdateSub.remove();
    };
  }, [playerMode, player, lessonId, durationSeconds, onCompleted, onProgress]);

  // 6. Quản lý trạng thái và đồng bộ tiến độ cho YouTube Player
  const handleYoutubeStateChange = useCallback(
    (state: PLAYER_STATES) => {
      if (state === PLAYER_STATES.PLAYING) {
        if (!ytProgressTimerRef.current) {
          ytProgressTimerRef.current = setInterval(async () => {
            if (ytPlayerRef.current) {
              try {
                const cur = Math.round(await ytPlayerRef.current.getCurrentTime());
                const durRaw = await ytPlayerRef.current.getDuration();
                const dur = Math.round(durRaw) || durationSeconds;

                if (onProgress) {
                  onProgress(cur, dur);
                }

                if (cur > 0 && Math.abs(cur - lastRecordedTimeRef.current) >= 5) {
                  lastRecordedTimeRef.current = cur;
                  autoSyncEngine.recordLessonProgress(lessonId, cur, dur).catch(() => {});
                }
              } catch {
                // ignore
              }
            }
          }, 1000);
        }
      } else {
        if (ytProgressTimerRef.current) {
          clearInterval(ytProgressTimerRef.current);
          ytProgressTimerRef.current = null;
        }
      }

      if (state === PLAYER_STATES.ENDED) {
        if (ytProgressTimerRef.current) {
          clearInterval(ytProgressTimerRef.current);
          ytProgressTimerRef.current = null;
        }
        const dur = durationSeconds;
        autoSyncEngine.recordLessonProgress(lessonId, dur, dur).catch(() => {});
        if (onCompleted) {
          onCompleted();
        }
      }
    },
    [lessonId, durationSeconds, onCompleted, onProgress]
  );

  const handleYoutubeReady = useCallback(() => {
    if (typeof seekTimestamp === 'number' && seekTimestamp > 0 && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(Math.floor(seekTimestamp), true);
    }
  }, [seekTimestamp]);

  useEffect(() => {
    return () => {
      if (ytProgressTimerRef.current) {
        clearInterval(ytProgressTimerRef.current);
        ytProgressTimerRef.current = null;
      }
    };
  }, []);

  const handleOpenYoutubeApp = () => {
    if (youtubeVideoId) {
      const url = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
      Linking.canOpenURL(url)
        .then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Linking.openURL(`https://m.youtube.com/watch?v=${youtubeVideoId}`);
          }
        })
        .catch(() => {
          Linking.openURL(`https://m.youtube.com/watch?v=${youtubeVideoId}`);
        });
    }
  };

  const handleToggleFullscreen = () => {
    if (videoViewRef.current) {
      videoViewRef.current.enterFullscreen();
    }
  };

  const safeStart = typeof seekTimestamp === 'number' && seekTimestamp > 0 ? Math.floor(seekTimestamp) : 0;

  if (isLoadingSource) {
    return (
      <View style={styles.videoContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.resolvingText}>Đang kết nối luồng phát video...</Text>
      </View>
    );
  }

  if (loadError || (playerMode === 'native' && !sourceUri) || (playerMode === 'youtube' && !youtubeVideoId)) {
    return (
      <View style={styles.videoContainer}>
        <AlertCircle color="#F59E0B" size={28} />
        <Text style={styles.errorText}>{loadError || 'Chưa gắn tệp video cho bài học này.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer} onLayout={handleLayout}>
      {playerMode === 'youtube' && youtubeVideoId ? (
        <View style={styles.ytWrapper}>
          {ytError ? (
            <View style={styles.errorOverlay}>
              <AlertCircle color="#F59E0B" size={28} />
              <Text style={styles.errorOverlayText}>
                Video này có giới hạn phát nhúng từ chủ sở hữu.
              </Text>
              <TouchableOpacity
                style={styles.openYtBtn}
                onPress={handleOpenYoutubeApp}
                activeOpacity={0.8}
              >
                <Youtube color="#EF4444" size={16} />
                <Text style={styles.openYtBtnText}>Mở xem trên ứng dụng YouTube</Text>
                <ExternalLink color="#94A3B8" size={14} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <YoutubePlayer
                ref={ytPlayerRef}
                width={playerDimensions.width}
                height={playerDimensions.height}
                videoId={youtubeVideoId}
                play={isYtPlaying}
                initialPlayerParams={{
                  controls: true,
                  rel: false,
                  start: safeStart,
                  preventFullScreen: false,
                }}
                forceAndroidAutoplay={true}
                onChangeState={handleYoutubeStateChange}
                onReady={handleYoutubeReady}
                onError={(err: string) => {
                  console.warn('[YouTube] Player error:', err);
                  setYtError(err);
                }}
                webViewProps={{
                  androidLayerType: 'hardware',
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
              />
            </>
          )}
        </View>
      ) : (
        <>
          <VideoView
            ref={videoViewRef}
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={true}
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture={true}
            startsPictureInPictureAutomatically={true}
          />

          {/* Cụm nút điều khiển PiP & Toàn màn hình */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => {
                if (videoViewRef.current) {
                  try {
                    videoViewRef.current.startPictureInPicture();
                  } catch (err) {
                    console.warn('[HybridVideoPlayer] Start PiP error:', err);
                  }
                }
              }}
              activeOpacity={0.8}
              accessibilityLabel="Thu nhỏ màn hình PiP"
            >
              <PictureInPicture color="#FFFFFF" size={14} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleToggleFullscreen}
              activeOpacity={0.8}
              accessibilityLabel="Phóng to toàn màn hình"
            >
              <Maximize2 color="#FFFFFF" size={14} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  ytWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 20,
  },
  platformBadgeText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  resolvingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 8,
  },
  errorText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0F172A',
    width: '100%',
  },
  errorOverlayText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  openYtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
  },
  openYtBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  controlsRow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  controlBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
