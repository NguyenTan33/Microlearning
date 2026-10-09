import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HelpCircle, CheckCircle2, Lock, Bookmark, Heart } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { HybridVideoPlayer } from '../../src/components/player/HybridVideoPlayer';
import { DownloadButton } from '../../src/components/download/DownloadButton';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { favoriteSubjectApi } from '../../src/services/favoriteSubjectApi';
import { mediaBookmarkService } from '../../src/services/mediaBookmarkService';
import type { Lesson } from '../../src/types/catalog.types';

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(params.id || '1', 10);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [onlineStreamUrl, setOnlineStreamUrl] = useState<string | undefined>(undefined);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [watchedPercent, setWatchedPercent] = useState<number>(0);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
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
      if (prog) {
        setWatchedPercent(prog.percent || 0);
        if (prog.isCompleted) {
          setIsCompleted(true);
        }
      }

      // 3. Tra cứu nguồn video chuẩn từ Azure Storage (Direct URL hoặc HTTP 206 Stream)
      try {
        const mediaInfo = await catalogApi.getLessonMediaInfo(lessonId);
        if (mediaInfo.sourceType === 'direct_url' && mediaInfo.externalUrl) {
          setOnlineStreamUrl(mediaInfo.externalUrl);
        } else if (mediaInfo.streamUrl) {
          setOnlineStreamUrl(mediaInfo.streamUrl);
        } else {
          const apiBase =
            process.env.EXPO_PUBLIC_API_URL ||
            'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net/api';
          setOnlineStreamUrl(`${apiBase}/media/lesson/${lessonId}/stream`);
        }
      } catch {
        const apiBase =
          process.env.EXPO_PUBLIC_API_URL ||
          'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net/api';
        setOnlineStreamUrl(`${apiBase}/media/lesson/${lessonId}/stream`);
      }

      // 4. Nếu đang online và chưa có mediaAssets, gọi package để nạp đề trắc nghiệm
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
    setWatchedPercent(100);
  };

  const handleToggleFavorite = async () => {
    if (!lesson) return;
    try {
      if (isFavorited) {
        await favoriteSubjectApi.removeFavoriteSubject(lesson.subjectId);
        setIsFavorited(false);
        Alert.alert('Thành công', 'Đã xóa khỏi danh sách yêu thích.');
      } else {
        await favoriteSubjectApi.addFavoriteSubject(lesson.subjectId);
        setIsFavorited(true);
        Alert.alert('Thành công', 'Đã thêm môn học vào danh sách yêu thích!');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể thực hiện thao tác.');
    }
  };

  const handleAddBookmark = async () => {
    if (!lesson) return;
    try {
      await mediaBookmarkService.addBookmark(lesson.id, 0, `Đánh dấu bài: ${lesson.title}`);
      Alert.alert('Đã đánh dấu', 'Đã lưu mốc thời gian bài học vào Thư viện Đánh dấu!');
    } catch {
      Alert.alert('Lỗi', 'Không thể đánh dấu bài học.');
    }
  };

  const handleQuizPress = () => {
    if (!isCompleted && watchedPercent < 60) {
      Alert.alert(
        '🔒 Bài trắc nghiệm bị khóa',
        `Bạn cần xem tối thiểu 60% thời lượng video (Hiện tại: ${Math.round(
          watchedPercent
        )}%) để mở khóa bài thi trắc nghiệm này.`
      );
      return;
    }
    router.push(`/quiz/${lessonId}` as any);
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

  const isQuizUnlocked = isCompleted || watchedPercent >= 60;

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

            {/* Nút Đánh dấu Mốc bài học */}
            <TouchableOpacity style={styles.iconActionBtn} onPress={handleAddBookmark}>
              <Bookmark color="#38BDF8" size={18} />
            </TouchableOpacity>

            {/* Nút Yêu thích môn học */}
            <TouchableOpacity style={styles.iconActionBtn} onPress={handleToggleFavorite}>
              <Heart
                color={isFavorited ? '#EF4444' : '#94A3B8'}
                fill={isFavorited ? '#EF4444' : 'transparent'}
                size={18}
              />
            </TouchableOpacity>

            {/* Nút Làm bài thi trắc nghiệm Quiz (Strict 60% Coverage Lock) */}
            <TouchableOpacity
              style={[
                styles.quizButton,
                !isQuizUnlocked && styles.quizButtonLocked,
              ]}
              onPress={handleQuizPress}
              activeOpacity={0.8}
            >
              {isQuizUnlocked ? (
                <HelpCircle color="#FFFFFF" size={16} />
              ) : (
                <Lock color="#94A3B8" size={16} />
              )}
              <Text
                style={[
                  styles.quizButtonText,
                  !isQuizUnlocked && styles.quizButtonTextLocked,
                ]}
              >
                {isQuizUnlocked ? 'Trắc nghiệm' : `Khóa (${Math.round(watchedPercent)}%)`}
              </Text>
            </TouchableOpacity>
          </View>

          {!isQuizUnlocked && (
            <View style={styles.lockWarningBanner}>
              <Lock color="#F59E0B" size={14} />
              <Text style={styles.lockWarningText}>
                Xem tối thiểu 60% video để mở khóa bài trắc nghiệm.
              </Text>
            </View>
          )}

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
    gap: 8,
    marginBottom: 12,
  },
  iconActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    height: 40,
    borderRadius: 12,
    gap: 6,
  },
  quizButtonLocked: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
  },
  quizButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quizButtonTextLocked: {
    color: '#94A3B8',
  },
  lockWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  lockWarningText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
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
