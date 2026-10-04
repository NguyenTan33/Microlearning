import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Check,
  Send,
  Inbox,
  Award,
  AlertCircle,
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import type { QuizDetail, QuizAttemptResult, QuizHistoryItem } from '../../types/catalog.types';
import { quizApi } from '../../services/quizApi';
import { queueQuizAttempt } from '../../services/syncService';
import { getOfflineLessonPackage } from '../../services/indexedDbService';

interface InteractiveQuizCardProps {
  lessonId: number;
  isOnline: boolean;
  onAttemptSubmitted?: () => void;
}

export const InteractiveQuizCard: React.FC<InteractiveQuizCardProps> = ({
  lessonId,
  isOnline,
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

  // Tải đề thi từ máy chủ (hoặc lấy từ gói ngoại tuyến khi mất mạng)
  const loadQuiz = useCallback(async () => {
    setLoading(true);
    setAttemptResult(null);
    setSelectedAnswers({});
    setNoticeMessage(null);

    try {
      if (isOnline) {
        const data = await quizApi.getQuizByLesson(lessonId);
        setQuiz(data);
        if (data) {
          // Tải lịch sử làm bài nếu có
          quizApi.getQuizHistory(data.id).then(setHistoryList).catch(() => {});
        }
      } else {
        // Lấy đề thi từ kho lưu trữ ngoại tuyến IndexedDB
        const offlinePkg = (await getOfflineLessonPackage(lessonId)) as {
          quiz?: {
            id: number;
            title: string;
            passScore: number;
            version: number;
            questions: QuizDetail['questions'];
          };
        } | null;

        if (offlinePkg?.quiz) {
          setQuiz({
            id: offlinePkg.quiz.id,
            lessonId,
            title: offlinePkg.quiz.title,
            passScore: offlinePkg.quiz.passScore,
            version: offlinePkg.quiz.version,
            questions: offlinePkg.quiz.questions,
          });
        } else {
          setQuiz(null);
        }
      }
    } catch {
      setQuiz(null);
    } finally {
      setLoading(false);
    }
  }, [lessonId, isOnline]);

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
      if (!confirm('Bạn vẫn còn câu hỏi chưa chọn câu trả lời. Bạn có chắc chắn muốn nộp bài ngay?')) {
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
      if (isOnline) {
        // Nộp trực tuyến và nhận kết quả chấm điểm tức thì
        const result = await quizApi.submitQuizAttempt({
          clientAttemptId,
          quizId: quiz.id,
          startedAt: startTime,
          answers: answersPayload,
        });

        setAttemptResult(result);
        setNoticeMessage(
          result.isPassed
            ? `Chúc mừng! Bạn đã đạt ${result.score} điểm (${result.correctAnswersCount}/${result.totalQuestionsCount} câu đúng).`
            : `Bạn đạt ${result.score} điểm (${result.correctAnswersCount}/${result.totalQuestionsCount} câu đúng). Điểm chuẩn yêu cầu là ${quiz.passScore} điểm.`
        );

        // Cập nhật lại danh sách lịch sử thi
        quizApi.getQuizHistory(quiz.id).then(setHistoryList).catch(() => {});
      } else {
        // Chế độ Ngoại tuyến: Đóng gói và lưu vào hàng đợi Outbox
        const outboxAnswers = quiz.questions
          .filter((q) => (selectedAnswers[q.id] || []).length > 0)
          .map((q) => ({
            questionId: q.id,
            selectedOptionId: selectedAnswers[q.id][0],
          }));

        await queueQuizAttempt(quiz.id, outboxAnswers);
        setNoticeMessage(
          'Bài làm đã được lưu an toàn vào hàng đợi ngoại tuyến. Điểm số sẽ được cập nhật tự động khi có kết nối mạng.'
        );
      }

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
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-6 flex items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
        <span className="text-xs">Đang tải bộ câu hỏi đánh giá bài học...</span>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-6 text-center text-slate-400">
        <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-xs">Bài học này hiện chưa có bài tập trắc nghiệm đánh giá.</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header Đề thi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {quiz.title}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
              <span>{quiz.questions.length} câu hỏi</span>
              <span>•</span>
              <span>Điểm đạt: {quiz.passScore} điểm</span>
              <span>•</span>
              <span className={isOnline ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                {isOnline ? 'Chấm điểm trực tuyến' : 'Lưu ngoại tuyến'}
              </span>
            </div>
          </div>
        </div>

        {/* Nút Xem lịch sử bài làm */}
        {historyList.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 text-xs text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lịch sử ({historyList.length})</span>
          </button>
        )}
      </div>

      {/* Modal / Bảng Lịch sử các lần thi */}
      {showHistory && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Lịch sử đánh giá</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {historyList.map((h) => (
              <div
                key={h.attemptId}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2">
                  {h.isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="font-semibold text-slate-200">{h.score} điểm</span>
                  <span className="text-[11px] text-slate-400">
                    ({h.isPassed ? 'Đạt chuẩn' : 'Chưa đạt'})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(h.submittedAt).toLocaleString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thông báo kết quả nộp bài */}
      {noticeMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
            attemptResult
              ? attemptResult.isPassed
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
          }`}
        >
          {attemptResult ? (
            attemptResult.isPassed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )
          ) : (
            <Inbox className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          )}
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Form danh sách câu hỏi */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {quiz.questions.map((question, qIndex) => {
          const selected = selectedAnswers[question.id] || [];
          const isMultiChoice = question.questionType === 2;

          return (
            <div key={question.id} className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {qIndex + 1}
                </span>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                    {question.content}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    {isMultiChoice ? 'Chọn nhiều đáp án' : 'Chọn 1 đáp án duy nhất'} • {question.points} điểm
                  </span>
                </div>
              </div>

              {/* Danh sách lựa chọn đáp án */}
              <div className="space-y-2 pl-8">
                {question.options.map((option) => {
                  const isChecked = selected.includes(option.id);

                  return (
                    <label
                      key={option.id}
                      onClick={() => handleSelectOption(question.id, option.id, isMultiChoice)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none text-xs leading-relaxed ${
                        isChecked
                          ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-sm'
                          : 'bg-slate-900/50 border-white/5 hover:border-white/15 text-slate-300'
                      } ${attemptResult ? 'cursor-not-allowed opacity-80' : ''}`}
                    >
                      <div
                        className={`w-4 h-4 ${
                          isMultiChoice ? 'rounded-md' : 'rounded-full'
                        } border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isChecked
                            ? 'border-indigo-400 bg-indigo-600 text-white'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="font-normal">{option.optionText}</span>
                    </label>
                  );
                })}
              </div>

              {/* Giải thích đáp án (chỉ hiển thị sau khi đã nộp bài nếu có) */}
              {attemptResult && question.explanation && (
                <div className="ml-8 p-3 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300">
                  <span className="font-semibold text-indigo-400 block mb-0.5">Giải thích:</span>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Nút thao tác */}
        <div className="pt-2 flex flex-wrap items-center gap-3 pl-8">
          {!attemptResult ? (
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isOnline ? 'Nộp bài trực tuyến' : 'Lưu bài làm ngoại tuyến'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetake}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Làm lại bài kiểm tra</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
