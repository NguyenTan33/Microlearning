import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2, Loader2 } from 'lucide-react-native';
import { ttsApi } from '../../services/ttsApi';

interface PodcastAudioPlayerProps {
  audioUrl?: string;
  transcript?: string;
  title: string;
  onEnded?: () => void;
}

export const PodcastAudioPlayer: React.FC<PodcastAudioPlayerProps> = ({
  audioUrl,
  transcript,
  title,
  onEnded,
}) => {
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | undefined>(audioUrl);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    setActiveAudioUrl(audioUrl);
  }, [audioUrl]);

  // Tạo native player thông qua expo-video (chế độ Audio background)
  const player = useVideoPlayer(activeAudioUrl ? { uri: activeAudioUrl } : null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.5;
  });

  const handleSynthesizeAudio = async () => {
    if (!transcript || isSynthesizing) return;
    try {
      setIsSynthesizing(true);
      const clean = transcript
        .replace(/^===.*?===$/gm, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .trim();
      const text = clean.length > 1500 ? clean.substring(0, 1500) : clean;
      const res = await ttsApi.synthesizeSpeech(text, 'vi-VN-HoaiMyNeural');
      if (res?.audioUrl) {
        setActiveAudioUrl(res.audioUrl);
      }
    } catch (err) {
      console.warn('[PodcastAudioPlayer] Synthesize error:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  useEffect(() => {
    if (!player) return;

    const anyPlayer = player as unknown as {
      addListener: (
        event: string,
        callback: (payload: any) => void
      ) => { remove: () => void };
      duration?: number;
      currentTime?: number;
      pause: () => void;
      play: () => void;
    };

    const statusSub = anyPlayer.addListener('statusChange', (payload: any) => {
      const currentStatus = payload?.status || payload;
      if (currentStatus === 'readyToPlay') {
        setIsReady(true);
        setDuration(anyPlayer.duration || 0);
      } else if (currentStatus === 'idle') {
        setIsPlaying(false);
      }
    });

    const playSub = anyPlayer.addListener('playingChange', (payload: any) => {
      const isCurrentlyPlaying = typeof payload === 'boolean' ? payload : Boolean(payload?.isPlaying);
      setIsPlaying(isCurrentlyPlaying);
    });

    const timeSub = anyPlayer.addListener('timeUpdate', (event: any) => {
      if (typeof event?.currentTime === 'number') {
        setCurrentTime(event.currentTime);
      }
      if (anyPlayer.duration) {
        setDuration(anyPlayer.duration);
      }
    });

    const endSub = anyPlayer.addListener('playToEnd', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) onEnded();
    });

    return () => {
      try {
        statusSub.remove();
        playSub.remove();
        timeSub.remove();
        endSub.remove();
        player.pause();
      } catch {}
    };
  }, [player, onEnded]);

  const togglePlay = () => {
    if (!player || !activeAudioUrl) return;
    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('[PodcastAudioPlayer] Toggle error:', err);
    }
  };

  const handleReplay = () => {
    if (!player) return;
    try {
      player.currentTime = 0;
      setCurrentTime(0);
      player.play();
    } catch {}
  };

  const formatSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  if (!activeAudioUrl) {
    return (
      <View style={styles.noAudioContainer}>
        <View style={styles.noAudioInfo}>
          <Sparkles color="#A855F7" size={14} />
          <Text style={styles.noAudioText}>
            Tập Podcast đang ở dạng kịch bản văn bản.
          </Text>
        </View>

        {transcript ? (
          <TouchableOpacity
            style={styles.synthesizeBtn}
            onPress={handleSynthesizeAudio}
            disabled={isSynthesizing}
            activeOpacity={0.8}
          >
            {isSynthesizing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Volume2 color="#FFFFFF" size={13} />
                <Text style={styles.synthesizeBtnText}>Tạo giọng đọc AI</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ẩn VideoView ngầm để engine expo-video phát âm thanh ổn định trên cả Android/iOS */}
      <VideoView
        player={player}
        style={styles.hiddenVideo}
        contentFit="contain"
        nativeControls={false}
      />

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.leftGroup}>
          <TouchableOpacity
            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
            onPress={togglePlay}
            activeOpacity={0.8}
          >
            {isPlaying ? (
              <Pause color="#FFFFFF" size={16} />
            ) : (
              <Play color="#FFFFFF" size={16} style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.replayBtn}
            onPress={handleReplay}
            activeOpacity={0.7}
          >
            <RotateCcw color="#94A3B8" size={14} />
          </TouchableOpacity>

          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>
              {formatSec(currentTime)} / {duration > 0 ? formatSec(duration) : '--:--'}
            </Text>
          </View>
        </View>

        <View style={styles.badgeGroup}>
          <CheckCircle2 color="#10B981" size={12} />
          <Text style={styles.badgeText}>Giọng đọc AI sẵn sàng</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  hiddenVideo: {
    width: 1,
    height: 1,
    opacity: 0.01,
    position: 'absolute',
    top: -100,
    left: -100,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#818CF8',
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  playBtnActive: {
    backgroundColor: '#EC4899',
    shadowColor: '#EC4899',
  },
  replayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInfo: {
    marginLeft: 4,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  badgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '600',
  },
  noAudioContainer: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noAudioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  noAudioText: {
    color: '#D8B4FE',
    fontSize: 11,
    flex: 1,
  },
  synthesizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#9333EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  synthesizeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
