import { secureStorage } from '../utils/secureStorage';
import { bookmarkRepository } from '../db/repositories/bookmarkRepository';
import { apiClient } from './apiClient';
import type { MediaBookmark, CreateMediaBookmarkPayload } from '../types/mediaBookmark.types';

const BOOKMARK_STORAGE_KEY = 'microlearning_media_bookmarks_store';

export function formatBookmarkTime(secs: number): string {
  const totalSeconds = Math.max(0, Math.floor(secs));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export const mediaBookmarkService = {
  /**
   * Lấy toàn bộ mốc đánh dấu (Ưu tiên SQLite DB & đồng bộ với Cloud API)
   */
  async getAllBookmarks(): Promise<MediaBookmark[]> {
    // 1. Đọc nhanh từ SQLite DB
    let localBookmarks = await bookmarkRepository.getAll();

    // 2. Thử đồng bộ từ Cloud API nếu có mạng
    try {
      const res = await apiClient.get<MediaBookmark[]>('/api/media-bookmarks');
      if (Array.isArray(res.data) && res.data.length > 0) {
        await bookmarkRepository.saveBatch(res.data);
        await secureStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(res.data));
        return res.data;
      }
    } catch {
      // Offline fallback: tiếp tục dùng dữ liệu SQLite
    }

    // 3. Fallback SecureStorage nếu SQLite trống
    if (localBookmarks.length === 0) {
      try {
        const raw = await secureStorage.getItem(BOOKMARK_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MediaBookmark[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            await bookmarkRepository.saveBatch(parsed);
            localBookmarks = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    return localBookmarks;
  },

  /**
   * Lấy danh sách đánh dấu của một bài học cụ thể
   */
  async getBookmarksByLesson(lessonId: number): Promise<MediaBookmark[]> {
    const dbList = await bookmarkRepository.getByLessonId(lessonId);
    if (dbList.length > 0) return dbList;

    const all = await this.getAllBookmarks();
    return all
      .filter((b) => b.lessonId === lessonId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  /**
   * Thêm mới mốc đánh dấu (Ghi vào CSDL SQLite ngay lập tức & gửi lên Cloud API)
   */
  async addBookmark(payload: CreateMediaBookmarkPayload): Promise<MediaBookmark> {
    const formattedTime = formatBookmarkTime(payload.timestamp);
    const newBookmark: MediaBookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      lessonId: payload.lessonId,
      mediaId: payload.mediaId,
      courseId: payload.courseId || 1,
      courseTitle: payload.courseTitle || 'Khóa học Microlearning',
      lessonTitle: payload.lessonTitle || 'Bài học',
      timestamp: Number(payload.timestamp.toFixed(1)),
      formattedTime,
      title: payload.title.trim(),
      note: payload.note?.trim(),
      createdAt: new Date().toISOString(),
    };

    // 1. Lưu vào CSDL SQLite cục bộ (Database-backed)
    await bookmarkRepository.save(newBookmark);

    // 2. Cập nhật SecureStorage
    try {
      const all = await this.getAllBookmarks();
      if (!all.some((b) => b.id === newBookmark.id)) {
        all.unshift(newBookmark);
      }
      await secureStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }

    // 3. Đẩy lên Cloud API nếu có mạng
    try {
      await apiClient.post('/api/media-bookmarks', {
        lessonId: newBookmark.lessonId,
        mediaId: newBookmark.mediaId,
        courseId: newBookmark.courseId,
        courseTitle: newBookmark.courseTitle,
        lessonTitle: newBookmark.lessonTitle,
        timestamp: newBookmark.timestamp,
        title: newBookmark.title,
        note: newBookmark.note,
      });
    } catch {
      // Khi offline, đã được lưu trong SQLite
    }

    return newBookmark;
  },

  /**
   * Xóa mốc đánh dấu (Xóa khỏi CSDL SQLite & gửi yêu cầu xóa lên Cloud API)
   */
  async deleteBookmark(bookmarkId: string): Promise<void> {
    // 1. Xóa khỏi CSDL SQLite
    await bookmarkRepository.delete(bookmarkId);

    // 2. Cập nhật SecureStorage
    try {
      const raw = await secureStorage.getItem(BOOKMARK_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw) as MediaBookmark[];
        const filtered = list.filter((b) => b.id !== bookmarkId);
        await secureStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {
      // ignore
    }

    // 3. Gửi lệnh xóa lên Cloud API
    try {
      await apiClient.delete(`/api/media-bookmarks/${bookmarkId}`);
    } catch {
      // ignore
    }
  },
};
