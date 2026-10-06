import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Play, Pause, RotateCcw, RotateCw, HardDrive, Globe } from 'lucide-react-native';
import { downloadManager } from '../../services/downloadManager';
import { autoSyncEngine } from '../../services/autoSyncEngine';
import { formatDuration } from '../../utils/formatters';

interface HybridVideoPlayerProps {
  lessonId: number;
  onlineStreamUrl?: string;
  durationSeconds?: number;
  onCompleted?: () => void;
}

export const HybridVideoPlayer: React.FC<HybridVideoPlayerProps> = ({
  lessonId,
  onlineStreamUrl,
  durationSeconds = 120,
  onCompleted,
}) => {
  const videoRef = useRef<Video>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [isOfflineSource, setIsOfflineSource] = useState<boolean>(false);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(true);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionSeconds, setPositionSeconds] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState<number>(durationSeconds);
  const lastRecordedTimeRef = useRef<number>(0);

  // 1. Phân giải nguồn phát: Ưu tiên file offline, fallback online HTTP 206
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSource(true);

    downloadManager
      .resolvePlayableVideoUri(lessonId, onlineStreamUrl)
      .then((resolved) => {
        if (isMounted) {
          setSourceUri(resolved.uri);
          setIsOfflineSource(resolved.isOffline);
          setIsLoadingSource(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSourceUri(onlineStreamUrl || null);
          setIsOfflineSource(false);
          setIsLoadingSource(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId, onlineStreamUrl]);

  // 2. Theo dõi trạng thái phát video & tự lưu tiến độ học tập
  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;

      setIsPlaying(status.isPlaying);
      const posSecs = Math.floor(status.positionMillis / 1000);
      const durSecs = status.durationMillis
        ? Math.floor(status.durationMillis / 1000)
        : totalSeconds;

      setPositionSeconds(posSecs);
      if (durSecs > 0) setTotalSeconds(durSecs);

      // Cứ sau mỗi 5 giây ghi nhận tiến độ 1 lần qua AutoSyncEngine
      if (posSecs > 0 && Math.abs(posSecs - lastRecordedTimeRef.current) >= 5) {
        lastRecordedTimeRef.current = posSecs;
        autoSyncEngine.recordLessonProgress(lessonId, posSecs, durSecs).catch(() => {});
      }

      // Khi kết thúc video
      if (status.didJustFinish) {
        autoSyncEngine.recordLessonProgress(lessonId, durSecs, durSecs).catch(() => {});
        if (onCompleted) onCompleted();
      }
    },
    [lessonId, totalSeconds, onCompleted]
  );

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const seekRelative = async (offsetSeconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(totalSeconds, positionSeconds + offsetSeconds));
    await videoRef.current.setPositionAsync(target * 1000);
  };

  const progressPercent = totalSeconds > 0 ? (positionSeconds / totalSeconds) * 100 : 0;

  if (isLoadingSource) {
    return (
      <View style={styles.videoContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.resolvingText}>Đang chuẩn bị luồng video...</Text>
      </View>
    );
  }

  if (!sourceUri) {
    return (
      <View style={styles.videoContainer}>
        <Text style={styles.errorText}>Không tìm thấy tệp video bài học.</Text>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: sourceUri }}
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
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
            <Text style={styles.onlineSourceText}>Phát trực tuyến (HTTP 206)</Text>
          </>
        )}
      </View>

      {/* Thanh tiến trình mini */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Bảng điều khiển tùy biến mượt mà */}
      <View style={styles.controlsBar}>
        <View style={styles.leftButtons}>
          <TouchableOpacity onPress={() => seekRelative(-10)} style={styles.seekButton}>
            <RotateCcw color="#E2E8F0" size={18} />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
            {isPlaying ? (
              <Pause color="#FFFFFF" size={20} />
            ) : (
              <Play color="#FFFFFF" size={20} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seekRelative(10)} style={styles.seekButton}>
            <RotateCw color="#E2E8F0" size={18} />
          </TouchableOpacity>
        </View>

        <Text style={styles.timeText}>
          {formatDuration(positionSeconds)} / {formatDuration(totalSeconds)}
        </Text>
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
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
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
  progressBarBackground: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: 'rgba(7, 11, 23, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
});
