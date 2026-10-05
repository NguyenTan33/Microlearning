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
} from 'lucide-react';
import type { CourseDetail, Lesson } from '../../types/catalog.types';
import { VideoLessonPlayer } from '../player/VideoLessonPlayer';
import { AudioTtsPlayer } from '../player/AudioTtsPlayer';
import { InteractiveQuizCard } from '../quiz/InteractiveQuizCard';
import { CourseCatalogView } from '../catalog/CourseCatalogView';
import { LessonSidebar } from './LessonSidebar';
import { CourseManagementModal } from '../management/CourseManagementModal';
import { AdminUserManagementModal } from '../management/AdminUserManagementModal';
import { getCurrentUser } from '../../utils/tokenHelper';
import { catalogApi } from '../../services/catalogApi';
import { progressApi } from '../../services/progressApi';
import { SAMPLE_COURSES } from '../../services/sampleCatalogData';

interface StudyDashboardProps {
  onLogout: () => void;
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({ onLogout }) => {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [isCourseMgmtOpen, setIsCourseMgmtOpen] = useState<boolean>(false);
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'WORKSPACE' | 'CATALOG'>('CATALOG');
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]);

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

  // Xử lý chuyển bài học
  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setCurrentView('WORKSPACE');
    setIsMobileCurriculumOpen(false); // Đóng drawer trên mobile khi đã chọn bài

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
  };

  // Ghi nhận hoàn thành bài học
  const handleLessonCompleted = () => {
    if (activeLesson) {
      setCompletedLessonIds((prev) => Array.from(new Set([...prev, activeLesson.id])));
    }
  };

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
              onClick={() => setCurrentView('CATALOG')}
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
              onClick={() => setCurrentView('WORKSPACE')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'WORKSPACE'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Phòng học</span>
            </button>
          </nav>

          {/* Desktop Action Buttons & User Menu */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {/* Nút Studio Đăng Tải Bài Giảng & Quiz */}
            <button
              onClick={() => setIsCourseMgmtOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/80 to-purple-900/80 hover:from-indigo-800 hover:to-purple-800 border border-indigo-500/40 text-xs font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
              title="Đăng tải bài giảng, học phần và soạn đề thi quizz"
            >
              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
              <span>Studio Đăng tải</span>
            </button>

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

            {/* User Role Badge */}
            {currentUser && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border bg-slate-900/80 border-white/10 text-slate-300"
                title={`Tài khoản: ${currentUser.displayName}`}
              >
                <Shield className="w-3 h-3 text-cyan-400" />
                <span className="truncate max-w-[100px]">{currentUser.displayName}</span>
              </div>
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

          {/* Mobile Right Controls: Studio + Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={() => setIsCourseMgmtOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-bold"
              title="Studio Đăng tải"
            >
              <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
              <span>Studio</span>
            </button>

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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setCurrentView('CATALOG');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                  currentView === 'CATALOG'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-900/80 border-white/5 text-slate-300'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Khám phá khóa học</span>
              </button>

              <button
                onClick={() => {
                  setCurrentView('WORKSPACE');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                  currentView === 'WORKSPACE'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-900/80 border-white/5 text-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Phòng học</span>
              </button>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-semibold">{currentUser?.displayName || 'Học viên'}</span>
              </div>
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
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {/* VIEW 1: KHÁM PHÁ KHÓA HỌC (CATALOG) */}
        {currentView === 'CATALOG' && (
          <CourseCatalogView
            onSelectCourse={handleSelectCourseFromCatalog}
            onOpenStudio={() => setIsCourseMgmtOpen(true)}
          />
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
          STUDIO MODAL: ĐĂNG TẢI KHÓA HỌC, BÀI GIẢNG & SOẠN ĐỀ THI QUIZZ
      ========================================================================= */}
      <CourseManagementModal
        isOpen={isCourseMgmtOpen}
        onClose={() => setIsCourseMgmtOpen(false)}
        onDataChanged={() => loadInitialCourse(effectiveCourse.id)}
      />

      {/* ADMIN USER MANAGEMENT MODAL */}
      {currentUser?.isAdmin && (
        <AdminUserManagementModal
          isOpen={isAdminUsersOpen}
          onClose={() => setIsAdminUsersOpen(false)}
        />
      )}
    </div>
  );
};
