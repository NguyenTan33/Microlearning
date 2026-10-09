import { apiClient } from './apiClient';

export interface TtsResponse {
  audioUrl: string;
  message?: string;
}

export const ttsApi = {
  async synthesizeSpeech(text: string, voiceName: string = 'vi-VN-HoaiMyNeural'): Promise<TtsResponse> {
    try {
      const res = await apiClient.post<TtsResponse>('/api/media/tts/test', {
        text,
        voiceName,
      });
      return res.data;
    } catch {
      return {
        audioUrl: '',
        message: 'Không thể tổng hợp giọng đọc AI.',
      };
    }
  },
};
