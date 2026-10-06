import React, { useState, useEffect } from 'react';
import {
  mistakeVaultApi,
  type QuizMistakeItem,
  type MistakeAnswerResult,
} from '../../services/mistakeVaultApi';

interface MistakeVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MistakeVaultModal: React.FC<MistakeVaultModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'practice'>('list');
  const [mistakes, setMistakes] = useState<QuizMistakeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Practice state
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<MistakeAnswerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMistakes = async () => {
    setIsLoading(true);
    try {
      const data = await mistakeVaultApi.getMyMistakes(false);
      setMistakes(data);
    } catch (err) {
      console.warn('Lỗi khi tải sổ tay lỗi sai:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMistakes();
      setActiveTab('list');
      setAnswerResult(null);
      setSelectedOptionId(null);
      setPracticeIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMistake = mistakes[practiceIndex];

  const handleStartPractice = () => {
    if (mistakes.length === 0) return;
    setActiveTab('practice');
    setPracticeIndex(0);
    setSelectedOptionId(null);
    setAnswerResult(null);
  };

  const handleCheckAnswer = async () => {
    if (!currentMistake || selectedOptionId === null) return;
    setIsSubmitting(true);
    try {
      const result = await mistakeVaultApi.submitPracticeAnswer(currentMistake.id, selectedOptionId);
      setAnswerResult(result);
      if (result.isResolved) {
        // Tự động cập nhật danh sách
        setMistakes((prev) => prev.filter((m) => m.id !== currentMistake.id));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi nộp câu trả lời ôn tập.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextPracticeQuestion = () => {
    setSelectedOptionId(null);
    setAnswerResult(null);
    if (practiceIndex < mistakes.length - 1) {
      setPracticeIndex(practiceIndex + 1);
    } else {
      // Hết bài ôn tập
      alert('Tuyệt vời! Bạn đã hoàn thành tất cả các câu hỏi trong phiên ôn tập.');
      setActiveTab('list');
      loadMistakes();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shadow-inner">
              📖
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Sổ Tay Ôn Tập Câu Hỏi Sai
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu lại các câu hỏi trả lời chưa đúng để ôn luyện lại kiến thức
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-3 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'list'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Danh sách câu sai ({mistakes.length})
          </button>
          <button
            type="button"
            onClick={handleStartPractice}
            disabled={mistakes.length === 0}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'practice'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
                : mistakes.length > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
            }`}
          >
            <span>🎯 Ôn luyện ngay</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Đang mở sổ tay lỗi sai...</p>
            </div>
          ) : activeTab === 'list' ? (
            /* TAB 1: DANH SÁCH CÂU SAI */
            mistakes.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Sổ tay của bạn đang trống!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Bạn không có câu hỏi nào chưa khắc phục. Hãy tiếp tục làm các bài thi trắc nghiệm nhé!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {mistakes.map((mistake, index) => (
                  <div
                    key={mistake.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 hover:border-rose-300 dark:hover:border-rose-900 transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 text-[11px] font-bold rounded-lg">
                        Câu #{index + 1} • Sai {mistake.failedCount} lần
                      </span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={mistake.lessonTitle}>
                        Bài: {mistake.lessonTitle}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      {mistake.questionText}
                    </p>

                    {mistake.explanation && (
                      <div className="mt-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                        <strong className="text-indigo-600 dark:text-indigo-400">💡 Giải thích:</strong> {mistake.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* TAB 2: PHIÊN ÔN LUYỆN */
            currentMistake && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    Câu ôn tập {practiceIndex + 1} / {mistakes.length}
                  </span>
                  <span>Bài học: {currentMistake.lessonTitle}</span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 leading-relaxed">
                  {currentMistake.questionText}
                </h4>

                {/* Các lựa chọn đáp án */}
                <div className="space-y-2 mb-4">
                  {currentMistake.options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const isAnswered = answerResult !== null;
                    const isCorrect = isAnswered && opt.id === answerResult.correctOptionId;
                    const isWrongSelected = isAnswered && isSelected && !answerResult.isCorrect;

                    let optionStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400';
                    if (isSelected && !isAnswered) {
                      optionStyle = 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600 text-indigo-700 dark:text-indigo-300 font-semibold';
                    } else if (isCorrect) {
                      optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold';
                    } else if (isWrongSelected) {
                      optionStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-bold';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`w-full text-left p-3.5 rounded-xl border text-sm transition flex items-center justify-between ${optionStyle}`}
                      >
                        <span>{opt.optionText}</span>
                        {isCorrect && <span className="text-emerald-600 text-sm font-bold">✓ Đúng</span>}
                        {isWrongSelected && <span className="text-rose-600 text-sm font-bold">✗ Sai</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Kết quả phản hồi */}
                {answerResult && (
                  <div
                    className={`p-3.5 rounded-xl border mb-4 text-xs ${
                      answerResult.isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <p className="font-bold text-sm mb-1">{answerResult.feedbackMessage}</p>
                    {answerResult.explanation && (
                      <p className="mt-1 opacity-90">
                        <strong>Giải thích:</strong> {answerResult.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Nút hành động */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  {!answerResult ? (
                    <button
                      type="button"
                      disabled={selectedOptionId === null || isSubmitting}
                      onClick={handleCheckAnswer}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                    >
                      {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      <span>Kiểm tra đáp án</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNextPracticeQuestion}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                    >
                      {practiceIndex < mistakes.length - 1 ? 'Câu tiếp theo →' : 'Hoàn thành phiên ôn tập 🎉'}
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
