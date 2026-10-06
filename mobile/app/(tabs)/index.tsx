import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PlayCircle, CheckCircle2, Clock, Download, ChevronRight } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { autoSyncEngine } from '../../src/services/autoSyncEngine';
import { formatDuration } from '../../src/utils/formatters';
import type { CourseDetail, Lesson } from '../../src/types/catalog.types';

export default function StudyHomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { downloadedLessonIds } = useDownloadStore();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Điều hướng sang Auth nếu chưa đăng nhập
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    try {
      // 1. Đọc từ SQLite trước (Cache-First)
      const cachedCourses = await catalogRepository.getAllCourses();
      let activeCourseId = cachedCourses.length > 0 ? cachedCourses[0].id : 1;

      let detail = await catalogRepository.getCourseDetailById(activeCourseId);
      if (detail) {
        setCourse(detail);
      }

      // 2. Nếu có mạng -> Gọi API cập nhật và lưu đè SQLite
      try {
        const apiCourses = await catalogApi.getAllCourses();
        if (apiCourses.length > 0) {
          await catalogRepository.saveCourses(apiCourses);
          activeCourseId = apiCourses[0].id;
          detail = await catalogApi.getCourseById(activeCourseId);
          await catalogRepository.saveCourseDetail(detail);
          setCourse(detail);
        }
      } catch {
        // Nếu mất mạng thì giữ nguyên dữ liệu từ SQLite
      }

      // 3. Đọc danh sách bài đã hoàn thành từ SQLite
      const completed = await progressRepository.getCompletedLessonIds();
      setCompletedIds(new Set(completed));
    } catch (err) {
      console.warn('[StudyHome] Lỗi nạp dữ liệu:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    autoSyncEngine.triggerSyncWithDebounce(0);
    await loadData();
  };

  if (authLoading || loading) {
    return <LoadingIndicator message="Đang nạp bài học của bạn..." />;
  }

  // Tìm bài học tiếp theo cần học (bài chưa hoàn thành đầu tiên)
  let nextLesson: Lesson | null = null;
  if (course && course.subjects) {
    for (const sub of course.subjects) {
      if (sub.lessons) {
        for (const les of sub.lessons) {
          if (!completedIds.has(les.id)) {
            nextLesson = les;
            break;
          }
        }
      }
      if (nextLesson) break;
    }
    // Nếu đã hoàn thành hết, lấy bài đầu tiên
    if (!nextLesson && course.subjects[0]?.lessons?.[0]) {
      nextLesson = course.subjects[0].lessons[0];
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Học tập" subtitle={course ? course.title : 'Microlearning'} />
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Banner Bài học tiếp theo */}
        {nextLesson && (
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>BÀI HỌC TIẾP THEO</Text>
            </View>

            <Text style={styles.heroTitle}>{nextLesson.title}</Text>
            <Text style={styles.heroDesc} numberOfLines={2}>
              {nextLesson.description || 'Xem video bài giảng ngắn và làm bài trắc nghiệm củng cố.'}
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.metaItem}>
                <Clock color="#94A3B8" size={14} />
                <Text style={styles.metaText}>{formatDuration(nextLesson.durationSeconds)}</Text>
              </View>

              {downloadedLessonIds.has(nextLesson.id) && (
                <View style={styles.offlineReadyPill}>
                  <Download color="#10B981" size={12} />
                  <Text style={styles.offlineReadyText}>Sẵn sàng offline</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.push(`/lesson/${nextLesson!.id}`)}
              activeOpacity={0.8}
            >
              <PlayCircle color="#FFFFFF" size={18} />
              <Text style={styles.continueButtonText}>Tiếp tục học ngay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Danh sách Môn học & Bài học trong Khóa học */}
        <View style={styles.curriculumSection}>
          <Text style={styles.sectionTitle}>Lộ trình bài giảng</Text>

          {course?.subjects?.map((subject) => (
            <View key={subject.id} style={styles.subjectCard}>
              <Text style={styles.subjectTitle}>{subject.title}</Text>

              <View style={styles.lessonsList}>
                {subject.lessons?.map((les) => {
                  const isDone = completedIds.has(les.id);
                  const isOffline = downloadedLessonIds.has(les.id);

                  return (
                    <TouchableOpacity
                      key={les.id}
                      style={[styles.lessonRow, isDone && styles.lessonRowDone]}
                      onPress={() => router.push(`/lesson/${les.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.lessonLeft}>
                        {isDone ? (
                          <CheckCircle2 color="#10B981" size={20} />
                        ) : (
                          <View style={styles.lessonIndexCircle}>
                            <Text style={styles.lessonIndexText}>{les.sortOrder}</Text>
                          </View>
                        )}
                        <View style={styles.lessonTextContainer}>
                          <Text
                            style={[styles.lessonTitle, isDone && styles.lessonTitleDone]}
                            numberOfLines={1}
                          >
                            {les.title}
                          </Text>
                          <View style={styles.lessonSubInfo}>
                            <Text style={styles.lessonDuration}>
                              {formatDuration(les.durationSeconds)}
                            </Text>
                            {isOffline && (
                              <View style={styles.offlineMiniBadge}>
                                <Text style={styles.offlineMiniText}>Offline</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <ChevronRight color="#475569" size={18} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
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
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 24,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 6,
  },
  heroDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  offlineReadyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  offlineReadyText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  curriculumSection: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  subjectCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  subjectTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  lessonsList: {
    gap: 8,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070B17',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  lessonRowDone: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  lessonIndexCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonIndexText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  lessonTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  lessonTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  lessonTitleDone: {
    color: '#94A3B8',
  },
  lessonSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lessonDuration: {
    color: '#64748B',
    fontSize: 11,
  },
  offlineMiniBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offlineMiniText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '600',
  },
});
