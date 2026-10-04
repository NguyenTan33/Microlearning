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
  HardDrive,
  FolderOpen,
} from 'lucide-react';
import type { Course, Enrollment } from '../../types/catalog.types';
import { catalogApi } from '../../services/catalogApi';
import { enrollmentApi } from '../../services/enrollmentApi';
import { getAllOfflineVideos } from '../../services/indexedDbService';

interface CourseCatalogViewProps {
  isOnline: boolean;
  onSelectCourse: (courseId: number) => void;
}

export const CourseCatalogView: React.FC<CourseCatalogViewProps> = ({
  isOnline,
  onSelectCourse,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ENROLLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [offlineVideoCount, setOfflineVideoCount] = useState<number>(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const [courseList, enrollmentList] = await Promise.all([
          catalogApi.getAllCourses().catch(() => []),
          enrollmentApi.getMyEnrollments().catch(() => []),
        ]);
        setCourses(courseList);
        setEnrollments(enrollmentList);
      }
      const offlineVideos = await getAllOfflineVideos().catch(() => []);
      setOfflineVideoCount(offlineVideos.length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadData();
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

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Tiêu đề */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-[#0A0F1F] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>Chương trình Đào tạo Vi mô</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Danh Mục Khóa Học Trực Tuyến &amp; Ngoại Tuyến
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
            Nền tảng đào tạo chuyên sâu với cấu trúc bài giảng tối ưu, cho phép học tập linh hoạt bất kể tình trạng kết nối mạng.
          </p>
        </div>

        {offlineVideoCount > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Bộ nhớ thiết bị</span>
              <span className="text-xs font-bold text-emerald-300">
                {offlineVideoCount} bài học đã sẵn sàng
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bộ lọc tab & Ô tìm kiếm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/80 border border-white/5">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất cả khóa học ({courses.length})
          </button>

          <button
            onClick={() => setActiveTab('ENROLLED')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ENROLLED'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Khóa học của tôi ({enrollments.length})
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Danh sách thẻ khóa học */}
      {loading ? (
        <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-xs">Đang tải danh mục khóa học...</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-white/5 p-8 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Không tìm thấy khóa học phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'ENROLLED'
              ? 'Bạn chưa tham gia khóa học nào. Hãy chuyển sang mục "Tất cả khóa học" để đăng ký.'
              : 'Chưa có khóa học nào khớp với từ khóa tìm kiếm của bạn.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const enrolled = isEnrolled(course.id);
            const progress = getEnrollmentProgress(course.id);

            return (
              <div
                key={course.id}
                className="rounded-2xl bg-[#090D1A] border border-white/10 hover:border-indigo-500/40 transition-all duration-300 flex flex-col overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 group"
              >
                {/* Ảnh thu nhỏ khóa học */}
                <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden">
                  <img
                    src={
                      course.thumbnailUrl ||
                      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600'
                    }
                    alt={course.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090D1A] via-transparent to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {enrolled ? (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Đã ghi danh</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold backdrop-blur-md">
                        Tiêu chuẩn
                      </span>
                    )}
                  </div>
                </div>

                {/* Nội dung khóa học */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {course.description || 'Chương trình giảng dạy được thiết kế theo lộ trình thực tiễn.'}
                    </p>
                  </div>

                  {/* Thanh tiến độ nếu đã ghi danh */}
                  {enrolled && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Tiến độ hoàn thành</span>
                        <span className="font-bold text-cyan-300">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Nút hành động */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{course.totalSubjects} học phần</span>
                    </span>

                    {enrolled ? (
                      <button
                        onClick={() => onSelectCourse(course.id)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                      >
                        <span>Vào học ngay</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrollingId === course.id || !isOnline}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {enrollingId === course.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span>{isOnline ? 'Ghi danh khóa học' : 'Cần kết nối mạng'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
