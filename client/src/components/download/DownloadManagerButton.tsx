import React, { useState, useEffect, useCallback } from 'react';
import { Download, CheckCircle2, Trash2, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  downloadAndSaveOfflineMedia,
  getOfflineVideoBlob,
  deleteOfflineVideoRecord,
  getDownloadInfo,
} from '../../services/mediaService';
import { catalogApi } from '../../services/catalogApi';
import { saveOfflineLessonPackage } from '../../services/indexedDbService';

interface DownloadManagerButtonProps {
  mediaId: number;
  lessonId?: number;
  onDownloadStatusChanged?: () => void;
}

export const DownloadManagerButton: React.FC<DownloadManagerButtonProps> = ({
  mediaId,
  lessonId,
  onDownloadStatusChanged,
}) => {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<string | null>(null);

  // Kiểm tra trạng thái đã lưu trữ trong IndexedDB
  const checkStatus = useCallback(async () => {
    try {
      const blob = await getOfflineVideoBlob(mediaId);
      setIsDownloaded(blob !== null);
      if (blob) {
        setFileSizeMb((blob.size / (1024 * 1024)).toFixed(1));
      }
    } catch {
      setIsDownloaded(false);
    }
  }, [mediaId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);
    setErrorMessage(null);
    setStatusMessage('Đang lấy thông tin tệp & mã băm SHA-256 từ máy chủ...');

    try {
      // 1. Tải gói dữ liệu bài học (metadata + câu hỏi trắc nghiệm) nếu có lessonId
      if (lessonId) {
        try {
          const pkg = await catalogApi.getLessonPackage(lessonId);
          await saveOfflineLessonPackage(lessonId, pkg);
        } catch {
          // Gói dữ liệu bài học có thể không có nếu chưa đăng nhập hoặc mạng yếu
        }
      }

      // 2. Lấy thông tin kích thước và tải video
      const info = await getDownloadInfo(mediaId);
      setFileSizeMb((info.fileSizeBytes / (1024 * 1024)).toFixed(1));
      setStatusMessage(`Đang tải dữ liệu (${(info.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)...`);

      const result = await downloadAndSaveOfflineMedia(mediaId, (pct) => {
        setProgress(pct);
        if (pct === 100) {
          setStatusMessage('Đang đối soát mã băm SHA-256 (Web Crypto)...');
        } else {
          setStatusMessage(`Đang tải bài giảng: ${pct}%`);
        }
      });

      if (result.success && result.checksumMatched) {
        setIsDownloaded(true);
        setStatusMessage('Đã xác thực mã băm SHA-256 toàn vẹn! Lưu trữ ngoại tuyến thành công.');
        setTimeout(() => setStatusMessage(null), 4000);
        if (onDownloadStatusChanged) onDownloadStatusChanged();
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định khi tải video.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa tệp video này khỏi bộ nhớ ngoại tuyến để giải phóng dung lượng?')) {
      await deleteOfflineVideoRecord(mediaId);
      setIsDownloaded(false);
      setStatusMessage('Đã giải phóng bộ nhớ ngoại tuyến.');
      setTimeout(() => setStatusMessage(null), 2500);
      if (onDownloadStatusChanged) onDownloadStatusChanged();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {isDownloaded ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Đã lưu ngoại tuyến {fileSizeMb ? `(${fileSizeMb} MB)` : ''}</span>
              <span title="Toàn vẹn tệp đã được kiểm chứng bởi SHA-256">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </div>

            <button
              onClick={handleDelete}
              title="Xóa khỏi bộ nhớ thiết bị"
              className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98] cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Đang tải ({progress}%)</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Tải học ngoại tuyến</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Progress bar khi tải */}
      {isDownloading && (
        <div className="w-full space-y-1">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {statusMessage && (
            <p className="text-[11px] text-cyan-300/80 animate-pulse">{statusMessage}</p>
          )}
        </div>
      )}

      {/* Thông báo trạng thái hoặc lỗi */}
      {!isDownloading && statusMessage && (
        <p className="text-[11px] text-emerald-400 font-medium">{statusMessage}</p>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-950/40 border border-rose-500/30 p-2 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
