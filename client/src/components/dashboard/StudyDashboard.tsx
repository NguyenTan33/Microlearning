import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Wifi,
  WifiOff,
  Inbox,
  LogOut,
  BookOpen,
  HardDrive,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
  Compass,
  FolderKanban,
  Users,
  Shield,
} from 'lucide-react';
import type { CourseDetail, Lesson } from '../../types/catalog.types';
import { VideoLessonPlayer } from '../player/VideoLessonPlayer';
import { DownloadManagerButton } from '../download/DownloadManagerButton';
import { AudioTtsPlayer } from '../player/AudioTtsPlayer';
import { InteractiveQuizCard } from '../quiz/InteractiveQuizCard';
import { SyncCenterModal } from '../sync/SyncCenterModal';
import { CourseCatalogView } from '../catalog/CourseCatalogView';
import { OfflineLibraryView } from '../offline/OfflineLibraryView';
import { LessonSidebar } from './LessonSidebar';
import { CourseManagementModal } from '../management/CourseManagementModal';
import { AdminUserManagementModal } from '../management/AdminUserManagementModal';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { registerCurrentDevice } from '../../services/deviceService';
import { getCurrentUser } from '../../utils/tokenHelper';
import {
  getOutboxCount,
  getAllOfflineVideos,
  getOfflineLessonPackage,
} from '../../services/indexedDbService';
import { catalogApi } from '../../services/catalogApi';
import { progressApi } from '../../services/progressApi';
import { SAMPLE_COURSES } from '../../services/sampleCatalogData';

interface StudyDashboardProps {
  onLogout: () => void;
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({ onLogout }) => {
  const { isOnline, isServerHealthy } = useNetworkStatus();
  const [currentUser] = useState(() => getCurrentUser());
  const [isCourseMgmtOpen, setIsCourseMgmtOpen] = useState<boolean>(false);
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'WORKSPACE' | 'CATALOG' | 'OFFLINE_LIBRARY'>('WORKSPACE');
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [downloadedMediaIds, setDownloadedMediaIds] = useState<number[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<number[]>([]);

  // Khóa học và bài học hiện tại đang học
  const [currentCourse, setCurrentCourse] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);

  // 1. Quét trạng thái Outbox và các tệp ngoại tuyến đã tải
  const refreshStorageAndOutbox = useCallback(async () => {
    try {
      const count = await getOutboxCount();
      setOutboxCount(count);

      const videos = await getAllOfflineVideos();
      setDownloadedMediaIds(videos.map((v) => v.mediaId));
    } catch {
      // ignore
    }
  }, []);

  // 2. Tải khóa học và bài học ban đầu
  const loadInitialCourse = useCallback(async (courseId?: number) => {
    setLoadingWorkspace(true);
    try {
      let targetCourse: CourseDetail | null = null;
      let targetLesson: Lesson | null = null;

      // 1. Thử lấy danh sách khóa học
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

      // 2. Nếu targetCourse chưa có hoặc không có học phần, dùng ngay SAMPLE_COURSES (Excel)
      if (!targetCourse || !targetCourse.subjects || targetCourse.subjects.length === 0) {
        targetCourse = SAMPLE_COURSES[0];
      }

      // 3. Tìm bài học đầu tiên trong targetCourse
      for (const subj of targetCourse.subjects) {
        if (subj.lessons && subj.lessons.length > 0) {
          targetLesson = subj.lessons[0];
          break;
        }
      }

      // 4. Nếu targetLesson vẫn null, gán bài học đầu tiên của SAMPLE_COURSES
      if (!targetLesson) {
        targetCourse = SAMPLE_COURSES[0];
        targetLesson = SAMPLE_COURSES[0].subjects[0].lessons![0];
      }

      setCurrentCourse(targetCourse);
      setActiveLesson(targetLesson);

      // Kiểm tra tiến độ các bài đã hoàn thành
      if (targetLesson && isOnline) {
        progressApi.getLessonProgress(targetLesson.id).then((p) => {
          if (p && p.isCompleted) {
            setCompletedLessonIds((prev) => Array.from(new Set([...prev, targetLesson!.id])));
          }
        }).catch(() => {});
      }
    } catch {
      setCurrentCourse(SAMPLE_COURSES[0]);
      setActiveLesson(SAMPLE_COURSES[0].subjects[0].lessons![0]);
    } finally {
      setLoadingWorkspace(false);
    }
  }, [isOnline]);

  useEffect(() => {
    registerCurrentDevice().catch(() => {});
    refreshStorageAndOutbox();
    loadInitialCourse();
  }, [refreshStorageAndOutbox, loadInitialCourse]);

  // Xử lý chuyển bài học
  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setCurrentView('WORKSPACE');
  };

  // Xử lý chọn khóa học từ màn Catalog
  const handleSelectCourseFromCatalog = (courseId: number) => {
    loadInitialCourse(courseId);
    setCurrentView('WORKSPACE');
  };

  // Xử lý phát bài học ngoại tuyến từ thư viện
  const handlePlayOfflineFromLibrary = async (mediaId: number) => {
    const offlinePkg = (await getOfflineLessonPackage(mediaId)) as {
      lessonId?: number;
      title?: string;
      description?: string;
      durationSeconds?: number;
    } | null;

    const offlineLesson: Lesson = {
      id: offlinePkg?.lessonId || mediaId,
      subjectId: 1,
      title: offlinePkg?.title || `Bài giảng ngoại tuyến #${mediaId}`,
      description: offlinePkg?.description || 'Nội dung phát trực tiếp từ bộ nhớ đệm thiết bị.',
      durationSeconds: offlinePkg?.durationSeconds || 120,
      sortOrder: 1,
      version: 1,
      isPublished: true,
      createdAt: new Date().toISOString(),
      hasQuiz: true,
      mediaAssetCount: 1,
    };

    setActiveLesson(offlineLesson);
    setCurrentView('WORKSPACE');
  };

  const handleLessonCompleted = () => {
    if (activeLesson) {
      setCompletedLessonIds((prev) => Array.from(new Set([...prev, activeLesson.id])));
    }
    refreshStorageAndOutbox();
  };

  return (
    <div className="min-h-screen bg-[#070B17] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header Điều hướng Chính */}
      <header className="sticky top-0 z-40 bg-[#0A0F1F]/90 border-b border-white/10 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-[#080D1A] rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white">MicroLearn</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                  Ngoại Tuyến
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Hệ thống Học tập Vi mô Chuyên sâu</p>
            </div>
          </div>

          {/* Cụm Tabs điều hướng View */}
          <nav className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-white/5 text-xs font-semibold">
            <button
              onClick={() => setCurrentView('WORKSPACE')}
              disabled={!activeLesson}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'WORKSPACE'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white disabled:opacity-40'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Phòng học</span>
            </button>

            <button
              onClick={() => setCurrentView('CATALOG')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'CATALOG'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Khóa học</span>
            </button>

            <button
              onClick={() => setCurrentView('OFFLINE_LIBRARY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'OFFLINE_LIBRARY'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Thư viện tải về</span>
              {downloadedMediaIds.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                  {downloadedMediaIds.length}
                </span>
              )}
            </button>
          </nav>

          {/* Cụm công cụ trạng thái & Đồng bộ */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Vai trò người dùng */}
            {currentUser && (
              <div
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                  currentUser.isAdmin
                    ? 'bg-purple-950/70 border-purple-500/40 text-purple-300'
                    : currentUser.isTeacher
                    ? 'bg-blue-950/70 border-blue-500/40 text-blue-300'
                    : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                }`}
                title={`Tài khoản: ${currentUser.displayName}`}
              >
                <Shield className="w-3 h-3" />
                <span>{currentUser.isAdmin ? 'Admin' : currentUser.isTeacher ? 'Giáo viên' : 'Học viên'}</span>
              </div>
            )}

            {/* Nút Studio Quản lý khóa học & bài giảng (Admin & Giáo viên) */}
            {(currentUser?.isAdmin || currentUser?.isTeacher) && (
              <button
                onClick={() => setIsCourseMgmtOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-xs font-semibold text-indigo-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Mở Studio Quản Lý Khóa Học & Bài Giảng"
              >
                <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Studio</span>
              </button>
            )}

            {/* Nút Quản trị tài khoản người dùng (Chỉ Admin) */}
            {currentUser?.isAdmin && (
              <button
                onClick={() => setIsAdminUsersOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-xs font-semibold text-purple-300 hover:text-white transition-all cursor-pointer shadow-sm"
                title="Quản Lý Tài Khoản Người Dùng"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Tài khoản</span>
              </button>
            )}

            {/* Badge Mạng */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-colors ${
                isOnline && isServerHealthy
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}
            >
              {isOnline && isServerHealthy ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline">Trực tuyến</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ngoại tuyến</span>
                </>
              )}
            </div>

            {/* Nút Hàng đợi Outbox & Mở Sync Modal */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm"
              title="Mở Trung tâm đồng bộ dữ liệu Outbox"
            >
              <Inbox className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Hàng đợi</span>
              {outboxCount > 0 ? (
                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {outboxCount}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">0</span>
              )}
            </button>

            {/* Nút Đăng xuất */}
            <button
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex-1">
        {/* VIEW 1: KHÁM PHÁ KHÓA HỌC */}
        {currentView === 'CATALOG' && (
          <CourseCatalogView
            isOnline={isOnline && isServerHealthy}
            onSelectCourse={handleSelectCourseFromCatalog}
          />
        )}

        {/* VIEW 2: THƯ VIỆN BỘ NHỚ NGOẠI TUYẾN */}
        {currentView === 'OFFLINE_LIBRARY' && (
          <OfflineLibraryView
            onPlayOfflineLesson={handlePlayOfflineFromLibrary}
          />
        )}

        {/* VIEW 3: PHÒNG HỌC BÀI GIẢNG HIỆN TẠI (WORKSPACE) */}
        {currentView === 'WORKSPACE' && (() => {
          const effectiveLesson = activeLesson || SAMPLE_COURSES[0].subjects[0].lessons![0];
          const effectiveCourse = currentCourse || SAMPLE_COURSES[0];

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Cột trái: Cây cấu trúc học phần và bài học */}
              <aside className="lg:col-span-4">
                <LessonSidebar
                  course={effectiveCourse}
                  activeLessonId={effectiveLesson.id}
                  downloadedMediaIds={downloadedMediaIds}
                  completedLessonIds={completedLessonIds}
                  onSelectLesson={handleSelectLesson}
                  onBackToCatalog={() => setCurrentView('CATALOG')}
                />
              </aside>

              {/* Cột phải: Video Player + Tải ngoại tuyến + Trợ lý giọng đọc AI + Trắc nghiệm */}
              <section className="lg:col-span-8 space-y-6">
                {/* 1. Trình phát Video thông minh */}
                <div className="space-y-3">
                  <VideoLessonPlayer
                    mediaId={effectiveLesson.id}
                    lessonId={effectiveLesson.id}
                    lessonTitle={effectiveLesson.title}
                    isOnline={isOnline && isServerHealthy}
                    onProgressSaved={handleLessonCompleted}
                  />

                  {/* Action Bar dưới Player: Download & Thông tin bài */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090D1A] border border-white/10">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Lưu trữ học tập ngoại tuyến</span>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      </h3>
                      <p className="text-xs text-slate-400">
                        Tải bài giảng về IndexedDB và đối chiếu mã SHA-256 chống hỏng tệp
                      </p>
                    </div>

                    <DownloadManagerButton
                      mediaId={effectiveLesson.id}
                      lessonId={effectiveLesson.id}
                      onDownloadStatusChanged={refreshStorageAndOutbox}
                    />
                  </div>
                </div>

                {/* 2. Trợ lý âm thanh giọng đọc AI (Edge-TTS) */}
                <AudioTtsPlayer
                  lessonTitle={effectiveLesson.title}
                  lessonDescription={effectiveLesson.description}
                  isOnline={isOnline && isServerHealthy}
                />

                {/* 3. Đề kiểm tra tương tác bài học */}
                <InteractiveQuizCard
                  lessonId={effectiveLesson.id}
                  isOnline={isOnline && isServerHealthy}
                  onAttemptSubmitted={refreshStorageAndOutbox}
                />
              </section>
            </div>
          );
        })()}
      </main>

      {/* Modal Trung Tâm Đồng Bộ Sync Engine */}
      <SyncCenterModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isOnline={isOnline && isServerHealthy}
        onSyncCompleted={refreshStorageAndOutbox}
      />

      {/* Modal Studio Quản lý khóa học & bài giảng (Admin & Giáo viên) */}
      {(currentUser?.isAdmin || currentUser?.isTeacher) && (
        <CourseManagementModal
          isOpen={isCourseMgmtOpen}
          onClose={() => setIsCourseMgmtOpen(false)}
          onDataChanged={() => {
            loadInitialCourse(currentCourse?.id);
          }}
        />
      )}

      {/* Modal Quản trị người dùng & phân quyền (Chỉ Admin) */}
      {currentUser?.isAdmin && (
        <AdminUserManagementModal
          isOpen={isAdminUsersOpen}
          onClose={() => setIsAdminUsersOpen(false)}
        />
      )}
    </div>
  );
};
