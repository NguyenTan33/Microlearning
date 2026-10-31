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
  FileText,
  Download,
  HardDrive,
} from 'lucide-react-native';
import { HybridVideoPlayer } from '../../src/components/player/HybridVideoPlayer';
import { CourseStudentProgressModal } from '../../src/components/management/CourseStudentProgressModal';
import { BookmarkLibraryModal } from '../../src/components/bookmarks/BookmarkLibraryModal';
import { LessonAttachmentsModal } from '../../src/components/common/LessonAttachmentsModal';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { downloadRepository } from '../../src/db/repositories/downloadRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { streakApi } from '../../src/services/streakApi';
import { mediaBookmarkService } from '../../src/services/mediaBookmarkService';
import { favoriteSubjectApi } from '../../src/services/favoriteSubjectApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { formatDuration } from '../../src/utils/formatters';
import { parseVideoUrl, extractYoutubeVideoId, LessonMediaInfo } from '../../src/types/media.types';
import type { CourseDetail, Lesson, Subject } from '../../src/types/catalog.types';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const courseId = Number(id);
  const { isTeacher, isAdmin } = useAuthStore();
  const { downloadedLessonIds, activeDownloads, startDownload, deleteDownload, refreshDownloads } = useDownloadStore();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [favoriteSubjectIds, setFavoriteSubjectIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showStudentProgressModal, setShowStudentProgressModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagTitle, setFlagTitle] = useState('');
  const [flagNote, setFlagNote] = useState('');

  // Video current time & seeking state
  const currentVideoSecondsRef = useRef<number>(0);
  const [seekTimestamp, setSeekTimestamp] = useState<number | undefined>(undefined);
  const [watchedSeconds, setWatchedSeconds] = useState<number>(0);

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
    setSeekTimestamp(undefined);
    currentVideoSecondsRef.current = 0;
    setWatchedSeconds(completedIds.has(lesson.id) ? (lesson.durationSeconds || 180) : 0);
  };

  const [activeLessonMediaInfo, setActiveLessonMediaInfo] = useState<LessonMediaInfo | null>(null);
  const [activeLessonIsYoutube, setActiveLessonIsYoutube] = useState<boolean>(false);

  useEffect(() => {
    if (!activeLesson) {
      setActiveLessonMediaInfo(null);
      setActiveLessonIsYoutube(false);
      return;
    }

    if (activeLesson.videoUrl && (parseVideoUrl(activeLesson.videoUrl).sourceType === 'youtube' || extractYoutubeVideoId(activeLesson.videoUrl))) {
      setActiveLessonIsYoutube(true);
    }

    let isCancelled = false;
    catalogApi.getLessonMediaInfo(activeLesson.id)
      .then((mediaInfo) => {
        if (isCancelled || !mediaInfo) return;
        setActiveLessonMediaInfo(mediaInfo);
        const isYt =
          mediaInfo.sourceType === 'youtube' ||
          Boolean(mediaInfo.streamUrl && (parseVideoUrl(mediaInfo.streamUrl).sourceType === 'youtube' || extractYoutubeVideoId(mediaInfo.streamUrl))) ||
          Boolean(mediaInfo.externalUrl && (parseVideoUrl(mediaInfo.externalUrl).sourceType === 'youtube' || extractYoutubeVideoId(mediaInfo.externalUrl))) ||
          Boolean(mediaInfo.embedUrl && (parseVideoUrl(mediaInfo.embedUrl).sourceType === 'youtube' || extractYoutubeVideoId(mediaInfo.embedUrl)));
        
        setActiveLessonIsYoutube(isYt);

        // Tự động dọn dẹp nếu bài học là YouTube nhưng máy lại lưu nhầm file offline test.mp4 trước đó
        if (isYt && downloadedLessonIds.has(activeLesson.id)) {
          downloadRepository.deleteDownloadByLessonId(activeLesson.id).then(() => {
            refreshDownloads();
          }).catch(() => {});
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setActiveLessonIsYoutube(false);
          setActiveLessonMediaInfo(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeLesson?.id, activeLesson?.videoUrl]);

  const isYoutubeLesson = Boolean(
    activeLessonIsYoutube ||
      (activeLesson?.videoUrl && (parseVideoUrl(activeLesson.videoUrl).sourceType === 'youtube' || extractYoutubeVideoId(activeLesson.videoUrl))) ||
      (activeLessonMediaInfo?.sourceType === 'youtube')
  );

  const handleToggleDownload = async () => {
    if (!activeLesson) return;

    if (isYoutubeLesson) {
      Alert.alert(
        'Không hỗ trợ tải ngoại tuyến',
        'Video bài học này là nguồn liên kết từ YouTube. Chỉ các video được đăng tải trực tiếp lên máy chủ đám mây Azure mới hỗ trợ tải về máy để xem khi không có mạng.'
      );
      return;
    }

    const isDownloaded = downloadedLessonIds.has(activeLesson.id);

    if (isDownloaded) {
      Alert.alert(
        'Quản lý video tải về',
        `Bài học "${activeLesson.title}" đã được lưu trên máy. Bạn có muốn xóa bản offline này?`,
        [
          { text: 'Giữ lại', style: 'cancel' },
          {
            text: 'Xóa bản tải',
            style: 'destructive',
            onPress: async () => {
              await deleteDownload(activeLesson.id);
              Alert.alert('Thành công', 'Đã xóa video offline khỏi thiết bị.');
            },
          },
        ]
      );
    } else {
      try {
        let streamUrl: string | undefined = activeLesson.videoUrl;
        if (!streamUrl) {
          try {
            const mediaInfo = await catalogApi.getLessonMediaInfo(activeLesson.id);
            streamUrl = (mediaInfo?.streamUrl || mediaInfo?.externalUrl) ?? undefined;
          } catch {
            // fallback in downloadManager
          }
        }
        await startDownload(activeLesson.id, streamUrl, activeLesson.title);
        await refreshDownloads();
        useDownloadStore.getState().removeDownloadProgress(activeLesson.id);
        Alert.alert('Thành công! 💾', `Đã lưu bài học "${activeLesson.title}" vào kho ngoại tuyến.`);
      } catch {
        useDownloadStore.getState().removeDownloadProgress(activeLesson.id);
        Alert.alert('Lỗi', 'Không thể tải video bài học.');
      }
    }
  };

  const handleQuizPress = () => {
    if (!activeLesson) return;

    if (!activeLesson.hasQuiz) {
      Alert.alert('Thông báo', 'Bài học này chưa có câu hỏi trắc nghiệm.');
      return;
    }

    const duration = activeLesson.durationSeconds || 180;
    const watchedPercent = duration > 0 ? Math.round((watchedSeconds / duration) * 100) : 0;
    const isCompleted = completedIds.has(activeLesson.id);

    if (!isCompleted && watchedPercent < 60) {
      Alert.alert(
        'Chưa mở khóa trắc nghiệm',
        `Bạn cần học ít nhất 60% thời lượng bài học để mở khóa bài trắc nghiệm củng cố (Hiện tại đã xem: ${watchedPercent}%). Hãy tiếp tục xem bài giảng nhé!`
      );
      return;
    }

    router.push(`/quiz/${activeLesson.id}`);
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
              onlineStreamUrl={
                activeLesson.videoUrl ||
                activeLessonMediaInfo?.externalUrl ||
                activeLessonMediaInfo?.embedUrl ||
                activeLessonMediaInfo?.streamUrl
              }
              mediaInfo={activeLessonMediaInfo}
              durationSeconds={activeLesson.durationSeconds || 180}
              seekTimestamp={seekTimestamp}
              onProgress={(currentSec: number, totalDur: number) => {
                currentVideoSecondsRef.current = currentSec;
                if (totalDur > 0) {
                  setWatchedSeconds((prev) => Math.max(prev, currentSec));
                }
              }}
              onCompleted={handleMarkCompleted}
            />

            {/* Thanh điều khiển bài giảng: Tiêu đề + Cụm Action Nhanh + Chuyển bài */}
            <View style={styles.playerControlsBody}>
              <View style={styles.lessonMetaHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playingBadge}>ĐANG PHÁT BÀI {currentLessonIndex + 1}/{totalLessons}</Text>
                  <Text style={styles.activeLessonTitle} numberOfLines={2}>
                    {activeLesson.title}
                  </Text>
                </View>
              </View>

              {activeLesson.description ? (
                <Text style={styles.activeLessonDesc} numberOfLines={2}>
                  {activeLesson.description}
                </Text>
              ) : null}

              {/* Hàng nút chức năng nhanh: Tài liệu (luôn hiện), Tải offline, Lưu mốc */}
              <View style={styles.quickActionRow}>
                {/* 1. Nút Tài liệu bài giảng - Luôn hiển thị kể cả khi bài không có tài liệu */}
                <TouchableOpacity
                  style={styles.quickActionPill}
                  onPress={() => setShowAttachmentsModal(true)}
                  activeOpacity={0.8}
                >
                  <FileText color="#38BDF8" size={15} />
                  <Text style={styles.quickActionPillText}>Tài liệu</Text>
                </TouchableOpacity>

                {/* 2. Nút Tải bài giảng về học offline - ẨN HOÀN TOÀN NẾU LÀ VIDEO YOUTUBE */}
                {!isYoutubeLesson && (
                  <TouchableOpacity
                    style={[
                      styles.quickActionPill,
                      downloadedLessonIds.has(activeLesson.id) && styles.quickActionPillSuccess,
                    ]}
                    onPress={handleToggleDownload}
                    activeOpacity={0.8}
                  >
                    {downloadedLessonIds.has(activeLesson.id) ? (
                      <>
                        <HardDrive color="#10B981" size={15} />
                        <Text style={[styles.quickActionPillText, { color: '#10B981' }]}>Đã tải offline</Text>
                      </>
                    ) : activeDownloads[activeLesson.id] !== undefined ? (
                      <>
                        <ActivityIndicator size="small" color="#38BDF8" />
                        <Text style={styles.quickActionPillText}>
                          Đang tải {activeDownloads[activeLesson.id]}%
                        </Text>
                      </>
                    ) : (
                      <>
                        <Download color="#818CF8" size={15} />
                        <Text style={styles.quickActionPillText}>Tải offline</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* 3. Nút Lưu mốc video */}
                <TouchableOpacity
                  style={styles.quickActionPill}
                  onPress={() => setIsFlagModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Bookmark color="#F59E0B" size={15} fill="#F59E0B" />
                  <Text style={styles.quickActionPillText}>Lưu mốc</Text>
                </TouchableOpacity>

                {/* 4. Nút Sổ tay AI chuyển sang màn AI Notebook */}
                <TouchableOpacity
                  style={styles.quickActionPill}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/ai',
                      params: {
                        courseId: String(course.id),
                        courseTitle: course.title,
                        lessonId: String(activeLesson.id),
                        lessonTitle: activeLesson.title,
                      },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Sparkles color="#A855F7" size={15} />
                  <Text style={styles.quickActionPillText}>Sổ tay AI</Text>
                </TouchableOpacity>
              </View>

              {/* Nút Điều Hướng Chuyển Bài (Chỉ còn Bài trước và Bài tiếp, bỏ nút đã hoàn thành ở giữa) */}
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

              {/* Lối tắt làm Quiz trắc nghiệm củng cố - Luôn hiển thị, khóa khi chưa học đủ 60% */}
              {(() => {
                const isLessonDone = completedIds.has(activeLesson.id);
                const dur = activeLesson.durationSeconds || 180;
                const watchedPct = dur > 0 ? Math.round((watchedSeconds / dur) * 100) : 0;
                const isUnlocked = isLessonDone || watchedPct >= 60;

                if (!activeLesson.hasQuiz) {
                  return (
                    <TouchableOpacity
                      style={styles.quizShortcutBtnNoQuiz}
                      onPress={handleQuizPress}
                      activeOpacity={0.8}
                    >
                      <FileQuestion color="#64748B" size={18} />
                      <Text style={styles.quizShortcutTextNoQuiz}>
                        Làm bài trắc nghiệm củng cố (Chưa có đề)
                      </Text>
                      <ChevronRight color="#64748B" size={16} />
                    </TouchableOpacity>
                  );
                }

                if (!isUnlocked) {
                  return (
                    <TouchableOpacity
                      style={styles.quizShortcutBtnLocked}
                      onPress={handleQuizPress}
                      activeOpacity={0.8}
                    >
                      <Lock color="#94A3B8" size={18} />
                      <Text style={styles.quizShortcutTextLocked}>
                        Làm bài trắc nghiệm (Khóa - Cần học ≥ 60% • Hiện tại: {watchedPct}%)
                      </Text>
                      <ChevronRight color="#94A3B8" size={16} />
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    style={styles.quizShortcutBtn}
                    onPress={handleQuizPress}
                    activeOpacity={0.8}
                  >
                    <FileQuestion color="#F59E0B" size={18} />
                    <Text style={styles.quizShortcutText}>Làm bài trắc nghiệm củng cố bài này</Text>
                    <ChevronRight color="#F59E0B" size={16} />
                  </TouchableOpacity>
                );
              })()}
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
              <Text style={styles.authorText}>Giảng viên: {course.authorName || 'EduSync Master'}</Text>
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

      {/* Modal Tài Liệu Đính Kèm Bài Giảng */}
      <LessonAttachmentsModal
        visible={showAttachmentsModal}
        lessonId={activeLesson?.id || 0}
        lessonTitle={activeLesson?.title || ''}
        canManage={isTeacher || isAdmin}
        onClose={() => setShowAttachmentsModal(false)}
      />

      {/* Modal Thư Viện Đánh Dấu */}
      <BookmarkLibraryModal
        visible={showBookmarkModal}
        onClose={() => setShowBookmarkModal(false)}
        onSelectBookmark={(bm) => {
          const found = allLessons.find((l) => l.id === bm.lessonId);
          if (found) {
            setActiveLesson(found);
          }
          setSeekTimestamp(bm.timestamp);
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
    marginBottom: 12,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickActionPillSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  quickActionPillDisabled: {
    backgroundColor: '#090D1A',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.55,
  },
  quickActionPillText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#070B17',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { color: '#818CF8', fontSize: 13, fontWeight: '600' },
  navBtnTextDisabled: { color: '#64748B' },
  quizShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 12,
  },
  quizShortcutText: { color: '#F59E0B', fontSize: 12, fontWeight: '700', flex: 1, marginLeft: 8 },
  quizShortcutBtnNoQuiz: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 12,
    opacity: 0.75,
  },
  quizShortcutTextNoQuiz: { color: '#94A3B8', fontSize: 12, fontWeight: '600', flex: 1, marginLeft: 8 },
  quizShortcutBtnLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 12,
  },
  quizShortcutTextLocked: { color: '#94A3B8', fontSize: 12, fontWeight: '600', flex: 1, marginLeft: 8 },
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
