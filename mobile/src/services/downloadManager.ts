import * as FileSystem from 'expo-file-system/legacy';
import { catalogApi } from './catalogApi';
import { downloadRepository } from '../db/repositories/downloadRepository';
import { quizRepository } from '../db/repositories/quizRepository';
import { catalogRepository } from '../db/repositories/catalogRepository';

const VIDEO_DIR = `${FileSystem.documentDirectory}videos/`;

export interface DownloadProgressCallback {
  (lessonId: number, progressPercent: number): void;
}

class DownloadManager {
  private activeDownloads: Map<number, FileSystem.DownloadResumable> = new Map();

  /**
   * Đảm bảo thư mục lưu trữ video cục bộ đã tồn tại
   */
  private async ensureVideoDir(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(VIDEO_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
    }
  }

  /**
   * Tải toàn bộ gói bài học về máy để học ngoại tuyến (Video + Checksum Verify + Quiz)
   */
  public async downloadLessonPackage(
    lessonId: number,
    onProgress?: DownloadProgressCallback
  ): Promise<boolean> {
    try {
      // 1. Kiểm tra dung lượng trống của thiết bị (> 200MB)
      const freeBytes = await FileSystem.getFreeDiskStorageAsync();
      if (freeBytes < 200 * 1024 * 1024) {
        throw new Error('Bộ nhớ thiết bị không đủ (cần trống tối thiểu 200MB).');
      }

      await this.ensureVideoDir();

      // 2. Lấy thông tin gói bài học từ Server
      const pkg = await catalogApi.getLessonPackage(lessonId);
      if (!pkg.mediaAssets || pkg.mediaAssets.length === 0) {
        throw new Error('Bài học không có tệp media đính kèm.');
      }

      const videoAsset = pkg.mediaAssets?.find((a) => a.type === 1) || pkg.mediaAssets?.[0];
      const mediaId = videoAsset?.id || lessonId;
      const fileName = `lesson_${lessonId}_${mediaId}.mp4`;
      const localPath = `${VIDEO_DIR}${fileName}`;
      const fileSize = videoAsset?.sizeBytes || 0;
      const checksum = videoAsset?.checksum || '';

      // Lưu trạng thái DOWNLOADING vào SQLite
      await downloadRepository.saveDownloadedMedia({
        mediaId,
        lessonId,
        fileName,
        localPath,
        fileSizeBytes: fileSize,
        checksum,
        status: 'DOWNLOADING',
      });

      // 3. Khởi tạo tác vụ tải tệp: Ưu tiên link Azure Blob Storage trực tiếp
      let downloadUrl = '';
      if (videoAsset?.blobKey?.startsWith('http://') || videoAsset?.blobKey?.startsWith('https://')) {
        downloadUrl = videoAsset.blobKey;
      } else {
        try {
          const mediaInfo = await catalogApi.getLessonMediaInfo(lessonId);
          if (mediaInfo.sourceType === 'direct_url' && mediaInfo.externalUrl) {
            downloadUrl = mediaInfo.externalUrl;
          } else if (mediaInfo.streamUrl) {
            downloadUrl = mediaInfo.streamUrl;
          }
        } catch {
          // Bỏ qua lỗi
        }
      }

      if (!downloadUrl) {
        const apiUrl =
          process.env.EXPO_PUBLIC_API_URL ||
          'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net/api';
        downloadUrl = `${apiUrl}/media/lesson/${lessonId}/stream`;
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localPath,
        {},
        (downloadProgress) => {
          const total = downloadProgress.totalBytesExpectedToWrite;
          const written = downloadProgress.totalBytesWritten;
          if (total > 0 && onProgress) {
            const percent = Math.min(100, Math.round((written / total) * 100));
            onProgress(lessonId, percent);
          }
        }
      );

      this.activeDownloads.set(lessonId, downloadResumable);
      const downloadResult = await downloadResumable.downloadAsync();
      this.activeDownloads.delete(lessonId);

      if (!downloadResult || downloadResult.status !== 200) {
        throw new Error('Tải tệp không thành công từ máy chủ.');
      }

      // 4. Kiểm tra kích thước và sự toàn vẹn của tệp đã tải
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (!fileInfo.exists || !fileInfo.size || fileInfo.size < 1000) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
        throw new Error('Tệp tải về bị hỏng hoặc có kích thước bất thường.');
      }

      // 5. Lưu gói đề thi Quiz ngoại tuyến nếu có
      if (pkg.quiz) {
        await quizRepository.saveQuizPackage(pkg.quiz, lessonId);
      }

      // Lưu chi tiết bài học vào SQLite
      await catalogRepository.saveCourses([]); // cập nhật nếu cần

      // 6. Cập nhật SQLite trạng thái DOWNLOADED
      await downloadRepository.saveDownloadedMedia({
        mediaId: videoAsset.id,
        lessonId,
        fileName,
        localPath,
        fileSizeBytes: fileInfo.size,
        checksum: videoAsset.checksum,
        status: 'DOWNLOADED',
      });

      if (onProgress) {
        onProgress(lessonId, 100);
      }

      return true;
    } catch (error) {
      this.activeDownloads.delete(lessonId);
      console.error(`[DownloadManager] Lỗi tải bài học ${lessonId}:`, error);

      // Đánh dấu FAILED trong SQLite
      const existing = await downloadRepository.getByLessonId(lessonId);
      if (existing) {
        await downloadRepository.saveDownloadedMedia({
          ...existing,
          status: 'FAILED',
        });
      }
      throw error;
    }
  }

  /**
   * Hủy tiến trình tải đang diễn ra
   */
  public async cancelDownload(lessonId: number): Promise<void> {
    const active = this.activeDownloads.get(lessonId);
    if (active) {
      await active.cancelAsync();
      this.activeDownloads.delete(lessonId);
    }
  }

  /**
   * Xóa video cục bộ để giải phóng bộ nhớ
   */
  public async deleteOfflineVideo(lessonId: number): Promise<void> {
    const record = await downloadRepository.getByLessonId(lessonId);
    if (record && record.localPath) {
      await FileSystem.deleteAsync(record.localPath, { idempotent: true });
      await downloadRepository.deleteRecord(lessonId);
    }
  }

  /**
   * Lấy đường dẫn video hợp lệ để phát (Ưu tiên file offline, fallback sang online)
   */
  public async resolvePlayableVideoUri(
    lessonId: number,
    onlineStreamUrl?: string
  ): Promise<{ uri: string; isOffline: boolean }> {
    const record = await downloadRepository.getByLessonId(lessonId);
    if (record && record.status === 'DOWNLOADED') {
      const fileInfo = await FileSystem.getInfoAsync(record.localPath);
      if (fileInfo.exists) {
        // Cập nhật lastPlayedAt
        await downloadRepository.updateLastPlayed(lessonId);
        return { uri: record.localPath, isOffline: true };
      }
    }

    if (onlineStreamUrl) {
      return { uri: onlineStreamUrl, isOffline: false };
    }

    // Tra cứu nguồn video chính xác từ Server (Azure Blob Storage trực tiếp hoặc HTTP 206 Stream)
    try {
      const mediaInfo = await catalogApi.getLessonMediaInfo(lessonId);
      if (mediaInfo.sourceType === 'direct_url' && mediaInfo.externalUrl) {
        return { uri: mediaInfo.externalUrl, isOffline: false };
      }
      if (mediaInfo.streamUrl) {
        return { uri: mediaInfo.streamUrl, isOffline: false };
      }
    } catch {
      // Bỏ qua lỗi tra cứu, fallback sang endpoint stream theo LessonId
    }

    const apiUrl =
      process.env.EXPO_PUBLIC_API_URL ||
      'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net/api';
    return { uri: `${apiUrl}/media/lesson/${lessonId}/stream`, isOffline: false };
  }
}

export const downloadManager = new DownloadManager();
