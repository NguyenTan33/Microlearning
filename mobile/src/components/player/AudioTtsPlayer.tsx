import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Volume2, Play, Pause, Sparkles } from 'lucide-react-native';
import { ttsApi } from '../../services/ttsApi';

interface AudioTtsPlayerProps {
  lessonId?: number;
  lessonTitle: string;
  lessonContent?: string;
  audioTtsUrl?: string;
}

export const AudioTtsPlayer: React.FC<AudioTtsPlayerProps> = ({
  lessonTitle,
  lessonContent = '',
  audioTtsUrl,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setLoading(true);
    try {
      if (!audioTtsUrl) {
        const textToRead = lessonContent || lessonTitle;
        const res = await ttsApi.synthesizeSpeech(textToRead);
        if (!res.audioUrl) {
          Alert.alert('Giọng đọc AI', 'Bài học này hiện chưa có file âm thanh TTS.');
          setLoading(false);
          return;
        }
      }
      setIsPlaying(true);
    } catch {
      Alert.alert('Lỗi', 'Không thể phát giọng đọc TTS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.iconCircle}>
          <Volume2 color="#06B6D4" size={18} />
        </View>
        <View style={styles.textGroup}>
          <View style={styles.titleRow}>
            <Sparkles color="#F59E0B" size={13} />
            <Text style={styles.badgeText}>AI VOICE TTS</Text>
          </View>
          <Text style={styles.titleText} numberOfLines={1}>
            Nghe đọc tự động bài học
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.playBtn, isPlaying && styles.playBtnActive]}
        onPress={handleTogglePlay}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : isPlaying ? (
          <Pause color="#FFFFFF" size={16} />
        ) : (
          <Play color="#FFFFFF" size={16} fill="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090D1A',
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginVertical: 10,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  badgeText: {
    color: '#06B6D4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: '#06B6D4',
  },
});
