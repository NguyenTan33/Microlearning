import type { LessonAttachment } from '../types/catalog.types';

function getAuthHeaders(includeContentType = true): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.message || `Yêu cầu thất bại với mã trạng thái ${res.status}.`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const attachmentApi = {
  /**
   * Lấy danh sách các tài liệu đính kèm (Word/PDF) của bài học
   */
  async getAttachments(lessonId: number): Promise<LessonAttachment[]> {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/attachments`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<LessonAttachment[]>(res);
    } catch (err) {
      console.warn(`Không thể lấy tài liệu đính kèm cho bài học ${lessonId}:`, err);
      return [];
    }
  },

  /**
   * Lấy toàn bộ tài liệu đính kèm (PDF/Word) của tất cả bài học trong khóa học
   */
  async getCourseAttachments(courseId: number): Promise<import('../types/catalog.types').CourseAttachment[]> {
    try {
      const res = await fetch(`/api/courses/${courseId}/attachments`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<import('../types/catalog.types').CourseAttachment[]>(res);
    } catch (err) {
      console.warn(`Không thể lấy tài liệu đính kèm cho khóa học ${courseId}:`, err);
      return [];
    }
  },

  /**
   * Tải tệp tài liệu mới lên (PDF, DOC, DOCX tối đa 50MB)
   */
  async uploadAttachment(lessonId: number, file: File): Promise<LessonAttachment> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`/api/lessons/${lessonId}/attachments`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });

    return await handleResponse<LessonAttachment>(res);
  },

  /**
   * Xóa tệp tài liệu đính kèm
   */
  async deleteAttachment(lessonId: number, attachmentId: number): Promise<void> {
    const res = await fetch(`/api/lessons/${lessonId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!res.ok && res.status !== 204) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.message || 'Không thể xóa tệp đính kèm.');
    }
  },
};
