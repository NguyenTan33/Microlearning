import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  CheckCircle,
  Clock,
  Award,
  Search,
  X,
  Heart,
} from 'lucide-react';
import type { Course, CourseDetail, Lesson } from '../../types/catalog.types';
import { useLessonSearch } from '../../hooks/useLessonSearch';
import { favoriteSubjectApi } from '../../services/favoriteSubjectApi';

interface LessonSidebarProps {
  course: CourseDetail;
  activeLessonId: number;
  completedLessonIds: number[];
  onSelectLesson: (lesson: Lesson) => void;
  onBackToCatalog: () => void;
  allCourses?: Course[];
  onSelectCourse?: (courseId: number) => void;
}

export const LessonSidebar: React.FC<LessonSidebarProps> = ({
  course,
  activeLessonId,
  completedLessonIds,
  onSelectLesson,
  onBackToCatalog,
  allCourses,
  onSelectCourse,
}) => {
  // 1. Quản lý trạng thái Môn học yêu thích (Thả tim ❤️)
  const [favoriteSubjectIds, setFavoriteSubjectIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let isMounted = true;
    async function loadFavoriteIds() {
      try {
        const ids = await favoriteSubjectApi.getMyFavoriteIds();
        if (isMounted) {
          setFavoriteSubjectIds(new Set(ids));
        }
      } catch (err) {
        console.warn('Lỗi khi tải danh sách môn học yêu thích:', err);
      }
    }
    loadFavoriteIds();

    const handleFavoriteUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ subjectId: number; isFavorite: boolean }>;
      if (customEvent.detail) {
        setFavoriteSubjectIds((prev) => {
          const next = new Set(prev);
          if (customEvent.detail.isFavorite) {
            next.add(customEvent.detail.subjectId);
          } else {
            next.delete(customEvent.detail.subjectId);
          }
          return next;
        });
      }
    };

    window.addEventListener('favorite-subjects-updated', handleFavoriteUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('favorite-subjects-updated', handleFavoriteUpdated);
    };
  }, []);

  const handleToggleFavorite = async (e: React.MouseEvent, subjectId: number) => {
    e.stopPropagation();
    try {
      const res = await favoriteSubjectApi.toggleFavorite(subjectId);
      setFavoriteSubjectIds((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) {
          next.add(subjectId);
        } else {
          next.delete(subjectId);
        }
        return next;
      });
      window.dispatchEvent(
        new CustomEvent('favorite-subjects-updated', {
          detail: { subjectId, isFavorite: res.isFavorite },
        })
      );
    } catch (err) {
      console.error('Lỗi khi thả tim môn học:', err);
    }
  };

  // 2. Tìm kiếm bài học (Feature 3: useLessonSearch)
  const subjects = useMemo(() => course.subjects || [], [course.subjects]);
  const {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    filteredSubjects,
    matchingLessonCount,
    matchedSubjectIds,
    clearSearch,
  } = useLessonSearch(subjects, 250);

  // 3. Trạng thái Accordion đóng/mở môn học (Feature 4)
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    subjects.forEach((s) => initial.add(s.id));
    return initial;
  });

  // Tự động mở môn học chứa bài giảng active hiện tại
  useEffect(() => {
    if (activeLessonId) {
      const targetSubject = subjects.find((s) =>
        s.lessons?.some((l) => l.id === activeLessonId)
      );
      if (targetSubject) {
        setExpandedSubjectIds((prev) => new Set([...prev, targetSubject.id]));
      }
    }
  }, [activeLessonId, subjects]);

  // Tự động mở các môn học có kết quả tìm kiếm trùng khớp
  useEffect(() => {
    if (debouncedTerm && matchedSubjectIds.size > 0) {
      setExpandedSubjectIds((prev) => new Set([...prev, ...matchedSubjectIds]));
    }
  }, [debouncedTerm, matchedSubjectIds]);

  const toggleSubjectAccordion = (subjectId: number) => {
    setExpandedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set<number>();
    subjects.forEach((s) => all.add(s.id));
    setExpandedSubjectIds(all);
  };

  const handleCollapseAll = () => {
    setExpandedSubjectIds(new Set());
  };

  // Tính tổng số bài học và số bài đã hoàn thành
  const allLessons: Lesson[] = [];
  subjects.forEach((s) => {
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

        {/* Bộ chuyển đổi khóa học (Course Switcher - Chọn các khóa học đã tham gia ngay trong phòng học) */}
        {allCourses && allCourses.length > 0 && onSelectCourse && (
          <div className="pt-2">
            <div className="relative">
              <select
                aria-label="Chọn khóa học tham gia"
                value={course.id}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val && val !== course.id) {
                    onSelectCourse(val);
                  }
                }}
                className="w-full appearance-none bg-slate-900 border border-indigo-500/30 hover:border-indigo-500/60 transition-colors rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm truncate"
              >
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.id === course.id ? `✓ ${c.title}` : c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Thanh tìm kiếm bài học (Feature 3) */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm bài học trong môn..."
            className="w-full pl-8 pr-7 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 text-slate-400 hover:text-white transition"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {debouncedTerm && (
          <div className="mt-1.5 text-[11px] text-indigo-400 flex items-center justify-between">
            <span>
              Tìm thấy <strong>{matchingLessonCount}</strong> bài học phù hợp
            </span>
            <button
              type="button"
              onClick={clearSearch}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              Đặt lại
            </button>
          </div>
        )}
      </div>

      {/* Thanh công cụ Accordion (Feature 4: Mở / Thu gọn tất cả) */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-0.5">
        <span className="font-semibold uppercase tracking-wider text-[10px]">Danh sách môn học</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="hover:text-indigo-400 transition cursor-pointer"
          >
            Mở tất cả
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="hover:text-indigo-400 transition cursor-pointer"
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Danh sách các học phần & bài học (Accordion) */}
      <div className="space-y-3 max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-340px)] overflow-y-auto pr-1 custom-scrollbar">
        {filteredSubjects.length > 0 ? (
          filteredSubjects.map((subject, sIdx) => {
            const isExpanded = expandedSubjectIds.has(subject.id);
            const isFav = favoriteSubjectIds.has(subject.id);
            const lessonList = subject.lessons || [];

            return (
              <div
                key={subject.id}
                id={`subject-${subject.id}`}
                className="rounded-xl border border-white/5 bg-slate-900/30 overflow-hidden transition-all"
              >
                {/* Header Học phần (Accordion Toggle & Thả tim ❤️) */}
                <div
                  onClick={() => toggleSubjectAccordion(subject.id)}
                  className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/5 transition select-none group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                      {subject.title}
                    </span>
                    <span className="text-[10px] text-slate-500">({lessonList.length})</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Nút Thả tim ❤️ Môn học yêu thích (Feature 10) */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(e, subject.id)}
                      title={isFav ? 'Bỏ yêu thích môn học' : 'Yêu thích môn học này'}
                      className={`p-1 rounded-lg transition-transform active:scale-75 ${
                        isFav
                          ? 'text-rose-500 hover:text-rose-400'
                          : 'text-slate-600 hover:text-rose-400 opacity-60 group-hover:opacity-100'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isFav ? 'fill-current animate-pulse' : ''}`}
                      />
                    </button>

                    {/* Mũi tên đóng mở Accordion */}
                    <span className="text-slate-400 p-0.5">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Danh sách bài học của học phần (Collapsible Accordion Body) */}
                {isExpanded && (
                  <div className="p-2 pt-0 space-y-1.5 border-t border-white/5">
                    {lessonList.length > 0 ? (
                      lessonList.map((lesson) => {
                        const isActive = lesson.id === activeLessonId;
                        const isCompleted = completedLessonIds.includes(lesson.id);
                        const durationMinutes = Math.ceil(lesson.durationSeconds / 60);

                        return (
                          <div
                            key={lesson.id}
                            onClick={() => onSelectLesson(lesson)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                              isActive
                                ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-950/50 text-white ring-1 ring-indigo-500/30'
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
                      <p className="text-[11px] text-slate-500 py-1.5 pl-2">
                        Chưa có bài học trong học phần này.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            {searchTerm
              ? 'Không tìm thấy bài học nào phù hợp với từ khóa.'
              : 'Khóa học đang được cập nhật nội dung bài giảng.'}
          </div>
        )}
      </div>
    </div>
  );
};
