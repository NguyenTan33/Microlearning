import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Wifi,
  WifiOff,
  Inbox,
  LogOut,
  BookOpen,
  CheckCircle,
  PlayCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VideoLessonPlayer } from '../player/VideoLessonPlayer';
import { DownloadManagerButton } from '../download/DownloadManagerButton';
import { InteractiveQuizCard } from '../quiz/InteractiveQuizCard';
import { SyncCenterModal } from '../sync/SyncCenterModal';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { registerCurrentDevice } from '../../services/deviceService';
import { getOutboxCount, getAllOfflineVideos } from '../../services/indexedDbService';

interface StudyDashboardProps {
  onLogout: () => void;
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({ onLogout }) => {
  const { isOnline, isServerHealthy } = useNetworkStatus();
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [downloadedCount, setDownloadedCount] = useState<number>(0);
  const [activeLessonId] = useState<number>(1);

  const refreshOutbox = useCallback(async () => {
    try {
      const count = await getOutboxCount();
      setOutboxCount(count);
      const videos = await getAllOfflineVideos();
      setDownloadedCount(videos.length);
    } catch {
      // ignore
    }
  }, []);

  // 1. Tự động đăng ký thiết bị khi học viên mở trang học
  useEffect(() => {
    registerCurrentDevice().catch(() => {
      // Không gián đoạn UI nếu chưa kết nối được
    });
    refreshOutbox();
  }, [refreshOutbox]);

  return (
    <div className="min-h-screen bg-[#070B17] text-slate-100 flex flex-col">
      {/* Header Điều hướng Chính */}
      <header className="sticky top-0 z-40 bg-[#0A0F1F]/90 border-b border-white/10 backdrop-blur-xl px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#080D1A] rounded-[10px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">MicroLearn</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                  Học Ngoại Tuyến
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Offline-First Learning Hub</p>
            </div>
          </div>

          {/* Cụm công cụ trạng thái & Đồng bộ */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Badge Mạng */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-colors ${
                isOnline && isServerHealthy
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              }`}
            >
              {isOnline && isServerHealthy ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Trực tuyến (Online)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ngoại tuyến (Offline)</span>
                </>
              )}
            </div>

            {/* Nút Hàng đợi Outbox & Mở Sync Modal */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm"
            >
              <Inbox className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Outbox</span>
              {outboxCount > 0 ? (
                <span className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {outboxCount}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">0</span>
              )}
            </button>

            {/* Nút Đăng xuất */}
            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Danh mục bài học (Lesson Playlist) */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#090D1A] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Khóa học cốt lõi</span>
              </div>

              <div>
                <h2 className="text-base font-extrabold text-white">
                  Kiến Trúc Microlearning &amp; Offline-First
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Lộ trình học vi mô gồm video ngắn, trắc nghiệm tương tác và tự động đồng bộ 2 chiều.
                </p>
              </div>

              {/* Tóm tắt bài học offline đã tải */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Bài học ngoại tuyến
                </span>
                <span className="font-bold text-cyan-300">{downloadedCount} bài sẵn sàng</span>
              </div>

              {/* Danh sách bài học */}
              <div className="space-y-2 pt-1">
                {/* Bài 1 - Đang học */}
                <div
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activeLessonId === 1
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                      : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <PlayCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">
                        Bài 1: Kiến trúc RESTful &amp; HTTP 206
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Range Streaming video, tua bài tức thì
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bài 2 */}
                <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5 opacity-70 cursor-not-allowed">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-300 block">
                        Bài 2: Cơ chế Sequence Delta Sync
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Kéo dữ liệu vi sai tiết kiệm băng thông 4G
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bài 3 */}
                <div className="p-3 rounded-xl bg-slate-900/30 border border-white/5 opacity-70 cursor-not-allowed">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-300 block">
                        Bài 3: Kiểm tra toàn vẹn Checksum SHA-256
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Chống hỏng tệp khi tải qua mạng chập chờn
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Cột phải: Video Player + Download Manager + Quiz Card */}
          <section className="lg:col-span-8 space-y-6">
            {/* 1. Trình phát Video thông minh */}
            <div className="space-y-3">
              <VideoLessonPlayer
                mediaId={1}
                lessonId={1}
                lessonTitle="Bài 1: Kiến trúc RESTful và HTTP 206 Range Streaming"
                onProgressSaved={refreshOutbox}
              />

              {/* Action Bar dưới Player: Download & Thông tin bài */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#090D1A] border border-white/10">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Học ngoại tuyến không giới hạn</span>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tải video về IndexedDB và tự động đối chiếu mã SHA-256
                  </p>
                </div>

                <DownloadManagerButton
                  mediaId={1}
                  onDownloadStatusChanged={refreshOutbox}
                />
              </div>
            </div>

            {/* 2. Bài kiểm tra tương tác (Interactive Quiz) */}
            <InteractiveQuizCard
              quizId={1}
              onAttemptSubmitted={refreshOutbox}
            />
          </section>
        </div>
      </main>

      {/* Modal Trung Tâm Đồng Bộ Sync Engine */}
      <SyncCenterModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isOnline={isOnline && isServerHealthy}
        onSyncCompleted={refreshOutbox}
      />
    </div>
  );
};
