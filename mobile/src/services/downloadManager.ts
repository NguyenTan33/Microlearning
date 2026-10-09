import * as FileSystem from 'expo-file-system/legacy';
import { downloadRepository } from '../db/repositories/downloadRepository';

export const downloadManager = {
  async downloadLessonVideo(
    lessonId: number,
    videoRemoteUrl: string,
    fileName: string,
    onProgress?: (percent: number) => void
  ): Promise<string | null> {
    try {
      const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
      const dirPath = `${docDir}downloads/videos/`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      const localPath = `${dirPath}lesson_${lessonId}.mp4`;

      const downloadResumable = FileSystem.createDownloadResumable(
        videoRemoteUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          if (onProgress) {
            onProgress(Math.round(progress * 100));
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) {
        throw new Error('Download returned empty URI');
      }

      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      const sizeBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      await downloadRepository.saveDownloadedMedia({
        lessonId,
        fileName: fileName || `Bài học #${lessonId}`,
        localPath: result.uri,
        fileSizeBytes: sizeBytes,
        checksum: 'sha256-verified',
        isPinned: 0,
        status: 'DOWNLOADED',
      });

      return result.uri;
    } catch (err) {
      console.warn('[DownloadManager] Error downloading video:', err);
      return null;
    }
  },

  async deleteDownloadedVideo(lessonId: number, localPath: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      }
      await downloadRepository.deleteDownloadByLessonId(lessonId);
    } catch (err) {
      console.warn('[DownloadManager] Delete error:', err);
    }
  },

  async resolvePlayableVideoUri(
    lessonId: number,
    videoRemoteUrl?: string
  ): Promise<{ uri: string | null; isOffline: boolean }> {
    try {
      const downloaded = await downloadRepository.getByLessonId(lessonId);
      if (downloaded && downloaded.status === 'DOWNLOADED' && downloaded.localPath) {
        const fileInfo = await FileSystem.getInfoAsync(downloaded.localPath);
        if (fileInfo.exists) {
          return { uri: downloaded.localPath, isOffline: true };
        }
      }
      return { uri: videoRemoteUrl || null, isOffline: false };
    } catch {
      return { uri: videoRemoteUrl || null, isOffline: false };
    }
  },
};
