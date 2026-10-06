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
} from 'lucide-react';
import type { Course, Enrollment } from '../../types/catalog.types';
import { catalogApi } from '../../services/catalogApi';
import { enrollmentApi } from '../../services/enrollmentApi';
import { courseAccessApi } from '../../services/courseAccessApi';
import { UnlockCourseModal } from './UnlockCourseModal';

interface CourseCatalogViewProps {
  onSelectCourse: (courseId: number) => void;
  onOpenStudio?: () => void;
}

export const CourseCatalogView: React.FC<CourseCatalogViewProps> = ({
  onSelectCourse,
  onOpenStudio,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OFFICE' | 'IT' | 'ENROLLED'>('ALL');
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
    window.addEventListener('lesson-progress-updated', handleProgressUpdate);
    return () => {
      window.removeEventListener('lesson-progress-updated', handleProgressUpdate);
    };
  }, [loadData]);

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
    return item ? Number(item.overallProgressPercent) : 0;
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'ENROLLED') {
      return isEnrolled(c.id);
    }

    if (activeTab === 'OFFICE') {
      return (
        c.title.toLowerCase().includes('excel') ||
        c.title.toLowerCase().includes('word')
      );
    }

    if (activeTab === 'IT') {
      return (
        c.title.toLowerCase().includes('react') ||
        c.title.toLowerCase().includes('sql') ||
        c.title.toLowerCase().includes('.net') ||
        c.title.toLowerCase().includes('offline')
      );
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Tiêu đề */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-[#0A0F1F] border border-white/10 shadow-xl">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Nền tảng Đào tạo Trực tuyến</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            Khám Phá Các Khóa Học Chuyên Sâu
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Học tập thực chiến qua video HD bài bản về Tin học văn phòng (Excel, Word) và Công nghệ thông tin (React, SQL Server, .NET 8). Làm bài kiểm tra trắc nghiệm nhận kết quả tức thì.
          </p>
        </div>

        {onOpenStudio && (
          <button
            onClick={onOpenStudio}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95 shrink-0 self-start md:self-auto"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Đăng tải bài giảng &amp; Quiz mới</span>
          </button>
        )}
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
            const isOffice = course.title.toLowerCase().includes('excel') || course.title.toLowerCase().includes('word');

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
                          : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                      }`}
                    >
                      {isOffice ? 'Tin học văn phòng' : 'Lập trình & IT'}
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
                        <span>{course.totalSubjects || 2} học phần</span>
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
