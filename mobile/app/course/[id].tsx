import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  Users,
  Lock,
  Globe,
  Layers,
} from 'lucide-react-native';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { formatDuration } from '../../src/utils/formatters';
import type { CourseDetail } from '../../src/types/catalog.types';
import { useAuthStore } from '../../src/store/useAuthStore';
import { CourseStudentProgressModal } from '../../src/components/management/CourseStudentProgressModal';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const courseId = Number(id);
  const { isTeacher, isAdmin } = useAuthStore();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStudentProgressModal, setShowStudentProgressModal] = useState(false);

  const loadCourse = useCallback(async () => {
    try {
      // 1. Đọc từ SQLite trước
      let detail = await catalogRepository.getCourseDetailById(courseId);
      if (detail) {
        setCourse(detail);
      }

      // 2. Fetch live từ Azure API
      try {
        detail = await catalogApi.getCourseById(courseId, true);
        await catalogRepository.saveCourseDetail(detail);
        setCourse(detail);
      } catch {
        // Fallback SQLite
      }

      const completed = await progressRepository.getCompletedLessonIds();
      setCompletedIds(new Set(completed));
    } catch (err) {
      console.warn('[CourseDetail] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  if (loading) {
    return <LoadingIndicator message="Đang nạp thông tin khóa học..." />;
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Khóa học không tồn tại</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalLessons = course.subjects?.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) || 0;
  const completedCount = course.subjects?.reduce(
    (acc, s) => acc + (s.lessons?.filter((l) => completedIds.has(l.id)).length || 0),
    0
  ) || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <ArrowLeft color="#F8FAFC" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadCourse} tintColor="#6366F1" />}
      >
        {/* Banner Thumbnail Khóa Học Thật */}
        <View style={styles.heroThumbnailContainer}>
          {course.thumbnailUrl ? (
            <Image
              source={{ uri: course.thumbnailUrl }}
              style={styles.heroThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholderBanner}>
              <BookOpen color="#818CF8" size={48} />
            </View>
          )}

          {/* Badge Loại Khóa Học */}
          <View style={styles.heroBadgeRow}>
            {course.isPrivate ? (
              <View style={[styles.badge, styles.badgePrivate]}>
                <Lock color="#F59E0B" size={11} />
                <Text style={styles.badgeTextPrivate}>Hạn chế</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgePublic]}>
                <Globe color="#10B981" size={11} />
                <Text style={styles.badgeTextPublic}>Công khai</Text>
              </View>
            )}
          </View>
        </View>

        {/* Thông tin Khóa Học */}
        <View style={styles.heroCard}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.authorText}>Giảng viên: {course.authorName || 'Microlearning Master'}</Text>
          <Text style={styles.descText}>{course.description || 'Khóa học Microlearning chuẩn kiến thức thực chiến.'}</Text>

          {/* Thanh Tiến Độ Học Viên */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabel}>Tiến độ hoàn thành</Text>
              <Text style={styles.progressPercent}>{progressPercent}% ({completedCount}/{totalLessons} bài)</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Thống kê nhanh */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Layers color="#818CF8" size={16} />
              <Text style={styles.statText}>{course.subjects?.length || 0} Môn học</Text>
            </View>
            <View style={styles.statItem}>
              <PlayCircle color="#38BDF8" size={16} />
              <Text style={styles.statText}>{totalLessons} Bài học</Text>
            </View>
          </View>

          {/* Nút Xem Tiến Độ Học Viên (Dành cho Giáo viên & Admin) */}
          {(isTeacher || isAdmin) && (
            <TouchableOpacity
              style={styles.analyticsBtn}
              onPress={() => setShowStudentProgressModal(true)}
              activeOpacity={0.8}
            >
              <Users color="#06B6D4" size={16} />
              <Text style={styles.analyticsBtnText}>Thống Kê Tiến Độ Học Viên Khóa Này</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Danh sách Môn Học & Bài Giảng */}
        <Text style={styles.sectionTitle}>Nội dung chương trình ({course.subjects?.length || 0} học phần)</Text>

        {course.subjects?.map((sub, sIdx) => (
          <View key={sub.id} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectIndexBadge}>
                <Text style={styles.subjectIndexText}>{sIdx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectTitle}>{sub.title}</Text>
                {sub.description ? <Text style={styles.subjectDesc}>{sub.description}</Text> : null}
              </View>
            </View>

            <View style={styles.lessonsList}>
              {sub.lessons?.map((les) => {
                const isDone = completedIds.has(les.id);

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
                        <PlayCircle color="#6366F1" size={20} />
                      )}
                      <View style={styles.lessonTextContainer}>
                        <Text style={[styles.lessonTitle, isDone && styles.lessonTitleDone]} numberOfLines={1}>
                          {les.title}
                        </Text>
                        <Text style={styles.lessonDuration}>{formatDuration(les.durationSeconds)}</Text>
                      </View>
                    </View>

                    <ChevronRight color="#475569" size={18} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal Thống Kê Tiến Độ Học Viên */}
      <CourseStudentProgressModal
        visible={showStudentProgressModal}
        courseId={courseId}
        courseTitle={course.title}
        onClose={() => setShowStudentProgressModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 36 },
  heroThumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroThumbnail: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholderBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgePrivate: {
    backgroundColor: 'rgba(245, 158, 11, 0.85)',
  },
  badgePublic: {
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
  },
  badgeTextPrivate: { color: '#000000', fontSize: 10, fontWeight: '800' },
  badgeTextPublic: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  heroCard: {
    backgroundColor: '#090D1A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  courseTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  authorText: { color: '#818CF8', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  descText: { color: '#94A3B8', fontSize: 13, lineHeight: 19 },
  progressContainer: {
    marginTop: 16,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  progressPercent: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  analyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
    marginTop: 16,
  },
  analyticsBtnText: {
    color: '#06B6D4',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  subjectCard: {
    backgroundColor: '#090D1A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 10,
  },
  subjectIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIndexText: { color: '#818CF8', fontSize: 11, fontWeight: '800' },
  subjectTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: '700' },
  subjectDesc: { color: '#64748B', fontSize: 11, marginTop: 2 },
  lessonsList: { gap: 8 },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  lessonRowDone: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  lessonLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  lessonTextContainer: { marginLeft: 12, flex: 1 },
  lessonTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  lessonTitleDone: { color: '#94A3B8' },
  lessonDuration: { color: '#64748B', fontSize: 11 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorTitle: { color: '#F43F5E', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  backBtn: { backgroundColor: '#6366F1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
