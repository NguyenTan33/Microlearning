import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Check,
  Send,
  Award,
  AlertCircle,
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import type { QuizDetail, QuizAttemptResult, QuizHistoryItem } from '../../types/catalog.types';
import { quizApi } from '../../services/quizApi';

interface InteractiveQuizCardProps {
  lessonId: number;
  onAttemptSubmitted?: () => void;
}

export const InteractiveQuizCard: React.FC<InteractiveQuizCardProps> = ({
  lessonId,
  onAttemptSubmitted,
}) => {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttemptResult | null>(null);
  const [historyList, setHistoryList] = useState<QuizHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [startTime] = useState<string>(() => new Date().toISOString());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const QUESTIONS_PER_PAGE = 5;

  // 1. Tải đề thi trắc nghiệm trực tuyến từ máy chủ
  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setAttemptResult(null);
    setSelectedAnswers({});
    setNoticeMessage(null);
    setCurrentPage(1);

    try {
      const data = await quizApi.getQuizByLesson(lessonId);
      setQuiz(data);
      if (data) {
        quizApi.getQuizHistory(data.id).then(setHistoryList).catch(() => {});
      }
    } catch {
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSelectOption = (questionId: number, optionId: number, isMultiChoice: boolean) => {
    if (attemptResult) return; // Đã nộp bài thì không sửa đáp án

    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMultiChoice) {
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || quiz.questions.length === 0) return;

    // Kiểm tra học viên đã chọn đủ câu hỏi chưa
    const answeredCount = Object.keys(selectedAnswers).filter(
      (k) => (selectedAnswers[Number(k)] || []).length > 0
    ).length;

    if (answeredCount < quiz.questions.length) {
      if (!confirm(`Bạn mới trả lời ${answeredCount}/${quiz.questions.length} câu. Bạn có chắc chắn muốn nộp bài ngay?`)) {
        return;
      }
    }

    setSubmitting(true);
    setNoticeMessage(null);

    const clientAttemptId = crypto.randomUUID();
    const answersPayload = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: selectedAnswers[q.id] || [],
    }));

    try {
      const result = await quizApi.submitQuizAttempt({
        clientAttemptId,
        quizId: quiz.id,
        startedAt: startTime,
        answers: answersPayload,
      });

      setAttemptResult(result);
      setNoticeMessage(
        result.isPassed
          ? `Xuất sắc! Bạn đã đạt ${result.score} điểm (${result.correctAnswersCount}/${result.totalQuestionsCount} câu đúng). Bài học đã được hoàn thành!`
          : `Bạn đạt ${result.score} điểm (${result.correctAnswersCount}/${result.totalQuestionsCount} câu đúng). Điểm chuẩn yêu cầu là ${quiz.passScore} điểm. Hãy ôn tập và làm lại nhé!`
      );

      // Cập nhật lại danh sách lịch sử thi
      quizApi.getQuizHistory(quiz.id).then(setHistoryList).catch(() => {});

      if (onAttemptSubmitted) {
        onAttemptSubmitted();
      }
    } catch (err: unknown) {
      setNoticeMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra khi nộp bài.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAttemptResult(null);
    setSelectedAnswers({});
    setNoticeMessage(null);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-6 sm:p-8 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-xs sm:text-sm">Đang tải bộ câu hỏi trắc nghiệm trực tuyến...</span>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-6 sm:p-8 text-center text-slate-400">
        <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs sm:text-sm">Bài học này hiện chưa có bài tập trắc nghiệm đánh giá.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(quiz.questions.length / QUESTIONS_PER_PAGE);
  const currentQuestions = quiz.questions.slice(
    (currentPage - 1) * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE
  );

  return (
    <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-4 sm:p-6 shadow-xl space-y-5">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Bài Kiểm Tra Đánh Giá Năng Lực</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
            {quiz.title}
          </h3>
          <p className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-white">{quiz.questions.length}</strong> câu hỏi • Điểm chuẩn đạt: <strong className="text-emerald-400">{quiz.passScore} điểm</strong>
          </p>
        </div>

        {/* Nút Xem lịch sử thi */}
        {historyList.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer self-start sm:self-auto"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lịch sử ({historyList.length})</span>
          </button>
        )}
      </div>

      {/* Accordion Lịch sử thi */}
      {showHistory && historyList.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/20 space-y-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Các lần làm bài trước đó:</span>
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {historyList.map((h) => (
              <div
                key={h.attemptId}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/60 border border-white/5"
              >
                <div className="flex items-center gap-2">
                  {h.isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold text-white">{h.score} điểm</span>
                  <span className="text-[11px] text-slate-400">
                    ({h.totalAnswers} câu trả lời)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(h.submittedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thông báo kết quả chấm điểm */}
      {noticeMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
            attemptResult?.isPassed
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : attemptResult
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
          }`}
        >
          {attemptResult?.isPassed ? (
            <Award className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-semibold">{noticeMessage}</p>
          </div>
        </div>
      )}

      {/* Danh sách câu hỏi */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-5">
          {currentQuestions.map((question, qIdx) => {
            const actualIndex = (currentPage - 1) * QUESTIONS_PER_PAGE + qIdx + 1;
            const currentSelected = selectedAnswers[question.id] || [];
            const isMulti = question.questionType === 2;

            return (
              <div
                key={question.id}
                className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3.5 hover:border-white/10 transition-colors"
              >
                {/* Tiêu đề câu hỏi */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                      Câu hỏi {actualIndex}/{quiz.questions.length} • {question.points} điểm
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {question.content}
                    </p>
                  </div>
                  {isMulti && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-semibold shrink-0">
                      Nhiều đáp án
                    </span>
                  )}
                </div>

                {/* Danh sách các lựa chọn đáp án */}
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const isChecked = currentSelected.includes(option.id);

                    // Xác định màu sắc sau khi chấm điểm
                    let optionStyle = 'bg-slate-900/80 border-white/5 hover:border-white/20 text-slate-300';
                    if (attemptResult) {
                      if (isChecked) {
                        optionStyle = attemptResult.isPassed
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-indigo-950/50 border-indigo-500/50 text-white';
                      }
                    } else if (isChecked) {
                      optionStyle = 'bg-indigo-950/60 border-indigo-500 text-white shadow-sm';
                    }

                    return (
                      <div
                        key={option.id}
                        onClick={() => handleSelectOption(question.id, option.id, isMulti)}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 select-none ${
                          attemptResult ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                        } ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Radio / Checkbox Indicator */}
                          <div
                            className={`w-4 h-4 rounded-${
                              isMulti ? 'md' : 'full'
                            } border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-cyan-500 border-cyan-400 text-black'
                                : 'border-slate-600 bg-slate-800'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <span className="text-xs font-medium leading-relaxed">
                            {option.optionText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Phần giải thích chi tiết đáp án sau khi nộp bài */}
                {attemptResult && question.explanation && (
                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-start gap-2 animate-fadeIn">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Giải thích: </span>
                      <span>{question.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Thanh Phân Trang Câu Hỏi (nếu đề thi > 5 câu) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 disabled:opacity-40 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs text-slate-400 font-semibold px-2">
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 disabled:opacity-40 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nút Hành Động Submit / Retake */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            {!attemptResult ? (
              <span>
                Đã chọn:{' '}
                <strong className="text-white">
                  {Object.keys(selectedAnswers).filter((k) => (selectedAnswers[Number(k)] || []).length > 0).length}
                </strong>
                /{quiz.questions.length} câu
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">
                Đã hoàn tất đánh giá bài thi
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {attemptResult ? (
              <button
                type="button"
                onClick={handleRetake}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Làm lại đề thi</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang chấm điểm...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Nộp bài chấm điểm</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
