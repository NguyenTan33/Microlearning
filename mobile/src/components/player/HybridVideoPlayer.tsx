import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { HardDrive, Globe } from 'lucide-react-native';
import { downloadManager } from '../../services/downloadManager';
import { autoSyncEngine } from '../../services/autoSyncEngine';

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
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [isOfflineSource, setIsOfflineSource] = useState<boolean>(false);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(true);
  const lastRecordedTimeRef = useRef<number>(0);

  // 1. Phân giải nguồn phát: Ưu tiên file offline trong máy, fallback online HTTP 206
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

  // 2. Khởi tạo player với expo-video thế hệ mới
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

      if (cur > 0 && Math.abs(cur - lastRecordedTimeRef.current) >= 5) {
        lastRecordedTimeRef.current = cur;
        autoSyncEngine.recordLessonProgress(lessonId, cur, dur).catch(() => {});
      }
    });

    return () => {
      playToEndSub.remove();
      statusSub.remove();
    };
  }, [player, lessonId, durationSeconds, onCompleted]);

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
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls={true}
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
