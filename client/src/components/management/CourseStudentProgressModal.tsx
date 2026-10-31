import React, { useState, useEffect } from 'react';
import {
  studentAnalyticsApi,
  type CourseOverviewMetrics,
  type StudentProgressDetail,
  type StudentLessonQuizDetail,
} from '../../services/studentAnalyticsApi';
import {
  X,
  Users,
  Video,
  Award,
  CheckCircle2,
  Clock,
  ChevronRight,
  BookOpen,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

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

  // State cho Sub-Modal xem chi tiết tiến độ bài học & bài tập của 1 sinh viên
  const [selectedStudent, setSelectedStudent] = useState<StudentProgressDetail | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentLessonQuizDetail[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

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

  const handleOpenStudentDetail = async (student: StudentProgressDetail) => {
    setSelectedStudent(student);
    setIsLoadingDetail(true);
    try {
      const details = await studentAnalyticsApi.getStudentCourseDetail(courseId, student.accountId);
      setStudentDetails(details);
    } catch (error) {
      console.error('Lỗi khi tải chi tiết sinh viên:', error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D1429] border border-white/10 rounded-3xl max-w-5xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] relative text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl">📊</span>
              <span>Tiến Độ Học Viên & Bài Tập</span>
              <span className="text-xs font-normal text-indigo-300 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                {courseTitle}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Theo dõi chi tiết phần trăm xem video và kết quả làm bài tập trắc nghiệm của học viên
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Cards (Tổng quan Video & Bài tập) */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            <div className="p-3.5 bg-slate-900/70 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-400">Tổng học viên</p>
                <Users className="w-4 h-4 text-blue-400/80" />
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.totalStudentsEnrolled} <span className="text-xs font-normal text-slate-400">người</span>
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/70 border border-indigo-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-indigo-400">Tiến độ xem video</p>
                <Video className="w-4 h-4 text-indigo-400/80" />
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.averageProgressPercent}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Xong: {metrics.completedStudentsCount} học viên</p>
            </div>

            <div className="p-3.5 bg-slate-900/70 border border-emerald-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-400">Hoàn thành bài tập</p>
                <Award className="w-4 h-4 text-emerald-400/80" />
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.studentsCompletedAllQuizzesCount} <span className="text-xs font-normal text-slate-400">học viên</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tổng: {metrics.totalQuizzesInCourse} bài quiz</p>
            </div>

            <div className="p-3.5 bg-slate-900/70 border border-purple-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-purple-400">Điểm Quiz trung bình</p>
                <TrendingUp className="w-4 h-4 text-purple-400/80" />
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {metrics.averageCourseQuizScore} <span className="text-xs font-normal text-slate-400">/ 100</span>
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
              Đã xong 100% video
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
              placeholder="Tìm học viên theo tên hoặc email..."
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
              <thead className="bg-slate-950/90 text-slate-400 font-semibold border-b border-white/10 sticky top-0 z-10">
                <tr>
                  <th className="p-3.5">Học viên</th>
                  <th className="p-3.5 w-44">Tiến độ xem video</th>
                  <th className="p-3.5 w-48">Tiến độ làm bài tập</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5">Hoạt động gần nhất</th>
                  <th className="p-3.5 text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((student) => (
                  <tr key={student.accountId} className="hover:bg-white/[0.03] transition">
                    <td className="p-3.5">
                      <p className="font-semibold text-white">{student.fullName}</p>
                      <p className="text-[11px] text-slate-400">{student.email || student.phoneNumber || 'Không có liên hệ'}</p>
                    </td>

                    {/* Tiến độ xem video */}
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
                      <p className="text-[10px] text-slate-400 mt-1">
                        Hoàn thành: {student.completedLessons}/{student.totalLessons} bài
                      </p>
                    </td>

                    {/* Tiến độ làm bài tập */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              student.hasPassedAllQuizzes ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, student.quizCompletionPercent)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] w-10 text-right text-slate-200">{student.quizCompletionPercent}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>Đạt: {student.completedQuizzes}/{student.totalQuizzesInCourse} bài</span>
                        <span className="font-bold text-amber-300">ĐTB: {student.averageQuizScore}đ</span>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {student.hasCompletedCourse && student.hasPassedAllQuizzes ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-950/60 text-emerald-300 text-[11px] font-bold rounded-full border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xuất sắc (100%)
                        </span>
                      ) : student.hasCompletedCourse ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-950/60 text-blue-300 text-[11px] font-bold rounded-full border border-blue-500/40">
                          Xong video
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 text-amber-300 text-[11px] font-bold rounded-full border border-amber-500/40">
                          <Clock className="w-3.5 h-3.5" /> Đang học
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {student.lastActiveAt ? new Date(student.lastActiveAt).toLocaleString('vi-VN') : 'Chưa tham gia'}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenStudentDetail(student)}
                        className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
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

        {/* SUB-MODAL: CHI TIẾT TỪNG BÀI HỌC VÀ BÀI TẬP CỦA HỌC VIÊN */}
        {selectedStudent && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#0B1120] border border-indigo-500/30 rounded-3xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] relative text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span>Chi Tiết Học Tập: {selectedStudent.fullName}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedStudent.email || selectedStudent.phoneNumber} • {courseTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1">
                {isLoadingDetail ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Đang tải chi tiết từng bài học...</p>
                  </div>
                ) : studentDetails.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Chưa có bài học nào trong khóa này.
                  </div>
                ) : (
                  studentDetails.map((lesson) => (
                    <div key={lesson.lessonId} className="p-3.5 bg-slate-900/80 border border-white/5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white text-xs">{lesson.lessonTitle}</p>
                          <p className="text-[11px] text-slate-400">{lesson.subjectTitle}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            lesson.isVideoCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            Video: {lesson.videoPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Quizzes list của bài học này */}
                      <div className="mt-2.5 pt-2.5 border-t border-white/5">
                        <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Bài tập trắc nghiệm ({lesson.quizzes.length}):</span>
                        </p>
                        {lesson.quizzes.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">Bài học này không có bài tập.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {lesson.quizzes.map((quiz) => (
                              <div key={quiz.quizId} className="p-2 bg-slate-950/70 border border-white/5 rounded-xl flex items-center justify-between">
                                <div className="truncate pr-2">
                                  <p className="text-[11px] font-medium text-slate-200 truncate">{quiz.quizTitle}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {quiz.attemptsCount > 0 ? `Làm ${quiz.attemptsCount} lần` : 'Chưa làm'}
                                  </p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                  {quiz.attemptsCount > 0 ? (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      quiz.isPassed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    }`}>
                                      {quiz.bestScore}đ ({quiz.isPassed ? 'Đạt' : 'Chưa đạt'})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                                      Chưa nộp
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-white/10 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
