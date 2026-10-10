import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Maximize2, AlertCircle, PictureInPicture } from 'lucide-react-native';
import { downloadManager } from '../../services/downloadManager';
import { autoSyncEngine } from '../../services/autoSyncEngine';
import { catalogApi } from '../../services/catalogApi';

interface HybridVideoPlayerProps {
  lessonId: number;
  onlineStreamUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  seekTimestamp?: number;
  onCompleted?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
}

export const HybridVideoPlayer: React.FC<HybridVideoPlayerProps> = ({
  lessonId,
  onlineStreamUrl,
  videoUrl,
  durationSeconds = 120,
  seekTimestamp,
  onCompleted,
  onProgress,
}) => {
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastRecordedTimeRef = useRef<number>(0);
  const videoViewRef = useRef<VideoView | null>(null);

  // 1. Phân giải nguồn phát: Ưu tiên file offline, tiếp theo là Media Info thật từ Azure API
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSource(true);
    setLoadError(null);

    const resolveStream = async () => {
      try {
        // Ưu tiên 1: Kiểm tra ngay file tải ngoại tuyến trong máy (0ms, không phụ thuộc mạng)
        const offlineCheck = await downloadManager.resolvePlayableVideoUri(lessonId);
        if (offlineCheck.isOffline && offlineCheck.uri) {
          if (isMounted) {
            setSourceUri(offlineCheck.uri);
            setIsLoadingSource(false);
          }
          return;
        }

        // Ưu tiên 2: Nếu chưa tải offline, phân giải luồng online từ props hoặc API
        let streamTargetUrl = onlineStreamUrl || videoUrl;

        // Nếu chưa có streamUrl, truy vấn trực tiếp /api/media/lesson/{id}/info từ Azure API
        if (!streamTargetUrl) {
          try {
            const mediaInfo = await catalogApi.getLessonMediaInfo(lessonId);
            if (mediaInfo) {
              streamTargetUrl = mediaInfo.streamUrl || mediaInfo.externalUrl || undefined;
            }
          } catch {
            // Không lấy được online media info
          }
        }

        // Tự động phân giải endpoint stream Azure chuẩn nếu chưa có URL
        if (!streamTargetUrl) {
          streamTargetUrl = `https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net/api/media/lesson/${lessonId}/stream`;
        }

        const resolved = await downloadManager.resolvePlayableVideoUri(lessonId, streamTargetUrl);
        if (isMounted) {
          if (resolved.uri) {
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
  }, [lessonId, onlineStreamUrl, videoUrl]);

  // 2. Khởi tạo player với expo-video (tránh truyền chuỗi rỗng để không bị lỗi AVFoundation file:///)
  const player = useVideoPlayer(sourceUri || null, (p: { loop: boolean; timeUpdateEventInterval?: number }) => {
    p.loop = false;
    p.timeUpdateEventInterval = 1;
  });

  // 3. Xử lý tua video tới mốc đánh dấu (Seek to bookmark timestamp chính xác)
  useEffect(() => {
    if (!player || typeof seekTimestamp !== 'number' || seekTimestamp < 0) return;

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

    const statusSub = (player as any).addListener('statusChange', (payload: { status: string }) => {
      if (payload?.status === 'readyToPlay') {
        performSeek();
      }
    });

    return () => {
      if (statusSub && typeof statusSub.remove === 'function') {
        statusSub.remove();
      }
    };
  }, [player, seekTimestamp]);

  // 4. Theo dõi tiến trình phát và ghi nhận tiến độ học tập liên tục
  useEffect(() => {
    if (!player) return;

    const playToEndSub = player.addListener('playToEnd', () => {
      const totalDur = player.duration > 0 ? Math.round(player.duration) : durationSeconds;
      autoSyncEngine.recordLessonProgress(lessonId, totalDur, totalDur).catch(() => {});
      if (onCompleted) onCompleted();
    });

    // Lắng nghe cập nhật thời gian phát liên tục mỗi giây
    const timeUpdateSub = (player as any).addListener('timeUpdate', (payload: { currentTime: number }) => {
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
  }, [player, lessonId, durationSeconds, onCompleted, onProgress]);

  const handleToggleFullscreen = () => {
    if (videoViewRef.current) {
      videoViewRef.current.enterFullscreen();
    }
  };

  if (isLoadingSource) {
    return (
      <View style={styles.videoContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.resolvingText}>Đang kết nối luồng phát video Azure...</Text>
      </View>
    );
  }

  if (loadError || !sourceUri) {
    return (
      <View style={styles.videoContainer}>
        <AlertCircle color="#F59E0B" size={28} />
        <Text style={styles.errorText}>{loadError || 'Chưa gắn tệp video cho bài học này.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
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
