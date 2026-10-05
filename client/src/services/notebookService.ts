import type {
  Notebook,
  NotebookSource,
  NotebookStatus,
  PodcastEpisode,
  EpisodeProfile,
  SearchResult,
} from '../types/notebook.types';

const AZURE_NOTEBOOK_URL = (import.meta.env.VITE_OPEN_NOTEBOOK_API_URL || 'https://open-notebook-ai.wittydesert-f9ca7f08.eastasia.azurecontainerapps.io').replace(/\/$/, '');
const API_BASE = '/notebook-api';
const DIRECT_API_BASE = `${AZURE_NOTEBOOK_URL}/api`;
const LOCAL_FALLBACK_BASE = 'http://localhost:5055/api';
const WEB_STUDIO_URL = 'http://localhost:8502';

async function requestWithFallback(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 1. Thử gọi trực tiếp Cloud Azure Container App
  try {
    const res = await fetch(`${DIRECT_API_BASE}${endpoint}`, { ...options, headers });
    if (res.ok) return res;
  } catch {
    // tiếp tục fallback nếu cloud chưa phản hồi
  }

  // 2. Thử gọi qua Vite Proxy
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    if (res.ok) return res;
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      throw new Error(`Proxy status: ${res.status}`);
    }
    return res;
  } catch {
    // 3. Fallback về Local Docker
    return fetch(`${LOCAL_FALLBACK_BASE}${endpoint}`, { ...options, headers });
  }
}

export const notebookService = {
  getWebStudioUrl(): string {
    return WEB_STUDIO_URL;
  },

  /**
   * Kiểm tra xem Open Notebook Docker container có đang hoạt động không (Cloud hoặc Local)
   */
  async checkStatus(): Promise<NotebookStatus> {
    try {
      const res = await requestWithFallback('/config', { method: 'GET' });
      if (res.ok) {
        return {
          isOnline: true,
          apiUrl: AZURE_NOTEBOOK_URL,
          webUrl: WEB_STUDIO_URL,
          modelName: 'AI Cloud (Azure Container Apps)',
        };
      }
      return {
        isOnline: false,
        apiUrl: AZURE_NOTEBOOK_URL,
        webUrl: WEB_STUDIO_URL,
        modelName: 'Chưa kết nối',
      };
    } catch {
      return {
        isOnline: false,
        apiUrl: AZURE_NOTEBOOK_URL,
        webUrl: WEB_STUDIO_URL,
        modelName: 'Ngoại tuyến (Offline)',
      };
    }
  },

  // =========================================================================
  // 1. CHỨC NĂNG NOTEBOOKS (SỔ TAY)
  // =========================================================================

  async getNotebooks(): Promise<Notebook[]> {
    const res = await requestWithFallback('/notebooks', { method: 'GET' });
    if (!res.ok) throw new Error(`Không thể lấy danh sách Notebook (Mã lỗi: ${res.status})`);
    return res.json();
  },

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

  async deleteNotebook(notebookId: string): Promise<void> {
    const res = await requestWithFallback(`/notebooks/${notebookId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Xóa Notebook thất bại');
  },

  async getSourcesByNotebook(notebookId: string): Promise<NotebookSource[]> {
    const res = await requestWithFallback(`/sources?notebook_id=${encodeURIComponent(notebookId)}`, { method: 'GET' });
    if (!res.ok) throw new Error('Không thể lấy danh sách tài liệu của Sổ tay');
    return res.json();
  },

  async addSourceToNotebook(notebookId: string, sourceId: string): Promise<void> {
    const res = await requestWithFallback(`/notebooks/${notebookId}/sources/${sourceId}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể thêm tài liệu vào Sổ tay');
    }
  },

  async removeSourceFromNotebook(notebookId: string, sourceId: string): Promise<void> {
    const res = await requestWithFallback(`/notebooks/${notebookId}/sources/${sourceId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể gỡ tài liệu khỏi Sổ tay');
    }
  },

  async getNotebookDetail(notebookId: string): Promise<{ notebook: Notebook; sources: NotebookSource[] }> {
    const [nbRes, sources] = await Promise.all([
      requestWithFallback(`/notebooks/${notebookId}`, { method: 'GET' }),
      this.getSourcesByNotebook(notebookId).catch(() => [] as NotebookSource[]),
    ]);
    if (!nbRes.ok) throw new Error('Không thể tải chi tiết Notebook');
    const notebook = await nbRes.json();
    return {
      notebook,
      sources,
    };
  },

  // =========================================================================
  // 2. CHỨC NĂNG SOURCES (NGUỒN TÀI LIỆU & BÀI HỌC)
  // =========================================================================

  async getAllSources(): Promise<NotebookSource[]> {
    const res = await requestWithFallback('/sources', { method: 'GET' });
    if (!res.ok) throw new Error('Không thể lấy danh sách tài liệu');
    return res.json();
  },

  async getSourceDetail(sourceId: string): Promise<NotebookSource> {
    const res = await requestWithFallback(`/sources/${sourceId}`, { method: 'GET' });
    if (!res.ok) throw new Error('Không thể lấy chi tiết tài liệu');
    return res.json();
  },

  async deleteSource(sourceId: string): Promise<void> {
    const res = await requestWithFallback(`/sources/${sourceId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Xóa tài liệu thất bại');
  },

  async addLessonSource(
    notebookId: string | undefined,
    title: string,
    content: string
  ): Promise<NotebookSource> {
    const body: Record<string, unknown> = {
      type: 'text',
      title,
      content,
      embed: true,
    };
    if (notebookId) {
      body.notebook_id = notebookId;
    }
    const res = await requestWithFallback('/sources/json', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể nạp bài giảng vào Notebook');
    }
    return res.json();
  },

  /**
   * Tải file tài liệu lên Open Notebook (PDF, DOCX, TXT, MD...)
   */
  async uploadSourceFile(
    file: File,
    notebookId?: string,
    title?: string
  ): Promise<NotebookSource> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'upload');
    formData.append('embed', 'true');
    if (notebookId) {
      formData.append('notebook_id', notebookId);
    }
    if (title) {
      formData.append('title', title);
    }

    try {
      const res = await fetch(`${API_BASE}/sources`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) return res.json();
      if (res.status === 404 || res.status === 502) {
        throw new Error(`Proxy error ${res.status}`);
      }
      const err = await res.text();
      throw new Error(err || 'Tải file lên thất bại');
    } catch {
      const directRes = await fetch(`${DIRECT_API_BASE}/sources`, {
        method: 'POST',
        body: formData,
      });
      if (!directRes.ok) {
        const err = await directRes.text();
        throw new Error(err || 'Tải file lên thất bại');
      }
      return directRes.json();
    }
  },

  // =========================================================================
  // 3. CHỨC NĂNG ASK & SEARCH (HỎI ĐÁP & TÌM KIẾM NGỮ NGHĨA RAG)
  // =========================================================================

  async searchKnowledgeBase(
    query: string,
    type: 'text' | 'vector' = 'text',
    notebookIds?: string[]
  ): Promise<SearchResult[]> {
    const res = await requestWithFallback('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        type,
        scope_notebook_ids: notebookIds && notebookIds.length > 0 ? notebookIds : undefined,
      }),
    });

    if (!res.ok) throw new Error('Tìm kiếm tài liệu thất bại');
    const data = await res.json();
    return data.results || [];
  },

  async askQuestion(notebookId: string, question: string): Promise<string> {
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
        throw new Error('Tần suất gọi AI đang quá nhanh. Vui lòng đợi vài giây rồi thử lại nhé!');
      }
      throw new Error(err || 'AI gặp trục trặc khi tạo câu trả lời');
    }

    const chatData = await chatRes.json();
    const assistantMsg = chatData.messages?.find((m: { type: string; content: string }) => m.type === 'ai');
    return assistantMsg?.content || 'Đã xử lý xong câu hỏi của bạn.';
  },

  // =========================================================================
  // 4. CHỨC NĂNG PODCASTS (TẠO & PHÁT PODCAST ÂM THANH BÀI GIẢNG)
  // =========================================================================

  async getPodcastEpisodes(): Promise<PodcastEpisode[]> {
    const res = await requestWithFallback('/podcasts/episodes', { method: 'GET' });
    if (!res.ok) throw new Error('Không thể lấy danh sách Podcasts');
    return res.json();
  },

  async getEpisodeProfiles(): Promise<EpisodeProfile[]> {
    const res = await requestWithFallback('/episode-profiles', { method: 'GET' });
    if (!res.ok) throw new Error('Không thể lấy danh mục hồ sơ Podcast');
    return res.json();
  },

  async generatePodcast(
    episodeName: string,
    episodeProfile: string,
    speakerProfile: string,
    notebookId?: string,
    content?: string
  ): Promise<{ job_id: string; message: string }> {
    const res = await requestWithFallback('/podcasts/generate', {
      method: 'POST',
      body: JSON.stringify({
        episode_name: episodeName,
        episode_profile: episodeProfile,
        speaker_profile: speakerProfile,
        notebook_id: notebookId,
        content: content,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Không thể tạo Podcast bài học');
    }
    return res.json();
  },

  getPodcastAudioUrl(episodeId: string): string {
    return `/notebook-api/podcasts/episodes/${episodeId}/audio`;
  },
};
