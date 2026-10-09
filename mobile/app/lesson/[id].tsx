import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  FileQuestion,
  Headphones,
  Flame,
  Bookmark,
  Sparkles,
} from 'lucide-react-native';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { downloadManager } from '../../src/services/downloadManager';
import { downloadRepository } from '../../src/db/repositories/downloadRepository';
import { outboxRepository } from '../../src/db/repositories/outboxRepository';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { generateGuid } from '../../src/utils/guidHelper';
import { formatDuration } from '../../src/utils/formatters';
import type { Lesson } from '../../src/types/catalog.types';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lessonId = Number(id);

  const { downloadedLessonIds, refreshDownloads } = useDownloadStore();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const isOfflineReady = downloadedLessonIds.has(lessonId);

  const loadLesson = useCallback(async () => {
    try {
      // 1. SQLite First
      let item = await catalogRepository.getLessonById(lessonId);
      if (item) {
        setLesson(item);
      }

      // 2. API fetch if online
      try {
        item = await catalogApi.getLessonById(lessonId);
        setLesson(item);
      } catch {
        // Fallback SQLite
      }

      // Check completion status
      const completedList = await progressRepository.getCompletedLessonIds();
      setIsCompleted(completedList.includes(lessonId));
    } catch (err) {
      console.warn('[Lesson] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  const handleCompleteLesson = async () => {
    try {
      setIsCompleted(true);

      // Save to SQLite
      await progressRepository.saveProgress(lessonId, lesson?.durationSeconds || 180, 100.0, true);

      // Add to Outbox Queue for auto sync
      await outboxRepository.addOutboxItem({
        clientOperationId: generateGuid(),
        operationType: 'LESSON_PROGRESS',
        entityType: 'Lesson',
        entityId: lessonId,
        payloadJson: JSON.stringify({
          lessonId,
          watchedSeconds: lesson?.durationSeconds || 180,
          percent: 100.0,
        }),
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Chúc mừng! 🔥', 'Bạn đã hoàn thành bài học và tăng 1 ngày Streak!');
    } catch (err) {
      console.warn('[Lesson] Complete error:', err);
    }
  };

  const handleDownload = async () => {
    if (!lesson || !lesson.videoUrl) {
      Alert.alert('Thông báo', 'Bài học này chưa hỗ trợ video ngoại tuyến.');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    const localUri = await downloadManager.downloadLessonVideo(
      lessonId,
      lesson.videoUrl,
      lesson.title,
      (pct) => setDownloadProgress(pct)
    );

    setDownloading(false);
    if (localUri) {
      await refreshDownloads();
      Alert.alert('Thành công! 💾', 'Đã tải bài học về bộ nhớ offline.');
    } else {
      Alert.alert('Lỗi', 'Không thể tải bài học. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return <LoadingIndicator message="Đang nạp video bài giảng..." />;
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Bài học không tồn tại</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <ArrowLeft color="#F8FAFC" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {lesson.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Mock Video Container */}
        <View style={styles.videoPlayerBox}>
          <View style={styles.videoPlaceholderContent}>
            <Sparkles color="#818CF8" size={36} />
            <Text style={styles.videoPlaceholderTitle}>{lesson.title}</Text>
            <Text style={styles.videoPlaceholderTime}>Thời lượng: {formatDuration(lesson.durationSeconds)}</Text>
          </View>
        </View>

        {/* Lesson Metadata & Action Buttons */}
        <View style={styles.lessonMetaSection}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonDesc}>{lesson.description || 'Xem video ngắn và làm bài trắc nghiệm.'}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
              onPress={handleCompleteLesson}
              activeOpacity={0.8}
            >
              <CheckCircle2 color={isCompleted ? '#10B981' : '#FFFFFF'} size={18} />
              <Text style={[styles.completeBtnText, isCompleted && styles.completeBtnTextDone]}>
                {isCompleted ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành (+1 🔥)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.downloadActionBtn, isOfflineReady && styles.downloadActionBtnDone]}
              onPress={handleDownload}
              disabled={downloading}
            >
              <Download color={isOfflineReady ? '#10B981' : '#818CF8'} size={18} />
              <Text style={[styles.downloadActionText, isOfflineReady && styles.downloadActionTextDone]}>
                {downloading
                  ? `${downloadProgress}%`
                  : isOfflineReady
                  ? 'Đã tải'
                  : 'Tải offline'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio TTS Section */}
        {lesson.audioTtsUrl ? (
          <View style={styles.ttsCard}>
            <Headphones color="#8B5CF6" size={20} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ttsTitle}>Nghe bài giảng giọng đọc AI (Audio TTS)</Text>
              <Text style={styles.ttsSubText}>Học tập thụ động khi di chuyển hoặc đọc tài liệu</Text>
            </View>
          </View>
        ) : null}

        {/* Quiz CTA Card */}
        {lesson.hasQuiz ? (
          <View style={styles.quizCtaCard}>
            <View style={styles.quizIconBox}>
              <FileQuestion color="#F59E0B" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quizCtaTitle}>Bài thi trắc nghiệm củng cố</Text>
              <Text style={styles.quizCtaSub}>Kiểm tra ngay kiến thức vừa học</Text>
            </View>

            <TouchableOpacity
              style={styles.startQuizBtn}
              onPress={() => router.push(`/quiz/${lessonId}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.startQuizText}>Làm bài thi</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E293B', gap: 12 },
  headerBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 36 },
  videoPlayerBox: { width: '100%', height: 210, backgroundColor: '#0F172A', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)', overflow: 'hidden', marginBottom: 20 },
  videoPlaceholderContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  videoPlaceholderTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  videoPlaceholderTime: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  lessonMetaSection: { backgroundColor: '#0F172A', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#1E293B', marginBottom: 16 },
  lessonTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  lessonDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 12, gap: 6 },
  completeBtnDone: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  completeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  completeBtnTextDone: { color: '#10B981' },
  downloadActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, gap: 6, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  downloadActionBtnDone: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  downloadActionText: { color: '#818CF8', fontSize: 13, fontWeight: '700' },
  downloadActionTextDone: { color: '#10B981' },
  ttsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1E293B', gap: 12, marginBottom: 16 },
  ttsTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  ttsSubText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  quizCtaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', gap: 12 },
  quizIconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.15)', alignItems: 'center', justifyContent: 'center' },
  quizCtaTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  quizCtaSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  startQuizBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  startQuizText: { color: '#070B17', fontSize: 12, fontWeight: '800' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorTitle: { color: '#F43F5E', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  backBtn: { backgroundColor: '#6366F1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
