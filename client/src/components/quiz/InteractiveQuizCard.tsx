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
  ArrowLeft,
  Play,
} from 'lucide-react';
import type { QuizDetail, QuizSummary, QuizAttemptResult, QuizHistoryItem } from '../../types/catalog.types';
import { quizApi } from '../../services/quizApi';

interface InteractiveQuizCardProps {
  lessonId: number;
  initialQuizId?: number | null;
  onAttemptSubmitted?: () => void;
  onBackToList?: () => void;
}

export const InteractiveQuizCard: React.FC<InteractiveQuizCardProps> = ({
  lessonId,
  initialQuizId = null,
  onAttemptSubmitted,
  onBackToList,
}) => {
  const [quizList, setQuizList] = useState<QuizSummary[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<number | null>(initialQuizId);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingQuiz, setLoadingQuiz] = useState<boolean>(false);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttemptResult | null>(null);
  const [historyList, setHistoryList] = useState<QuizHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string>(() => new Date().toISOString());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const QUESTIONS_PER_PAGE = 5;

  // 1. Tải danh sách toàn bộ các đề thi của bài học
  const loadQuizList = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await quizApi.getAllQuizzesByLesson(lessonId);
      setQuizList(list);

      // Nếu có initialQuizId hợp lệ thì chọn bài đó
      if (initialQuizId && list.some((q) => q.id === initialQuizId)) {
        setActiveQuizId(initialQuizId);
      } else if (list.length === 1) {
        // Nếu bài này chỉ có duy nhất 1 quiz, tự động mở luôn bài đó
        setActiveQuizId(list[0].id);
      } else {
        setActiveQuizId(null);
      }
    } catch {
      setQuizList([]);
    } finally {
      setLoadingList(false);
    }
  }, [lessonId, initialQuizId]);

  useEffect(() => {
    loadQuizList();
  }, [loadQuizList]);

  // 2. Tải chi tiết bài quiz đang được chọn làm
  const loadActiveQuiz = useCallback(async (quizId: number) => {
    setLoadingQuiz(true);
    setAttemptResult(null);
    setSelectedAnswers({});
    setNoticeMessage(null);
    setCurrentPage(1);
    setStartTime(new Date().toISOString());

    try {
      const data = await quizApi.getQuizById(quizId);
      setQuiz(data);
      if (data) {
        quizApi.getQuizHistory(data.id).then(setHistoryList).catch(() => {});
      }
    } catch {
      setQuiz(null);
    } finally {
      setLoadingQuiz(false);
    }
  }, []);

  useEffect(() => {
    if (activeQuizId) {
      loadActiveQuiz(activeQuizId);
    } else {
      setQuiz(null);
    }
  }, [activeQuizId, loadActiveQuiz]);

  const handleSelectOption = (questionId: number, optionId: number, isMultiChoice: boolean) => {
    if (attemptResult) return;

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

  const answeredCount = Object.keys(selectedAnswers).filter(
    (k) => (selectedAnswers[Number(k)] || []).length > 0
  ).length;

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!quiz || quiz.questions.length === 0 || submitting) return;

    if (answeredCount === 0) {
      setNoticeMessage('⚠️ Bạn chưa chọn câu trả lời nào. Vui lòng làm bài trước khi bấm nộp bài!');
      return;
    }

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
          ? `Xuất sắc! Bạn đã đạt ${result.score} điểm (${result.correctAnswersCount}/${result.totalQuestionsCount} câu đúng). Bài tập đã hoàn thành đạt chuẩn!`
          : `Bạn đạt ${result.score} điểm (${result.correctAnswersCount}/${result.totalQuestionsCount} câu đúng). Điểm chuẩn yêu cầu là ${quiz.passScore} điểm. Hãy ôn tập và làm lại nhé!`
      );

      // Cập nhật lại lịch sử và danh sách tổng quan
      quizApi.getQuizHistory(quiz.id).then(setHistoryList).catch(() => {});
      loadQuizList();

      if (onAttemptSubmitted && result.isPassed) {
        onAttemptSubmitted();
      }
    } catch (err: unknown) {
      setNoticeMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra khi nộp bài.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!confirm('Bạn có chắc chắn muốn làm lại bài thi này không? Toàn bộ câu trả lời sẽ được làm mới.')) {
      return;
    }

    setAttemptResult(null);
    setSelectedAnswers({});
    setNoticeMessage(null);
    setCurrentPage(1);
    setStartTime(new Date().toISOString());

    setTimeout(() => {
      const container = document.getElementById('interactive-quiz-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  if (loadingList) {
    return (
      <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-6 sm:p-8 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-xs sm:text-sm">Đang tải danh sách bài tập trắc nghiệm...</span>
      </div>
    );
  }

  // Trường hợp bài học chưa có bài quiz nào
  if (quizList.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-6 sm:p-8 text-center text-slate-400">
        <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs sm:text-sm">Bài học này hiện chưa có bài tập trắc nghiệm nào.</p>
      </div>
    );
  }

  // GIAO DIỆN 1: DANH SÁCH BÀI TẬP QUIZ (Khi bài học có nhiều quiz và chưa chọn bài cụ thể)
  if (!activeQuizId || !quiz) {
    return (
      <div id="interactive-quiz-container" className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Danh Sách Bài Tập ({quizList.length})</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chọn bài tập bên dưới để bắt đầu làm bài và đánh giá kiến thức
            </p>
          </div>
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {quizList.map((q, idx) => (
            <div
              key={q.id}
              className="p-4 bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 rounded-2xl transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/30">
                    Bài #{idx + 1}
                  </span>
                  {q.bestScore !== null && q.bestScore !== undefined ? (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      q.isPassed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {q.bestScore}đ ({q.isPassed ? 'Đạt' : 'Chưa đạt'})
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                      Chưa làm
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white line-clamp-2">{q.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  {q.questionCount} câu hỏi • Điểm đạt: {q.passScore}đ
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveQuizId(q.id)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{q.bestScore !== null && q.bestScore !== undefined ? 'Làm lại bài' : 'Bắt đầu làm bài'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // GIAO DIỆN 2: MÀN HÌNH LÀM BÀI QUIZ CỤ THỂ
  if (loadingQuiz) {
    return (
      <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-6 sm:p-8 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-xs sm:text-sm">Đang tải nội dung đề thi...</span>
      </div>
    );
  }

  const totalPages = Math.ceil(quiz.questions.length / QUESTIONS_PER_PAGE);
  const currentQuestions = quiz.questions.slice(
    (currentPage - 1) * QUESTIONS_PER_PAGE,
    currentPage * QUESTIONS_PER_PAGE
  );

  return (
    <div id="interactive-quiz-container" className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-4 sm:p-6 shadow-xl space-y-5">
      {/* Quiz Header & Nút Quay lại danh sách */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {quizList.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveQuizId(null)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Đổi bài tập</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Đề Thi Trắc Nghiệm</span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
            {quiz.title}
          </h3>
          <p className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-white">{quiz.questions.length}</strong> câu hỏi • Điểm chuẩn: <strong className="text-emerald-400">{quiz.passScore} điểm</strong>
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

      {/* Thông báo kết quả nộp bài */}
      {noticeMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            attemptResult?.isPassed
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : attemptResult
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}
        >
          {attemptResult?.isPassed ? (
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">
            {noticeMessage}
          </div>
        </div>
      )}

      {/* Danh sách câu hỏi */}
      <div className="space-y-5">
        {currentQuestions.map((q, idx) => {
          const questionIndex = (currentPage - 1) * QUESTIONS_PER_PAGE + idx + 1;
          const userAnswers = selectedAnswers[q.id] || [];
          const isMulti = q.questionType === 2;

          return (
            <div
              key={q.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
                    Câu {questionIndex} / {quiz.questions.length} • {q.points} điểm
                  </span>
                  <h4 className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                    {q.content}
                  </h4>
                </div>
              </div>

              {/* Các đáp án lựa chọn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {q.options.map((opt) => {
                  const isChecked = userAnswers.includes(opt.id);

                  let btnStyle = 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-indigo-500/40 hover:bg-slate-900';
                  if (isChecked) {
                    btnStyle = 'bg-indigo-950/60 border-indigo-500 text-white font-semibold ring-1 ring-indigo-500/50';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={attemptResult !== null}
                      onClick={() => handleSelectOption(q.id, opt.id, isMulti)}
                      className={`text-left p-3 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between gap-2 cursor-pointer ${btnStyle} ${
                        attemptResult ? 'cursor-not-allowed opacity-90' : ''
                      }`}
                    >
                      <span className="flex-1">{opt.optionText}</span>
                      {isChecked && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Giải thích câu hỏi khi đã nộp bài */}
              {attemptResult && q.explanation && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300">
                  <strong className="text-indigo-400">Giải thích:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Phân trang khi nhiều hơn 5 câu */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Trang trước</span>
          </button>

          <span className="text-xs text-slate-400">
            Trang {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition cursor-pointer"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer & Nút Nộp Bài / Làm lại */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/10">
        <p className="text-xs text-slate-400">
          Đã trả lời: <strong className="text-white">{answeredCount}</strong> / {quiz.questions.length} câu
        </p>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {attemptResult ? (
            <button
              type="button"
              onClick={handleRetake}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại đề thi</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Nộp bài chấm điểm</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
