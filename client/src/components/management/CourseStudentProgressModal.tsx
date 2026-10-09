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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D1429] border border-white/10 rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] relative text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📊 Tiến Độ Học Viên</span>
              <span className="text-xs font-normal text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                {courseTitle}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi và phân tích phần trăm hoàn thành bài học của toàn bộ học viên trong khóa
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Metric Cards */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="p-3.5 bg-slate-900/70 border border-blue-500/20 rounded-2xl">
              <p className="text-xs font-semibold text-blue-400">Tổng số học viên</p>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.totalStudentsEnrolled} <span className="text-xs font-normal text-slate-400">học viên</span>
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/70 border border-emerald-500/20 rounded-2xl">
              <p className="text-xs font-semibold text-emerald-400">Tiến độ trung bình</p>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.averageProgressPercent}%
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/70 border border-purple-500/20 rounded-2xl">
              <p className="text-xs font-semibold text-purple-400">Đã hoàn thành (100%)</p>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.completedStudentsCount} <span className="text-xs font-normal text-slate-400">học viên</span>
              </p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-white/5 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setFilterCompleted(undefined); setPageNumber(1); }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterCompleted === undefined
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => { setFilterCompleted(true); setPageNumber(1); }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterCompleted === true
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              Hoàn thành (100%)
            </button>
            <button
              type="button"
              onClick={() => { setFilterCompleted(false); setPageNumber(1); }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterCompleted === false
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-amber-300'
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
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
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
        <div className="flex-1 overflow-y-auto border border-white/10 rounded-2xl bg-slate-950/30">
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
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-white/10 sticky top-0">
                <tr>
                  <th className="p-3.5">Học viên</th>
                  <th className="p-3.5">Số bài học</th>
                  <th className="p-3.5 w-44">Tiến độ (%)</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Hoạt động gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student) => (
                  <tr key={student.accountId} className="hover:bg-white/[0.03] transition">
                    <td className="p-3.5">
                      <p className="font-semibold text-white">{student.fullName}</p>
                      <p className="text-[11px] text-slate-400">{student.email || student.phoneNumber || 'Không có liên hệ'}</p>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-bold text-white">{student.completedLessons}</span>
                      <span className="text-slate-400"> / {student.totalLessons} bài</span>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              student.hasCompletedCourse ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(100, student.progressPercent)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] w-10 text-right text-slate-200">{student.progressPercent}%</span>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {student.hasCompletedCourse ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-500/40">
                          🏅 Đã hoàn thành
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 text-amber-300 text-[11px] font-bold rounded-full border border-amber-500/40">
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
          <div className="flex items-center justify-between pt-4 text-xs text-slate-400 border-t border-white/5 mt-2">
            <span>
              Tổng cộng <strong className="text-white">{totalCount}</strong> học viên (Trang {pageNumber}/{totalPages})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-white/10 rounded-xl font-medium transition cursor-pointer text-white"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber(pageNumber + 1)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-white/10 rounded-xl font-medium transition cursor-pointer text-white"
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
