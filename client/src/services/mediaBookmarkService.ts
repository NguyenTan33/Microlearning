import type { MediaBookmark, CreateMediaBookmarkPayload } from '../types/mediaBookmark.types';
import { SAMPLE_COURSES } from './sampleCatalogData';

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
 * Tự động bù đắp và chuẩn hóa thông tin Tên Khóa Học và Tên Bài Học
 */
function enrichBookmarkMetadata(bm: MediaBookmark): MediaBookmark {
  let courseTitle = bm.courseTitle;
  let lessonTitle = bm.lessonTitle;

  const isGenericCourse =
    !courseTitle ||
    courseTitle === 'Khóa học MicroLearn' ||
    courseTitle === 'Khóa học' ||
    courseTitle === 'Khóa học đang theo dõi';

  const isGenericLesson =
    !lessonTitle ||
    lessonTitle.startsWith('Bài giảng #') ||
    lessonTitle.startsWith('Bài học #') ||
    lessonTitle === 'Bài học';

  // 1. Nhận diện khóa học & bài học: "Kiến trúc Offline-First Mobile & Web App" - "Monotonic Merge chống tụt lùi tiến độ"
  if (bm.lessonId === 18 || bm.lessonId === 6001) {
    courseTitle = 'Kiến trúc Offline-First Mobile & Web App';
    lessonTitle = 'Monotonic Merge chống tụt lùi tiến độ';
  } else if (isGenericCourse || isGenericLesson) {
    // 2. Tìm trong danh mục mẫu SAMPLE_COURSES
    for (const c of SAMPLE_COURSES) {
      for (const s of c.subjects) {
        const found = s.lessons?.find((l) => l.id === bm.lessonId);
        if (found) {
          if (isGenericCourse) courseTitle = c.title;
          if (isGenericLesson) lessonTitle = found.title;
          break;
        }
      }
      if (courseTitle && lessonTitle && !lessonTitle.startsWith('Bài')) break;
    }

    // 3. Tìm trong localStorage các khóa học tùy chỉnh tạo từ Studio
    if (isGenericCourse || isGenericLesson) {
      try {
        const raw = localStorage.getItem('microlearn_custom_courses');
        if (raw) {
          const list = JSON.parse(raw);
          for (const c of list) {
            for (const s of c.subjects || []) {
              const found = s.lessons?.find((l: { id: number; title: string }) => l.id === bm.lessonId);
              if (found) {
                if (isGenericCourse) courseTitle = c.title;
                if (isGenericLesson) lessonTitle = found.title;
                break;
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // Tinh chỉnh tiêu đề tránh lặp lại mốc thời gian
  let title = bm.title;
  if (!title || title.toLowerCase().startsWith('mốc đánh dấu') || title.toLowerCase().startsWith('mốc quan trọng')) {
    title = lessonTitle || 'Monotonic Merge chống tụt lùi tiến độ';
  }

  return {
    ...bm,
    courseTitle: courseTitle || 'Kiến trúc Offline-First Mobile & Web App',
    lessonTitle: lessonTitle || 'Monotonic Merge chống tụt lùi tiến độ',
    title,
  };
}

/**
 * Service quản lý mốc cắm cờ (Flag Points / Media Bookmarks) lưu trữ theo từng bài học và toàn hệ thống.
 * Theo yêu cầu nghiệp vụ: Chỉ hỗ trợ Thêm, Xem tất cả, Nhảy tới mốc, và Xóa; KHÔNG có tính năng Sửa.
 */
export const mediaBookmarkService = {
  /**
   * Lấy danh sách toàn bộ các điểm đánh dấu của một bài học cụ thể (sắp xếp theo timeline video).
   */
  getBookmarks(lessonId: number): MediaBookmark[] {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${lessonId}`);
      if (!raw) return [];
      const items: MediaBookmark[] = JSON.parse(raw);
      if (!Array.isArray(items)) return [];
      const enriched = items.map(enrichBookmarkMetadata);
      return enriched.sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
  },

  /**
   * Lấy toàn bộ các điểm đánh dấu trên tất cả các khóa học & bài học trong hệ thống.
   */
  getAllBookmarks(): MediaBookmark[] {
    try {
      const all: MediaBookmark[] = [];
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key);
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: MediaBookmark[] = JSON.parse(raw);
            if (Array.isArray(list)) {
              all.push(...list);
            }
          }
        }
      }

      // Tự động làm giàu metadata khóa học, bài học
      const enriched = all.map(enrichBookmarkMetadata);

      // Cập nhật ngược lại localStorage để chuẩn hóa dữ liệu vĩnh viễn
      const groupedByLesson = new Map<number, MediaBookmark[]>();
      enriched.forEach((bm) => {
        const cur = groupedByLesson.get(bm.lessonId) || [];
        cur.push(bm);
        groupedByLesson.set(bm.lessonId, cur);
      });

      groupedByLesson.forEach((list, lId) => {
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${lId}`, JSON.stringify(list));
        } catch {
          // ignore
        }
      });

      return enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  },

  /**
   * Đếm tổng số điểm đánh dấu hiện có trên toàn hệ thống.
   */
  getAllBookmarksCount(): number {
    return this.getAllBookmarks().length;
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

    let courseTitle = payload.courseTitle;
    let lessonTitle = payload.lessonTitle;

    // Đặc thù bài 18 hoặc 6001
    if (payload.lessonId === 18 || payload.lessonId === 6001) {
      courseTitle = 'Kiến trúc Offline-First Mobile & Web App';
      lessonTitle = 'Monotonic Merge chống tụt lùi tiến độ';
    } else if (!courseTitle || !lessonTitle) {
      for (const c of SAMPLE_COURSES) {
        for (const s of c.subjects) {
          const found = s.lessons?.find((l) => l.id === payload.lessonId);
          if (found) {
            if (!courseTitle) courseTitle = c.title;
            if (!lessonTitle) lessonTitle = found.title;
            break;
          }
        }
        if (courseTitle && lessonTitle) break;
      }
    }

    const newBookmark: MediaBookmark = {
      id: newId,
      lessonId: payload.lessonId,
      mediaId: payload.mediaId,
      courseId: payload.courseId || 6,
      courseTitle: courseTitle || 'Kiến trúc Offline-First Mobile & Web App',
      lessonTitle: lessonTitle || 'Monotonic Merge chống tụt lùi tiến độ',
      timestamp: Number(payload.timestamp.toFixed(1)),
      formattedTime,
      title: payload.title?.trim() || lessonTitle || 'Monotonic Merge chống tụt lùi tiến độ',
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
   * Xóa toàn bộ điểm đánh dấu của một bài học.
   */
  clearBookmarks(lessonId: number): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${lessonId}`);
  },

  /**
   * Xóa toàn bộ điểm đánh dấu trong hệ thống.
   */
  clearAllBookmarks(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },
};
