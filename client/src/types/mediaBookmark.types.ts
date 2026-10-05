export interface MediaBookmark {
  id: string;
  lessonId: number;
  mediaId: number;
  timestamp: number;
  formattedTime: string;
  title: string;
  note?: string;
  createdAt: string;
}

export interface CreateMediaBookmarkPayload {
  lessonId: number;
  mediaId: number;
  timestamp: number;
  title?: string;
  note?: string;
}
