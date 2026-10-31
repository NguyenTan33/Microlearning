import React, { useState, useEffect } from 'react';
import {
  mistakeVaultApi,
  type CourseMistakeGroup,
  type LessonMistakeGroup,
  type QuizMistakeItem,
  type MistakeAnswerResult,
} from '../../services/mistakeVaultApi';
import {
  X,
  BookOpen,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Play,
  Sparkles,
} from 'lucide-react';

interface MistakeVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MistakeVaultModal: React.FC<MistakeVaultModalProps> = ({ isOpen, onClose }) => {
  const [viewMode, setViewMode] = useState<'grouped' | 'practice'>('grouped');
  const [courseGroups, setCourseGroups] = useState<CourseMistakeGroup[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Practice state
  const [activeLesson, setActiveLesson] = useState<LessonMistakeGroup | null>(null);
  const [practiceMistakes, setPracticeMistakes] = useState<QuizMistakeItem[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<MistakeAnswerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await mistakeVaultApi.getGroupedMistakes(false);
      setCourseGroups(data);

      // Mặc định expand khóa học đầu tiên nếu có
      if (data.length > 0) {
        setExpandedCourses((prev) => ({ ...prev, [data[0].courseId]: true }));
      }
    } catch (err) {
      console.warn('Lỗi khi tải sổ câu sai phân cấp:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setViewMode('grouped');
      setActiveLesson(null);
      setPracticeIndex(0);
      setSelectedOptionId(null);
      setAnswerResult(null);
    }
  }, [isOpen]);

  const toggleCourseExpand = (courseId: number) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const handleStartLessonPractice = async (lesson: LessonMistakeGroup) => {
    setActiveLesson(lesson);
    setIsLoading(true);
    try {
      const session = await mistakeVaultApi.generatePracticeSession(lesson.lessonId, lesson.courseId);
      setPracticeMistakes(session.mistakes.length > 0 ? session.mistakes : lesson.mistakes);
      setPracticeIndex(0);
      setSelectedOptionId(null);
      setAnswerResult(null);
      setViewMode('practice');
    } catch (err) {
      console.error('Lỗi khởi tạo phiên ôn tập bài học:', err);
      setPracticeMistakes(lesson.mistakes);
      setPracticeIndex(0);
      setViewMode('practice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitPractice = () => {
    setViewMode('grouped');
    setActiveLesson(null);
    setPracticeMistakes([]);
    setPracticeIndex(0);
    setSelectedOptionId(null);
    setAnswerResult(null);
    loadData(); // Tải lại danh sách cập nhật
  };

  const currentMistake = practiceMistakes[practiceIndex];

  const handleCheckAnswer = async () => {
    if (!currentMistake || selectedOptionId === null) return;
    setIsSubmitting(true);
    try {
      const result = await mistakeVaultApi.submitPracticeAnswer(currentMistake.id, selectedOptionId);
      setAnswerResult(result);
      if (result.isResolved) {
        // Cập nhật trạng thái câu sai
        setPracticeMistakes((prev) =>
          prev.map((m) => (m.id === currentMistake.id ? { ...m, isResolved: true } : m))
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi nộp câu trả lời.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextPracticeQuestion = () => {
    setSelectedOptionId(null);
    setAnswerResult(null);

    // Lọc các câu chưa resolved hoặc tiếp tục câu sau
    if (practiceIndex < practiceMistakes.length - 1) {
      setPracticeIndex(practiceIndex + 1);
    } else {
      alert('Chúc mừng! Bạn đã hoàn thành tất cả các câu sai của bài học này.');
      handleExitPractice();
    }
  };

  if (!isOpen) return null;

  const totalAllMistakes = courseGroups.reduce((acc, c) => acc + c.unresolvedCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0D1429] border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] relative text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xl shadow-inner">
              📖
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>Sổ Tay Câu Hỏi Sai</span>
                {totalAllMistakes > 0 && (
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/40">
                    {totalAllMistakes} câu cần sửa
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Phân loại theo Khóa học & Bài học để ôn luyện liên tục
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Đang tải sổ tay câu hỏi sai...</p>
            </div>
          ) : viewMode === 'grouped' ? (
            /* VIEW 1: PHÂN CẤP THEO KHÓA HỌC -> BÀI HỌC */
            courseGroups.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-3">
                  🎉
                </div>
                <h4 className="text-base font-bold text-slate-200">
                  Sổ tay của bạn hoàn toàn sạch sẽ!
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Bạn không có câu hỏi nào bị làm sai cần khắc phục. Hãy tiếp tục học tập và làm bài tập nhé!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseGroups.map((course) => {
                  const isExpanded = !!expandedCourses[course.courseId];
                  return (
                    <div
                      key={course.courseId}
                      className="bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden transition"
                    >
                      {/* Tiêu đề Khóa học */}
                      <button
                        type="button"
                        onClick={() => toggleCourseExpand(course.courseId)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <FolderOpen className="w-5 h-5 text-indigo-400" />
                          <div>
                            <p className="font-bold text-white text-sm">{course.courseTitle}</p>
                            <p className="text-[11px] text-slate-400">
                              {course.lessons.length} bài học có câu sai
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-lg">
                            {course.unresolvedCount} câu sai
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Danh sách Bài học trong Khóa học */}
                      {isExpanded && (
                        <div className="p-3 pt-0 space-y-2 border-t border-white/5 bg-slate-950/40">
                          {course.lessons.map((lesson) => (
                            <div
                              key={lesson.lessonId}
                              className="p-3 bg-slate-900/90 rounded-xl border border-white/5 hover:border-indigo-500/30 transition flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5 truncate pr-2">
                                <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-slate-200 truncate">{lesson.lessonTitle}</p>
                                  <p className="text-[10px] text-slate-400">{lesson.subjectTitle}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[11px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-500/20">
                                  {lesson.unresolvedCount} câu
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartLessonPractice(lesson)}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Làm bài</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* VIEW 2: MÀN HÌNH LUYỆN TẬP CÂU SAI LIÊN TỤC CỦA BÀI ĐÃ CHỌN */
            currentMistake && (
              <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/10 relative">
                {/* Thanh điều hướng & Nút Thoát */}
                <div className="flex items-center justify-between text-xs text-slate-400 pb-3 mb-3 border-b border-white/10">
                  <div className="truncate pr-2">
                    <p className="text-rose-400 font-bold text-[11px]">
                      {activeLesson?.courseTitle} &gt; {activeLesson?.lessonTitle}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Đang ôn luyện: Câu {practiceIndex + 1} / {practiceMistakes.length} (Sai {currentMistake.failedCount} lần)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExitPractice}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>

                <h4 className="text-base font-bold text-white mb-4 leading-relaxed">
                  {currentMistake.questionText}
                </h4>

                {/* Các lựa chọn đáp án */}
                <div className="space-y-2 mb-4">
                  {currentMistake.options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const isAnswered = answerResult !== null;
                    const isCorrect = isAnswered && opt.id === answerResult.correctOptionId;
                    const isWrongSelected = isAnswered && isSelected && !answerResult.isCorrect;

                    let optionStyle = 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-900';
                    if (isSelected && !isAnswered) {
                      optionStyle = 'border-indigo-500 bg-indigo-950/50 ring-1 ring-indigo-500 text-white font-semibold';
                    } else if (isCorrect) {
                      optionStyle = 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-bold';
                    } else if (isWrongSelected) {
                      optionStyle = 'border-rose-500 bg-rose-950/60 text-rose-200 font-bold';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between cursor-pointer ${optionStyle}`}
                      >
                        <span>{opt.optionText}</span>
                        {isCorrect && (
                          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Đúng
                          </span>
                        )}
                        {isWrongSelected && (
                          <span className="text-rose-400 text-xs font-bold flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Sai
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Kết quả phản hồi */}
                {answerResult && (
                  <div
                    className={`p-3.5 rounded-xl border mb-4 text-xs ${
                      answerResult.isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <p className="font-bold text-sm mb-1">{answerResult.feedbackMessage}</p>
                    {answerResult.explanation && (
                      <p className="mt-1 opacity-90 leading-relaxed">
                        <strong className="text-indigo-400">Giải thích:</strong> {answerResult.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Nút hành động */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleExitPractice}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Dừng & Quay lại</span>
                  </button>

                  {!answerResult ? (
                    <button
                      type="button"
                      disabled={selectedOptionId === null || isSubmitting}
                      onClick={handleCheckAnswer}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      <span>Kiểm tra đáp án</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextPracticeQuestion}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>{practiceIndex < practiceMistakes.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành bài'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
