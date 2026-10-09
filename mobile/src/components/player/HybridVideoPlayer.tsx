import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { HardDrive, Globe, Maximize2, AlertCircle } from 'lucide-react-native';
import { downloadManager } from '../../services/downloadManager';
import { autoSyncEngine } from '../../services/autoSyncEngine';
import { catalogApi } from '../../services/catalogApi';

interface HybridVideoPlayerProps {
  lessonId: number;
  onlineStreamUrl?: string;
  videoUrl?: string;
  durationSeconds?: number;
  onCompleted?: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
}

export const HybridVideoPlayer: React.FC<HybridVideoPlayerProps> = ({
  lessonId,
  onlineStreamUrl,
  videoUrl,
  durationSeconds = 120,
  onCompleted,
  onProgress,
}) => {
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [isOfflineSource, setIsOfflineSource] = useState<boolean>(false);
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
            setIsOfflineSource(resolved.isOffline);
          } else {
            setLoadError('Bài học này chưa có video hoặc đang được xử lý.');
          }
          setIsLoadingSource(false);
        }
      } catch (err) {
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

  // 2. Khởi tạo player với expo-video
  const player = useVideoPlayer(sourceUri || '', (p) => {
    p.loop = false;
  });

  // 3. Theo dõi tiến trình phát và ghi nhận tiến độ học tập
  useEffect(() => {
    if (!player) return;

    const playToEndSub = player.addListener('playToEnd', () => {
      const totalDur = player.duration > 0 ? Math.round(player.duration) : durationSeconds;
      autoSyncEngine.recordLessonProgress(lessonId, totalDur, totalDur).catch(() => {});
      if (onCompleted) onCompleted();
    });

    const statusSub = player.addListener('statusChange', () => {
      const cur = Math.round(player.currentTime);
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
      statusSub.remove();
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
      />

      {/* Badge chỉ định nguồn phát */}
      <View style={styles.sourceBadge}>
        {isOfflineSource ? (
          <>
            <HardDrive color="#10B981" size={13} />
            <Text style={styles.offlineSourceText}>Phát từ máy (Offline)</Text>
          </>
        ) : (
          <>
            <Globe color="#38BDF8" size={13} />
            <Text style={styles.onlineSourceText}>Phát Azure Cloud</Text>
          </>
        )}
      </View>

      {/* Nút phóng to toàn màn hình */}
      <TouchableOpacity
        style={styles.fullscreenBtn}
        onPress={handleToggleFullscreen}
        activeOpacity={0.8}
      >
        <Maximize2 color="#FFFFFF" size={14} />
      </TouchableOpacity>
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
  sourceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    zIndex: 10,
  },
  fullscreenBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 10,
  },
  offlineSourceText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  onlineSourceText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
});
