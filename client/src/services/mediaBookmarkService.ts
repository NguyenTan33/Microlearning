import type { MediaBookmark, CreateMediaBookmarkPayload } from '../types/mediaBookmark.types';
import { SAMPLE_COURSES } from './sampleCatalogData';
import { getCurrentUser } from '../utils/tokenHelper';

/**
 * Trả về tiền tố lưu trữ bookmarks riêng biệt cho từng tài khoản người dùng
 */
function getUserStoragePrefix(): string {
  const user = getCurrentUser();
  const userId = user?.userId ? user.userId.trim() : 'guest';
  return `microlearn_bookmarks_${userId}_lesson_`;
}

/**
 * Khóa lưu trữ bookmarks của một bài học cụ thể theo user hiện tại
 */
function getLessonStorageKey(lessonId: number): string {
  return `${getUserStoragePrefix()}${lessonId}`;
}

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
      const raw = localStorage.getItem(getLessonStorageKey(lessonId));
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
   * Lấy toàn bộ các điểm đánh dấu trên tất cả các khóa học & bài học của tài khoản hiện tại.
   */
  getAllBookmarks(): MediaBookmark[] {
    try {
      const prefix = getUserStoragePrefix();
      const all: MediaBookmark[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
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

      // Cập nhật ngược lại localStorage cho user hiện tại
      const groupedByLesson = new Map<number, MediaBookmark[]>();
      enriched.forEach((bm) => {
        const cur = groupedByLesson.get(bm.lessonId) || [];
        cur.push(bm);
        groupedByLesson.set(bm.lessonId, cur);
      });

      groupedByLesson.forEach((list, lId) => {
        try {
          localStorage.setItem(getLessonStorageKey(lId), JSON.stringify(list));
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
   * Đồng bộ toàn bộ bookmarks từ Cloud API về localStorage
   */
  async syncCloudBookmarks(): Promise<MediaBookmark[]> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return this.getAllBookmarks();

      const res = await fetch('/api/media-bookmarks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const cloudList: MediaBookmark[] = await res.json();
        if (Array.isArray(cloudList)) {
          const groupedByLesson = new Map<number, MediaBookmark[]>();
          cloudList.forEach((bm) => {
            const cur = groupedByLesson.get(bm.lessonId) || [];
            cur.push(bm);
            groupedByLesson.set(bm.lessonId, cur);
          });
          groupedByLesson.forEach((list, lId) => {
            localStorage.setItem(getLessonStorageKey(lId), JSON.stringify(list));
          });
          return cloudList;
        }
      }
    } catch {
      // offline fallback
    }
    return this.getAllBookmarks();
  },

  /**
   * Đếm tổng số điểm đánh dấu hiện có trên toàn hệ thống của tài khoản hiện tại.
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
    localStorage.setItem(getLessonStorageKey(payload.lessonId), JSON.stringify(updatedList));

    // Đồng bộ tức thời lên CSDL Cloud Backend
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        fetch('/api/media-bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: newBookmark.id,
            lessonId: newBookmark.lessonId,
            mediaId: newBookmark.mediaId,
            courseId: newBookmark.courseId,
            courseTitle: newBookmark.courseTitle,
            lessonTitle: newBookmark.lessonTitle,
            timestamp: newBookmark.timestamp,
            title: newBookmark.title,
            note: newBookmark.note,
          }),
        }).catch(() => {});
      }
    } catch {
      // ignore
    }

    return newBookmark;
  },

  /**
   * Xóa một điểm đánh dấu cụ thể khỏi danh sách (Không có chức năng sửa).
   */
  deleteBookmark(lessonId: number, bookmarkId: string): MediaBookmark[] {
    const currentList = this.getBookmarks(lessonId);
    const updatedList = currentList.filter((item) => item.id !== bookmarkId);
    localStorage.setItem(getLessonStorageKey(lessonId), JSON.stringify(updatedList));

    // Đồng bộ xóa lên CSDL Cloud Backend
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        fetch(`/api/media-bookmarks/${bookmarkId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } catch {
      // ignore
    }

    return updatedList;
  },

  /**
   * Xóa toàn bộ điểm đánh dấu của một bài học.
   */
  clearBookmarks(lessonId: number): void {
    localStorage.removeItem(getLessonStorageKey(lessonId));
  },

  /**
   * Xóa toàn bộ điểm đánh dấu trong hệ thống của tài khoản hiện tại.
   */
  clearAllBookmarks(): void {
    const prefix = getUserStoragePrefix();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },
};
