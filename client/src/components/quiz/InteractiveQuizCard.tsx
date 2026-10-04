import React, { useState } from 'react';
import { HelpCircle, Check, Send, Inbox, ShieldAlert } from 'lucide-react';
import { queueQuizAttempt } from '../../services/syncService';

interface InteractiveQuizCardProps {
  quizId: number;
  onAttemptSubmitted?: () => void;
}

export const InteractiveQuizCard: React.FC<InteractiveQuizCardProps> = ({
  quizId,
  onAttemptSubmitted,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [attemptNotice, setAttemptNotice] = useState<string | null>(null);

  // Câu hỏi kiểm tra kiến thức cho Bài 1 (Tuân thủ Quy tắc 3: Không có trường IsCorrect ở client)
  const question = {
    id: 1,
    content: 'Khi phát video theo chuẩn HTTP 206 Partial Content (Range Streaming), lợi ích lớn nhất đối với học viên và hệ thống là gì?',
    options: [
      { id: 1, text: 'Học viên có thể tua tới/lui bất kỳ đoạn nào ngay lập tức mà không cần đợi tải toàn bộ tệp video.' },
      { id: 2, text: 'Bắt buộc học viên phải tải hết 100% dung lượng video về máy trước khi bắt đầu xem.' },
      { id: 3, text: 'Trình phát sẽ tự động chuyển video sang định dạng file PDF tĩnh.' },
      { id: 4, text: 'Chỉ hoạt động được khi máy tính kết nối cổng dây mạng LAN vật lý.' },
    ],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOptionId === null) return;

    // Gửi thao tác nộp bài vào Outbox (Tự sinh ClientAttemptId dạng GUID theo chuẩn chống gian lận)
    await queueQuizAttempt(quizId, [
      {
        questionId: question.id,
        selectedOptionId,
      },
    ]);

    setIsSubmitted(true);
    setAttemptNotice(
      'Bài làm đã được đóng gói và lưu an toàn vào hàng đợi Outbox! Máy chủ sẽ tự động chấm điểm và bảo toàn Idempotency khi bạn đồng bộ.'
    );

    if (onAttemptSubmitted) {
      onAttemptSubmitted();
    }
  };

  return (
    <div className="w-full rounded-2xl bg-[#090D1A] border border-white/10 p-5 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            Kiểm Tra Tương Tác Nhanh (Quiz #1)
          </h3>
          <p className="text-[11px] text-slate-400">
            Hỗ trợ làm bài Offline - Tự động đồng bộ và chấm điểm bảo mật trên Server
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
          {question.content}
        </p>

        {/* Danh sách các lựa chọn đáp án */}
        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            return (
              <label
                key={opt.id}
                onClick={() => {
                  if (!isSubmitted) setSelectedOptionId(opt.id);
                }}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-indigo-950/50 border-indigo-500/60 text-white shadow-md'
                    : 'bg-slate-900/50 border-white/5 hover:border-white/15 text-slate-300'
                } ${isSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-600 text-white'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-xs leading-relaxed font-normal">{opt.text}</span>
              </label>
            );
          })}
        </div>

        {/* Nút nộp bài */}
        {!isSubmitted ? (
          <button
            type="submit"
            disabled={selectedOptionId === null}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp bài kiểm tra (Lưu Outbox)</span>
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-indigo-300">
              <Inbox className="w-4 h-4 text-indigo-400" />
              <span>Đã lưu vào Hàng đợi Outbox Cục bộ</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {attemptNotice}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tuân thủ Quy tắc Bảo mật: Đáp án đúng được chấm độc quyền tại Backend.</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
