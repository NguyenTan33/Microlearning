import React, { useState, useEffect } from 'react';
import {
  studentAnalyticsApi,
  type CourseOverviewMetrics,
  type StudentProgressDetail,
} from '../../services/studentAnalyticsApi';

interface CourseStudentProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseTitle: string;
}

export const CourseStudentProgressModal: React.FC<CourseStudentProgressModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
}) => {
  const [metrics, setMetrics] = useState<CourseOverviewMetrics | null>(null);
  const [students, setStudents] = useState<StudentProgressDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterCompleted, setFilterCompleted] = useState<boolean | undefined>(undefined);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, progressData] = await Promise.all([
        studentAnalyticsApi.getCourseOverview(courseId),
        studentAnalyticsApi.getStudentsProgress(courseId, {
          searchTerm: searchTerm.trim() || undefined,
          pageNumber,
          pageSize: 10,
          onlyCompleted: filterCompleted,
        }),
      ]);

      setMetrics(overviewData);
      setStudents(progressData.items);
      setTotalPages(progressData.totalPages);
      setTotalCount(progressData.totalCount);
    } catch (err) {
      console.error('Lỗi khi tải tiến độ học viên:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, courseId, pageNumber, filterCompleted]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPageNumber(1);
    loadData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📊 Tiến Độ Học Viên</span>
              <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {courseTitle}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi và phân tích phần trăm hoàn thành bài học của toàn bộ học viên trong khóa
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Metric Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Tổng số học viên</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {metrics.totalStudentsEnrolled} <span className="text-xs font-normal text-slate-400">học viên</span>
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Tiến độ trung bình</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {metrics.averageProgressPercent}%
              </p>
            </div>

            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-2xl">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">Đã tốt nghiệp (100%)</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                {metrics.completedStudentsCount} <span className="text-xs font-normal text-slate-400">học viên</span>
              </p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setFilterCompleted(undefined); setPageNumber(1); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterCompleted === undefined
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => { setFilterCompleted(true); setPageNumber(1); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterCompleted === true
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Hoàn thành (100%)
            </button>
            <button
              type="button"
              onClick={() => { setFilterCompleted(false); setPageNumber(1); }}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterCompleted === false
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Đang học
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
        </div>

        {/* Student List Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Đang tải tiến độ học viên...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">Không tìm thấy học viên nào khớp với bộ lọc.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="p-3.5">Học viên</th>
                  <th className="p-3.5">Số bài học</th>
                  <th className="p-3.5 w-44">Tiến độ (%)</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Hoạt động gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student) => (
                  <tr key={student.accountId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{student.fullName}</p>
                      <p className="text-[11px] text-slate-400">{student.email || student.phoneNumber || 'Không có liên hệ'}</p>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{student.completedLessons}</span>
                      <span className="text-slate-400"> / {student.totalLessons} bài</span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              student.hasCompletedCourse ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${Math.min(100, student.progressPercent)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] w-10 text-right">{student.progressPercent}%</span>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {student.hasCompletedCourse ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                          🏅 Đã tốt nghiệp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[11px] font-bold rounded-full border border-amber-200 dark:border-amber-800">
                          ⏱️ Đang học
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {student.lastActiveAt ? new Date(student.lastActiveAt).toLocaleString('vi-VN') : 'Chưa tham gia'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
            <span>
              Tổng cộng <strong>{totalCount}</strong> học viên (Trang {pageNumber}/{totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber(pageNumber + 1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg font-medium transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
