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
  Paperclip,
  BookOpen,
  Lock,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
} from 'lucide-react-native';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { HybridVideoPlayer } from '../../src/components/player/HybridVideoPlayer';
import { AudioTtsPlayer } from '../../src/components/player/AudioTtsPlayer';
import { LessonAttachmentsModal } from '../../src/components/player/LessonAttachmentsModal';
import { NotebookModal } from '../../src/components/notebook/NotebookModal';
import { DuolingoStreakCelebrationModal } from '../../src/components/common/DuolingoStreakCelebrationModal';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { downloadRepository } from '../../src/db/repositories/downloadRepository';
import { downloadManager } from '../../src/services/downloadManager';
import { outboxRepository } from '../../src/db/repositories/outboxRepository';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { generateGuid } from '../../src/utils/guidHelper';
import { streakApi } from '../../src/services/streakApi';
import { quizApi } from '../../src/services/quizApi';
import { progressApi } from '../../src/services/progressApi';
import { parseVideoUrl, extractYoutubeVideoId, LessonMediaInfo } from '../../src/types/media.types';
import type { Lesson } from '../../src/types/catalog.types';

export default function LessonScreen() {
  const { id, seekTimestamp } = useLocalSearchParams<{ id: string; seekTimestamp?: string }>();
  const router = useRouter();
  const lessonId = Number(id);

  const { downloadedLessonIds, refreshDownloads } = useDownloadStore();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [siblingLessons, setSiblingLessons] = useState<Lesson[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [watchedPercent, setWatchedPercent] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAttachments, setShowAttachments] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [currentStreakCount, setCurrentStreakCount] = useState(1);
  const [hasQuizAvailable, setHasQuizAvailable] = useState<boolean>(false);
  const [quizList, setQuizList] = useState<any[]>([]);

  const isOfflineReady = downloadedLessonIds.has(lessonId);

  const loadLesson = useCallback(async () => {
    try {
      // 1. Đọc từ SQLite trước
      let item = await catalogRepository.getLessonById(lessonId);
      if (item) {
        setLesson(item);
        if (item.hasQuiz) {
          setHasQuizAvailable(true);
          quizApi.getAllQuizzesByLesson(lessonId).then((ql) => setQuizList(ql)).catch(() => {});
        }
      }

      // 2. Tải trực tiếp từ Azure API
      try {
        const remoteItem = await catalogApi.getLessonById(lessonId);
        if (remoteItem) {
          item = remoteItem;
          setLesson(remoteItem);
          await catalogRepository.saveLesson(remoteItem);

          if (remoteItem.hasQuiz) {
            setHasQuizAvailable(true);
          } else {
            // Kiểm tra xem bài thi có tồn tại trên server không
            quizApi.getQuizPackageByLessonId(lessonId)
              .then((pkg) => {
                if (pkg && pkg.questions && pkg.questions.length > 0) {
                  setHasQuizAvailable(true);
                  setLesson((prev) => (prev ? { ...prev, hasQuiz: true } : prev));
                }
              })
              .catch(() => {});
          }

          // Lấy danh sách bài giảng cùng môn để làm nút Tiến / Lùi
          if (remoteItem.subjectId) {
            const siblings = await catalogApi.getLessonsBySubject(remoteItem.subjectId);
            if (Array.isArray(siblings)) {
              setSiblingLessons(siblings.sort((a, b) => a.sortOrder - b.sortOrder));
            }
          }

          // Đồng bộ tiến độ từ Server / Web (khôi phục trạng thái hoàn thành ngay cả khi vừa đăng nhập mobile)
          try {
            const serverProgress = await progressApi.getLessonProgress(lessonId);
            if (serverProgress && (serverProgress.isCompleted || serverProgress.percent > 0)) {
              await progressRepository.saveProgress(
                lessonId,
                serverProgress.watchedSeconds || 0,
                serverProgress.percent || 0,
                Boolean(serverProgress.isCompleted)
              );
              if (serverProgress.isCompleted) {
                setIsCompleted(true);
                setWatchedPercent(100);
              } else if (serverProgress.percent > 0) {
                setWatchedPercent((prev) => Math.max(prev, serverProgress.percent));
              }
            }
          } catch {
            // ignore server progress check error
          }
        }
      } catch {
        // Fallback SQLite khi không có Internet
      }

      // 3. Fallback: Nếu không tải được online và SQLite chưa có lesson, kiểm tra kho ngoại tuyến DownloadedMedia
      if (!item) {
        const downloaded = await downloadRepository.getByLessonId(lessonId);
        if (downloaded) {
          const offlineLesson: Lesson = {
            id: lessonId,
            subjectId: 0,
            title: downloaded.fileName || `Bài học #${lessonId}`,
            description: 'Bài học đã tải về bộ nhớ ngoại tuyến.',
            durationSeconds: 180,
            sortOrder: 1,
            version: 1,
            mediaAssetCount: 1,
            hasQuiz: false,
            isPublished: true,
            videoUrl: downloaded.localPath,
          };
          item = offlineLesson;
          setLesson(offlineLesson);
          await catalogRepository.saveLesson(offlineLesson);
        }
      }

      // 3. Kiểm tra tiến độ học từ SQLite
      const progress = await progressRepository.getByLessonId(lessonId);
      if (progress) {
        setIsCompleted((prev) => prev || progress.isCompleted === 1);
        setWatchedPercent((prev) => Math.max(prev, progress.percent || 0));
      }
    } catch (err) {
      console.warn('[Lesson] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  // Xác định bài trước và bài sau
  const currentIndex = siblingLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null;

  const handleCompleteLesson = async () => {
    try {
      setIsCompleted(true);
      setWatchedPercent(100);

      await progressRepository.saveProgress(lessonId, lesson?.durationSeconds || 180, 100.0, true);

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

      // Điểm danh streak thật trên Azure API
      try {
        const streak = await streakApi.pingStreak();
        if (streak && streak.currentStreak) {
          setCurrentStreakCount(streak.currentStreak);
        }
      } catch {
        // ignore
      }

      setShowStreakModal(true);
    } catch (err) {
      console.warn('[Lesson] Complete error:', err);
    }
  };

  const [lessonMediaInfo, setLessonMediaInfo] = useState<LessonMediaInfo | null>(null);
  const [lessonIsYoutube, setLessonIsYoutube] = useState<boolean>(false);

  useEffect(() => {
    if (!lessonId) {
      setLessonMediaInfo(null);
      setLessonIsYoutube(false);
      return;
    }

    if (lesson?.videoUrl && (parseVideoUrl(lesson.videoUrl).sourceType === 'youtube' || extractYoutubeVideoId(lesson.videoUrl))) {
      setLessonIsYoutube(true);
    }

    let isCancelled = false;
    catalogApi.getLessonMediaInfo(lessonId)
      .then((mediaInfo) => {
        if (isCancelled || !mediaInfo) return;
        setLessonMediaInfo(mediaInfo);
        const isYt =
          mediaInfo.sourceType === 'youtube' ||
          Boolean(mediaInfo.streamUrl && (parseVideoUrl(mediaInfo.streamUrl).sourceType === 'youtube' || extractYoutubeVideoId(mediaInfo.streamUrl))) ||
          Boolean(mediaInfo.externalUrl && (parseVideoUrl(mediaInfo.externalUrl).sourceType === 'youtube' || extractYoutubeVideoId(mediaInfo.externalUrl))) ||
          Boolean(mediaInfo.embedUrl && (parseVideoUrl(mediaInfo.embedUrl).sourceType === 'youtube' || extractYoutubeVideoId(mediaInfo.embedUrl)));
        
        setLessonIsYoutube(isYt);

        // Tự động dọn dẹp nếu bài học là YouTube nhưng máy lại lưu nhầm file offline test.mp4 trước đó
        if (isYt && downloadedLessonIds.has(lessonId)) {
          downloadRepository.deleteDownloadByLessonId(lessonId).then(() => {
            refreshDownloads();
          }).catch(() => {});
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLessonIsYoutube(false);
          setLessonMediaInfo(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [lessonId, lesson?.videoUrl]);

  const isYoutubeVideo = Boolean(
    lessonIsYoutube ||
      (lesson?.videoUrl && (parseVideoUrl(lesson.videoUrl).sourceType === 'youtube' || extractYoutubeVideoId(lesson.videoUrl))) ||
      (lessonMediaInfo?.sourceType === 'youtube')
  );

  const handleDownload = async () => {
    if (!lesson) return;

    if (isYoutubeVideo) {
      Alert.alert(
        'Không hỗ trợ tải',
        'Video bài học này được liên kết từ YouTube nên không hỗ trợ tải về máy để xem ngoại tuyến. Chỉ video tải lên hệ thống Azure mới hỗ trợ tải offline.'
      );
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    try {
      let downloadUrl = lesson.videoUrl;
      if (!downloadUrl) {
        const mediaInfo = await catalogApi.getLessonMediaInfo(lessonId);
        downloadUrl = mediaInfo?.streamUrl || mediaInfo?.externalUrl || undefined;
      }

      if (!downloadUrl) {
        Alert.alert('Thông báo', 'Bài học này chưa có tệp video trực tiếp để tải.');
        setDownloading(false);
        return;
      }

      const localUri = await downloadManager.downloadLessonVideo(
        lessonId,
        downloadUrl,
        lesson.title,
        (pct) => setDownloadProgress(pct)
      );

      if (localUri) {
        await catalogRepository.saveLesson({
          ...lesson,
          videoUrl: localUri,
        });
        await refreshDownloads();
        Alert.alert('Thành công! 💾', 'Đã tải bài học về bộ nhớ ngoại tuyến.');
      } else {
        Alert.alert('Lỗi', 'Không thể tải bài học. Vui lòng thử lại sau.');
      }
    } catch {
      Alert.alert('Lỗi', 'Quá trình tải ngoại tuyến gặp sự cố.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Đang nạp bài giảng..." />;
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

  const canTakeQuiz = isCompleted || watchedPercent >= 60;
  useEffect(() => {
    if (canTakeQuiz && quizList.length === 0) {
      quizApi.getAllQuizzesByLesson(lessonId).then((ql) => {
        if (ql && ql.length > 0) {
          setQuizList(ql);
          setHasQuizAvailable(true);
        }
      }).catch(() => {});
    }
  }, [canTakeQuiz, lessonId]);

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
        {/* Trình phát Video Hybrid kết nối Azure Media Stream */}
        <HybridVideoPlayer
          lessonId={lessonId}
          onlineStreamUrl={
            lesson.videoUrl ||
            lessonMediaInfo?.externalUrl ||
            lessonMediaInfo?.embedUrl ||
            lessonMediaInfo?.streamUrl
          }
          mediaInfo={lessonMediaInfo}
          durationSeconds={lesson.durationSeconds}
          seekTimestamp={seekTimestamp ? Number(seekTimestamp) : undefined}
          onCompleted={handleCompleteLesson}
        />

        {/* Thanh Điều Hướng: Nút Bài Trước & Bài Tiếp Theo */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, !prevLesson && styles.navBtnDisabled]}
            disabled={!prevLesson}
            onPress={() => {
              if (prevLesson) router.replace(`/lesson/${prevLesson.id}`);
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft color={prevLesson ? '#818CF8' : '#475569'} size={18} />
            <Text style={[styles.navBtnText, !prevLesson && styles.navBtnTextDisabled]} numberOfLines={1}>
              Bài trước
            </Text>
          </TouchableOpacity>

          <View style={styles.navIndicator}>
            <Text style={styles.navIndicatorText}>
              {currentIndex >= 0 ? `${currentIndex + 1}/${siblingLessons.length}` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.navBtn, !nextLesson && styles.navBtnDisabled]}
            disabled={!nextLesson}
            onPress={() => {
              if (nextLesson) router.replace(`/lesson/${nextLesson.id}`);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, !nextLesson && styles.navBtnTextDisabled]} numberOfLines={1}>
              Bài tiếp
            </Text>
            <ChevronRight color={nextLesson ? '#818CF8' : '#475569'} size={18} />
          </TouchableOpacity>
        </View>

        {/* Quick Toolbar: Attachments & Notebook & Sổ tay AI */}
        <View style={styles.toolBarRow}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setShowAttachments(true)}
            activeOpacity={0.7}
          >
            <Paperclip color="#38BDF8" size={16} />
            <Text style={styles.toolBtnText}>Tài liệu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => setShowNotebook(true)}
            activeOpacity={0.7}
          >
            <BookOpen color="#818CF8" size={16} />
            <Text style={styles.toolBtnText}>Ghi chú</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, styles.toolBtnAi]}
            onPress={() => {
              router.push({
                pathname: '/(tabs)/ai',
                params: {
                  lessonId: String(lesson.id),
                  lessonTitle: lesson.title,
                },
              });
            }}
            activeOpacity={0.7}
          >
            <Sparkles color="#C084FC" size={16} />
            <Text style={[styles.toolBtnText, { color: '#C084FC' }]}>Sổ tay AI</Text>
          </TouchableOpacity>
        </View>

        {/* Thông tin Bài học & Nút Hoàn thành / Tải Offline */}
        <View style={styles.lessonMetaSection}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonDesc}>
            {lesson.description || 'Xem video ngắn và làm bài trắc nghiệm củng cố kiến thức.'}
          </Text>

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

            {/* Nút tải về bài học - ẨN HOÀN TOÀN NẾU LÀ VIDEO YOUTUBE */}
            {!isYoutubeVideo && (
              <TouchableOpacity
                style={[
                  styles.downloadActionBtn,
                  isOfflineReady && styles.downloadActionBtnDone,
                ]}
                onPress={handleDownload}
                disabled={downloading}
                activeOpacity={0.8}
              >
                <Download color={isOfflineReady ? '#10B981' : '#818CF8'} size={18} />
                <Text style={[styles.downloadActionText, isOfflineReady && styles.downloadActionTextDone]}>
                  {isOfflineReady
                    ? 'Đã tải'
                    : downloading
                    ? `${downloadProgress}%`
                    : 'Tải offline'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Audio TTS Player */}
        <AudioTtsPlayer
          lessonId={lessonId}
          lessonTitle={lesson.title}
          lessonContent={lesson.description || lesson.title}
        />

        {/* Khối bài thi trắc nghiệm */}
        {(lesson.hasQuiz || hasQuizAvailable) ? (
          <View style={styles.quizCtaCard}>
            <View style={styles.quizIconBox}>
              <FileQuestion color={canTakeQuiz ? '#F59E0B' : '#64748B'} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quizCtaTitle}>Bài thi trắc nghiệm củng cố</Text>
              <Text style={styles.quizCtaSub}>
                {canTakeQuiz
                  ? 'Kiểm tra ngay kiến thức vừa học'
                  : `Cần xem ≥60% video để mở khóa (Hiện tại: ${Math.round(watchedPercent)}%)`}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.startQuizBtn, !canTakeQuiz && styles.startQuizBtnDisabled]}
              onPress={() => {
                if (!canTakeQuiz) {
                  Alert.alert(
                    'Khóa bài thi',
                    `Bạn cần xem tối thiểu 60% thời lượng bài học để làm trắc nghiệm (Tiến độ hiện tại: ${Math.round(watchedPercent)}%).`
                  );
                  return;
                }
                router.push(`/quiz/${lessonId}`);
              }}
              activeOpacity={0.8}
            >
              {canTakeQuiz ? (
                <Text style={styles.startQuizText}>Làm bài thi</Text>
              ) : (
                <Lock color="#94A3B8" size={16} />
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Modals */}
      <LessonAttachmentsModal
        visible={showAttachments}
        lessonId={lessonId}
        onClose={() => setShowAttachments(false)}
      />

      <NotebookModal
        visible={showNotebook}
        lessonId={lessonId}
        onClose={() => setShowNotebook(false)}
      />

      <DuolingoStreakCelebrationModal
        visible={showStreakModal}
        streakCount={currentStreakCount}
        onClose={() => {
          setShowStreakModal(false);
          // Gợi ý tự động chuyển sang bài tiếp theo nếu có
          if (nextLesson) {
            Alert.alert(
              'Tiếp tục bài tiếp theo?',
              `Bạn có muốn chuyển sang "${nextLesson.title}" không?`,
              [
                { text: 'Ở lại', style: 'cancel' },
                {
                  text: 'Học tiếp',
                  onPress: () => router.replace(`/lesson/${nextLesson.id}`),
                },
              ]
            );
          }
        }}
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E1428',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  navBtnDisabled: {
    backgroundColor: '#090D1A',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  navBtnText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '700',
  },
  navBtnTextDisabled: {
    color: '#475569',
  },
  navIndicator: {
    paddingHorizontal: 8,
  },
  navIndicatorText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  toolBarRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D1A',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    gap: 6,
  },
  toolBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  toolBtnAi: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(192, 132, 252, 0.35)',
  },
  lessonMetaSection: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  lessonTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  lessonDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  completeBtnDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  completeBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  completeBtnTextDone: { color: '#10B981' },
  downloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E1428',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  downloadActionBtnDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  downloadActionBtnDisabled: {
    backgroundColor: '#090D1A',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.55,
  },
  downloadActionText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  downloadActionTextDone: { color: '#10B981' },
  quizCtaCard: {
    backgroundColor: '#0B0F19',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  quizIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizCtaTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  quizCtaSub: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  startQuizBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startQuizBtnDisabled: {
    backgroundColor: '#1E293B',
  },
  startQuizText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  backBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  backBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
