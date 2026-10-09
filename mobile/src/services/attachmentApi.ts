import { apiClient } from './apiClient';
import type { LessonAttachment } from '../types/catalog.types';

export const attachmentApi = {
  async getAttachments(lessonId: number): Promise<LessonAttachment[]> {
    try {
      const res = await apiClient.get<LessonAttachment[]>(`/api/lessons/${lessonId}/attachments`);
      return res.data;
    } catch (err) {
      console.warn(`[AttachmentApi] Error getting attachments for lesson ${lessonId}:`, err);
      return [];
    }
  },

  async uploadAttachment(lessonId: number, formData: FormData): Promise<LessonAttachment> {
    const res = await apiClient.post<LessonAttachment>(
      `/api/lessons/${lessonId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },

  async addAttachmentByUrl(
    lessonId: number,
    data: { fileName: string; fileUrl: string }
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('fileName', data.fileName);
      formData.append('fileUrl', data.fileUrl);
      await apiClient.post(`/api/lessons/${lessonId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (err) {
      console.warn(`[AttachmentApi] Add attachment error:`, err);
    }
  },

  async deleteAttachment(lessonId: number, attachmentId: number): Promise<void> {
    await apiClient.delete(`/api/lessons/${lessonId}/attachments/${attachmentId}`);
  },
};
