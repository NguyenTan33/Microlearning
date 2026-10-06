import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HelpCircle, CheckCircle2 } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { HybridVideoPlayer } from '../../src/components/player/HybridVideoPlayer';
import { DownloadButton } from '../../src/components/download/DownloadButton';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { catalogApi } from '../../src/services/catalogApi';
import type { Lesson } from '../../src/types/catalog.types';

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(params.id || '1', 10);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const loadLessonData = useCallback(async () => {
    try {
      // 1. Đọc từ SQLite trước
      const local = await catalogRepository.getLessonById(lessonId);
      if (local) {
        setLesson(local);
      }

      // 2. Kéo tiến độ bài học từ SQLite
      const prog = await progressRepository.getProgress(lessonId);
      if (prog && prog.isCompleted) {
        setIsCompleted(true);
      }

      // 3. Nếu đang online và chưa có mediaAssets, có thể gọi package để cache
      try {
        const pkg = await catalogApi.getLessonPackage(lessonId);
        if (pkg) {
          setLesson({
            id: pkg.lessonId,
            subjectId: pkg.subjectId,
            title: pkg.title,
            description: pkg.description,
            durationSeconds: pkg.durationSeconds,
            sortOrder: pkg.sortOrder,
            version: pkg.version,
            isPublished: true,
            hasQuiz: Boolean(pkg.quiz),
            mediaAssetCount: pkg.mediaAssets?.length || 0,
            mediaAssets: pkg.mediaAssets,
          });
        }
      } catch {
        // Fallback giữ nguyên local
      }
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadLessonData();
  }, [loadLessonData]);

  const handleLessonCompleted = () => {
    setIsCompleted(true);
  };

  if (loading) {
    return <LoadingIndicator message="Đang chuẩn bị bài giảng..." />;
  }

  if (!lesson) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader showBack title="Bài học" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy bài học này.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onlineStreamUrl = `${
    process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5124/api'
  }/media/1/stream`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showBack title={`Bài ${lesson.sortOrder}: ${lesson.title}`} />
      <OfflineBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Trình phát Video Hybrid (Tự động resolve Offline / Online Range Stream) */}
        <HybridVideoPlayer
          lessonId={lesson.id}
          onlineStreamUrl={onlineStreamUrl}
          durationSeconds={lesson.durationSeconds}
          onCompleted={handleLessonCompleted}
        />

        {/* Thông tin bài học & Thanh công cụ */}
        <View style={styles.lessonMetaCard}>
          <View style={styles.titleRow}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <CheckCircle2 color="#10B981" size={14} />
                <Text style={styles.completedText}>Đã hoàn thành</Text>
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            {/* Nút Tải ngoại tuyến */}
            <DownloadButton lessonId={lesson.id} />

            {/* Nút Làm bài thi trắc nghiệm Quiz */}
            <TouchableOpacity
              style={styles.quizButton}
              onPress={() => router.push(`/quiz/${lesson.id}`)}
              activeOpacity={0.8}
            >
              <HelpCircle color="#FFFFFF" size={16} />
              <Text style={styles.quizButtonText}>Làm bài trắc nghiệm</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.descTitle}>Giới thiệu bài học</Text>
          <Text style={styles.descContent}>
            {lesson.description ||
              'Bài giảng tập trung giải thích các khái niệm cốt lõi theo phương pháp microlearning ngắn gọn, súc tích. Sau khi xem xong video, hãy hoàn thành bài trắc nghiệm để củng cố kiến thức.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B17',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  lessonMetaCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 16,
  },
  titleRow: {
    marginBottom: 14,
  },
  lessonTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  completedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  quizButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  quizButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginBottom: 14,
  },
  descTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  descContent: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
