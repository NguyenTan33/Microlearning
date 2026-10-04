import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Inbox,
  CheckCircle2,
  Clock,
  Laptop,
  Check,
} from 'lucide-react';
import type { SyncOperationItem } from '../../types/offline.types';
import {
  getAllOutboxItems,
  getCheckpointSequence,
} from '../../services/indexedDbService';
import {
  pushSyncBatch,
  pullDeltaSync,
} from '../../services/syncService';
import { getOrCreateDeviceId } from '../../services/deviceService';

interface SyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onSyncCompleted?: () => void;
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onSyncCompleted,
}) => {
  const [outboxItems, setOutboxItems] = useState<SyncOperationItem[]>([]);
  const [checkpointSeq, setCheckpointSeq] = useState<number>(0);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const deviceId = getOrCreateDeviceId();

  const loadData = async () => {
    try {
      const items = await getAllOutboxItems();
      setOutboxItems(items);
      const seq = await getCheckpointSequence();
      setCheckpointSeq(seq);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSyncFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Thực hiện Sync Push (Đẩy mảng Outbox lên server)
  const handlePush = async () => {
    setIsPushing(true);
    setSyncFeedback('Đang gửi mảng thao tác trong Outbox lên Server...');
    try {
      const result = await pushSyncBatch();
      if (result) {
        setSyncFeedback(
          `Đồng bộ Push thành công! Server đã tiếp nhận ${result.acceptedOperationIds.length} thao tác.`
        );
      } else {
        setSyncFeedback('Hàng đợi Outbox hiện đang trống.');
      }
      await loadData();
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: unknown) {
      setSyncFeedback(err instanceof Error ? err.message : 'Đồng bộ Push thất bại.');
    } finally {
      setIsPushing(false);
    }
  };

  // Thực hiện Delta Sync Pull (Kéo dữ liệu vi sai từ server)
  const handlePull = async () => {
    setIsPulling(true);
    setSyncFeedback('Đang kiểm tra dữ liệu vi sai từ Server...');
    try {
      const result = await pullDeltaSync(50);
      if (result) {
        setSyncFeedback(
          `Kéo dữ liệu thành công! Nhận ${result.changes.length} thay đổi. Mốc Sequence mới: ${result.newCheckpointSequence}`
        );
      } else {
        setSyncFeedback('Không có thay đổi mới nào từ Server.');
      }
      await loadData();
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: unknown) {
      setSyncFeedback(err instanceof Error ? err.message : 'Đồng bộ Pull thất bại.');
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl rounded-3xl bg-[#0B1020] border border-white/10 p-6 sm:p-7 shadow-2xl relative space-y-5">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Trung Tâm Đồng Bộ (Sync Engine)
              </h2>
              <p className="text-xs text-slate-400">
                Kiến trúc Offline-First 2 chiều: Batch Push &amp; Sequence Delta Pull
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trạng thái mạng & Thiết bị */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mạng</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-bold text-white">
                {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Thiết bị</span>
            <div className="flex items-center gap-1 text-slate-300">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono truncate">{deviceId.substring(0, 10)}...</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Checkpoint Seq</span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              Seq #{checkpointSeq}
            </span>
          </div>
        </div>

        {/* Thông báo kết quả thao tác */}
        {syncFeedback && (
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Danh sách các tác vụ trong Hàng đợi Outbox */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Inbox className="w-4 h-4 text-indigo-400" />
              Tác vụ chờ đồng bộ trong Outbox ({outboxItems.length})
            </span>
            <span className="text-[11px] text-slate-400 font-normal">IndexedDB: sync_outbox</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 rounded-xl bg-slate-950/60 p-2.5 border border-white/5">
            {outboxItems.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                <Check className="w-6 h-6 mx-auto mb-1 text-emerald-400 opacity-60" />
                Hàng đợi Outbox trống. Toàn bộ dữ liệu của bạn đã được lưu an toàn trên Server!
              </div>
            ) : (
              outboxItems.map((item) => (
                <div
                  key={item.clientOperationId}
                  className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                        {item.operationType}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]">
                        {item.clientOperationId.substring(0, 8)}...
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono truncate max-w-xs">
                      {item.payloadJson}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Nút hành động Sync Push và Sync Pull */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handlePush}
            disabled={isPushing || outboxItems.length === 0 || !isOnline}
            className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>{isPushing ? 'Đang gửi Batch...' : `Gửi Outbox (${outboxItems.length})`}</span>
          </button>

          <button
            onClick={handlePull}
            disabled={isPulling || !isOnline}
            className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-cyan-300 font-bold text-xs shadow-sm disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>{isPulling ? 'Đang kéo...' : 'Kéo Delta Pull'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
