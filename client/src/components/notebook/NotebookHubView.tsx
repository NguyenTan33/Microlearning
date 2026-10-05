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
  Search,
  Mic,
  HelpCircle,
  Play,
  Pause,
  X,
  Volume2,
  FolderOpen,
} from 'lucide-react';
import { useNotebook, type NotebookTab } from '../../hooks/useNotebook';
import { notebookService } from '../../services/notebookService';
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
  const {
    currentTab,
    setCurrentTab,
    notebooks,
    activeNotebook,
    allSources,
    selectedSourceDetail,
    setSelectedSourceDetail,
    sources,
    messages,
    searchResults,
    podcasts,
    episodeProfiles,
    status,
    isLoading,
    isAsking,
    isSyncing,
    isSearching,
    isGeneratingPodcast,
    error,
    refreshAll,
    selectNotebook,
    createNotebook,
    removeNotebook,
    syncLessonSource,
    removeSource,
    viewSourceDetail,
    searchKnowledge,
    askQuestion,
    createPodcast,
  } = useNotebook(currentCourse?.title);

  // States cho Modals & Forms
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'NOTEBOOK' | 'SOURCE' | 'PODCAST'>('NOTEBOOK');
  const [newNotebookTitle, setNewNotebookTitle] = useState<string>('');
  const [newNotebookDesc, setNewNotebookDesc] = useState<string>('');
  const [newSourceTitle, setNewSourceTitle] = useState<string>('');
  const [newSourceContent, setNewSourceContent] = useState<string>('');
  const [newPodcastName, setNewPodcastName] = useState<string>('');
  const [newPodcastProfile, setNewPodcastProfile] = useState<string>('solo_expert');
  const [newPodcastSpeaker, setNewPodcastSpeaker] = useState<string>('speaker_profile:w0svyiocc4areyhjebj8');

  // Search & Ask states
  const [searchQueryInput, setSearchQueryInput] = useState<string>('');
  const [askQuestionInput, setAskQuestionInput] = useState<string>('');
  const [searchFilterType, setSearchFilterType] = useState<'text' | 'vector'>('text');

  // Audio Podcast Player
  const [playingPodcastId, setPlayingPodcastId] = useState<string | null>(null);

  // Xử lý nạp nhanh bài giảng Microlearning hiện tại
  const handleQuickSyncCurrentLesson = async () => {
    if (!activeLesson) return;
    const durationMin = Math.round((activeLesson.durationSeconds || 0) / 60);
    const lessonTitle = `Bài giảng: ${activeLesson.title}`;
    const lessonContent = `Khóa học: ${currentCourse?.title || 'Chưa phân loại'}\nBài học: ${activeLesson.title}\nMô tả nội dung: ${activeLesson.description || 'Nội dung cốt lõi của bài học.'}\nThời lượng: ${durationMin} phút.`;
    await syncLessonSource(lessonTitle, lessonContent);
  };

  // Xử lý tạo mới từ Modal
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'NOTEBOOK' && newNotebookTitle.trim()) {
        await createNotebook(newNotebookTitle.trim(), newNotebookDesc.trim());
        setNewNotebookTitle('');
        setNewNotebookDesc('');
        setIsNewModalOpen(false);
      } else if (modalType === 'SOURCE' && newSourceTitle.trim() && newSourceContent.trim()) {
        await syncLessonSource(newSourceTitle.trim(), newSourceContent.trim());
        setNewSourceTitle('');
        setNewSourceContent('');
        setIsNewModalOpen(false);
      } else if (modalType === 'PODCAST' && newPodcastName.trim()) {
        await createPodcast(newPodcastName.trim(), newPodcastProfile, newPodcastSpeaker);
        setNewPodcastName('');
        setIsNewModalOpen(false);
      }
    } catch {
      // Error handled by hook
    }
  };

  const QUICK_PROMPTS = [
    'Tóm tắt các điểm quan trọng nhất trong bài học này',
    'Giải thích các khái niệm cốt lõi bằng ví dụ dễ hiểu',
    'Tạo 3 câu hỏi trắc nghiệm ôn tập kèm đáp án',
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#070b18] text-slate-100 min-h-0">
      {/* =========================================================================
          TOP ACTION BAR
      ========================================================================= */}
      <header className="px-4 sm:px-6 py-3 bg-slate-900/95 backdrop-blur-md border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBackToWorkspace && (
            <button
              onClick={onBackToWorkspace}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Quay lại Phòng học"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Phòng học</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {activeNotebook ? activeNotebook.name : 'Chưa chọn Sổ tay'}
            </span>
            {activeNotebook && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                {sources.length} tài liệu
              </span>
            )}
          </div>
        </div>

        {/* Trạng thái Server & Mở Web Studio rời */}
        <div className="flex items-center gap-3 ml-auto">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              status.isOnline
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">{status.modelName}</span>
          </div>

          <button
            onClick={() => refreshAll()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/10"
            title="Làm mới toàn bộ dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Mở Web Studio rời ra tab riêng */}
          <a
            href={status.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-all shadow-sm"
            title="Mở toàn bộ giao diện Open Notebook gốc trên tab riêng biệt (Port 8502)"
          >
            <span>Web Studio (Port 8502)</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          </a>
        </div>
      </header>

      {/* =========================================================================
          MAIN LAYOUT: SIDEBAR (4 MỤC) + MAIN CONTENT
      ========================================================================= */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* =========================================================================
            SIDEBAR THEO CHUẨN OPEN NOTEBOOK (NHƯ TRONG ẢNH)
        ========================================================================= */}
        <aside className="w-full md:w-64 bg-[#0d121f] border-b md:border-b-0 md:border-r border-indigo-500/20 flex flex-col shrink-0 min-h-0">
          {/* Header macOS Dots + Logo */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="font-bold text-sm text-white ml-1.5 flex items-center gap-1.5">
                Open Notebook
              </span>
            </div>
          </div>

          {/* Nút to màu xanh lá "+ New" y hệt ảnh */}
          <div className="p-3">
            <button
              onClick={() => {
                setModalType('NOTEBOOK');
                setIsNewModalOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="text-sm">New</span>
            </button>
          </div>

          {/* Menu Navigation 4 Chức Năng Chuẩn */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 custom-scrollbar">
            {/* 1. COLLECT */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                COLLECT
              </p>
              <button
                onClick={() => setCurrentTab('SOURCES')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  currentTab === 'SOURCES'
                    ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className={`w-4 h-4 ${currentTab === 'SOURCES' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Sources</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">
                  {allSources.length}
                </span>
              </button>
            </div>

            {/* 2. PROCESS */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                PROCESS
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setCurrentTab('NOTEBOOKS')}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentTab === 'NOTEBOOKS'
                      ? 'bg-purple-950/70 border border-purple-500/40 text-purple-300 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BookMarked className={`w-4 h-4 ${currentTab === 'NOTEBOOKS' ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span>Notebooks</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">
                    {notebooks.length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentTab('ASK_SEARCH')}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentTab === 'ASK_SEARCH'
                      ? 'bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Search className={`w-4 h-4 ${currentTab === 'ASK_SEARCH' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>Ask and Search</span>
                </button>
              </div>
            </div>

            {/* 3. CREATE */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                CREATE
              </p>
              <button
                onClick={() => setCurrentTab('PODCASTS')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  currentTab === 'PODCASTS'
                    ? 'bg-pink-950/70 border border-pink-500/40 text-pink-300 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mic className={`w-4 h-4 ${currentTab === 'PODCASTS' ? 'text-pink-400' : 'text-slate-500'}`} />
                <span>Podcasts</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">
                  {podcasts.length}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            MAIN CONTENT AREA CHO 4 CHỨC NĂNG
        ========================================================================= */}
        <main className="flex-1 flex flex-col bg-[#050814] min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          {error && (
            <div className="mb-4 px-3.5 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* =====================================================================
              VIEW 1: SOURCES (QUẢN LÝ TÀI LIỆU & NGUỒN TRI THỨC)
          ===================================================================== */}
          {currentTab === 'SOURCES' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Quản Lý Nguồn Tri Thức (Sources)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toàn bộ tài liệu, slide, văn bản bài giảng đã được nạp để AI học và trích dẫn.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeLesson && (
                    <button
                      onClick={handleQuickSyncCurrentLesson}
                      disabled={isSyncing}
                      className="px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                      title="Nạp bài giảng đang xem vào nguồn tài liệu"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isSyncing ? 'Đang nạp...' : 'Nạp bài giảng hiện tại'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setModalType('SOURCE');
                      setIsNewModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm tài liệu</span>
                  </button>
                </div>
              </div>

              {/* Grid danh sách Sources */}
              {allSources.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Chưa có nguồn tài liệu nào</p>
                  <p className="text-xs mt-1">Bấm "Nạp bài giảng hiện tại" hoặc "Thêm tài liệu" để bắt đầu nạp kiến thức cho AI.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {allSources.map((source) => (
                    <div
                      key={source.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold text-white line-clamp-2">
                            {source.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              source.embedded
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {source.embedded ? 'Đã vector hóa' : 'Đang xử lý'}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 font-mono">
                          ID: {source.id}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5">
                        <button
                          onClick={() => viewSourceDetail(source.id)}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Xem toàn văn</span>
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa tài liệu "${source.title}"?`)) {
                              removeSource(source.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all"
                          title="Xóa tài liệu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 2: NOTEBOOKS (QUẢN LÝ SỔ TAY BÀI HỌC)
          ===================================================================== */}
          {currentTab === 'NOTEBOOKS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-purple-400" />
                    Quản Lý Sổ Tay Bài Học (Notebooks)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mỗi sổ tay là một không gian tri thức chứa tài liệu và lịch sử hỏi đáp của từng môn học.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {currentCourse && (
                    <button
                      onClick={async () => {
                        await createNotebook(`Khóa học: ${currentCourse.title}`, currentCourse.description);
                      }}
                      className="px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-purple-300" />
                      <span>Tạo từ Khóa học này</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setModalType('NOTEBOOK');
                      setIsNewModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-purple-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Sổ tay mới</span>
                  </button>
                </div>
              </div>

              {/* Grid danh sách Notebooks */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {notebooks.map((nb) => {
                  const isCurrent = activeNotebook?.id === nb.id;
                  return (
                    <div
                      key={nb.id}
                      onClick={() => selectNotebook(nb)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                        isCurrent
                          ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold truncate">
                            {nb.name}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Đang dùng
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {nb.description || 'Không có mô tả'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] text-slate-400">
                        <span>{nb.source_count || 0} tài liệu</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Bạn có chắc muốn xóa sổ tay "${nb.name}"?`)) {
                              removeNotebook(nb.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all"
                          title="Xóa sổ tay này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 3: ASK AND SEARCH (HỎI ĐÁP & TÌM KIẾM THÔNG MINH RAG)
          ===================================================================== */}
          {currentTab === 'ASK_SEARCH' && (
            <div className="flex-1 flex flex-col min-h-[500px]">
              {/* Tab con: Tìm kiếm kiến thức VS Hỏi đáp RAG */}
              <div className="mb-4 pb-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">
                    Hỏi Đáp & Tìm Kiếm Tri Thức (Ask and Search)
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tìm kiếm nhanh */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQueryInput}
                      onChange={(e) => setSearchQueryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchKnowledge(searchQueryInput, searchFilterType);
                        }
                      }}
                      placeholder="Tìm từ khóa trong tài liệu..."
                      className="w-48 sm:w-64 px-3 py-1.5 pl-8 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    onClick={() => searchKnowledge(searchQueryInput, searchFilterType)}
                    disabled={isSearching}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                  >
                    {isSearching ? 'Tìm...' : 'Tìm'}
                  </button>
                </div>
              </div>

              {/* Nếu có kết quả tìm kiếm, hiển thị bảng kết quả */}
              {searchResults.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">
                      Kết quả tìm kiếm ({searchResults.length})
                    </span>
                    <button
                      onClick={() => searchKnowledge('')}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.map((r) => (
                      <div key={r.id} className="p-2 rounded-xl bg-slate-900/60 text-xs flex items-center justify-between">
                        <span className="font-semibold text-white">{r.title}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Độ khớp: {Math.round(r.relevance)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Khung Chat RAG với Gemini 3.5 Flash-Lite */}
              <div className="flex-1 flex flex-col bg-slate-900/40 rounded-2xl border border-white/10 min-h-0">
                {/* Tin nhắn */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar min-h-0">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">
                        Gemini 3.5 Flash-Lite RAG Sẵn Sàng
                      </h3>
                      <p className="text-xs text-slate-400 mb-5">
                        Tốc độ phản hồi ~2 giây! Đặt câu hỏi để AI tra cứu tài liệu bài học và trả lời chính xác.
                      </p>

                      <div className="w-full space-y-2">
                        {QUICK_PROMPTS.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              askQuestion(p);
                            }}
                            className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/40 text-left text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between"
                          >
                            <span>{p}</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
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
                              isUser ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                            }`}
                          >
                            {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              isUser
                                ? 'bg-indigo-600 text-white rounded-tr-none'
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

                  {isAsking && (
                    <div className="flex gap-3 max-w-xl mr-auto">
                      <div className="w-7 h-7 rounded-lg bg-purple-600 text-white shrink-0 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 animate-spin" />
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                        <span>Gemini 3.5 Flash-Lite đang đọc tài liệu và phân tích...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input gửi câu hỏi */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (askQuestionInput.trim()) {
                      askQuestion(askQuestionInput.trim());
                      setAskQuestionInput('');
                    }
                  }}
                  className="p-3 sm:p-4 border-t border-white/10 flex items-center gap-2 bg-slate-900/80"
                >
                  <input
                    type="text"
                    value={askQuestionInput}
                    onChange={(e) => setAskQuestionInput(e.target.value)}
                    placeholder="Hỏi bất kỳ điều gì về bài học này..."
                    disabled={!activeNotebook || isAsking}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950/90 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!askQuestionInput.trim() || isAsking || !activeNotebook}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Gửi</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 4: PODCASTS (TẠO & PHÁT PODCAST AI BÀI HỌC)
          ===================================================================== */}
          {currentTab === 'PODCASTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-pink-400" />
                    Podcast Âm Thanh Bài Giảng AI (Podcasts)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chuyển đổi bài học thành tập Podcast đối thoại âm thanh sống động để học mọi lúc mọi nơi.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setModalType('PODCAST');
                    setIsNewModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-pink-600/30"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Podcast mới</span>
                </button>
              </div>

              {/* Danh sách Podcasts */}
              {podcasts.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <Mic className="w-12 h-12 mx-auto mb-3 opacity-30 text-pink-400" />
                  <p className="text-sm font-semibold">Chưa có tập Podcast nào</p>
                  <p className="text-xs mt-1">Bấm "Tạo Podcast mới" để AI tự động biên soạn kịch bản và sinh giọng nói bài giảng.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {podcasts.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-pink-500/40 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold text-white">{ep.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300">
                            {ep.episode_profile || 'AI Audio'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">ID: {ep.id}</p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setPlayingPodcastId(playingPodcastId === ep.id ? null : ep.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-pink-600/80 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          {playingPodcastId === ep.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{playingPodcastId === ep.id ? 'Dừng phát' : 'Nghe Podcast'}</span>
                        </button>
                      </div>

                      {/* Trình phát âm thanh khi bấm play */}
                      {playingPodcastId === ep.id && (
                        <div className="mt-3 pt-2">
                          <audio
                            src={notebookService.getPodcastAudioUrl(ep.id)}
                            controls
                            autoPlay
                            className="w-full h-8"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL TẠO MỚI (NOTEBOOK / SOURCE / PODCAST)
      ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1423] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {modalType === 'NOTEBOOK' && 'Tạo Sổ Tay Mới'}
                {modalType === 'SOURCE' && 'Thêm Nguồn Tài Liệu'}
                {modalType === 'PODCAST' && 'Tạo Podcast Bài Học'}
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3.5">
              {modalType === 'NOTEBOOK' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tên Sổ tay *
                    </label>
                    <input
                      type="text"
                      value={newNotebookTitle}
                      onChange={(e) => setNewNotebookTitle(e.target.value)}
                      placeholder="Ví dụ: Lập trình C# nâng cao..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mô tả (Tùy chọn)
                    </label>
                    <textarea
                      value={newNotebookDesc}
                      onChange={(e) => setNewNotebookDesc(e.target.value)}
                      placeholder="Ghi chú thêm về sổ tay..."
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </>
              )}

              {modalType === 'SOURCE' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tiêu đề tài liệu *
                    </label>
                    <input
                      type="text"
                      value={newSourceTitle}
                      onChange={(e) => setNewSourceTitle(e.target.value)}
                      placeholder="Ví dụ: Tóm tắt bài 1..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nội dung văn bản tài liệu *
                    </label>
                    <textarea
                      value={newSourceContent}
                      onChange={(e) => setNewSourceContent(e.target.value)}
                      placeholder="Dán nội dung lý thuyết, bài giảng hoặc ghi chú vào đây..."
                      rows={4}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      required
                    />
                  </div>
                </>
              )}

              {modalType === 'PODCAST' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tên tập Podcast *
                    </label>
                    <input
                      type="text"
                      value={newPodcastName}
                      onChange={(e) => setNewPodcastName(e.target.value)}
                      placeholder="Ví dụ: Thảo luận về Async Await..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kịch bản Podcast
                    </label>
                    <select
                      value={newPodcastProfile}
                      onChange={(e) => setNewPodcastProfile(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                    >
                      {episodeProfiles.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} - {p.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || isGeneratingPodcast}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all disabled:opacity-50"
                >
                  {isGeneratingPodcast ? 'Đang tạo...' : 'Xác nhận tạo'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL XEM TOÀN VĂN TÀI LIỆU (SOURCE DETAIL)
      ========================================================================= */}
      {selectedSourceDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1423] border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-emerald-400" />
                {selectedSourceDetail.title}
              </h3>
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedSourceDetail.full_text || 'Không có văn bản chi tiết'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
