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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, Clock, CheckCircle2, ChevronRight, PlayCircle } from 'lucide-react-native';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { formatDuration } from '../../src/utils/formatters';
import type { CourseDetail } from '../../src/types/catalog.types';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const courseId = Number(id);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCourse = useCallback(async () => {
    try {
      // 1. Read SQLite
      let detail = await catalogRepository.getCourseDetailById(courseId);
      if (detail) {
        setCourse(detail);
      }

      // 2. Fetch API if available
      try {
        detail = await catalogApi.getCourseById(courseId);
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
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <BookOpen color="#818CF8" size={32} />
          </View>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.authorText}>Giảng viên: {course.authorName || 'Microlearning'}</Text>
          <Text style={styles.descText}>{course.description || 'Khóa học Microlearning chất lượng cao.'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Nội dung chương trình học</Text>

        {course.subjects?.map((sub) => (
          <View key={sub.id} style={styles.subjectCard}>
            <Text style={styles.subjectTitle}>{sub.title}</Text>

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
  headerBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  heroCard: { backgroundColor: '#0F172A', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
  iconCircle: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  courseTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  authorText: { color: '#818CF8', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  descText: { color: '#94A3B8', fontSize: 13, lineHeight: 18 },
  sectionTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700', marginBottom: 14 },
  subjectCard: { backgroundColor: '#0F172A', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1E293B', marginBottom: 14 },
  subjectTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: '600', marginBottom: 12 },
  lessonsList: { gap: 8 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#070B17', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
  lessonRowDone: { borderColor: 'rgba(16, 185, 129, 0.3)' },
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
