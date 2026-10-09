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

  async deleteAttachment(lessonId: number, attachmentId: number): Promise<void> {
    await apiClient.delete(`/api/lessons/${lessonId}/attachments/${attachmentId}`);
  },
};
