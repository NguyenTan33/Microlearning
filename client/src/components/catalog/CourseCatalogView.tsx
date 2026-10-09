import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Search,
  Check,
  Loader2,
  FolderPlus,
  Layers,
  GraduationCap,
  Play,
  Flame,
  Trophy,
  CheckCircle2,
  Tv,
  FileSpreadsheet,
  Code2,
  Zap,
} from 'lucide-react';
import type { Course, Enrollment } from '../../types/catalog.types';
import { catalogApi } from '../../services/catalogApi';
import { enrollmentApi } from '../../services/enrollmentApi';
import { courseAccessApi } from '../../services/courseAccessApi';
import { UnlockCourseModal } from './UnlockCourseModal';

interface CourseCatalogViewProps {
  onSelectCourse: (courseId: number) => void;
  onOpenStudio?: () => void;
  refreshTrigger?: number;
}

export const CourseCatalogView: React.FC<CourseCatalogViewProps> = ({
  onSelectCourse,
  onOpenStudio,
  refreshTrigger,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OFFICE' | 'IT' | 'OTHER' | 'ENROLLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [unlockModalCourse, setUnlockModalCourse] = useState<Course | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const courseList = await catalogApi.getAllCourses();
      const enrollmentList = await enrollmentApi.getMyEnrollments();
      setCourses(courseList);
      setEnrollments(enrollmentList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleProgressUpdate = () => {
      enrollmentApi.getMyEnrollments().then(setEnrollments).catch(() => {});
    };
    const handleCoursesUpdate = () => {
      loadData();
    };
    window.addEventListener('lesson-progress-updated', handleProgressUpdate);
    window.addEventListener('catalog-courses-updated', handleCoursesUpdate);
    return () => {
      window.removeEventListener('lesson-progress-updated', handleProgressUpdate);
      window.removeEventListener('catalog-courses-updated', handleCoursesUpdate);
    };
  }, [loadData, refreshTrigger]);

  const handleEnroll = async (courseId: number) => {
    setEnrollingId(courseId);
    try {
      const newEnrollment = await enrollmentApi.enrollCourse(courseId);
      setEnrollments((prev) => [...prev, newEnrollment]);
      onSelectCourse(courseId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ghi danh khóa học thất bại.');
    } finally {
      setEnrollingId(null);
    }
  };

  const isEnrolled = (courseId: number) => {
    return enrollments.some((e) => e.courseId === courseId);
  };

  const handleCourseAction = async (course: Course) => {
    if (course.isPrivate) {
      try {
        const access = await courseAccessApi.checkAccess(course.id);
        if (!access.hasAccess) {
          setUnlockModalCourse(course);
          return;
        }
      } catch {
        // Fallback open modal
        setUnlockModalCourse(course);
        return;
      }
    }

    if (isEnrolled(course.id)) {
      onSelectCourse(course.id);
    } else {
      handleEnroll(course.id);
    }
  };

  const getEnrollmentProgress = (courseId: number) => {
    const item = enrollments.find((e) => e.courseId === courseId);
    if (!item) return 0;
    const serverPct = Number(item.overallProgressPercent) || 0;
    if (item.totalLessons && item.totalLessons > 0 && item.completedLessons !== undefined) {
      const clientPct = Math.min(100, Math.round((item.completedLessons / item.totalLessons) * 100));
      return Math.max(serverPct, clientPct);
    }
    return serverPct;
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'ENROLLED') {
      return isEnrolled(c.id);
    }

    const titleLower = c.title.toLowerCase();
    const descLower = (c.description || '').toLowerCase();
    const isOffice =
      titleLower.includes('excel') ||
      titleLower.includes('word') ||
      descLower.includes('excel') ||
      descLower.includes('word');
    const isIT =
      titleLower.includes('react') ||
      titleLower.includes('sql') ||
      titleLower.includes('.net') ||
      titleLower.includes('offline') ||
      descLower.includes('react') ||
      descLower.includes('sql') ||
      descLower.includes('.net') ||
      descLower.includes('offline');

    if (activeTab === 'OFFICE') {
      return isOffice;
    }

    if (activeTab === 'IT') {
      return isIT;
    }

    if (activeTab === 'OTHER') {
      return !isOffice && !isIT;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Tiêu đề - Hiệu ứng Hoạt họa & Hoạt ảnh Sinh động */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/85 via-slate-900/90 to-[#0A0F1F] border border-indigo-500/20 p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Hào quang hoạt ảnh chuyển động mềm mại (Ambient Glowing Orbs) */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl animate-pulse-glow" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl animate-pulse-glow" style={{ animationDelay: '4s' }} />

        {/* Lưới công nghệ vi mô nền (Cyber Grid Accent Pattern) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.035] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* CỘT TRÁI (7 cols): Tiêu đề sinh động, Huy hiệu hoạt họa & Feature tags */}
          <div className="lg:col-span-7 space-y-5">
            {/* Live Indicator Pill với hiệu ứng radar ping */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-indigo-950/90 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-lg shadow-indigo-950/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span className="tracking-wide">HỆ THỐNG ĐÀO TẠO THỰC CHIẾN 4.0</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            {/* Tiêu đề chính dạng Gradient đa sắc rực rỡ */}
            <div className="space-y-2.5">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-300 tracking-tight leading-tight">
                Khám Phá Các Khóa Học Chuyên Sâu
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-xl">
                Lộ trình chuẩn doanh nghiệp: Kết hợp video thực hành Full HD, bài tập lab và hệ thống bài kiểm tra trắc nghiệm chấm điểm tự động.
              </p>
            </div>

            {/* Các thẻ tính năng hoạt họa tương tác (Feature Badges) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/50 border border-purple-500/30 text-purple-200 text-xs font-semibold hover:border-purple-400/50 hover:bg-purple-900/50 transition-all cursor-default shadow-sm group">
                <Tv className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Video HD 1080p</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-200 text-xs font-semibold hover:border-cyan-400/50 hover:bg-cyan-900/50 transition-all cursor-default shadow-sm group">
                <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Quiz Chấm Tức Thì</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-200 text-xs font-semibold hover:border-blue-400/50 hover:bg-blue-900/50 transition-all cursor-default shadow-sm group">
                <Code2 className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>React &amp; .NET 8</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-200 text-xs font-semibold hover:border-emerald-400/50 hover:bg-emerald-900/50 transition-all cursor-default shadow-sm group">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Excel &amp; Word Chuyên Sâu</span>
              </div>
            </div>

            {/* Nút Đăng tải bài giảng (Studio) nếu có quyền */}
            {onOpenStudio && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenStudio}
                  className="group relative inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs sm:text-sm font-bold transition-all shadow-xl shadow-indigo-600/30 cursor-pointer active:scale-95 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <FolderPlus className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Đăng tải bài giảng &amp; Quiz mới</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {/* CỘT PHẢI (5 cols): KHỐI HOẠT HỌA TRỰC QUAN (ANIMATED 3D LEARNING HUB MOCKUP) */}
          <div className="lg:col-span-5 flex items-center justify-center relative py-6 lg:py-2">
            {/* Floating Badge 1: Top-Left (XP & Điểm thưởng) */}
            <div className="absolute -top-1 left-2 sm:left-6 z-20 animate-float-bob">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 text-amber-300 text-[11px] font-bold shadow-xl shadow-amber-500/15 backdrop-blur-md">
                <Trophy className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span>+150 XP Mastery</span>
              </div>
            </div>

            {/* Floating Badge 2: Top-Right (Quiz Đạt điểm tối đa) */}
            <div className="absolute -top-2 right-2 sm:right-6 z-20 animate-float-bob-delay">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold shadow-xl shadow-emerald-500/15 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Đạt Chuẩn</span>
              </div>
            </div>

            {/* Floating Badge 3: Bottom-Left (Streak ngọn lửa) */}
            <div className="absolute -bottom-2 left-4 sm:left-8 z-20 animate-float-bob-delay">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-rose-500/40 text-rose-300 text-[11px] font-bold shadow-xl shadow-rose-500/15 backdrop-blur-md">
                <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                <span>Chuỗi Học Tập 🔥</span>
              </div>
            </div>

            {/* Thẻ mô phỏng trung tâm Glassmorphism (Interactive Micro-Learning Card) */}
            <div className="w-full max-w-[340px] rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-white/15 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl space-y-4 relative group hover:border-indigo-500/40 transition-all">
              {/* Window Controls Mockup */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                  <span>MicroLearning Hub</span>
                </div>
              </div>

              {/* Video Player Mockup with Glowing Play Button */}
              <div className="relative rounded-xl overflow-hidden bg-gradient-to-tr from-slate-950 via-indigo-950/70 to-slate-900 border border-white/10 aspect-video flex items-center justify-center group-hover:border-cyan-500/30 transition-all">
                {/* Visual grid / tech lines */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_14px]" />
                
                {/* Glowing Play Icon Button with Pulse */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/40 group-hover:scale-110 transition-transform cursor-pointer">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  <span className="absolute -inset-1 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
                </div>

                {/* Subtitle tag overlay */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] text-slate-300">
                  <span className="font-mono truncate">Lesson: Thực hành Chuyên sâu</span>
                  <span className="text-cyan-400 font-bold shrink-0">1080p 60fps</span>
                </div>
              </div>

              {/* Progress & Status Indicators */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Tiến độ bài học:</span>
                  <span className="text-emerald-400 font-bold">Hoàn tất 85%</span>
                </div>
                {/* Animated progress bar */}
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full w-[85%] animate-pulse" />
                </div>
              </div>

              {/* Interactive micro tags */}
              <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                <div className="flex items-center gap-1 text-slate-300">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Chứng nhận số</span>
                </div>
                <div className="flex items-center gap-1 text-cyan-300">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>AI Mentor Hỗ trợ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bộ lọc tab & Ô tìm kiếm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/5">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất cả ({courses.length})
          </button>

          <button
            onClick={() => setActiveTab('OFFICE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'OFFICE'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Excel &amp; Word
          </button>

          <button
            onClick={() => setActiveTab('IT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'IT'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lập trình &amp; IT
          </button>

          <button
            onClick={() => setActiveTab('OTHER')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'OTHER'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Khác / Mới
          </button>

          <button
            onClick={() => setActiveTab('ENROLLED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ENROLLED'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Đang học ({enrollments.length})
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Grid Danh sách khóa học */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
          <span className="text-xs sm:text-sm">Đang tải danh mục khóa học...</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#090D1A] rounded-2xl border border-white/5">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Không tìm thấy khóa học nào phù hợp.</p>
          <p className="text-xs text-slate-500">Hãy thử nhập từ khóa khác hoặc chuyển sang danh mục Tất cả.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCourses.map((course) => {
            const enrolled = isEnrolled(course.id);
            const progress = getEnrollmentProgress(course.id);
            const isOffice =
              course.title.toLowerCase().includes('excel') || course.title.toLowerCase().includes('word');
            const isIT =
              course.title.toLowerCase().includes('react') ||
              course.title.toLowerCase().includes('sql') ||
              course.title.toLowerCase().includes('.net') ||
              course.title.toLowerCase().includes('offline');

            return (
              <div
                key={course.id}
                className="rounded-2xl bg-[#090D1A] border border-white/10 hover:border-indigo-500/40 transition-all shadow-xl hover:shadow-indigo-500/10 flex flex-col overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}
                    alt={course.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090D1A] via-transparent to-transparent" />

                  {/* Badges trên Thumbnail */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border ${
                        isOffice
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : isIT
                          ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                          : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300'
                      }`}
                    >
                      {isOffice ? 'Tin học văn phòng' : isIT ? 'Lập trình & IT' : 'Khóa học chuyên đề'}
                    </span>

                    {course.isPrivate && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border bg-amber-950/80 border-amber-500/50 text-amber-300 flex items-center gap-1 shadow-sm">
                        <span>🔒 Riêng tư</span>
                      </span>
                    )}
                  </div>

                  {enrolled && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 backdrop-blur-md">
                        <CheckCircle className="w-3 h-3 text-cyan-400" />
                        <span>Đã ghi danh</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Nội dung Card */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-white/5">
                    {/* Thống kê bài học / Tiến độ */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{course.totalSubjects ?? 0} học phần</span>
                      </span>

                      {enrolled && (
                        <span className="font-semibold text-emerald-400 text-[11px]">
                          Tiến độ: {progress}%
                        </span>
                      )}
                    </div>

                    {enrolled && (
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    {/* Nút hành động */}
                    <div className="pt-1">
                      {enrolled ? (
                        <button
                          onClick={() => handleCourseAction(course)}
                          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-98"
                        >
                          <span>Tiếp tục học bài giảng</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCourseAction(course)}
                          disabled={enrollingId === course.id}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                        >
                          {enrollingId === course.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang ghi danh...</span>
                            </>
                          ) : (
                            <>
                              <GraduationCap className="w-4 h-4 text-cyan-400" />
                              <span>Tham gia khóa học ngay</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal mở khóa khóa học riêng tư */}
      {unlockModalCourse && (
        <UnlockCourseModal
          isOpen={Boolean(unlockModalCourse)}
          onClose={() => setUnlockModalCourse(null)}
          courseId={unlockModalCourse.id}
          courseTitle={unlockModalCourse.title}
          onUnlocked={() => {
            const target = unlockModalCourse;
            setUnlockModalCourse(null);
            if (isEnrolled(target.id)) {
              onSelectCourse(target.id);
            } else {
              handleEnroll(target.id);
            }
          }}
        />
      )}
    </div>
  );
};
