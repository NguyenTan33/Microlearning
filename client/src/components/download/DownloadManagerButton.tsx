import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Trash2, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  downloadAndSaveOfflineMedia,
  getOfflineVideoBlob,
  deleteOfflineVideoRecord,
  getDownloadInfo,
} from '../../services/mediaService';

interface DownloadManagerButtonProps {
  mediaId: number;
  onDownloadStatusChanged?: () => void;
}

export const DownloadManagerButton: React.FC<DownloadManagerButtonProps> = ({
  mediaId,
  onDownloadStatusChanged,
}) => {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<string | null>(null);

  // Kiểm tra trạng thái đã tải về trong IndexedDB
  const checkStatus = async () => {
    try {
      const blob = await getOfflineVideoBlob(mediaId);
      setIsDownloaded(blob !== null);
      if (blob) {
        setFileSizeMb((blob.size / (1024 * 1024)).toFixed(1));
      }
    } catch {
      setIsDownloaded(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [mediaId]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);
    setErrorMessage(null);
    setStatusMessage('Đang lấy thông tin tệp & mã băm SHA-256 từ Server...');

    try {
      // 1. Lấy thông tin kích thước trước
      const info = await getDownloadInfo(mediaId);
      setFileSizeMb((info.fileSizeBytes / (1024 * 1024)).toFixed(1));
      setStatusMessage(`Đang tải dữ liệu (${(info.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB)...`);

      // 2. Tải và băm SHA-256 kiểm tra
      const result = await downloadAndSaveOfflineMedia(mediaId, (pct) => {
        setProgress(pct);
        if (pct === 100) {
          setStatusMessage('Đang tính toán mã băm SHA-256 (Web Crypto API)...');
        } else {
          setStatusMessage(`Đang tải xuống: ${pct}%`);
        }
      });

      if (result.success && result.checksumMatched) {
        setIsDownloaded(true);
        setStatusMessage('Đã xác thực mã băm SHA-256 nguyên vẹn 100%! Lưu thành công.');
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
    if (confirm('Bạn có chắc chắn muốn xóa video này khỏi bộ nhớ ngoại tuyến để giải phóng dung lượng?')) {
      await deleteOfflineVideoRecord(mediaId);
      setIsDownloaded(false);
      setStatusMessage('Đã xóa tệp ngoại tuyến.');
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
              <span>Đã lưu Ngoại tuyến {fileSizeMb ? `(${fileSizeMb} MB)` : ''}</span>
              <span title="Đã qua kiểm tra mã băm SHA-256">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </span>
            </div>

            <button
              onClick={handleDelete}
              title="Xóa video để giải phóng bộ nhớ"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải ({progress}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Tải bài học (Học Offline)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Thanh tiến trình tải xuống */}
      {isDownloading && (
        <div className="space-y-1 max-w-sm">
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-cyan-300 font-medium">{statusMessage}</p>
        </div>
      )}

      {/* Thông báo thành công */}
      {!isDownloading && statusMessage && (
        <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{statusMessage}</span>
        </p>
      )}

      {/* Cảnh báo lỗi Checksum hoặc lỗi mạng */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2 max-w-md">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
