import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, Layers, Clock, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { formatDuration } from '../../src/utils/formatters';
import type { CourseDetail } from '../../src/types/catalog.types';

export default function CourseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const courseId = parseInt(params.id || '1', 10);

  const { downloadedLessonIds } = useDownloadStore();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourseData = useCallback(async () => {
    try {
      // 1. Đọc cache SQLite trước
      const cached = await catalogRepository.getCourseDetailById(courseId);
      if (cached) {
        setCourse(cached);
      }

      // 2. Kéo API nếu có mạng
      try {
        const remote = await catalogApi.getCourseById(courseId);
        await catalogRepository.saveCourseDetail(remote);
        setCourse(remote);
      } catch {
        // Giữ local khi mất mạng
      }

      const completed = await progressRepository.getCompletedLessonIds();
      setCompletedIds(new Set(completed));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourseData();
  };

  if (loading) {
    return <LoadingIndicator message="Đang nạp chi tiết khóa học..." />;
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader showBack title="Chi tiết khóa học" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy thông tin khóa học.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showBack title={course.title} subtitle={`${course.totalSubjects} Môn học`} />
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Banner Khóa học */}
        <View style={styles.courseHeaderCard}>
          <View style={styles.courseIconBox}>
            <BookOpen color="#38BDF8" size={32} />
          </View>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseDesc}>
            {course.description || 'Chương trình đào tạo dạng bài giảng video ngắn và bài tập trắc nghiệm.'}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Layers color="#818CF8" size={13} />
              <Text style={styles.metaBadgeText}>{course.subjects.length} Môn học</Text>
            </View>
            <Text style={styles.metaVersionText}>Phiên bản {course.version}.0</Text>
          </View>
        </View>

        {/* Danh sách Môn học & Bài học */}
        <View style={styles.curriculumContainer}>
          <Text style={styles.curriculumTitle}>Nội dung chương trình đào tạo</Text>

          {course.subjects.map((subject, sIdx) => (
            <View key={subject.id} style={styles.subjectBox}>
              <View style={styles.subjectHeader}>
                <Text style={styles.subjectIndex}>Phần {sIdx + 1}</Text>
                <Text style={styles.subjectTitle}>{subject.title}</Text>
              </View>

              <View style={styles.lessonsList}>
                {subject.lessons?.map((les) => {
                  const isDone = completedIds.has(les.id);
                  const isOffline = downloadedLessonIds.has(les.id);

                  return (
                    <TouchableOpacity
                      key={les.id}
                      style={[styles.lessonItem, isDone && styles.lessonItemDone]}
                      onPress={() => router.push(`/lesson/${les.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.lessonItemLeft}>
                        {isDone ? (
                          <CheckCircle2 color="#10B981" size={20} />
                        ) : (
                          <View style={styles.lessonOrderCircle}>
                            <Text style={styles.lessonOrderText}>{les.sortOrder}</Text>
                          </View>
                        )}
                        <View style={styles.lessonItemDetails}>
                          <Text
                            style={[styles.lessonTitle, isDone && styles.lessonTitleDone]}
                            numberOfLines={1}
                          >
                            {les.title}
                          </Text>
                          <View style={styles.lessonBadgesRow}>
                            <View style={styles.durationBadge}>
                              <Clock color="#64748B" size={11} />
                              <Text style={styles.durationText}>
                                {formatDuration(les.durationSeconds)}
                              </Text>
                            </View>
                            {isOffline && (
                              <View style={styles.offlinePill}>
                                <Text style={styles.offlinePillText}>Offline</Text>
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
  courseHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  courseIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  courseTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 8,
  },
  courseDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  metaBadgeText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
  metaVersionText: {
    color: '#64748B',
    fontSize: 12,
  },
  curriculumContainer: {
    marginTop: 4,
  },
  curriculumTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },
  subjectBox: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  subjectHeader: {
    marginBottom: 12,
  },
  subjectIndex: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  subjectTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  lessonsList: {
    gap: 8,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070B17',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  lessonItemDone: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  lessonItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  lessonOrderCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonOrderText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  lessonItemDetails: {
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
  lessonBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#64748B',
    fontSize: 11,
  },
  offlinePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offlinePillText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '600',
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
