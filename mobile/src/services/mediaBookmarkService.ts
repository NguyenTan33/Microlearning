import { apiClient } from './apiClient';

export interface MediaBookmarkItem {
  id: number;
  lessonId: number;
  lessonTitle: string;
  timestampSeconds: number;
  noteText: string;
  createdAt: string;
}

export const mediaBookmarkService = {
  /**
   * Lấy danh sách các mốc đánh dấu bài học của học viên
   */
  async getBookmarks(): Promise<MediaBookmarkItem[]> {
    try {
      const response = await apiClient.get<MediaBookmarkItem[]>('/media/bookmarks');
      return response.data;
    } catch {
      return [];
    }
  },

  /**
   * Thêm mốc thời gian đánh dấu bài học
   */
  async addBookmark(lessonId: number, timestampSeconds: number, noteText: string): Promise<MediaBookmarkItem | null> {
    try {
      const response = await apiClient.post<MediaBookmarkItem>('/media/bookmarks', {
        lessonId,
        timestampSeconds,
        noteText,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Xóa mốc đánh dấu
   */
  async removeBookmark(bookmarkId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/media/bookmarks/${bookmarkId}`);
      return true;
    } catch {
      return true;
    }
  },
};
