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

  async uploadAttachmentFile(
    lessonId: number,
    file: { uri: string; name: string; type?: string }
  ): Promise<LessonAttachment> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/pdf',
    } as unknown as Blob);

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
