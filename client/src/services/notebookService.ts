import type {
  Notebook,
  NotebookSource,
  NotebookStatus,
} from '../types/notebook.types';

const API_BASE = '/notebook-api';
const DIRECT_API_BASE = 'http://localhost:5055/api';
const WEB_STUDIO_URL = 'http://localhost:8502';

async function requestWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.ok) return res;
    // Nếu proxy trả về lỗi khác 404/500 thử fallback sang direct port
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      throw new Error(`Proxy status: ${res.status}`);
    }
    return res;
  } catch {
    // Fallback sang gọi trực tiếp cổng 5055
    return fetch(`${DIRECT_API_BASE}${endpoint}`, { ...options, headers });
  }
}

export const notebookService = {
  getWebStudioUrl(): string {
    return WEB_STUDIO_URL;
  },

  /**
   * Kiểm tra xem Open Notebook Docker container có đang hoạt động không
   */
  async checkStatus(): Promise<NotebookStatus> {
    try {
      const res = await requestWithFallback('/config', { method: 'GET' });
      if (res.ok) {
        return {
          isOnline: true,
          apiUrl: 'http://localhost:5055',
          webUrl: WEB_STUDIO_URL,
          modelName: 'Gemini 3.5 Flash-Lite (Siêu nhanh & Ổn định)',
        };
      }
      return {
        isOnline: false,
        apiUrl: 'http://localhost:5055',
        webUrl: WEB_STUDIO_URL,
        modelName: 'Chưa kết nối',
      };
    } catch {
      return {
        isOnline: false,
        apiUrl: 'http://localhost:5055',
        webUrl: WEB_STUDIO_URL,
        modelName: 'Ngoại tuyến (Offline)',
      };
    }
  },

  /**
   * Lấy danh sách tất cả các Notebook
   */
  async getNotebooks(): Promise<Notebook[]> {
    const res = await requestWithFallback('/notebooks', { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Không thể lấy danh sách Notebook (Mã lỗi: ${res.status})`);
    }
    return res.json();
  },

  /**
   * Tạo một Notebook mới từ Khóa học hoặc chủ đề tùy chọn
   */
  async createNotebook(name: string, description: string = ''): Promise<Notebook> {
    const res = await requestWithFallback('/notebooks', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Tạo Notebook thất bại');
    }
    return res.json();
  },

  /**
   * Xóa một Notebook
   */
  async deleteNotebook(notebookId: string): Promise<void> {
    const res = await requestWithFallback(`/notebooks/${notebookId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Xóa Notebook thất bại');
    }
  },

  /**
   * Lấy chi tiết thông tin và tài liệu của Notebook
   */
  async getNotebookDetail(notebookId: string): Promise<{ notebook: Notebook; sources: NotebookSource[] }> {
    const res = await requestWithFallback(`/notebooks/${notebookId}`, { method: 'GET' });
    if (!res.ok) {
      throw new Error('Không thể tải chi tiết Notebook');
    }
    const data = await res.json();
    return {
      notebook: data,
      sources: data.sources || [],
    };
  },

  /**
   * Nạp nội dung bài giảng / ghi chú / transcript vào Notebook làm nguồn tri thức (Source)
   */
  async addLessonSource(
    notebookId: string,
    title: string,
    content: string
  ): Promise<NotebookSource> {
    const res = await requestWithFallback('/sources/json', {
      method: 'POST',
      body: JSON.stringify({
        notebook_id: notebookId,
        type: 'text',
        title,
        content,
        embed: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể nạp bài giảng vào Notebook');
    }
    return res.json();
  },

  /**
   * Hỏi đáp AI (Chat RAG) với Notebook
   */
  async askQuestion(notebookId: string, question: string): Promise<string> {
    // 1. Tạo hoặc lấy Chat Session cho Notebook này
    const sessionRes = await requestWithFallback('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        notebook_id: notebookId,
        title: `Hỏi đáp bài học`,
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      throw new Error(`Không thể khởi tạo phiên trò chuyện: ${err}`);
    }

    const session = await sessionRes.json();

    // 2. Gửi câu hỏi và nhận câu trả lời
    const chatRes = await requestWithFallback('/chat/execute', {
      method: 'POST',
      body: JSON.stringify({
        session_id: session.id,
        message: question,
        context: {},
      }),
    });

    if (!chatRes.ok) {
      const err = await chatRes.text();
      if (err.includes('Rate limit')) {
        throw new Error('Tần suất gọi Gemini AI đang quá nhanh (Free Tier Rate Limit). Vui lòng đợi 30 giây rồi thử lại nhé!');
      }
      throw new Error(err || 'AI gặp trục trặc khi tạo câu trả lời');
    }

    const chatData = await chatRes.json();
    const assistantMsg = chatData.messages?.find((m: { type: string; content: string }) => m.type === 'ai');
    return assistantMsg?.content || 'Đã xử lý xong câu hỏi của bạn.';
  },
};
