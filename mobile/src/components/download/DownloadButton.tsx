import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, View } from 'react-native';
import { Download, CheckCircle2 } from 'lucide-react-native';
import { useDownloadStore } from '../../store/useDownloadStore';

interface DownloadButtonProps {
  lessonId: number;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ lessonId }) => {
  const { downloadingProgress, downloadedLessonIds, startDownload, deleteDownload } =
    useDownloadStore();

  const isDownloaded = downloadedLessonIds.has(lessonId);
  const currentProgress = downloadingProgress[lessonId];
  const isDownloading = currentProgress !== undefined;

  const handlePress = async () => {
    if (isDownloading) return;

    if (isDownloaded) {
      Alert.alert(
        'Tệp ngoại tuyến',
        'Bài học này đã được tải về máy. Bạn có muốn xóa để giải phóng bộ nhớ không?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa tệp',
            style: 'destructive',
            onPress: () => deleteDownload(lessonId),
          },
        ]
      );
      return;
    }

    try {
      await startDownload(lessonId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải bài học ngoại tuyến.';
      Alert.alert('Không thể tải bài học', message);
    }
  };

  if (isDownloading) {
    return (
      <View style={[styles.button, styles.downloadingButton]}>
        <ActivityIndicator size="small" color="#38BDF8" style={{ marginRight: 6 }} />
        <Text style={styles.downloadingText}>{currentProgress}%</Text>
      </View>
    );
  }

  if (isDownloaded) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.downloadedButton]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <CheckCircle2 color="#10B981" size={16} />
        <Text style={styles.downloadedText}>Đã tải về máy</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, styles.idleButton]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Download color="#A5B4FC" size={16} />
      <Text style={styles.idleText}>Tải học offline</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 6,
  },
  idleButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  idleText: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  downloadingButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  downloadingText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  downloadedButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  downloadedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});
