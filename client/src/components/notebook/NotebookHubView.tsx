import React, { useState } from 'react';
import {
  BookMarked,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Bot,
  User,
  Layers,
  HelpCircle,
  Maximize2,
} from 'lucide-react';
import { useNotebook } from '../../hooks/useNotebook';
import type { Course, Lesson } from '../../types/catalog.types';

interface NotebookHubViewProps {
  currentCourse?: Course;
  activeLesson?: Lesson;
  onBackToWorkspace?: () => void;
}

export const NotebookHubView: React.FC<NotebookHubViewProps> = ({
  currentCourse,
  activeLesson,
  onBackToWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'RAG_CHAT' | 'STUDIO_IFRAME'>('RAG_CHAT');
  const [newNotebookName, setNewNotebookName] = useState<string>('');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  const {
    notebooks,
    activeNotebook,
    sources,
    messages,
    status,
    isLoading,
    isAsking,
    isSyncing,
    error,
    refreshNotebooks,
    selectNotebook,
    createNotebook,
    removeNotebook,
    syncLessonSource,
    askQuestion,
  } = useNotebook(currentCourse?.title);

  // Xử lý tạo Notebook thủ công
  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim()) return;
    try {
      await createNotebook(newNotebookName.trim(), `Sổ tay tạo từ bài giảng Microlearning`);
      setNewNotebookName('');
      setIsCreatingNew(false);
    } catch {
      // Error handled by hook
    }
  };

  // Tạo nhanh notebook từ khóa học hiện tại
  const handleQuickCreateFromCourse = async () => {
    if (!currentCourse) return;
    try {
      await createNotebook(
        `Khóa học: ${currentCourse.title}`,
        currentCourse.description || `Sổ tay tự động đồng bộ từ ${currentCourse.title}`
      );
    } catch {
      // Error handled by hook
    }
  };

  // Đồng bộ bài giảng hiện tại làm nguồn tri thức (Source)
  const handleSyncCurrentLesson = async () => {
    if (!activeLesson) return;
    const lessonTitle = `Bài giảng: ${activeLesson.title}`;
    const durationMin = Math.round((activeLesson.durationSeconds || 0) / 60);
    const lessonContent = `Khóa học: ${currentCourse?.title || 'Chưa phân loại'}\nBài học: ${activeLesson.title}\nMô tả nội dung: ${activeLesson.description || 'Nội dung cốt lõi của bài học.'}\nThời lượng: ${durationMin} phút.`;
    
    await syncLessonSource(lessonTitle, lessonContent);
  };

  // Gửi câu hỏi cho AI
  const handleSendQuestion = async (textToSend?: string) => {
    const text = textToSend || questionInput;
    if (!text.trim() || isAsking) return;
    setQuestionInput('');
    await askQuestion(text.trim());
  };

  const QUICK_PROMPTS = [
    'Tóm tắt các điểm quan trọng nhất trong bài học này',
    'Giải thích các khái niệm cốt lõi bằng ví dụ dễ hiểu',
    'Tạo 3 câu hỏi trắc nghiệm ôn tập kèm đáp án',
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#070b18] text-slate-100 min-h-0">
      {/* =========================================================================
          TOP HEADER BAR
      ========================================================================= */}
      <header className="px-4 sm:px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBackToWorkspace && (
            <button
              onClick={onBackToWorkspace}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs"
              title="Quay lại Phòng học"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Phòng học</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  Open Notebook AI
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                  Gemini RAG
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sổ tay học tập thông minh & Trợ lý hỏi đáp bài giảng chuyên sâu
              </p>
            </div>
          </div>
        </div>

        {/* Trạng thái kết nối & Tabs chuyển đổi */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Badge trạng thái Server */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              status.isOnline
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
            }`}
            title={status.isOnline ? 'Open Notebook Docker đang chạy tốt' : 'Docker chưa chạy hoặc đang khởi động'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="text-[11px] hidden sm:inline">
              {status.isOnline ? 'Docker Online' : 'Docker Offline'}
            </span>
          </div>

          {/* Toggle Chế độ xem */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('RAG_CHAT')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'RAG_CHAT'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Sổ tay & Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('STUDIO_IFRAME')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'STUDIO_IFRAME'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Web Studio</span>
            </button>
          </div>

          {/* Mở tab mới tới cổng 8502 */}
          <a
            href={status.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/10"
            title="Mở toàn bộ giao diện Open Notebook trên tab mới (Port 8502)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* =========================================================================
          TAB 1: GIAO DIỆN SỔ TAY NATIVE & CHAT RAG HỎI ĐÁP BÀI HỌC
      ========================================================================= */}
      {activeTab === 'RAG_CHAT' && (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* CỘT BÊN TRÁI: DANH SÁCH NOTEBOOK & NGUỒN TÀI LIỆU (SOURCES) */}
          <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-indigo-500/20 bg-slate-950/60 flex flex-col shrink-0 min-h-0">
            {/* Header Sidebar: Nút tạo Notebook */}
            <div className="p-4 border-b border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Danh Sách Sổ Tay ({notebooks.length})
                </span>
                <button
                  onClick={() => refreshNotebooks()}
                  className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Quick action: Tạo notebook từ khóa học hiện tại */}
              {currentCourse && (
                <button
                  onClick={handleQuickCreateFromCourse}
                  className="w-full py-2 px-3 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>Tạo Notebook cho: {currentCourse.title.substring(0, 20)}...</span>
                </button>
              )}

              {/* Form tạo notebook mới */}
              {isCreatingNew ? (
                <form onSubmit={handleCreateNotebook} className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    placeholder="Nhập tên sổ tay mới..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/40 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={!newNotebookName.trim()}
                      className="flex-1 py-1 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-all disabled:opacity-50"
                    >
                      Tạo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all border border-white/5"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tạo sổ tay mới</span>
                </button>
              )}
            </div>

            {/* Danh sách Notebooks (Cuộn dọc) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar min-h-[140px] md:min-h-0">
              {notebooks.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Chưa có sổ tay nào. Hãy bấm "Tạo sổ tay mới" ở trên để bắt đầu!
                </div>
              ) : (
                notebooks.map((nb) => {
                  const isSelected = activeNotebook?.id === nb.id;
                  return (
                    <div
                      key={nb.id}
                      onClick={() => selectNotebook(nb)}
                      className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-500/50 text-white shadow-md shadow-purple-900/20'
                          : 'bg-slate-900/50 hover:bg-slate-900 border-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <BookMarked
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-purple-400' : 'text-slate-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{nb.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {nb.source_count || 0} tài liệu bài học
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Bạn có chắc muốn xóa sổ tay "${nb.name}"?`)) {
                            removeNotebook(nb.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-950 hover:text-rose-400 rounded text-slate-500 transition-all"
                        title="Xóa sổ tay"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* NGUỒN TÀI LIỆU ĐÃ NẠP (SOURCES) CHO NOTEBOOK ĐANG CHỌN */}
            {activeNotebook && (
              <div className="p-3 border-t border-white/10 bg-slate-900/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    Tài liệu đã nạp ({sources.length})
                  </span>
                  {activeLesson && (
                    <button
                      onClick={handleSyncCurrentLesson}
                      disabled={isSyncing}
                      className="px-2 py-0.5 rounded-md bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Nạp bài giảng đang xem vào sổ tay này để AI đọc"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isSyncing ? 'Đang nạp...' : 'Nạp bài giảng này'}</span>
                    </button>
                  )}
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar text-xs">
                  {sources.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-1">
                      Chưa có tài liệu. Bấm "Nạp bài giảng này" để AI đọc kiến thức bài học!
                    </p>
                  ) : (
                    sources.map((s) => (
                      <div
                        key={s.id}
                        className="px-2 py-1.5 rounded-lg bg-slate-950/50 border border-white/5 flex items-center justify-between text-[11px]"
                      >
                        <span className="truncate pr-2 text-slate-300">{s.title}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* CỘT BÊN PHẢI: KHUNG CHAT TRỢ LÝ AI HỎI ĐÁP RAG */}
          <main className="flex-1 flex flex-col bg-[#050814] min-h-0">
            {/* Thanh hiển thị Notebook hiện tại */}
            <div className="px-5 py-3 border-b border-indigo-500/10 bg-slate-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">
                  {activeNotebook ? activeNotebook.name : 'Vui lòng chọn sổ tay để hỏi đáp'}
                </span>
                {activeNotebook && (
                  <span className="text-[10px] text-slate-400">
                    ({sources.length} nguồn bài giảng)
                  </span>
                )}
              </div>
            </div>

            {/* Khung tin nhắn trò chuyện (Cuộn mượt) */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar min-h-0">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/30 border border-purple-500/30 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-purple-300 animate-pulse" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                    Trợ lý Gemini RAG Sẵn Sàng
                  </h3>
                  <p className="text-xs text-slate-400 mb-5">
                    Đặt bất kỳ câu hỏi nào về nội dung bài học. AI sẽ trả lời dựa trên chính xác các tài liệu bạn đã nạp vào sổ tay!
                  </p>

                  {/* Gợi ý câu hỏi nhanh */}
                  <div className="w-full space-y-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left">
                      Gợi ý câu hỏi nhanh:
                    </p>
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendQuestion(prompt)}
                        className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/5 hover:border-purple-500/40 text-left text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <span>{prompt}</span>
                        <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 max-w-3xl ${
                        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                          isUser
                            ? 'bg-indigo-600 text-white'
                            : m.isError
                            ? 'bg-rose-600 text-white'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600/90 text-white rounded-tr-none'
                            : m.isError
                            ? 'bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-tl-none'
                            : 'bg-slate-900/90 border border-indigo-500/20 text-slate-200 rounded-tl-none shadow-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{m.text}</div>
                        <span className="block text-[10px] text-slate-400 mt-1.5 text-right font-mono">
                          {m.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Loading khi AI đang trả lời */}
              {isAsking && (
                <div className="flex gap-3 max-w-xl mr-auto">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white shrink-0 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-xs text-purple-300 rounded-tl-none flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    <span>Gemini AI đang tra cứu tài liệu bài học và suy nghĩ...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar: Nhập câu hỏi */}
            <div className="p-3 sm:p-4 border-t border-indigo-500/20 bg-slate-900/80">
              {error && (
                <div className="mb-2 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder={
                    activeNotebook
                      ? 'Hỏi bất kỳ điều gì về bài học này...'
                      : 'Vui lòng chọn hoặc tạo sổ tay trước...'
                  }
                  disabled={!activeNotebook || isAsking}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/90 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!questionInput.trim() || isAsking || !activeNotebook}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-600/30 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </form>
            </div>
          </main>
        </div>
      )}

      {/* =========================================================================
          TAB 2: TOÀN BỘ GIAO DIỆN OPEN NOTEBOOK STUDIO (NHÚNG IFRAME PORT 8502)
      ========================================================================= */}
      {activeTab === 'STUDIO_IFRAME' && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 relative">
          <iframe
            src={`${status.webUrl}/notebooks`}
            title="Open Notebook Studio Full"
            className="w-full h-full border-none min-h-[600px] flex-1"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}
    </div>
  );
};
