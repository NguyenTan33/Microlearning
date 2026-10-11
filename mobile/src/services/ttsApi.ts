import { apiClient } from './apiClient';
import { API_BASE_URL } from '../utils/constants';

export interface TtsResponse {
  audioUrl: string;
  message?: string;
}

export const ttsApi = {
  async synthesizeSpeech(text: string, voiceName: string = 'vi-VN-HoaiMyNeural'): Promise<TtsResponse> {
    try {
      const res = await apiClient.post<TtsResponse>('/api/media/tts/test', {
        Text: text,
        VoiceName: voiceName,
      });

      let rawUrl = res.data?.audioUrl || '';
      if (rawUrl) {
        // Nếu backend trả về URL chứa localhost hoặc cổng 5124, map lại sang API_BASE_URL (Azure Cloud)
        if (rawUrl.startsWith('http://localhost') || rawUrl.startsWith('http://127.0.0.1')) {
          const pathOnly = rawUrl.replace(/^http:\/\/[^/]+/, '');
          rawUrl = `${API_BASE_URL}${pathOnly}`;
        } else if (rawUrl.startsWith('/')) {
          rawUrl = `${API_BASE_URL}${rawUrl}`;
        }
      }

      return {
        ...res.data,
        audioUrl: rawUrl,
      };
    } catch {
      return {
        audioUrl: '',
        message: 'Không thể tổng hợp giọng đọc AI.',
      };
    }
  },
};
