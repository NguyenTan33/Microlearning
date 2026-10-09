export interface MediaBookmark {
  id: string;
  lessonId: number;
  mediaId?: number;
  courseId: number;
  courseTitle: string;
  lessonTitle: string;
  timestamp: number; // Thời điểm tính bằng giây
  formattedTime: string; // mm:ss hoặc hh:mm:ss
  title: string;
  note?: string;
  createdAt: string;
}

export interface CreateMediaBookmarkPayload {
  lessonId: number;
  mediaId?: number;
  courseId?: number;
  courseTitle?: string;
  lessonTitle?: string;
  timestamp: number;
  title: string;
  note?: string;
}
