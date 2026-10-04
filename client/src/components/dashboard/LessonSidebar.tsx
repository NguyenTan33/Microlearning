import React from 'react';
import {
  BookOpen,
  ChevronLeft,
  PlayCircle,
  CheckCircle,
  HelpCircle,
  Clock,
  Award,
} from 'lucide-react';
import type { CourseDetail, Lesson } from '../../types/catalog.types';

interface LessonSidebarProps {
  course: CourseDetail;
  activeLessonId: number;
  completedLessonIds: number[];
  onSelectLesson: (lesson: Lesson) => void;
  onBackToCatalog: () => void;
}

export const LessonSidebar: React.FC<LessonSidebarProps> = ({
  course,
  activeLessonId,
  completedLessonIds,
  onSelectLesson,
  onBackToCatalog,
}) => {
  // Tính tổng số bài học và số bài đã hoàn thành
  const allLessons: Lesson[] = [];
  course.subjects?.forEach((s) => {
    s.lessons?.forEach((l) => allLessons.push(l));
  });

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => completedLessonIds.includes(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#090D1A] border border-white/10 space-y-4 shadow-xl">
      {/* Nút quay lại danh mục khóa học */}
      <button
        onClick={onBackToCatalog}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Tất cả khóa học</span>
      </button>

      {/* Thông tin khóa học hiện tại */}
      <div className="space-y-2 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Chương trình học</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            {progressPercent}% hoàn thành
          </span>
        </div>

        <h2 className="text-sm sm:text-base font-extrabold text-white leading-snug line-clamp-2">
          {course.title}
        </h2>

        {/* Thanh tiến độ khóa học */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>{completedCount}/{totalLessons} bài hoàn tất</span>
          <span>{course.subjects?.length || 0} học phần</span>
        </div>
      </div>

      {/* Danh sách các học phần & bài học */}
      <div className="space-y-4 max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
        {course.subjects && course.subjects.length > 0 ? (
          course.subjects.map((subject, sIdx) => (
            <div key={subject.id} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center shrink-0">
                  {sIdx + 1}
                </span>
                <span className="truncate">{subject.title}</span>
              </div>

              {/* Danh sách bài học của học phần */}
              <div className="space-y-1.5 pl-2">
                {subject.lessons && subject.lessons.length > 0 ? (
                  subject.lessons.map((lesson) => {
                    const isActive = lesson.id === activeLessonId;
                    const isCompleted = completedLessonIds.includes(lesson.id);
                    const durationMinutes = Math.ceil(lesson.durationSeconds / 60);

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => onSelectLesson(lesson)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isActive
                            ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/50 text-white ring-1 ring-indigo-500/30'
                            : 'bg-slate-900/40 border-white/5 hover:border-white/15 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : isActive ? (
                            <PlayCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                          ) : (
                            <PlayCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          )}

                          <div className="space-y-1 flex-1 min-w-0">
                            <span
                              className={`text-xs font-bold block leading-snug line-clamp-2 ${
                                isActive ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {lesson.title}
                            </span>

                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{durationMinutes > 0 ? `${durationMinutes} phút` : 'Ngắn'}</span>
                              </span>

                              {lesson.hasQuiz && (
                                <span className="flex items-center gap-1 text-purple-400 font-medium">
                                  <Award className="w-3 h-3" />
                                  <span>Trắc nghiệm</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-slate-500 pl-2">Chưa có bài học trong học phần này.</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            Khóa học đang được cập nhật nội dung bài giảng.
          </div>
        )}
      </div>
    </div>
  );
};
