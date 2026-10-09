import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  PlayCircle,
  Users,
  Lock,
  Globe,
  Layers,
  Bookmark,
  Heart,
  FileQuestion,
  Sparkles,
  Volume2,
} from 'lucide-react-native';
import { HybridVideoPlayer } from '../../src/components/player/HybridVideoPlayer';
import { CourseStudentProgressModal } from '../../src/components/management/CourseStudentProgressModal';
import { BookmarkLibraryModal } from '../../src/components/bookmarks/BookmarkLibraryModal';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { streakApi } from '../../src/services/streakApi';
import { mediaBookmarkService } from '../../src/services/mediaBookmarkService';
import { favoriteSubjectApi } from '../../src/services/favoriteSubjectApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { formatDuration } from '../../src/utils/formatters';
import type { CourseDetail, Lesson, Subject } from '../../src/types/catalog.types';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const courseId = Number(id);
  const { isTeacher, isAdmin } = useAuthStore();
  const { downloadedLessonIds } = useDownloadStore();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [favoriteSubjectIds, setFavoriteSubjectIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showStudentProgressModal, setShowStudentProgressModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagTitle, setFlagTitle] = useState('');
  const [flagNote, setFlagNote] = useState('');

  // Video current time for bookmarking
  const currentVideoSecondsRef = useRef<number>(0);

  const loadCourse = useCallback(async () => {
    try {
      // 1. SQLite First
      let detail = await catalogRepository.getCourseDetailById(courseId);
      if (detail) {
        setCourse(detail);
      }

      // 2. Azure API Live Fetch
      try {
        const liveDetail = await catalogApi.getCourseById(courseId, isTeacher || isAdmin);
        if (liveDetail) {
          setCourse(liveDetail);
          catalogRepository.saveCourseDetail(liveDetail).catch((err) => {
            console.warn('[CourseDetail] Background SQLite cache save error:', err);
          });
        }
      } catch (apiErr) {
        console.warn('[CourseDetail] Azure fetch error:', apiErr);
      }

      // 3. Tiến độ bài học
      const completed = await progressRepository.getCompletedLessonIds();
      setCompletedIds(new Set(completed));

      // 4. Môn học yêu thích
      try {
        const favIds = await favoriteSubjectApi.getMyFavoriteIds();
        setFavoriteSubjectIds(new Set(favIds));
      } catch {
        // ignore
      }
    } catch (err) {
      console.warn('[CourseDetail] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId, isTeacher, isAdmin]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // Tự động chọn bài học đang học dở hoặc bài đầu tiên khi nạp xong khóa học
  useEffect(() => {
    if (course && course.subjects && course.subjects.length > 0 && !activeLesson) {
      let firstUnfinished: Lesson | null = null;
      let firstAny: Lesson | null = null;

      for (const s of course.subjects) {
        if (s.lessons && s.lessons.length > 0) {
          for (const l of s.lessons) {
            if (!firstAny) firstAny = l;
            if (!firstUnfinished && !completedIds.has(l.id)) {
              firstUnfinished = l;
            }
          }
        }
      }

      setActiveLesson(firstUnfinished || firstAny);
    }
  }, [course, completedIds, activeLesson]);

  // Danh sách phẳng tất cả bài học để điều hướng bài trước / bài sau
  const allLessons: Lesson[] = [];
  if (course?.subjects) {
    for (const sub of course.subjects) {
      if (sub.lessons) {
        for (const les of sub.lessons) {
          allLessons.push(les);
        }
      }
    }
  }

  const currentLessonIndex = activeLesson
    ? allLessons.findIndex((l) => l.id === activeLesson.id)
    : -1;
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1
      ? allLessons[currentLessonIndex + 1]
      : null;

  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  const handleMarkCompleted = async () => {
    if (!activeLesson) return;
    const lessonId = activeLesson.id;

    // Lưu SQLite tiến độ
    await progressRepository.saveProgress(
      lessonId,
      activeLesson.durationSeconds || 180,
      100,
      true
    );
    setCompletedIds((prev) => new Set([...prev, lessonId]));

    // Ghi nhận API Streak
    try {
      await streakApi.pingStreak();
    } catch {
      // offline
    }

    Alert.alert('Chúc mừng!', `Bạn đã hoàn thành bài học "${activeLesson.title}"! 🔥`);

    // Tự động chuyển bài tiếp theo nếu có
    if (nextLesson) {
      setActiveLesson(nextLesson);
    }
  };

  const handleSaveFlagBookmark = async () => {
    if (!activeLesson) return;
    const title = flagTitle.trim() || activeLesson.title;
    const timestamp = currentVideoSecondsRef.current || 0;

    await mediaBookmarkService.addBookmark({
      lessonId: activeLesson.id,
      courseId: course?.id || 1,
      courseTitle: course?.title || 'Khóa học',
      lessonTitle: activeLesson.title,
      timestamp,
      title,
      note: flagNote.trim() || undefined,
    });

    setIsFlagModalOpen(false);
    setFlagTitle('');
    setFlagNote('');
    Alert.alert('Thành công', `Đã lưu mốc đánh dấu tại ${Math.floor(timestamp)}s`);
  };

  const handleToggleFavoriteSubject = async (subjectId: number) => {
    try {
      const res = await favoriteSubjectApi.toggleFavorite(subjectId);
      setFavoriteSubjectIds((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) {
          next.add(subjectId);
        } else {
          next.delete(subjectId);
        }
        return next;
      });
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật môn học yêu thích.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Đang nạp dữ liệu khóa học & video bài giảng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <BookOpen color="#EF4444" size={48} />
          <Text style={styles.errorTitle}>Không tìm thấy khóa học</Text>
          <Text style={styles.errorDesc}>Khóa học này có thể đã bị xóa hoặc chưa được công khai.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại danh mục</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft color="#F8FAFC" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course.title}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setShowBookmarkModal(true)}
          activeOpacity={0.7}
        >
          <Bookmark color="#818CF8" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadCourse} tintColor="#6366F1" />}
      >
        {/* KHỐI XEM VIDEO TRỰC TIẾP TRONG KHÓA HỌC (NHƯ TRÊN WEB) */}
        {activeLesson ? (
          <View style={styles.playerContainer}>
            <HybridVideoPlayer
              lessonId={activeLesson.id}
              onlineStreamUrl={activeLesson.videoUrl}
              durationSeconds={activeLesson.durationSeconds || 180}
              onProgress={(currentSec: number) => {
                currentVideoSecondsRef.current = currentSec;
              }}
              onCompleted={handleMarkCompleted}
            />

            {/* Thanh điều khiển bài giảng: Tiêu đề + Nút Đánh Dấu + Cụm Chuyển bài */}
            <View style={styles.playerControlsBody}>
              <View style={styles.lessonMetaHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playingBadge}>ĐANG PHÁT BÀI {currentLessonIndex + 1}/{totalLessons}</Text>
                  <Text style={styles.activeLessonTitle} numberOfLines={2}>
                    {activeLesson.title}
                  </Text>
                </View>

                {/* Nút Cắm Cờ / Đánh Dấu Mốc Video */}
                <TouchableOpacity
                  style={styles.flagBtn}
                  onPress={() => setIsFlagModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Bookmark color="#F59E0B" size={16} fill="#F59E0B" />
                  <Text style={styles.flagBtnText}>Lưu mốc</Text>
                </TouchableOpacity>
              </View>

              {activeLesson.description ? (
                <Text style={styles.activeLessonDesc} numberOfLines={2}>
                  {activeLesson.description}
                </Text>
              ) : null}

              {/* Nút Điều Hướng Chuyển Bài (Bài trước / Hoàn thành / Bài sau) */}
              <View style={styles.navigationRow}>
                <TouchableOpacity
                  style={[styles.navBtn, !prevLesson && styles.navBtnDisabled]}
                  disabled={!prevLesson}
                  onPress={() => prevLesson && handleSelectLesson(prevLesson)}
                  activeOpacity={0.7}
                >
                  <ChevronLeft color={prevLesson ? '#818CF8' : '#475569'} size={18} />
                  <Text style={[styles.navBtnText, !prevLesson && styles.navBtnTextDisabled]}>
                    Bài trước
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.completeLessonBtn,
                    completedIds.has(activeLesson.id) && styles.completeLessonBtnDone,
                  ]}
                  onPress={handleMarkCompleted}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 color="#FFFFFF" size={16} />
                  <Text style={styles.completeLessonBtnText}>
                    {completedIds.has(activeLesson.id) ? 'Đã hoàn thành' : 'Đánh dấu xong'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.navBtn, !nextLesson && styles.navBtnDisabled]}
                  disabled={!nextLesson}
                  onPress={() => nextLesson && handleSelectLesson(nextLesson)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.navBtnText, !nextLesson && styles.navBtnTextDisabled]}>
                    Bài tiếp
                  </Text>
                  <ChevronRight color={nextLesson ? '#818CF8' : '#475569'} size={18} />
                </TouchableOpacity>
              </View>

              {/* Lối tắt làm Quiz trắc nghiệm củng cố nếu bài có Quiz */}
              {activeLesson.hasQuiz ? (
                <TouchableOpacity
                  style={styles.quizShortcutBtn}
                  onPress={() => router.push(`/quiz/${activeLesson.id}`)}
                  activeOpacity={0.8}
                >
                  <FileQuestion color="#F59E0B" size={18} />
                  <Text style={styles.quizShortcutText}>Làm bài trắc nghiệm củng cố bài này</Text>
                  <ChevronRight color="#F59E0B" size={16} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : (
          /* Ảnh Thumbnail nếu chưa có bài học */
          <View style={styles.heroThumbnailContainer}>
            {course.thumbnailUrl ? (
              <Image source={{ uri: course.thumbnailUrl }} style={styles.heroThumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholderBanner}>
                <BookOpen color="#818CF8" size={48} />
              </View>
            )}
          </View>
        )}

        {/* Thông tin Khóa Học & Tiến Độ */}
        <View style={styles.courseInfoCard}>
          <View style={styles.courseHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.authorText}>Giảng viên: {course.authorName || 'Microlearning Master'}</Text>
            </View>
            <View style={styles.percentBadge}>
              <Text style={styles.percentBadgeText}>{progressPercent}%</Text>
            </View>
          </View>

          {course.description ? (
            <Text style={styles.descText}>{course.description}</Text>
          ) : null}

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressSubText}>
              Hoàn thành {completedCount}/{totalLessons} bài học
            </Text>
          </View>

          {/* Nút Thống Kê Tiến Độ Học Viên (Dành cho Giáo viên & Admin) */}
          {(isTeacher || isAdmin) && (
            <TouchableOpacity
              style={styles.analyticsBtn}
              onPress={() => setShowStudentProgressModal(true)}
              activeOpacity={0.8}
            >
              <Users color="#06B6D4" size={16} />
              <Text style={styles.analyticsBtnText}>Thống Kê Tiến Độ Học Viên</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DANH SÁCH MÔN HỌC & BÀI GIẢNG (CURRICULUM TREE) */}
        <View style={styles.curriculumSection}>
          <Text style={styles.sectionHeaderTitle}>
            Nội dung khóa học ({course.subjects?.length || 0} học phần • {totalLessons} bài)
          </Text>

          {course.subjects && course.subjects.length > 0 ? (
            course.subjects.map((sub, sIdx) => {
              const isFav = favoriteSubjectIds.has(sub.id);

              return (
                <View key={sub.id} style={styles.subjectCard}>
                  {/* Subject Header */}
                  <View style={styles.subjectHeaderRow}>
                    <View style={styles.subjectIndexBox}>
                      <Text style={styles.subjectIndexText}>{sIdx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectTitle}>{sub.title}</Text>
                      {sub.description ? (
                        <Text style={styles.subjectDesc} numberOfLines={2}>
                          {sub.description}
                        </Text>
                      ) : null}
                    </View>

                    {/* Nút Thả tim yêu thích môn học */}
                    <TouchableOpacity
                      style={styles.heartSubjectBtn}
                      onPress={() => handleToggleFavoriteSubject(sub.id)}
                      activeOpacity={0.7}
                    >
                      <Heart
                        color={isFav ? '#EC4899' : '#64748B'}
                        size={18}
                        fill={isFav ? '#EC4899' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Lessons in Subject */}
                  <View style={styles.lessonsList}>
                    {sub.lessons?.map((les) => {
                      const isActive = activeLesson?.id === les.id;
                      const isDone = completedIds.has(les.id);
                      const isOffline = downloadedLessonIds.has(les.id);

                      return (
                        <TouchableOpacity
                          key={les.id}
                          style={[
                            styles.lessonItem,
                            isActive && styles.lessonItemActive,
                            isDone && styles.lessonItemDone,
                          ]}
                          onPress={() => handleSelectLesson(les)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.lessonItemLeft}>
                            {isDone ? (
                              <CheckCircle2 color="#10B981" size={20} />
                            ) : isActive ? (
                              <PlayCircle color="#818CF8" size={20} />
                            ) : (
                              <View style={styles.lessonCircleIndex}>
                                <Text style={styles.lessonCircleText}>{les.sortOrder}</Text>
                              </View>
                            )}

                            <View style={styles.lessonTitleWrapper}>
                              <Text
                                style={[
                                  styles.lessonTitleText,
                                  isActive && styles.lessonTitleActive,
                                  isDone && styles.lessonTitleDone,
                                ]}
                                numberOfLines={1}
                              >
                                {les.title}
                              </Text>

                              <View style={styles.lessonMetaBadgeRow}>
                                <Text style={styles.lessonDurationText}>
                                  {formatDuration(les.durationSeconds)}
                                </Text>
                                {les.hasQuiz ? (
                                  <View style={styles.quizMiniPill}>
                                    <Text style={styles.quizMiniPillText}>Quiz</Text>
                                  </View>
                                ) : null}
                                {isOffline ? (
                                  <View style={styles.offlineMiniPill}>
                                    <Text style={styles.offlineMiniPillText}>Offline</Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          </View>

                          <ChevronRight color={isActive ? '#818CF8' : '#475569'} size={16} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptySubjectsBox}>
              <BookOpen color="#64748B" size={32} />
              <Text style={styles.emptySubjectsText}>Khóa học này hiện chưa có bài giảng nào.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Cắm Cờ / Lưu Mốc Video */}
      <Modal visible={isFlagModalOpen} animationType="fade" transparent onRequestClose={() => setIsFlagModalOpen(false)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Lưu mốc video quan trọng</Text>
            <Text style={styles.dialogSub}>
              Bài học: {activeLesson?.title} ({Math.floor(currentVideoSecondsRef.current || 0)}s)
            </Text>

            <Text style={styles.dialogInputLabel}>Tiêu đề mốc ghi nhớ *</Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="VD: Định nghĩa quan trọng..."
              placeholderTextColor="#475569"
              value={flagTitle}
              onChangeText={setFlagTitle}
            />

            <Text style={styles.dialogInputLabel}>Ghi chú thêm (tùy chọn)</Text>
            <TextInput
              style={styles.dialogInput}
              placeholder="Nội dung cần lưu ý..."
              placeholderTextColor="#475569"
              value={flagNote}
              onChangeText={setFlagNote}
            />

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setIsFlagModalOpen(false)}
              >
                <Text style={styles.dialogCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={handleSaveFlagBookmark}
              >
                <Text style={styles.dialogConfirmText}>Lưu mốc</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Thư Viện Đánh Dấu */}
      <BookmarkLibraryModal
        visible={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        onSelectBookmark={(bm) => {
          const found = allLessons.find((l) => l.id === bm.lessonId);
          if (found) {
            setActiveLesson(found);
          }
        }}
      />

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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#070B17',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', flex: 1, marginHorizontal: 12 },
  scrollContent: { paddingBottom: 40 },
  playerContainer: {
    backgroundColor: '#090D1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  playerControlsBody: {
    padding: 16,
    backgroundColor: '#0F172A',
  },
  lessonMetaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  playingBadge: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activeLessonTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  flagBtnText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  activeLessonDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#070B17',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: '#818CF8', fontSize: 12, fontWeight: '600' },
  navBtnTextDisabled: { color: '#64748B' },
  completeLessonBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingVertical: 9,
    borderRadius: 10,
  },
  completeLessonBtnDone: { backgroundColor: '#10B981' },
  completeLessonBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  quizShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  quizShortcutText: { color: '#F59E0B', fontSize: 12, fontWeight: '700', flex: 1, marginLeft: 8 },
  heroThumbnailContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#0F172A',
  },
  heroThumbnail: { width: '100%', height: '100%' },
  heroPlaceholderBanner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  courseInfoCard: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  courseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  courseTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  authorText: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  percentBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentBadgeText: { color: '#818CF8', fontSize: 13, fontWeight: '700' },
  descText: { color: '#94A3B8', fontSize: 12, lineHeight: 17, marginTop: 8 },
  progressContainer: { marginTop: 12 },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 3 },
  progressSubText: { color: '#64748B', fontSize: 11 },
  analyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 14,
  },
  analyticsBtnText: { color: '#06B6D4', fontSize: 12, fontWeight: '700' },
  curriculumSection: { padding: 16 },
  sectionHeaderTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  subjectCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  subjectHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  subjectIndexBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIndexText: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
  subjectTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  subjectDesc: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  heartSubjectBtn: { padding: 4 },
  lessonsList: { gap: 6 },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070B17',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  lessonItemActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.12)' },
  lessonItemDone: { borderColor: 'rgba(16, 185, 129, 0.3)' },
  lessonItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  lessonCircleIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonCircleText: { color: '#94A3B8', fontSize: 10, fontWeight: '700' },
  lessonTitleWrapper: { flex: 1 },
  lessonTitleText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  lessonTitleActive: { color: '#818CF8', fontWeight: '700' },
  lessonTitleDone: { color: '#94A3B8' },
  lessonMetaBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  lessonDurationText: { color: '#64748B', fontSize: 10 },
  quizMiniPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  quizMiniPillText: { color: '#F59E0B', fontSize: 8, fontWeight: '700' },
  offlineMiniPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offlineMiniPillText: { color: '#10B981', fontSize: 8, fontWeight: '700' },
  emptySubjectsBox: { alignItems: 'center', padding: 24, gap: 8 },
  emptySubjectsText: { color: '#64748B', fontSize: 12 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  errorTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  errorDesc: { color: '#64748B', fontSize: 12, textAlign: 'center' },
  backBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  backBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
  },
  dialogTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  dialogSub: { color: '#94A3B8', fontSize: 12, marginBottom: 14 },
  dialogInputLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  dialogInput: {
    backgroundColor: '#070B17',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
  },
  dialogBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  dialogCancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  dialogCancelText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  dialogConfirmBtn: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  dialogConfirmText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
