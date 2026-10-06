import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import type { CourseDetail, Lesson } from '../../types/catalog.types';
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
import { HistoryNavigationControls } from '../common/HistoryNavigationControls';
import { useAppHistoryNavigation } from '../../hooks/useAppHistoryNavigation';
import type { UserProfile } from '../../types/userProfile.types';
import { getCurrentUser } from '../../utils/tokenHelper';
import { mediaBookmarkService } from '../../services/mediaBookmarkService';
import { userProfileService } from '../../services/userProfileService';
import { catalogApi } from '../../services/catalogApi';
import { progressApi } from '../../services/progressApi';
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
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]);
  const [initialSeekTimestamp, setInitialSeekTimestamp] = useState<number | null>(null);
  const [totalBookmarksCount, setTotalBookmarksCount] = useState<number>(() =>
    mediaBookmarkService.getAllBookmarksCount()
  );

  // Upgrade Features Modals (Mistake Vault & Favorite Subjects)
  const [isMistakeVaultOpen, setIsMistakeVaultOpen] = useState<boolean>(false);
  const [isFavoriteDrawerOpen, setIsFavoriteDrawerOpen] = useState<boolean>(false);

  // Khóa học và bài học hiện tại đang học
  const [currentCourse, setCurrentCourse] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);

  // Trạng thái Responsive Mobile Drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobileCurriculumOpen, setIsMobileCurriculumOpen] = useState<boolean>(false);

  // 1. Tải khóa học và bài học ban đầu trực tuyến
  const loadInitialCourse = useCallback(async (courseId?: number) => {
    setLoadingWorkspace(true);
    try {
      let targetCourse: CourseDetail | null = null;
      let targetLesson: Lesson | null = null;

      let targetId = courseId;
      if (!targetId) {
        try {
          const courses = await catalogApi.getAllCourses();
          if (courses.length > 0) {
            targetId = courses[0].id;
          }
        } catch {
          // ignore
        }
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

      // Kiểm tra tiến độ hoàn thành từ máy chủ
      if (targetLesson) {
        progressApi
          .getLessonProgress(targetLesson.id)
          .then((p) => {
            if (p && p.isCompleted) {
              setCompletedLessonIds((prev) => Array.from(new Set([...prev, targetLesson!.id])));
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
  }, []);

  useEffect(() => {
    loadInitialCourse();
  }, [loadInitialCourse]);

  // Feature 5: In-app history navigation stack & breadcrumbs
  const {
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    pushState,
    breadcrumbs,
  } = useAppHistoryNavigation(
    { view: 'catalog', title: 'Khám phá khóa học' },
    (targetState) => {
      if (targetState.view === 'catalog') {
        setCurrentView('CATALOG');
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
        if (p && p.isCompleted) {
          setCompletedLessonIds((prev) => Array.from(new Set([...prev, lesson.id])));
        }
      })
      .catch(() => {});
  };

  // Chọn khóa học từ danh mục
  const handleSelectCourseFromCatalog = async (courseId: number) => {
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

  // Ghi nhận hoàn thành bài học
  const handleLessonCompleted = () => {
    if (activeLesson) {
      setCompletedLessonIds((prev) => Array.from(new Set([...prev, activeLesson.id])));
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
          TOP NAVIGATION HEADER (Tương thích Desktop, Laptop, Tablet, Mobile)
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#070B17]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 lg:px-8 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Logo & Tiêu đề */}
          <div
            onClick={() => setCurrentView('CATALOG')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#080D1A] rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-4 sm:w-5 h-4 sm:h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  MicroLearn
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                Hệ thống Học tập &amp; Đánh giá Năng lực Trực tuyến
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/5 text-xs font-semibold">
            <button
              onClick={() => {
                setCurrentView('CATALOG');
                pushState({ view: 'catalog', title: 'Khám phá khóa học' });
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'CATALOG'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
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
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'WORKSPACE'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Phòng học</span>
            </button>

            {/* Nút Sổ tay NoteBook AI (Đứng phía trước Mục đánh dấu) */}
            <button
              onClick={() => {
                setCurrentView('NOTEBOOK');
                pushState({ view: 'course', courseId: effectiveCourse.id, title: 'NoteBook AI' });
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'NOTEBOOK'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Sổ tay học tập thông minh & Trợ lý hỏi đáp AI (Open Notebook)"
            >
              <BookMarked className="w-4 h-4 text-purple-400" />
              <span>NoteBook</span>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-400/20 text-purple-300 text-[10px] font-bold">
                AI
              </span>
            </button>

            <button
              onClick={() => {
                setCurrentView('BOOKMARKS');
                pushState({ view: 'course', courseId: effectiveCourse.id, title: 'Mục đánh dấu' });
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'BOOKMARKS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4 text-cyan-400" />
              <span>Mục đánh dấu</span>
              {totalBookmarksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-bold">
                  {totalBookmarksCount}
                </span>
              )}
            </button>
          </nav>

          {/* Desktop Action Buttons & User Menu */}
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
            {/* Feature 8: Streak 🔥 & Master Crown 👑 */}
            <StreakCrownBadge />

            {/* Feature 10: Môn học yêu thích ❤️ */}
            <button
              type="button"
              onClick={() => setIsFavoriteDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-rose-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Danh sách môn học yêu thích"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/80" />
              <span className="hidden xl:inline">Yêu thích</span>
            </button>

            {/* Feature 9: Sổ tay câu hỏi sai 📖 */}
            <button
              type="button"
              onClick={() => setIsMistakeVaultOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-amber-950/80 border border-white/10 hover:border-amber-500/40 text-xs font-semibold text-amber-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Sổ tay câu sai & Ôn luyện trắc nghiệm"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Sổ câu sai</span>
            </button>

            {/* Nút Studio Đăng Tải Bài Giảng & Quiz (Chỉ hiện cho Teacher & Admin) */}
            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsCourseMgmtOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/80 to-purple-900/80 hover:from-indigo-800 hover:to-purple-800 border border-indigo-500/40 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
                title="Đăng tải bài giảng, học phần và soạn đề thi quizz"
              >
                <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                <span>Studio Đăng tải</span>
              </button>
            )}

            {/* Quản lý người dùng (Dành cho Admin) */}
            {currentUser?.isAdmin && (
              <button
                onClick={() => setIsAdminUsersOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-semibold text-purple-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Quản Lý Tài Khoản Người Dùng"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Tài khoản</span>
              </button>
            )}

            {/* User Profile & Role Badge */}
            {currentUser && (
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl text-[11px] font-bold border bg-slate-900/80 hover:bg-slate-800 border-white/10 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm group active:scale-95"
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
                <span className="truncate max-w-[100px] sm:max-w-[130px] group-hover:text-cyan-300 transition-colors">
                  {userProfile.fullName || currentUser.displayName}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/5 text-slate-400 border border-white/5 uppercase">
                  {currentUser.isAdmin ? 'Admin' : currentUser.isTeacher ? 'Teacher' : 'Student'}
                </span>
              </button>
            )}

            {/* Nút Đăng xuất */}
            <button
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
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
              className="p-1 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer active:scale-95"
              title={`Hồ sơ: ${userProfile.fullName || currentUser?.displayName}`}
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.fullName}
                  className="w-7 h-7 rounded-lg object-cover border border-indigo-400/50 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-xs text-white font-bold shrink-0">
                  {userProfile.fullName ? userProfile.fullName.trim()[0].toUpperCase() : 'U'}
                </div>
              )}
            </button>

            {isTeacherOrAdmin && (
              <button
                onClick={() => setIsCourseMgmtOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-bold"
                title="Studio Đăng tải"
              >
                <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
                <span>Studio</span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
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
                  pushState({ view: 'course', courseId: effectiveCourse.id, title: 'NoteBook AI' });
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
                  pushState({ view: 'course', courseId: effectiveCourse.id, title: 'Mục đánh dấu' });
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
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6 flex-1">
        {/* Feature 5: In-app History Navigation Controls & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 p-2 sm:p-2.5 rounded-2xl bg-[#090D1A]/90 border border-white/5 backdrop-blur-sm shadow-sm">
          <HistoryNavigationControls
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onGoBack={goBack}
            onGoForward={goForward}
            breadcrumbs={breadcrumbs}
          />
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setIsFavoriteDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-rose-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Danh sách môn học yêu thích"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/80" />
              <span>Môn yêu thích</span>
            </button>
            <button
              onClick={() => setIsMistakeVaultOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-amber-500/40 text-xs font-semibold text-amber-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Sổ tay ôn luyện các câu làm sai"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Sổ câu sai</span>
            </button>
          </div>
        </div>

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

            {/* Mobile Curriculum Drawer Modal */}
            {isMobileCurriculumOpen && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
                <div className="w-full sm:max-w-md max-h-[85vh] bg-[#0A0F1F] border border-white/10 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span>Danh sách bài giảng khóa học</span>
                    </span>
                    <button
                      onClick={() => setIsMobileCurriculumOpen(false)}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <LessonSidebar
                      course={effectiveCourse}
                      activeLessonId={effectiveLesson.id}
                      completedLessonIds={completedLessonIds}
                      onSelectLesson={handleSelectLesson}
                      onBackToCatalog={() => {
                        setIsMobileCurriculumOpen(false);
                        setCurrentView('CATALOG');
                      }}
                    />
                  </div>
                </div>
              </div>
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
                    mediaId={effectiveLesson.id}
                    lessonId={effectiveLesson.id}
                    lessonTitle={effectiveLesson.title}
                    courseId={effectiveCourse?.id}
                    courseTitle={effectiveCourse?.title}
                    initialSeekTime={initialSeekTimestamp}
                    onOpenNotebookView={() => setCurrentView('NOTEBOOK')}
                    onOpenBookmarksView={() => setCurrentView('BOOKMARKS')}
                    onProgressSaved={handleLessonCompleted}
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

                    {/* Cụm nút chuyển bài: Bài trước / Bài tiếp theo */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => prevLesson && handleSelectLesson(prevLesson)}
                        disabled={!prevLesson}
                        title={prevLesson ? `Bài trước: ${prevLesson.title}` : 'Đã ở bài học đầu tiên'}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 disabled:opacity-30 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Bài trước</span>
                      </button>

                      <button
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

                {/* 3. Đề kiểm tra đánh giá trắc nghiệm trực tuyến */}
                <InteractiveQuizCard
                  lessonId={effectiveLesson.id}
                  onAttemptSubmitted={handleLessonCompleted}
                />
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
        allCourses={SAMPLE_COURSES}
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
    </div>
  );
};
