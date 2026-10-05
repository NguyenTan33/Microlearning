import type { MediaBookmark, CreateMediaBookmarkPayload } from '../types/mediaBookmark.types';

const STORAGE_PREFIX = 'microlearn_bookmarks_lesson_';

/**
 * Định dạng số giây thành chuỗi thời gian trực quan (mm:ss hoặc hh:mm:ss).
 */
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

/**
 * Service quản lý mốc cắm cờ (Flag Points / Media Bookmarks) lưu trữ theo từng bài học.
 * Theo yêu cầu nghiệp vụ: Chỉ hỗ trợ Thêm, Tìm kiếm theo mốc, và Xóa; KHÔNG có tính năng Sửa.
 */
export const mediaBookmarkService = {
  /**
   * Lấy danh sách toàn bộ các điểm đánh dấu của một bài học (đã sắp xếp theo thời gian tăng dần).
   */
  getBookmarks(lessonId: number): MediaBookmark[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${lessonId}`);
      if (!raw) return [];
      const items: MediaBookmark[] = JSON.parse(raw);
      if (!Array.isArray(items)) return [];
      // Sắp xếp tăng dần theo mốc giây trên video
      return items.sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  },

  /**
   * Cắm cờ tạo một điểm đánh dấu mới tại vị trí video đang phát.
   */
  addBookmark(payload: CreateMediaBookmarkPayload): MediaBookmark {
    const currentList = this.getBookmarks(payload.lessonId);
    const formattedTime = formatBookmarkTime(payload.timestamp);
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `bm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newBookmark: MediaBookmark = {
      id: newId,
      lessonId: payload.lessonId,
      mediaId: payload.mediaId,
      timestamp: Number(payload.timestamp.toFixed(1)),
      formattedTime,
      title: payload.title?.trim() || `Mốc đánh dấu lúc ${formattedTime}`,
      note: payload.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [...currentList, newBookmark].sort((a, b) => a.timestamp - b.timestamp);
    localStorage.setItem(`${STORAGE_PREFIX}${payload.lessonId}`, JSON.stringify(updatedList));

    return newBookmark;
  },

  /**
   * Xóa một điểm đánh dấu cụ thể khỏi danh sách (Không có chức năng sửa).
   */
  deleteBookmark(lessonId: number, bookmarkId: string): MediaBookmark[] {
    const currentList = this.getBookmarks(lessonId);
    const updatedList = currentList.filter((item) => item.id !== bookmarkId);
    localStorage.setItem(`${STORAGE_PREFIX}${lessonId}`, JSON.stringify(updatedList));
    return updatedList;
  },

  /**
   * Xóa toàn bộ các điểm đánh dấu của bài học.
   */
  clearBookmarks(lessonId: number): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${lessonId}`);
  },
};
