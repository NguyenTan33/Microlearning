import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  GraduationCap,
  LogOut,
  BookOpen,
  Compass,
  FolderKanban,
  Users,
  Shield,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ListOrdered,
  PlusCircle,
  Bookmark,
  BookMarked,
  BarChart3,
  Heart,
  HelpCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
} from 'lucide-react';
import type { Course, CourseDetail, Lesson } from '../../types/catalog.types';
import type { MediaBookmark } from '../../types/mediaBookmark.types';
import { VideoLessonPlayer } from '../player/VideoLessonPlayer';
import { AudioTtsPlayer } from '../player/AudioTtsPlayer';
import { InteractiveQuizCard } from '../quiz/InteractiveQuizCard';
import { CourseCatalogView } from '../catalog/CourseCatalogView';
import { BookmarkLibraryView } from '../bookmarks/BookmarkLibraryView';
import { NotebookHubView } from '../notebook/NotebookHubView';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { LessonSidebar } from './LessonSidebar';
import { CourseManagementModal } from '../management/CourseManagementModal';
import { AdminUserManagementModal } from '../management/AdminUserManagementModal';
import { UserProfileModal } from '../profile/UserProfileModal';
import { StreakCrownBadge } from '../common/StreakCrownBadge';
import { MistakeVaultModal } from '../quiz/MistakeVaultModal';
import { FavoriteSubjectsDrawer } from '../common/FavoriteSubjectsDrawer';
import { DuolingoStreakCelebrationModal } from '../common/DuolingoStreakCelebrationModal';
import { useAppHistoryNavigation } from '../../hooks/useAppHistoryNavigation';
import type { UserProfile } from '../../types/userProfile.types';
import { getCurrentUser } from '../../utils/tokenHelper';
import { mediaBookmarkService } from '../../services/mediaBookmarkService';
import { userProfileService } from '../../services/userProfileService';
import { catalogApi } from '../../services/catalogApi';
import { progressApi } from '../../services/progressApi';
import { enrollmentApi } from '../../services/enrollmentApi';
import { streakApi } from '../../services/streakApi';
import { SAMPLE_COURSES } from '../../services/sampleCatalogData';

interface StudyDashboardProps {
  onLogout: () => void;
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({ onLogout }) => {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isTeacherOrAdmin = Boolean(currentUser?.isAdmin || currentUser?.isTeacher);
  const [isCourseMgmtOpen, setIsCourseMgmtOpen] = useState<boolean>(false);
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    userProfileService.getUserProfile(currentUser?.userId || '', {
      fullName: currentUser?.displayName,
      phoneNumber: currentUser?.phoneNumber,
      email: currentUser?.email,
      role: currentUser?.isAdmin ? 'Quản trị viên' : currentUser?.isTeacher ? 'Giáo viên' : 'Học viên',
    })
  );
  const [currentView, setCurrentView] = useState<'WORKSPACE' | 'CATALOG' | 'BOOKMARKS' | 'NOTEBOOK'>('CATALOG');
  const storageProgressKey = useMemo(
    () => `microlearn_completed_lessons_${currentUser?.userId || 'guest'}`,
    [currentUser?.userId]
  );

  // Khôi phục mốc tiến độ đã hoàn thành từ LocalStorage để không bao giờ bị mất khi F5 / mở lại web
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>(() => {
    try {
      const key = `microlearn_completed_lessons_${currentUser?.userId || 'guest'}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Đồng bộ lại mốc tiến độ và số lượng cắm cờ theo đúng tài khoản người dùng khi chuyển acc / đăng nhập
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageProgressKey);
      setCompletedLessonIds(raw ? JSON.parse(raw) : []);
    } catch {
      setCompletedLessonIds([]);
    }
    setTotalBookmarksCount(mediaBookmarkService.getAllBookmarksCount());
  }, [storageProgressKey]);

  // Tự động sao lưu tiến độ khi danh sách bài học hoàn thành thay đổi
  useEffect(() => {
    try {
      localStorage.setItem(storageProgressKey, JSON.stringify(completedLessonIds));
    } catch {
      // ignore
    }
  }, [completedLessonIds, storageProgressKey]);

  const [initialSeekTimestamp, setInitialSeekTimestamp] = useState<number | null>(null);
  const [totalBookmarksCount, setTotalBookmarksCount] = useState<number>(() =>
    mediaBookmarkService.getAllBookmarksCount()
  );

  // Upgrade Features Modals (Mistake Vault & Favorite Subjects)
  const [isMistakeVaultOpen, setIsMistakeVaultOpen] = useState<boolean>(false);
  const [isFavoriteDrawerOpen, setIsFavoriteDrawerOpen] = useState<boolean>(false);

  // Danh mục toàn bộ khóa học thực tế từ API catalog
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);

  // Khóa học và bài học hiện tại đang học
  const [currentCourse, setCurrentCourse] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);

  // Trạng thái tiến độ xem từng bài học độc lập (lessonId -> percent) để chống tràn tiến độ chéo
  const [lessonWatchedMap, setLessonWatchedMap] = useState<Record<number, number>>({});
  const [isQuizOpen, setIsQuizOpen] = useState<boolean>(false);

  // Trạng thái Hiệu ứng Hoạt họa bay lên chúc mừng Streak
  const [showStreakFlyUp, setShowStreakFlyUp] = useState<boolean>(false);
  const [streakFlyUpInfo, setStreakFlyUpInfo] = useState<{ currentStreak: number; message: string } | null>(null);

  // Ref lưu trạng thái bắt đầu của bài học hiện tại (để kiểm tra bài chưa học 0% hoặc < 60%)
  const lessonInitialStateRef = React.useRef<{
    lessonId: number;
    initialPercent: number;
    wasCompleted: boolean;
  }>({
    lessonId: 0,
    initialPercent: 0,
    wasCompleted: false,
  });

  // Khi chuyển bài giảng, đồng bộ tiến độ đã xem của bài học đó và thu gọn quiz
  useEffect(() => {
    setIsQuizOpen(false);
    if (activeLesson) {
      const lessonId = activeLesson.id;
      const wasComp = completedLessonIds.includes(lessonId);
      progressApi
        .getLessonProgress(lessonId)
        .then((prog) => {
          const currentP = prog ? Number(prog.percent) || 0 : 0;
          const isComp = prog ? Boolean(prog.isCompleted) || wasComp : wasComp;
          lessonInitialStateRef.current = {
            lessonId,
            initialPercent: currentP,
            wasCompleted: isComp,
          };
          setLessonWatchedMap((prev) => ({
            ...prev,
            [lessonId]: currentP,
          }));
        })
        .catch(() => {
          lessonInitialStateRef.current = {
            lessonId,
            initialPercent: 0,
            wasCompleted: wasComp,
          };
          setLessonWatchedMap((prev) => ({
            ...prev,
            [lessonId]: 0,
          }));
        });
    }
  }, [activeLesson?.id]);

  // Trạng thái Responsive Mobile Drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobileCurriculumOpen, setIsMobileCurriculumOpen] = useState<boolean>(false);

  // Khóa cuộn trang nền khi mở danh mục bài giảng toàn màn hình trên Mobile để tránh cuộn kép
  useEffect(() => {
    if (isMobileCurriculumOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.overscrollBehavior = originalOverscroll;
      };
    }
  }, [isMobileCurriculumOpen]);

  // 1. Tải khóa học và bài học ban đầu trực tuyến & Đồng bộ Max Tiến Độ Chuẩn
  const loadInitialCourse = useCallback(async (courseId?: number) => {
    setLoadingWorkspace(true);
    try {
      let targetCourse: CourseDetail | null = null;
      let targetLesson: Lesson | null = null;

      // 1. Tải danh mục khóa học thật từ server
      let courses: Course[] = [];
      try {
        courses = await catalogApi.getAllCourses();
        if (courses.length > 0) {
          setCatalogCourses(courses);
        }
      } catch {
        // ignore
      }

      // 2. Xác định ID khóa học cần mở:
      // (1) param courseId truyền vào -> (2) localStorage lưu lần học gần nhất -> (3) khóa đầu tiên trong danh mục -> (4) default 1
      let targetId = courseId;
      if (!targetId) {
        try {
          const lastCourseId = localStorage.getItem('microlearning_last_course_id');
          if (lastCourseId) {
            const parsed = parseInt(lastCourseId, 10);
            if (!isNaN(parsed) && (courses.length === 0 || courses.some((c) => c.id === parsed))) {
              targetId = parsed;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!targetId && courses.length > 0) {
        targetId = courses[0].id;
      }

      if (targetId) {
        try {
          targetCourse = await catalogApi.getCourseById(targetId);
        } catch {
          targetCourse = null;
        }
      }

      // Nếu targetCourse chưa có hoặc không có học phần, dùng ngay SAMPLE_COURSES
      if (!targetCourse || !targetCourse.subjects || targetCourse.subjects.length === 0) {
        targetCourse = SAMPLE_COURSES[0];
      }

      // Lưu lại khóa học đang học để khi F5 / mở lại app không bị nhảy sai khóa và tự động ghi danh
      if (targetCourse?.id) {
        try {
          localStorage.setItem('microlearning_last_course_id', String(targetCourse.id));
        } catch {}
        enrollmentApi.enrollCourse(targetCourse.id).catch(() => {});
      }

      // Tìm bài học đầu tiên trong targetCourse
      for (const subj of targetCourse.subjects) {
        if (subj.lessons && subj.lessons.length > 0) {
          targetLesson = subj.lessons[0];
          break;
        }
      }

      if (!targetLesson) {
        targetCourse = SAMPLE_COURSES[0];
        targetLesson = SAMPLE_COURSES[0].subjects[0].lessons![0];
      }

      setCurrentCourse(targetCourse);
      setActiveLesson(targetLesson);

      // Đồng bộ Max tiến độ từ Máy Chủ cho TẤT CẢ các khóa học (không truyền courseId để tránh bị xóa sạch tiến độ các khóa khác)
      try {
        const completedIdsFromServer = await progressApi.getCompletedLessonIds();
        if (completedIdsFromServer && completedIdsFromServer.length > 0) {
          setCompletedLessonIds((prev) => {
            const merged = Array.from(new Set([...prev, ...completedIdsFromServer]));
            try {
              localStorage.setItem(storageProgressKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch {
        // ignore
      }

      // Kiểm tra tiến độ tổng thể khóa học: nếu đạt 100% thì tự động đánh dấu toàn bộ bài học
      if (targetCourse?.id) {
        progressApi
          .getCourseProgress(targetCourse.id)
          .then((cp) => {
            if (cp && cp.overallPercent >= 100 && targetCourse?.subjects) {
              const allCourseLessonIds: number[] = [];
              targetCourse.subjects.forEach((s) => s.lessons?.forEach((l) => allCourseLessonIds.push(l.id)));
              if (allCourseLessonIds.length > 0) {
                setCompletedLessonIds((prev) => {
                  const merged = Array.from(new Set([...prev, ...allCourseLessonIds]));
                  try {
                    localStorage.setItem(storageProgressKey, JSON.stringify(merged));
                  } catch {}
                  return merged;
                });
              }
            }
          })
          .catch(() => {});
      }

      // Kiểm tra tiến độ của bài học hiện tại (bắt buộc kiểm tra isCompleted từ máy chủ)
      if (targetLesson) {
        progressApi
          .getLessonProgress(targetLesson.id)
          .then((p) => {
            if (p) {
              setLessonWatchedMap((prev) => ({
                ...prev,
                [targetLesson!.id]: p.percent,
              }));
              if (p.isCompleted) {
                setCompletedLessonIds((prev) => {
                  const merged = Array.from(new Set([...prev, targetLesson!.id]));
                  try {
                    localStorage.setItem(storageProgressKey, JSON.stringify(merged));
                  } catch {}
                  return merged;
                });
              }
            }
          })
          .catch(() => {});
      }
    } catch {
      setCurrentCourse(SAMPLE_COURSES[0]);
      setActiveLesson(SAMPLE_COURSES[0].subjects[0].lessons![0]);
    } finally {
      setLoadingWorkspace(false);
    }
  }, [storageProgressKey]);

  useEffect(() => {
    loadInitialCourse();
  }, [loadInitialCourse]);

  // Lắng nghe sự kiện cập nhật tiến độ từ video player hoặc quiz
  useEffect(() => {
    const handleProgressUpdate = async () => {
      try {
        const serverIds = await progressApi.getCompletedLessonIds();
        if (serverIds && serverIds.length > 0) {
          setCompletedLessonIds((prev) => {
            const merged = Array.from(new Set([...prev, ...serverIds]));
            try {
              localStorage.setItem(storageProgressKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('lesson-progress-updated', handleProgressUpdate);
    return () => {
      window.removeEventListener('lesson-progress-updated', handleProgressUpdate);
    };
  }, [storageProgressKey]);

  // Feature 5: Native Browser History Navigation stack
  const { pushState } = useAppHistoryNavigation(
    { view: 'catalog', title: 'Khám phá khóa học' },
    (targetState) => {
      if (targetState.view === 'catalog') {
        setCurrentView('CATALOG');
      } else if (targetState.view === 'notebook') {
        setCurrentView('NOTEBOOK');
      } else if (targetState.view === 'bookmarks') {
        setCurrentView('BOOKMARKS');
      } else if (targetState.view === 'lesson' || targetState.view === 'course') {
        if (targetState.courseId && targetState.courseId !== currentCourse?.id) {
          loadInitialCourse(targetState.courseId);
        }
        if (targetState.lessonId && currentCourse?.subjects) {
          for (const subj of currentCourse.subjects) {
            const found = subj.lessons?.find((l) => l.id === targetState.lessonId);
            if (found) {
              setActiveLesson(found);
              break;
            }
          }
        }
        setCurrentView('WORKSPACE');
      }
    }
  );

  // Xử lý chuyển bài học
  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setCurrentView('WORKSPACE');
    setIsMobileCurriculumOpen(false); // Đóng drawer trên mobile khi đã chọn bài
    pushState({
      view: 'lesson',
      courseId: currentCourse?.id,
      lessonId: lesson.id,
      title: lesson.title,
    });

    progressApi
      .getLessonProgress(lesson.id)
      .then((p) => {
        const currentP = p ? Number(p.percent) || 0 : 0;
        setLessonWatchedMap((prev) => ({
          ...prev,
          [lesson.id]: currentP,
        }));
        if (p && p.isCompleted) {
          setCompletedLessonIds((prev) => {
            const merged = Array.from(new Set([...prev, lesson.id]));
            try {
              localStorage.setItem(storageProgressKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {
        setLessonWatchedMap((prev) => ({
          ...prev,
          [lesson.id]: 0,
        }));
      });
  };

  // Chọn khóa học từ danh mục
  const handleSelectCourseFromCatalog = async (courseId: number) => {
    try {
      localStorage.setItem('microlearning_last_course_id', String(courseId));
    } catch {}
    enrollmentApi.enrollCourse(courseId).catch(() => {});
    await loadInitialCourse(courseId);
    setCurrentView('WORKSPACE');
    pushState({
      view: 'course',
      courseId,
      title: 'Phòng học',
    });
  };

  // Feature 10: Bay nhanh tới môn học yêu thích (Quick Travel & Smooth Scroll)
  const handleNavigateToFavoriteSubject = async (courseId: number, subjectId: number) => {
    setIsFavoriteDrawerOpen(false);
    try {
      let targetCourse = currentCourse;
      if (!targetCourse || targetCourse.id !== courseId) {
        const fetched = await catalogApi.getCourseById(courseId);
        if (fetched) {
          targetCourse = fetched;
          setCurrentCourse(fetched);
        }
      }

      if (targetCourse?.subjects) {
        const foundSubj = targetCourse.subjects.find((s) => s.id === subjectId);
        if (foundSubj && foundSubj.lessons && foundSubj.lessons.length > 0) {
          setActiveLesson(foundSubj.lessons[0]);
          pushState({
            view: 'lesson',
            courseId: targetCourse.id,
            subjectId,
            lessonId: foundSubj.lessons[0].id,
            title: `${foundSubj.title} - ${foundSubj.lessons[0].title}`,
          });
        }
      }
      setCurrentView('WORKSPACE');

      setTimeout(() => {
        const el = document.getElementById(`subject-${subjectId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
    } catch (err) {
      console.warn('Lỗi khi điều hướng đến môn học yêu thích:', err);
    }
  };

  // Ghi nhận hoàn thành bài học và tự động tăng Streak ngầm nếu đủ điều kiện (chống farm tay)
  const handleLessonCompleted = async () => {
    if (!activeLesson) return;

    if (currentCourse?.id) {
      enrollmentApi.enrollCourse(currentCourse.id).catch(() => {});
    }

    setCompletedLessonIds((prev) => {
      const merged = Array.from(new Set([...prev, activeLesson.id]));
      try {
        localStorage.setItem(storageProgressKey, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    setLessonWatchedMap((prev) => ({
      ...prev,
      [activeLesson.id]: 100,
    }));

    // 1. Lưu tiến độ hoàn thành bài học lên máy chủ
    try {
      await progressApi.saveProgress(
        activeLesson.id,
        activeLesson.durationSeconds || 300,
        100
      );
    } catch (err) {
      console.warn('Lỗi khi lưu tiến độ bài học:', err);
    }

    // 2. Kiểm tra điều kiện tiên quyết để tăng Streak ngầm (chống farm tay):
    // - Điều kiện 1: Bài học mới (lần đầu học 0% hoặc trước phiên này học dở dưới 60%, chưa từng hoàn thành trước đó)
    // - Điều kiện 2: Mỗi ngày chỉ được tính tối đa 1 lần duy nhất
    const initialPercent = lessonInitialStateRef.current.initialPercent;
    const wasCompletedBefore = lessonInitialStateRef.current.wasCompleted;
    const isLessonEligible = !wasCompletedBefore && initialPercent < 60;

    const todayDateKey = new Date().toISOString().slice(0, 10);
    const lastAwardedDate = localStorage.getItem('microlearn_streak_awarded_date');
    const isNewDayForStreak = lastAwardedDate !== todayDateKey;

    if (isLessonEligible && isNewDayForStreak) {
      try {
        const streakData = await streakApi.pingDailyActivity();
        localStorage.setItem('microlearn_streak_awarded_date', todayDateKey);
        setStreakFlyUpInfo({
          currentStreak: streakData.currentStreak,
          message: streakData.statusMessage || 'Bạn đã hoàn thành bài học mới và duy trì chuỗi học tập hôm nay!',
        });
        setShowStreakFlyUp(true);
      } catch (err) {
        console.warn('Lỗi khi ghi nhận streak:', err);
      }
    }

    // Đánh dấu lại trạng thái bài hiện tại đã hoàn thành để không kích hoạt lặp lại trong phiên
    lessonInitialStateRef.current = {
      lessonId: activeLesson.id,
      initialPercent: 100,
      wasCompleted: true,
    };

    // 3. Phát sự kiện cập nhật tiến độ toàn cục để Header cập nhật ngọn lửa Streak ngay lập tức
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lesson-progress-updated'));
    }
  };

  // Cập nhật số lượng mốc cắm cờ khi chuyển view
  useEffect(() => {
    setTotalBookmarksCount(mediaBookmarkService.getAllBookmarksCount());
  }, [currentView]);

  // Lắng nghe cập nhật thông tin hồ sơ và avatar thời gian thực
  useEffect(() => {
    const unsubscribe = userProfileService.listenProfileChanges((updated) => {
      setUserProfile(updated);
    });
    return unsubscribe;
  }, []);

  // Tính danh sách bài học phẳng để hỗ trợ Prev / Next Lesson
  const effectiveCourse = currentCourse || SAMPLE_COURSES[0];
  const effectiveLesson = activeLesson || SAMPLE_COURSES[0].subjects[0].lessons![0];

  // Tiến độ xem video của bài giảng hiện tại (cách ly độc lập từng bài, chống tràn tiến độ)
  const currentLessonWatchedPercent = useMemo(() => {
    if (!effectiveLesson) return 0;
    if (completedLessonIds.includes(effectiveLesson.id)) return 100;
    const mapped = lessonWatchedMap[effectiveLesson.id];
    if (typeof mapped === 'number') {
      return Math.min(100, Math.max(0, mapped));
    }
    return 0;
  }, [effectiveLesson, completedLessonIds, lessonWatchedMap]);

  // Trạng thái mở khóa trắc nghiệm: Học viên đã hoàn thành bài hoặc đã xem >= 60%
  const isQuizUnlocked = Boolean(
    effectiveLesson &&
      (completedLessonIds.includes(effectiveLesson.id) || currentLessonWatchedPercent >= 60)
  );

  const flatLessons: Lesson[] = useMemo(() => {
    const list: Lesson[] = [];
    effectiveCourse.subjects?.forEach((s) => {
      s.lessons?.forEach((l) => list.push(l));
    });
    return list;
  }, [effectiveCourse]);

  // Xử lý khi chọn một mốc cắm cờ từ Thư viện Mục Đánh Dấu
  const handleSelectBookmarkFromLibrary = useCallback(
    (bm: MediaBookmark) => {
      // 1. Nếu mốc cắm cờ thuộc khóa học khác, nạp khóa học đó
      if (bm.courseId && currentCourse?.id !== bm.courseId) {
        catalogApi
          .getCourseById(bm.courseId)
          .then((c) => {
            if (c) setCurrentCourse(c);
          })
          .catch(() => {});
      }

      // 2. Tìm bài giảng tương ứng
      let targetLesson = flatLessons.find((l) => l.id === bm.lessonId);
      if (!targetLesson) {
        for (const c of SAMPLE_COURSES) {
          for (const s of c.subjects) {
            const l = s.lessons?.find((item) => item.id === bm.lessonId);
            if (l) {
              setCurrentCourse(c);
              targetLesson = l;
              break;
            }
          }
        }
      }

      if (targetLesson) {
        setActiveLesson(targetLesson);
      }

      // 3. Đặt mốc thời gian để video player tự động tua tới và phát ngay
      setInitialSeekTimestamp(bm.timestamp);

      // 4. Mở Phòng học
      setCurrentView('WORKSPACE');
      setIsMobileMenuOpen(false);
    },
    [currentCourse, flatLessons]
  );

  const currentLessonIndex = flatLessons.findIndex((l) => l.id === effectiveLesson.id);
  const prevLesson = currentLessonIndex > 0 ? flatLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < flatLessons.length - 1
      ? flatLessons[currentLessonIndex + 1]
      : null;

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* =========================================================================
          TOP NAVIGATION HEADER (Tương thích Desktop, Laptop, Tablet, Mobile) - v2.1.0
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#070B17]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 lg:px-8 py-2.5 transition-colors">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2.5">
          {/* Brand Logo & Tiêu đề */}
          <div
            onClick={() => setCurrentView('CATALOG')}
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#080D1A] rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-4.5 h-4.5 text-cyan-300" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                MicroLearn
              </span>
              <p className="text-[10px] text-slate-400 hidden 2xl:block leading-none mt-0.5">
                Học tập &amp; Đánh giá Năng lực
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Đồng bộ tuyệt đối chiều cao h-9) */}
          <nav className="hidden md:flex items-center gap-1 p-0.5 rounded-xl bg-slate-900/90 border border-white/10 h-9 shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => {
                setCurrentView('CATALOG');
                pushState({ view: 'catalog', title: 'Khám phá khóa học' });
              }}
              className={`h-full px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                currentView === 'CATALOG'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Khóa học</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView('WORKSPACE');
                pushState({
                  view: 'lesson',
                  courseId: effectiveCourse.id,
                  lessonId: effectiveLesson.id,
                  title: effectiveLesson.title,
                });
              }}
              className={`h-full px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                currentView === 'WORKSPACE'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Phòng học</span>
            </button>

            {/* Nút Sổ tay NoteBook AI */}
            <button
              type="button"
              onClick={() => {
                setCurrentView('NOTEBOOK');
                pushState({ view: 'notebook', title: 'NoteBook AI' });
              }}
              className={`h-full px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                currentView === 'NOTEBOOK'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Sổ tay học tập thông minh & Trợ lý hỏi đáp AI (Open Notebook)"
            >
              <BookMarked className="w-3.5 h-3.5 text-purple-400" />
              <span>NoteBook</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-400/20 text-purple-300 text-[10px] font-bold">
                AI
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentView('BOOKMARKS');
                pushState({ view: 'bookmarks', title: 'Mục đánh dấu' });
              }}
              className={`h-full px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                currentView === 'BOOKMARKS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mục đánh dấu</span>
              {totalBookmarksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-bold">
                  {totalBookmarksCount}
                </span>
              )}
            </button>
          </nav>

          {/* Desktop Action Buttons & Tiện ích học tập (Thống nhất chuẩn chiều cao h-9) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Feature 10: Môn học yêu thích (Đưa lên Header trên cùng) */}
            <button
              type="button"
              onClick={() => setIsFavoriteDrawerOpen(true)}
              className="h-9 px-2.5 lg:px-3 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-rose-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Danh sách môn học yêu thích"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/80 shrink-0" />
              <span className="hidden xl:inline">Môn yêu thích</span>
              <span className="inline xl:hidden">Yêu thích</span>
            </button>

            {/* Feature 9: Sổ tay câu hỏi sai (Đưa lên Header trên cùng) */}
            <button
              type="button"
              onClick={() => setIsMistakeVaultOpen(true)}
              className="h-9 px-2.5 lg:px-3 rounded-xl bg-slate-900/80 hover:bg-amber-950/40 border border-white/10 hover:border-amber-500/40 text-xs font-semibold text-amber-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Sổ tay ôn luyện các câu làm sai"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Sổ câu sai</span>
            </button>

            {/* Feature 8: Streak 🔥 & Master Crown 👑 */}
            <StreakCrownBadge />

            {/* Nút Studio Đăng Tải Bài Giảng & Quiz (Chỉ hiện cho Teacher & Admin) */}
            {isTeacherOrAdmin && (
              <button
                type="button"
                onClick={() => setIsCourseMgmtOpen(true)}
                className="h-9 px-2.5 lg:px-3 rounded-xl bg-gradient-to-r from-indigo-900/90 to-purple-900/90 hover:from-indigo-800 hover:to-purple-800 border border-indigo-500/40 text-xs font-bold text-cyan-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Studio Đăng tải bài giảng, học phần và soạn đề thi quizz"
              >
                <FolderKanban className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Studio</span>
              </button>
            )}

            {/* Quản lý người dùng (Dành cho Admin) */}
            {currentUser?.isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminUsersOpen(true)}
                className="h-9 px-2.5 lg:px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-bold text-purple-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Quản Lý Tài Khoản Người Dùng"
              >
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Tài khoản</span>
              </button>
            )}

            {/* User Profile & Role Badge */}
            {currentUser && (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="h-9 px-2.5 rounded-xl text-xs font-semibold border bg-slate-900/80 hover:bg-slate-800 border-white/10 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm group active:scale-95 flex items-center gap-2 whitespace-nowrap shrink-0"
                title={`Hồ sơ: ${userProfile.fullName || currentUser.displayName} - Bấm để xem Dashboard học tập & Đổi mật khẩu`}
              >
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.fullName}
                    className="w-5 h-5 rounded-lg object-cover border border-indigo-400/50 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                    {userProfile.fullName ? userProfile.fullName.trim()[0].toUpperCase() : 'U'}
                  </div>
                )}
                <span className="truncate max-w-[85px] lg:max-w-[120px] group-hover:text-cyan-300 transition-colors">
                  {userProfile.fullName || currentUser.displayName}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5 uppercase font-bold shrink-0 hidden sm:inline">
                  {currentUser.isAdmin ? 'Admin' : currentUser.isTeacher ? 'Teacher' : 'Student'}
                </span>
              </button>
            )}

            {/* Nút Đăng xuất */}
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer shrink-0 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Controls: Avatar + Streak + Studio + Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-1.5">
            <StreakCrownBadge />

            {/* Nút Avatar người dùng trên Mobile Header (Chạm để mở Dashboard & Đổi mật khẩu) */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="h-9 w-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer active:scale-95 shrink-0"
              title={`Hồ sơ: ${userProfile.fullName || currentUser?.displayName}`}
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.fullName}
                  className="w-6 h-6 rounded-lg object-cover border border-indigo-400/50 shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-xs text-white font-bold shrink-0">
                  {userProfile.fullName ? userProfile.fullName.trim()[0].toUpperCase() : 'U'}
                </div>
              )}
            </button>

            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsCourseMgmtOpen(true)}
                className="h-9 flex items-center gap-1 px-2.5 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-bold whitespace-nowrap active:scale-95 shrink-0"
                title="Studio Đăng tải"
              >
                <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                <span>Studio</span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer active:scale-95 shrink-0"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-white/10 mt-3 space-y-2 animate-fadeIn">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setCurrentView('CATALOG');
                  pushState({ view: 'catalog', title: 'Khám phá khóa học' });
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  currentView === 'CATALOG'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-900/80 border-white/5 text-slate-300'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Khóa học</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView('WORKSPACE');
                  pushState({
                    view: 'lesson',
                    courseId: effectiveCourse.id,
                    lessonId: effectiveLesson.id,
                    title: effectiveLesson.title,
                  });
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  currentView === 'WORKSPACE'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-900/80 border-white/5 text-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Phòng học</span>
              </button>

              {/* Nút Sổ tay NoteBook AI */}
              <button
                onClick={() => {
                  setCurrentView('NOTEBOOK');
                  pushState({ view: 'notebook', title: 'NoteBook AI' });
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${
                  currentView === 'NOTEBOOK'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white'
                    : 'bg-slate-900/80 border-white/5 text-slate-300'
                }`}
              >
                <BookMarked className="w-4 h-4 text-purple-400 shrink-0" />
                <span>NoteBook</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView('BOOKMARKS');
                  pushState({ view: 'bookmarks', title: 'Mục đánh dấu' });
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${
                  currentView === 'BOOKMARKS'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-900/80 border-white/5 text-slate-300'
                }`}
              >
                <Bookmark className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">Mục cờ {totalBookmarksCount > 0 ? `(${totalBookmarksCount})` : ''}</span>
              </button>

              {/* Feature 10: Môn học yêu thích */}
              <button
                onClick={() => {
                  setIsFavoriteDrawerOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="p-2 rounded-xl border border-rose-500/20 bg-rose-950/20 text-rose-300 text-xs font-bold flex items-center justify-center gap-1"
              >
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/80 shrink-0" />
                <span>Yêu thích</span>
              </button>

              {/* Feature 9: Sổ tay câu hỏi sai */}
              <button
                onClick={() => {
                  setIsMistakeVaultOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="p-2 rounded-xl border border-amber-500/20 bg-amber-950/20 text-amber-300 text-xs font-bold flex items-center justify-center gap-1"
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Sổ câu sai</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setIsProfileModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-left"
              >
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.fullName}
                    className="w-6 h-6 rounded-lg object-cover border border-indigo-400/50 shrink-0"
                  />
                ) : (
                  <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                )}
                <div className="flex flex-col">
                  <span className="text-white font-semibold text-xs truncate max-w-[170px]">
                    {userProfile.fullName || currentUser?.displayName || 'Học viên'}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-medium">Dashboard học tập &amp; Hồ sơ</span>
                </div>
              </button>
              <button
                onClick={onLogout}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          MAIN CONTENT AREA
      ========================================================================= */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 pb-24 md:pb-6 flex-1">
        {/* VIEW 1: KHÁM PHÁ KHÓA HỌC (CATALOG) */}
        {currentView === 'CATALOG' && (
          <CourseCatalogView
            onSelectCourse={handleSelectCourseFromCatalog}
            onOpenStudio={isTeacherOrAdmin ? () => setIsCourseMgmtOpen(true) : undefined}
          />
        )}

        {/* VIEW 2: THƯ VIỆN TOÀN BỘ MỐC CẮM CỜ ĐÁNH DẤU (BOOKMARKS) */}
        {currentView === 'BOOKMARKS' && (
          <BookmarkLibraryView
            onSelectBookmark={handleSelectBookmarkFromLibrary}
            onGoToWorkspace={() => setCurrentView('WORKSPACE')}
          />
        )}

        {/* VIEW 3: SỔ TAY AI NOTEBOOK & TRỢ LÝ RAG */}
        {currentView === 'NOTEBOOK' && (
          <ErrorBoundary fallbackTitle="Không thể tải giao diện Sổ tay AI">
            <NotebookHubView
              currentCourse={effectiveCourse}
              activeLesson={effectiveLesson}
              onBackToWorkspace={() => setCurrentView('WORKSPACE')}
              currentUser={currentUser}
            />
          </ErrorBoundary>
        )}

        {/* VIEW 2: PHÒNG HỌC TRỰC TUYẾN (WORKSPACE) */}
        {currentView === 'WORKSPACE' && (
          <div className="space-y-6">
            {/* Mobile Curriculum Bar: Nút mở danh mục bài học trên màn hình nhỏ */}
            <div className="lg:hidden flex items-center justify-between gap-3 p-3 rounded-xl bg-[#090D1A] border border-white/10 shadow-lg">
              <button
                onClick={() => setIsMobileCurriculumOpen(true)}
                className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <ListOrdered className="w-4 h-4 text-cyan-300" />
                <span>Mục lục bài giảng ({flatLessons.length} bài)</span>
              </button>

              <span className="text-xs text-slate-400 truncate max-w-[180px]">
                Bài {currentLessonIndex + 1}/{flatLessons.length}
              </span>
            </div>

            {/* Mobile Curriculum Fullscreen Portal Overlay */}
            {isMobileCurriculumOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div className="fixed inset-0 z-[9999] w-screen h-screen h-[100dvh] bg-[#070B18] flex flex-col overflow-hidden animate-fadeIn select-none">
                  {/* Top Bar toàn màn hình chuẩn Mobile với Safe Area */}
                  <div className="shrink-0 pt-[max(env(safe-area-inset-top,0px),0.75rem)] px-4 pb-3 border-b border-white/10 bg-[#090D1A]/95 backdrop-blur-md flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-white truncate leading-tight">
                          Danh sách bài giảng khóa học
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate">
                          {effectiveCourse?.title || 'Khóa học'} • {flatLessons.length} bài
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMobileCurriculumOpen(false)}
                      className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 shrink-0"
                      title="Đóng danh mục bài giảng"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Vùng danh sách bài giảng cuộn độc lập (overscroll-contain ngăn lướt lan trang bên dưới) */}
                  <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 pb-[max(env(safe-area-inset-bottom,0px),2rem)]">
                    <LessonSidebar
                      course={effectiveCourse}
                      activeLessonId={effectiveLesson.id}
                      completedLessonIds={completedLessonIds}
                      onSelectLesson={(lesson) => {
                        handleSelectLesson(lesson);
                        setIsMobileCurriculumOpen(false);
                      }}
                      onBackToCatalog={() => {
                        setIsMobileCurriculumOpen(false);
                        setCurrentView('CATALOG');
                      }}
                    />
                  </div>
                </div>,
                document.body
              )}

            {/* Workspace Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Cột trái: Cây cấu trúc học phần & bài học (Hiển thị cố định trên Desktop/Laptop) */}
              <aside className="hidden lg:block lg:col-span-4 sticky top-20">
                <LessonSidebar
                  course={effectiveCourse}
                  activeLessonId={effectiveLesson.id}
                  completedLessonIds={completedLessonIds}
                  onSelectLesson={handleSelectLesson}
                  onBackToCatalog={() => setCurrentView('CATALOG')}
                />
              </aside>

              {/* Cột phải: Video Player + Điều hướng bài + Trợ lý giọng đọc AI + Trắc nghiệm */}
              <section className="lg:col-span-8 space-y-6">
                {/* 1. Trình phát Video trực tuyến thông minh */}
                <div className="space-y-3">
                  <VideoLessonPlayer
                    key={effectiveLesson.id}
                    mediaId={effectiveLesson.id}
                    lessonId={effectiveLesson.id}
                    lessonTitle={effectiveLesson.title}
                    courseId={effectiveCourse?.id}
                    courseTitle={effectiveCourse?.title}
                    initialSeekTime={initialSeekTimestamp}
                    onOpenNotebookView={() => setCurrentView('NOTEBOOK')}
                    onOpenBookmarksView={() => setCurrentView('BOOKMARKS')}
                    onProgressSaved={(isCompleted) => {
                      if (isCompleted) {
                        handleLessonCompleted();
                      }
                    }}
                    onWatchedPercentChange={(p) =>
                      setLessonWatchedMap((prev) => ({
                        ...prev,
                        [effectiveLesson.id]: Math.min(100, Math.max(prev[effectiveLesson.id] || 0, Math.round(p))),
                      }))
                    }
                  />

                  {/* Thanh điều hướng bài học & thông tin bài */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090D1A] border border-white/10 shadow-lg">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                        Bài giảng đang học
                      </span>
                      <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                        {effectiveLesson.title}
                      </h3>
                      {effectiveLesson.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                          {effectiveLesson.description}
                        </p>
                      )}
                    </div>

                    {/* Cụm nút chuyển bài: Bài trước / Đánh dấu hoàn thành (+1 Streak) / Bài tiếp theo */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => prevLesson && handleSelectLesson(prevLesson)}
                        disabled={!prevLesson}
                        title={prevLesson ? `Bài trước: ${prevLesson.title}` : 'Đã ở bài học đầu tiên'}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 disabled:opacity-30 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Bài trước</span>
                      </button>

                      {/* Nút Đánh dấu hoàn thành bài học */}
                      <button
                        type="button"
                        onClick={handleLessonCompleted}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                          completedLessonIds.includes(effectiveLesson.id)
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/50'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
                        }`}
                        title={
                          completedLessonIds.includes(effectiveLesson.id)
                            ? 'Bài giảng đã được hoàn thành'
                            : 'Đánh dấu hoàn thành bài học này'
                        }
                      >
                        <CheckCircle className={`w-4 h-4 shrink-0 ${completedLessonIds.includes(effectiveLesson.id) ? 'text-emerald-400' : 'text-indigo-200'}`} />
                        <span>
                          {completedLessonIds.includes(effectiveLesson.id)
                            ? 'Đã hoàn thành'
                            : 'Đánh dấu hoàn thành'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => nextLesson && handleSelectLesson(nextLesson)}
                        disabled={!nextLesson}
                        title={nextLesson ? `Bài tiếp theo: ${nextLesson.title}` : 'Đã ở bài học cuối cùng'}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                      >
                        <span>Bài tiếp theo</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Trợ lý âm thanh giọng đọc AI (Edge-TTS) */}
                <AudioTtsPlayer
                  lessonTitle={effectiveLesson.title}
                  lessonDescription={effectiveLesson.description}
                />

                {/* 3. Đề kiểm tra đánh giá trắc nghiệm trực tuyến (Mở khóa >= 60%) */}
                <div className="rounded-2xl bg-[#090D1A] border border-white/10 shadow-xl overflow-hidden transition-all">
                  {/* Thanh Header điều khiển Mở / Đóng Quizz */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-950 via-[#0B1024] to-slate-950 border-b border-white/5">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                          Bài kiểm tra trắc nghiệm & Đánh giá
                        </h3>
                        {isQuizUnlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shadow-sm">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            Đã mở khóa ({Math.round(currentLessonWatchedPercent)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-950/80 border border-amber-500/40 text-amber-300 shadow-sm">
                            <Lock className="w-3 h-3 text-amber-400" />
                            Chưa mở khóa ({Math.round(currentLessonWatchedPercent)}% / 60%)
                          </span>
                        )}
                      </div>

                      {/* Thanh hiển thị tiến độ thực tế của bài học */}
                      <div className="space-y-1 max-w-md">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">Tiến độ bài học:</span>
                          <span className="font-mono font-bold text-slate-200">
                            {Math.round(currentLessonWatchedPercent)}%{' '}
                            <span className="text-slate-500 text-[10px]">/ 60% mở khóa</span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 border border-white/10 rounded-full overflow-hidden p-0.5 relative">
                          {/* Vạch mốc chỉ định 60% */}
                          <div
                            className="absolute top-0 bottom-0 left-[60%] w-0.5 bg-amber-400/90 z-10"
                            title="Mốc tối thiểu: 60%"
                          />
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isQuizUnlocked
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500'
                            }`}
                            style={{ width: `${Math.min(100, (currentLessonWatchedPercent / 60) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isQuizUnlocked
                          ? `🎉 Bạn đã xem ${Math.round(currentLessonWatchedPercent)}% thời lượng bài giảng (đáp ứng điều kiện ≥ 60%). Bạn có thể bắt đầu làm bài trắc nghiệm ngay!`
                          : `⚠️ Bạn mới xem ${Math.round(currentLessonWatchedPercent)}% bài giảng này. Cần xem thêm tối thiểu ${Math.max(0, 60 - Math.round(currentLessonWatchedPercent))}% thời lượng video để mở khóa bài kiểm tra trắc nghiệm.`}
                      </p>
                    </div>

                    {/* Nút bấm làm bài trắc nghiệm */}
                    <div className="flex items-center gap-3 shrink-0">
                      {!isQuizUnlocked ? (
                        <button
                          type="button"
                          disabled
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed select-none shadow-inner opacity-75"
                          title={`Cần xem tối thiểu 60% video để mở khóa. Hiện tại: ${Math.round(currentLessonWatchedPercent)}%`}
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Chưa đủ điều kiện ({Math.round(currentLessonWatchedPercent)}% / 60%)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsQuizOpen((prev) => !prev)}
                          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
                            isQuizOpen
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
                              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-indigo-600/30'
                          }`}
                        >
                          {isQuizOpen ? (
                            <>
                              <span>Thu gọn bài kiểm tra</span>
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                              <span>Bắt đầu làm bài trắc nghiệm</span>
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vùng bài kiểm tra khi được mở */}
                  {isQuizOpen && isQuizUnlocked && (
                    <div className="p-4 sm:p-6 animate-fadeIn">
                      <InteractiveQuizCard
                        lessonId={effectiveLesson.id}
                        onAttemptSubmitted={handleLessonCompleted}
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          THANH ĐIỀU HƯỚNG CHỨC NĂNG DASHBOARD CỐ ĐỊNH TRÊN MOBILE WEB (BOTTOM BAR)
      ========================================================================= */}
      <nav
        aria-label="Thanh điều hướng di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070B17]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom"
      >
        {/* 1. Khóa học */}
        <button
          type="button"
          onClick={() => setCurrentView('CATALOG')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'CATALOG'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className={`w-5 h-5 ${currentView === 'CATALOG' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Khóa học</span>
        </button>

        {/* 2. Phòng học */}
        <button
          type="button"
          onClick={() => setCurrentView('WORKSPACE')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'WORKSPACE'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${currentView === 'WORKSPACE' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">Phòng học</span>
        </button>

        {/* Sổ tay NoteBook AI (Đứng phía trước Mục cờ) */}
        <button
          type="button"
          onClick={() => setCurrentView('NOTEBOOK')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'NOTEBOOK'
              ? 'text-purple-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookMarked className={`w-5 h-5 ${currentView === 'NOTEBOOK' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5">NoteBook</span>
        </button>

        {/* 3. Mục cắm cờ đánh dấu */}
        <button
          type="button"
          onClick={() => setCurrentView('BOOKMARKS')}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            currentView === 'BOOKMARKS'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${currentView === 'BOOKMARKS' ? 'stroke-[2.5]' : ''}`} />
          {totalBookmarksCount > 0 && (
            <span className="absolute top-0 right-1.5 px-1 min-w-[14px] h-[14px] rounded-full bg-cyan-400 text-[#070B17] text-[9px] font-extrabold flex items-center justify-center">
              {totalBookmarksCount}
            </span>
          )}
          <span className="text-[10px] mt-0.5">Mục cờ</span>
        </button>

        {/* 4. Dashboard Tiến độ & Hồ sơ & Đổi mật khẩu */}
        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            isProfileModalOpen
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt=""
              className="w-5 h-5 rounded-full object-cover border border-indigo-400 shrink-0"
            />
          ) : (
            <BarChart3 className="w-5 h-5 text-indigo-400" />
          )}
          <span className="text-[10px] mt-0.5">Tiến độ</span>
        </button>

        {/* 5. Studio Đăng tải bài giảng (Chỉ hiện cho Teacher & Admin) */}
        {isTeacherOrAdmin && (
          <button
            type="button"
            onClick={() => setIsCourseMgmtOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-400 hover:text-purple-300 transition-all cursor-pointer"
          >
            <FolderKanban className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] mt-0.5">Studio</span>
          </button>
        )}
      </nav>

      {/* =========================================================================
          STUDIO MODAL: ĐĂNG TẢI KHÓA HỌC, BÀI GIẢNG & SOẠN ĐỀ THI QUIZZ
      ========================================================================= */}
      {isTeacherOrAdmin && (
        <CourseManagementModal
          isOpen={isCourseMgmtOpen}
          onClose={() => setIsCourseMgmtOpen(false)}
          onDataChanged={() => loadInitialCourse(effectiveCourse.id)}
        />
      )}

      {/* ADMIN USER MANAGEMENT MODAL */}
      {currentUser?.isAdmin && (
        <AdminUserManagementModal
          isOpen={isAdminUsersOpen}
          onClose={() => setIsAdminUsersOpen(false)}
        />
      )}

      {/* USER PROFILE & LEARNING PROGRESS DASHBOARD MODAL */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        allCourses={catalogCourses.length > 0 ? catalogCourses : SAMPLE_COURSES}
        completedLessonIds={completedLessonIds}
        onSelectCourse={handleSelectCourseFromCatalog}
        onProfileUpdated={(updated) => setUserProfile(updated)}
      />

      {/* Feature 9: SỔ TAY CÂU HỎI SAI & ÔN TẬP */}
      <MistakeVaultModal
        isOpen={isMistakeVaultOpen}
        onClose={() => setIsMistakeVaultOpen(false)}
      />

      {/* Feature 10: MÔN HỌC YÊU THÍCH (DRAWER BAY NHANH) */}
      <FavoriteSubjectsDrawer
        isOpen={isFavoriteDrawerOpen}
        onClose={() => setIsFavoriteDrawerOpen(false)}
        onSelectSubject={handleNavigateToFavoriteSubject}
      />

      {/* HIỆU ỨNG DUOLINGO ĂN MỪNG STREAK (LUNG LINH, XOAY BÙNG CHÁY, ĐẾM SỐ & BAY VÀO HEADER) */}
      <DuolingoStreakCelebrationModal
        isOpen={showStreakFlyUp && Boolean(streakFlyUpInfo)}
        targetStreak={streakFlyUpInfo?.currentStreak ?? 1}
        message={streakFlyUpInfo?.message}
        onClose={() => {
          setShowStreakFlyUp(false);
          setStreakFlyUpInfo(null);
        }}
      />
    </div>
  );
};
