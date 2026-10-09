import { secureStorage } from '../utils/secureStorage';
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
  async getAllBookmarks(): Promise<MediaBookmark[]> {
    try {
      const raw = await secureStorage.getItem(BOOKMARK_STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw) as MediaBookmark[];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  async getBookmarksByLesson(lessonId: number): Promise<MediaBookmark[]> {
    const all = await this.getAllBookmarks();
    return all
      .filter((b) => b.lessonId === lessonId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  async addBookmark(payload: CreateMediaBookmarkPayload): Promise<MediaBookmark> {
    const all = await this.getAllBookmarks();
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

    all.push(newBookmark);
    await secureStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(all));
    return newBookmark;
  },

  async deleteBookmark(bookmarkId: string): Promise<void> {
    const all = await this.getAllBookmarks();
    const filtered = all.filter((b) => b.id !== bookmarkId);
    await secureStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(filtered));
  },
};
