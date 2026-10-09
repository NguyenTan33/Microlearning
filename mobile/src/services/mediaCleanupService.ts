import * as FileSystem from 'expo-file-system/legacy';
import { downloadRepository } from '../db/repositories/downloadRepository';

export const mediaCleanupService = {
  /**
   * Chạy quét dọn dẹp các tệp video đã học xong sau 7 ngày (7-Day Auto Cleanup)
   * Không bao giờ xóa các bài học được ghim (isPinned = 1).
   */
  async runCleanupIfNeeded(): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const expiredVideos = await downloadRepository.getExpiredVideos(sevenDaysAgo);

      let cleanedCount = 0;
      for (const video of expiredVideos) {
        if (video.localPath) {
          await FileSystem.deleteAsync(video.localPath, { idempotent: true });
        }
        await downloadRepository.deleteRecord(video.lessonId);
        cleanedCount++;
      }

      if (cleanedCount > 0) {
        console.log(`[MediaCleanup] Đã tự động dọn dẹp ${cleanedCount} video hết hạn 7 ngày.`);
      }
      return cleanedCount;
    } catch (error) {
      console.warn('[MediaCleanup] Lỗi dọn dẹp video hết hạn:', error);
      return 0;
    }
  },

  async runAutoCleanup7Days(): Promise<number> {
    return await this.runCleanupIfNeeded();
  },
};
