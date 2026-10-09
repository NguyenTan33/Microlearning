import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  PlayCircle,
  CheckCircle2,
  Clock,
  Download,
  ChevronRight,
  Flame,
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
  ShieldCheck,
  HelpCircle,
  Bookmark,
  Heart,
  Crown,
} from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { CourseManagementModal } from '../../src/components/management/CourseManagementModal';
import { AdminUserManagementModal } from '../../src/components/management/AdminUserManagementModal';
import { MistakeVaultModal } from '../../src/components/quiz/MistakeVaultModal';
import { BookmarkLibraryModal } from '../../src/components/bookmarks/BookmarkLibraryModal';
import { FavoriteSubjectsModal } from '../../src/components/common/FavoriteSubjectsModal';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { streakApi, type StreakInfo } from '../../src/services/streakApi';
import { mediaBookmarkService } from '../../src/services/mediaBookmarkService';
import { favoriteSubjectApi } from '../../src/services/favoriteSubjectApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { autoSyncEngine } from '../../src/services/autoSyncEngine';
import { formatDuration } from '../../src/utils/formatters';
import type { Course, CourseDetail, Lesson } from '../../src/types/catalog.types';

export default function StudyHomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user, isTeacher, isAdmin, logout } = useAuthStore();
  const { downloadedLessonIds } = useDownloadStore();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const [courseList, setCourseList] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Chuỗi Streak thật từ Azure Backend
  const [streakData, setStreakData] = useState<StreakInfo | null>(null);

  // Số lượng mục yêu thích & bookmark
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [favoriteCount, setFavoriteCount] = useState<number>(0);

  // Modals state
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState<boolean>(false);
  const [isMistakesOpen, setIsMistakesOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    try {
      // 1. Tải streak thật từ Azure
      try {
        const sInfo = await streakApi.getMyStreak();
        if (sInfo) {
          setStreakData(sInfo);
        }
      } catch {
        // Fallback offline
      }

      // 2. Tải tiến độ hoàn thành từ SQLite
      const completed = await progressRepository.getCompletedLessonIds();
      setCompletedIds(new Set(completed));

      // 3. Tải số lượng Bookmarks & Favorites
      try {
        const bms = await mediaBookmarkService.getAllBookmarks();
        setBookmarkCount(bms.length);
        const favs = await favoriteSubjectApi.getMyFavoriteIds();
        setFavoriteCount(favs.length);
      } catch {
        // ignore
      }

      // 4. Tải danh mục khóa học (Local First -> Azure API)
      let courses = await catalogRepository.getAllCourses();
      try {
        const apiCourses = await catalogApi.getAllCourses(isTeacher || isAdmin);
        if (apiCourses.length > 0) {
          await catalogRepository.saveCourses(apiCourses);
          courses = apiCourses;
        }
      } catch {
        // Fallback SQLite
      }

      setCourseList(courses);

      // 5. Chọn khóa học đang kích hoạt
      const activeId = selectedCourseId || (courses.length > 0 ? courses[0].id : 1);
      if (!selectedCourseId && courses.length > 0) {
        setSelectedCourseId(courses[0].id);
      }

      let detail = await catalogRepository.getCourseDetailById(activeId);
      if (detail) {
        setCourse(detail);
      }

      try {
        detail = await catalogApi.getCourseById(activeId, isTeacher || isAdmin);
        if (detail) {
          await catalogRepository.saveCourseDetail(detail);
          setCourse(detail);
        }
      } catch {
        // Fallback SQLite
      }
    } catch (err) {
      console.warn('[StudyHome] Data load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTeacher, isAdmin, selectedCourseId]);

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

  const handleSelectCourse = async (courseId: number) => {
    setSelectedCourseId(courseId);
    setLoading(true);
    try {
      let detail = await catalogRepository.getCourseDetailById(courseId);
      if (detail) setCourse(detail);

      detail = await catalogApi.getCourseById(courseId, isTeacher || isAdmin);
      if (detail) {
        await catalogRepository.saveCourseDetail(detail);
        setCourse(detail);
      }
    } catch {
      // Keep existing
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingIndicator message="Đang nạp bài học & tiến độ thực..." />;
  }

  // Tìm bài học tiếp theo chưa học
  let nextLesson: Lesson | null = null;
  let totalLessonsCount = 0;
  if (course && course.subjects) {
    for (const sub of course.subjects) {
      if (sub.lessons) {
        totalLessonsCount += sub.lessons.length;
        for (const les of sub.lessons) {
          if (!nextLesson && !completedIds.has(les.id)) {
            nextLesson = les;
          }
        }
      }
    }
    if (!nextLesson && course.subjects[0]?.lessons?.[0]) {
      nextLesson = course.subjects[0].lessons[0];
    }
  }

  const completionRate =
    totalLessonsCount > 0 ? Math.round((completedIds.size / totalLessonsCount) * 100) : 0;
  const streakCount = streakData?.currentStreak || 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#070B17" />
      <AppHeader
        title="Học tập"
        subtitle={user?.fullName || 'Học viên Microlearning'}
        streakCount={streakCount}
        showStreak={true}
        onProfilePress={() => router.push('/(tabs)/profile')}
        onLogoutPress={handleLogout}
      />
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {/* Gamification Streak & Progress Card (ĐÃ BỎ EXP THEO YÊU CẦU ĐỒ ÁN) */}
        <View style={styles.gamificationRow}>
          <View style={[styles.statBox, styles.streakBox]}>
            <Flame color="#F59E0B" size={24} fill="#F59E0B" />
            <View>
              <Text style={styles.statValue}>{streakCount} Ngày</Text>
              <Text style={styles.statLabel}>Chuỗi học liên tiếp</Text>
            </View>
          </View>

          <View style={[styles.statBox, styles.progressBox]}>
            <CheckCircle2 color="#10B981" size={24} />
            <View>
              <Text style={styles.statValue}>{completedIds.size} Bài</Text>
              <Text style={styles.statLabel}>Đã hoàn thành</Text>
            </View>
          </View>
        </View>

        {/* Cụm Tiện Ích: Ôn Câu Sai • Đánh Dấu Videos • Môn Yêu Thích */}
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => setIsMistakesOpen(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <HelpCircle color="#F59E0B" size={18} />
            </View>
            <Text style={styles.quickCardTitle}>Ôn Câu Sai</Text>
            <Text style={styles.quickCardSub}>Sổ tay câu hỏi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => setIsBookmarksOpen(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Bookmark color="#818CF8" size={18} />
            </View>
            <Text style={styles.quickCardTitle}>Đánh Dấu</Text>
            <Text style={styles.quickCardSub}>{bookmarkCount} mốc video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => setIsFavoritesOpen(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Heart color="#EC4899" size={18} fill="#EC4899" />
            </View>
            <Text style={styles.quickCardTitle}>Yêu Thích</Text>
            <Text style={styles.quickCardSub}>{favoriteCount} môn học</Text>
          </TouchableOpacity>
        </View>

        {/* PHÂN HỆ STUDIO CHO GIẢNG VIÊN VÀ QUẢN TRỊ VIÊN */}
        {(isTeacher || isAdmin) && (
          <View style={styles.adminStudioSection}>
            {/* Studio Tạo/Sửa Khóa Học */}
            <TouchableOpacity
              style={styles.studioCard}
              onPress={() => setIsStudioOpen(true)}
              activeOpacity={0.85}
            >
              <View style={styles.studioCardLeft}>
                <View style={styles.studioIconBadge}>
                  <Layers color="#6366F1" size={20} />
                </View>
                <View style={styles.studioCardTexts}>
                  <View style={styles.studioCardTitleRow}>
                    <Text style={styles.studioCardTitle}>Studio Quản Lý Khóa Học & Bài Giảng</Text>
                    <View style={styles.studioRoleBadge}>
                      <Text style={styles.studioRoleText}>{isAdmin ? 'Admin' : 'Giáo viên'}</Text>
                    </View>
                  </View>
                  <Text style={styles.studioCardSubtitle}>
                    Thêm khóa học, chương mục, bài giảng & gắn video URL
                  </Text>
                </View>
              </View>
              <ChevronRight color="#818CF8" size={18} />
            </TouchableOpacity>

            {/* Quản Trị Người Dùng (Dành riêng cho Admin) */}
            {isAdmin && (
              <TouchableOpacity
                style={[styles.studioCard, styles.adminCard]}
                onPress={() => setIsAdminUsersOpen(true)}
                activeOpacity={0.85}
              >
                <View style={styles.studioCardLeft}>
                  <View style={[styles.studioIconBadge, styles.adminIconBadge]}>
                    <ShieldCheck color="#EF4444" size={20} />
                  </View>
                  <View style={styles.studioCardTexts}>
                    <View style={styles.studioCardTitleRow}>
                      <Text style={styles.studioCardTitle}>Quản Trị Người Dùng (Admin Users)</Text>
                      <View style={[styles.studioRoleBadge, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.studioRoleText}>Toàn quyền</Text>
                      </View>
                    </View>
                    <Text style={styles.studioCardSubtitle}>
                      Phân quyền Admin/Giáo viên, đổi mật khẩu & khóa tài khoản
                    </Text>
                  </View>
                </View>
                <ChevronRight color="#EF4444" size={18} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Khóa học của tôi - Course Switcher Selector */}
        {courseList.length > 1 && (
          <View style={styles.courseSwitcherContainer}>
            <Text style={styles.switcherLabel}>Khóa học đang học:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.switcherScroll}
            >
              {courseList.map((c) => {
                const isActive = c.id === course?.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.switcherChip, isActive && styles.switcherChipActive]}
                    onPress={() => handleSelectCourse(c.id)}
                    activeOpacity={0.8}
                  >
                    <BookOpen color={isActive ? '#818CF8' : '#64748B'} size={14} />
                    <Text
                      style={[styles.switcherChipText, isActive && styles.switcherChipTextActive]}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Active Course Hero Card With Thumbnail */}
        <TouchableOpacity
          style={styles.courseHeroCard}
          onPress={() => course && router.push(`/course/${course.id}`)}
          activeOpacity={0.88}
        >
          {course?.thumbnailUrl ? (
            <Image
              source={{ uri: course.thumbnailUrl }}
              style={styles.courseThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coursePlaceholderThumbnail}>
              <GraduationCap color="#6366F1" size={44} />
            </View>
          )}

          <View style={styles.courseHeroBody}>
            <View style={styles.courseHeroTopRow}>
              <View style={styles.courseCategoryBadge}>
                <Text style={styles.courseCategoryText}>{course?.category || 'Công nghệ'}</Text>
              </View>
              <Text style={styles.progressPercentText}>{completionRate}%</Text>
            </View>

            <Text style={styles.courseHeroTitle} numberOfLines={2}>
              {course?.title || 'Khóa học Microlearning'}
            </Text>

            {course?.description ? (
              <Text style={styles.courseHeroDesc} numberOfLines={2}>
                {course.description}
              </Text>
            ) : null}

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
            </View>
            <View style={styles.courseHeroFooter}>
              <Text style={styles.progressSubText}>
                Đã hoàn thành {completedIds.size}/{totalLessonsCount} bài học
              </Text>
              <View style={styles.viewDetailLink}>
                <Text style={styles.viewDetailText}>Vào học khóa này</Text>
                <ChevronRight color="#818CF8" size={14} />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Next Lesson Hero Card */}
        {nextLesson && (
          <View style={styles.heroCard}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Sparkles color="#818CF8" size={12} />
                <Text style={styles.heroBadgeText}>BÀI HỌC TIẾP THEO</Text>
              </View>

              {downloadedLessonIds.has(nextLesson.id) && (
                <View style={styles.offlineReadyPill}>
                  <Download color="#10B981" size={12} />
                  <Text style={styles.offlineReadyText}>Sẵn sàng offline</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroTitle}>{nextLesson.title}</Text>
            <Text style={styles.heroDesc} numberOfLines={2}>
              {nextLesson.description ||
                'Xem video ngắn 3-5 phút và hoàn thành bài trắc nghiệm củng cố kiến thức.'}
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.metaItem}>
                <Clock color="#94A3B8" size={14} />
                <Text style={styles.metaText}>{formatDuration(nextLesson.durationSeconds)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => router.push(`/course/${course?.id || 1}`)}
              activeOpacity={0.8}
            >
              <PlayCircle color="#FFFFFF" size={20} />
              <Text style={styles.continueButtonText}>Xem video & học ngay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Curriculum Hierarchy */}
        <View style={styles.curriculumSection}>
          <Text style={styles.sectionTitle}>Lộ trình bài giảng</Text>

          {course?.subjects && course.subjects.length > 0 ? (
            course.subjects.map((subject) => (
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
                        onPress={() => router.push(`/course/${course.id}`)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.lessonLeft}>
                          {isDone ? (
                            <CheckCircle2 color="#10B981" size={22} />
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
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <BookOpen color="#475569" size={32} />
              <Text style={styles.emptyStateText}>Chưa có bài giảng nào trong khóa học này.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals Studio & Quản lý */}
      <CourseManagementModal
        visible={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        onCourseUpdated={loadData}
      />

      <AdminUserManagementModal
        visible={isAdminUsersOpen}
        onClose={() => setIsAdminUsersOpen(false)}
      />

      <MistakeVaultModal
        visible={isMistakesOpen}
        onClose={() => setIsMistakesOpen(false)}
      />

      <BookmarkLibraryModal
        visible={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
      />

      <FavoriteSubjectsModal
        visible={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
      />
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
    paddingBottom: 36,
  },
  gamificationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    gap: 12,
  },
  streakBox: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  progressBox: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    alignItems: 'center',
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickCardTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickCardSub: {
    color: '#64748B',
    fontSize: 10,
  },
  adminStudioSection: {
    gap: 10,
    marginBottom: 16,
  },
  studioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.35)',
    borderRadius: 16,
    padding: 12,
  },
  adminCard: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  studioCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  studioIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminIconBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  studioCardTexts: {
    flex: 1,
  },
  studioCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  studioCardTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  studioRoleBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  studioRoleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  studioCardSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  courseSwitcherContainer: {
    marginBottom: 16,
  },
  switcherLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  switcherScroll: {
    gap: 8,
  },
  switcherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: 200,
  },
  switcherChipActive: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  switcherChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  switcherChipTextActive: {
    color: '#818CF8',
    fontWeight: '700',
  },
  courseHeroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    marginBottom: 16,
  },
  courseThumbnail: {
    width: '100%',
    height: 140,
    backgroundColor: '#1E293B',
  },
  coursePlaceholderThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#131D31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseHeroBody: {
    padding: 16,
  },
  courseHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseCategoryBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  courseCategoryText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  progressPercentText: {
    color: '#818CF8',
    fontSize: 14,
    fontWeight: '700',
  },
  courseHeroTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  courseHeroDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  courseHeroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressSubText: {
    color: '#64748B',
    fontSize: 11,
  },
  viewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewDetailText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    marginBottom: 20,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  heroBadgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  curriculumSection: {
    marginTop: 4,
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
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 13,
  },
});
