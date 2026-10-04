import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  Trash2,
  PlayCircle,
  ShieldCheck,
  FolderOpen,
  Calendar,
  Layers,
  ArrowRight,
  Database,
} from 'lucide-react';
import type { OfflineVideoRecord } from '../../types/offline.types';
import { getAllOfflineVideos, deleteOfflineVideo } from '../../services/indexedDbService';

interface OfflineLibraryViewProps {
  onPlayOfflineLesson: (mediaId: number) => void;
}

export const OfflineLibraryView: React.FC<OfflineLibraryViewProps> = ({
  onPlayOfflineLesson,
}) => {
  const [offlineVideos, setOfflineVideos] = useState<OfflineVideoRecord[]>([]);
  const [totalSizeMb, setTotalSizeMb] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);

  const loadOfflineData = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getAllOfflineVideos();
      setOfflineVideos(records);
      const totalBytes = records.reduce((sum, r) => sum + r.fileSizeBytes, 0);
      setTotalSizeMb((totalBytes / (1024 * 1024)).toFixed(1));
    } catch {
      setOfflineVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfflineData();
  }, [loadOfflineData]);

  const handleDelete = async (mediaId: number) => {
    if (confirm('Bạn có chắc muốn xóa bài học này khỏi bộ nhớ cục bộ để giải phóng dung lượng?')) {
      await deleteOfflineVideo(mediaId);
      await loadOfflineData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Tóm tắt dung lượng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-[#0A0F1F] border border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <HardDrive className="w-4 h-4" />
            <span>Kho Lưu Trữ Thiết Bị</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Thư Viện Bài Học Ngoại Tuyến
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
            Các bài giảng đã tải về trình duyệt thông qua cơ chế IndexedDB, sẵn sàng phát ngay cả khi không có kết nối Internet.
          </p>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Dung lượng đã sử dụng</span>
            <span className="text-sm font-black text-white">
              {totalSizeMb} MB <span className="text-xs text-emerald-400 font-bold">({offlineVideos.length} bài)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Danh sách bài học ngoại tuyến */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Đang quét kho lưu trữ ngoại tuyến...
        </div>
      ) : offlineVideos.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-white/5 p-8 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">Chưa có bài giảng ngoại tuyến nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Khi xem bài học trực tuyến, bạn có thể bấm nút "Tải học ngoại tuyến" để lưu trữ bài học và học bất cứ lúc nào.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offlineVideos.map((item) => {
            const sizeMb = (item.fileSizeBytes / (1024 * 1024)).toFixed(1);
            const dateStr = item.downloadedAt
              ? new Date(item.downloadedAt).toLocaleDateString('vi-VN')
              : 'Gần đây';

            return (
              <div
                key={item.mediaId}
                className="p-5 rounded-2xl bg-[#090D1A] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <PlayCircle className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                        {item.fileName}
                      </h4>
                    </div>

                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>SHA-256</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{sizeMb} MB</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tải ngày: {dateStr}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => handleDelete(item.mediaId)}
                    className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Xóa để giải phóng bộ nhớ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Giải phóng bộ nhớ</span>
                  </button>

                  <button
                    onClick={() => onPlayOfflineLesson(item.mediaId)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <span>Phát bài học</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
