import type { TtsSynthesizeResponse } from '../types/catalog.types';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
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

export const ttsApi = {
  /**
   * Tạo tệp âm thanh đọc tự động bằng trí tuệ nhân tạo (Edge-TTS)
   */
  async synthesizeSpeech(text: string, voiceName: string = 'vi-VN-HoaiMyNeural'): Promise<TtsSynthesizeResponse> {
    const res = await fetch('/api/media/tts/test', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text,
        voiceName,
      }),
    });
    return handleResponse<TtsSynthesizeResponse>(res);
  },

  /**
   * Tổng hợp giọng đọc AI cho kịch bản bài học NarrationScript
   */
  async synthesizeNarrationScript(scriptId: number): Promise<{ message: string; scriptId: number; fileName: string; audioUrl: string }> {
    const res = await fetch(`/api/media/tts/narration/${scriptId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; scriptId: number; fileName: string; audioUrl: string }>(res);
  },
};
