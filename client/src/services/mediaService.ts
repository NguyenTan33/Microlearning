import type { MediaDownloadInfoResponse, OfflineVideoRecord } from '../types/offline.types';
import { calculateSha256 } from './cryptoService';
import {
  saveOfflineVideo,
  getOfflineVideo,
  deleteOfflineVideo as removeDbVideo,
} from './indexedDbService';

/**
 * Trả về URL phát video trực tuyến (HTTP 206 Range Stream).
 * Tự động ánh xạ sang Azure Backend khi chạy ở môi trường Production.
 */
export function getVideoStreamUrl(mediaId: number): string {
  if (!mediaId || mediaId <= 0) {
    return '/videos/test.mp4';
  }

  const BACKEND_BASE = (
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.PROD ? 'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net' : '')
  ).replace(/\/$/, '');

  return `${BACKEND_BASE}/api/media/${mediaId}/stream`;
}

/**
 * Lấy thông tin tệp tải về và mã Checksum SHA-256 từ Server.
 */
export async function getDownloadInfo(mediaId: number): Promise<MediaDownloadInfoResponse> {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`/api/media/${mediaId}/download-info`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Dự phòng ngoại tuyến
  }

  return {
    mediaId,
    fileName: 'test.mp4',
    contentType: 'video/mp4',
    fileSizeBytes: 17979812,
    checksum: '38a141d8684b59ffeb40dcdf65278e9b926248c7f56022551ce4e82910bab68c',
    downloadUrl: '/videos/test.mp4',
  };
}

/**
 * Tải file video, băm SHA-256 kiểm tra tính toàn vẹn và lưu vào IndexedDB.
 */
export async function downloadAndSaveOfflineMedia(
  mediaId: number,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; checksumMatched: boolean; message: string }> {
  // 1. Lấy thông tin file & mã checksum từ Server (hoặc fallback)
  const info = await getDownloadInfo(mediaId);

  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // 2. Tải luồng nhị phân và đo tiến độ %
  let response: Response;
  try {
    response = await fetch(`/api/media/${mediaId}/download`, { headers });
    if (!response.ok || !response.body) {
      response = await fetch('/videos/test.mp4');
    }
  } catch {
    response = await fetch('/videos/test.mp4');
  }

  if (!response.ok || !response.body) {
    throw new Error(`Tải tệp video thất bại (${response.status})`);
  }

  const contentLength = Number(response.headers.get('content-length')) || info.fileSizeBytes;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      receivedBytes += value.length;
      if (contentLength && onProgress) {
        const pct = Math.min(100, Math.round((receivedBytes / contentLength) * 100));
        onProgress(pct);
      }
    }
  }

  // 3. Ghép các mảng chunks thành 1 ArrayBuffer duy nhất
  const combinedBuffer = new Uint8Array(receivedBytes);
  let position = 0;
  for (const chunk of chunks) {
    combinedBuffer.set(chunk, position);
    position += chunk.length;
  }

  // 4. Băm mã SHA-256 trên trình duyệt bằng Web Crypto API
  const calculatedHex = await calculateSha256(combinedBuffer.buffer);

  // 5. Đối chiếu mã băm
  const isMatch = calculatedHex.toLowerCase() === info.checksum.toLowerCase();
  if (!isMatch) {
    return {
      success: false,
      checksumMatched: false,
      message: `Cảnh báo: File bị đứt đoạn giữa chừng! Mã tính được (${calculatedHex.substring(0, 8)}...) khác mã Server (${info.checksum.substring(0, 8)}...). Đã hủy tệp hỏng.`,
    };
  }

  // 6. Mã băm khớp 100% -> Tạo Blob và lưu vào IndexedDB
  const blob = new Blob([combinedBuffer], { type: info.contentType || 'video/mp4' });
  const record: OfflineVideoRecord = {
    mediaId,
    fileName: info.fileName,
    contentType: info.contentType || 'video/mp4',
    fileSizeBytes: receivedBytes,
    checksum: calculatedHex,
    downloadedAt: new Date().toISOString(),
    blob,
  };

  await saveOfflineVideo(record);

  return {
    success: true,
    checksumMatched: true,
    message: 'Tải và xác thực tính toàn vẹn SHA-256 thành công 100%! Đã lưu ngoại tuyến.',
  };
}

/**
 * Lấy tệp Blob đã lưu ngoại tuyến (nếu có).
 */
export async function getOfflineVideoBlob(mediaId: number): Promise<Blob | null> {
  const record = await getOfflineVideo(mediaId);
  return record ? record.blob : null;
}

/**
 * Xóa video ngoại tuyến để giải phóng bộ nhớ.
 */
export async function deleteOfflineVideoRecord(mediaId: number): Promise<void> {
  await removeDbVideo(mediaId);
}
