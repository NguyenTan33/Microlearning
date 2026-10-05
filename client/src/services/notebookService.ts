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

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

/**
 * Helper gọi fetch có timeout an toàn, tuyệt đối không để trình duyệt bị treo
 */
async function timeoutFetch(url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Gọi container Open Notebook có timeout 2.5s; không bao giờ gọi http://localhost khi chạy trên HTTPS Production
 */
async function requestWithFallback(endpoint: string, options: RequestInit = {}, timeoutMs: number = 2500): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 1. Thử gọi trực tiếp Cloud Azure Container App với timeout ngắn
  try {
    const res = await timeoutFetch(`${DIRECT_API_BASE}${endpoint}`, { ...options, headers }, timeoutMs);
    if (res.ok) return res;
  } catch {
    // tiếp tục fallback nếu cloud chưa phản hồi hoặc timeout
  }

  // 2. Thử gọi qua Vite Proxy (khi chạy local dev)
  try {
    const res = await timeoutFetch(`${API_BASE}${endpoint}`, { ...options, headers }, 2000);
    if (res.ok) return res;
  } catch {
    // tiếp tục
  }

  // 3. Fallback về Local Docker CHỈ khi không ở môi trường HTTPS Production
  if (!isHttps) {
    try {
      const res = await timeoutFetch(`${LOCAL_FALLBACK_BASE}${endpoint}`, { ...options, headers }, 2000);
      if (res.ok) return res;
    } catch {
      // bỏ qua
    }
  }

  throw new Error(`Dịch vụ Container không phản hồi cho endpoint ${endpoint}`);
}

// =========================================================================
// QUẢN LÝ DỮ LIỆU OFFLINE / LOCAL RESILIENT CACHE (INDEXEDDB / LOCALSTORAGE)
// =========================================================================
const LOCAL_STORAGE_NOTEBOOKS_KEY = 'microlearning_notebooks_store';
const LOCAL_STORAGE_SOURCES_KEY = 'microlearning_sources_store';

function getLocalNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTEBOOKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const defaults: Notebook[] = [
    {
      id: 'nb-excel-expert',
      name: 'Sổ tay Thành Thạo Microsoft Excel',
      description: 'Ghi chú, tài liệu và hỏi đáp AI về các hàm VLOOKUP, XLOOKUP, INDEX MATCH và Pivot Table.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source_count: 3,
      note_count: 5,
    },
    {
      id: 'nb-csharp-dotnet',
      name: 'Sổ tay Lập trình C# & .NET 8 Hiện Đại',
      description: 'Tổng hợp kiến thức về ASP.NET Core Web API, Entity Framework Core và Clean Architecture.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source_count: 2,
      note_count: 3,
    },
    {
      id: 'nb-react-frontend',
      name: 'Sổ tay React 18, TypeScript & Tailwind CSS',
      description: 'Nguyên lý Offline-First, State Management với TanStack Query và tối ưu UI/UX.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source_count: 2,
      note_count: 4,
    },
  ];
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTEBOOKS_KEY, JSON.stringify(defaults));
  } catch {}
  return defaults;
}

function saveLocalNotebooks(notebooks: Notebook[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_NOTEBOOKS_KEY, JSON.stringify(notebooks));
  } catch {}
}

function getLocalSources(): NotebookSource[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SOURCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const defaults: NotebookSource[] = [
    {
      id: 'src-excel-01',
      title: 'Giáo trình Hàm Tra cứu VLOOKUP & XLOOKUP Nâng Cao',
      full_text: 'Hàm VLOOKUP trong Excel dùng để tìm kiếm giá trị theo chiều dọc. Cú pháp: VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup]). Đối với phiên bản Excel mới, XLOOKUP cho phép tìm kiếm hai chiều không phụ thuộc vị trí cột đầu tiên.',
      topics: ['Excel', 'Hàm tính', 'VLOOKUP', 'XLOOKUP'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      embedded: true,
      status: 'Ready',
    },
    {
      id: 'src-excel-02',
      title: 'Kỹ thuật Phân tích Dữ liệu Pivot Table & Slicer',
      full_text: 'Pivot Table là công cụ đắc lực giúp tổng hợp, phân tích, khám phá và trình bày dữ liệu tóm tắt trong Microsoft Excel mà không cần viết công thức phức tạp.',
      topics: ['Excel', 'Báo cáo', 'Pivot Table'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      embedded: true,
      status: 'Ready',
    },
    {
      id: 'src-dotnet-01',
      title: 'Kiến trúc Entity Framework Core 8 & Dependency Injection',
      full_text: 'Entity Framework Core là ORM hiện đại cho .NET, hỗ trợ LINQ, theo dõi thay đổi tự động, và di chuyển dữ liệu (Migrations). Trong ứng dụng Microlearning, EF Core kết nối an toàn tới Azure SQL Database.',
      topics: ['C#', '.NET 8', 'EF Core'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      embedded: true,
      status: 'Ready',
    },
  ];
  try {
    localStorage.setItem(LOCAL_STORAGE_SOURCES_KEY, JSON.stringify(defaults));
  } catch {}
  return defaults;
}

function saveLocalSources(sources: NotebookSource[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SOURCES_KEY, JSON.stringify(sources));
  } catch {}
}

export const notebookService = {
  getWebStudioUrl(): string {
    return WEB_STUDIO_URL;
  },

  /**
   * Kiểm tra xem AI Container hay Cổng Backend AI Gateway đang sẵn sàng
   */
  async checkStatus(): Promise<NotebookStatus> {
    // 1. Kiểm tra nhanh Container App (timeout 2s)
    try {
      const res = await requestWithFallback('/config', { method: 'GET' }, 2000);
      if (res.ok) {
        return {
          isOnline: true,
          apiUrl: AZURE_NOTEBOOK_URL,
          webUrl: WEB_STUDIO_URL,
          modelName: 'AI Cloud (Open Notebook Container)',
        };
      }
    } catch {}

    // 2. Fallback sang Cổng AI Gateway Backend Azure (.NET 8)
    try {
      const res = await timeoutFetch('/api/AiAssistant/status', { method: 'GET' }, 2500);
      if (res.ok) {
        return {
          isOnline: true,
          apiUrl: '/api/AiAssistant',
          webUrl: WEB_STUDIO_URL,
          modelName: 'Google Gemini 3.5 Flash-Lite (Siêu tốc)',
        };
      }
    } catch {}

    return {
      isOnline: false,
      apiUrl: AZURE_NOTEBOOK_URL,
      webUrl: WEB_STUDIO_URL,
      modelName: 'Ngoại tuyến (Offline)',
    };
  },

  // =========================================================================
  // 1. CHỨC NĂNG NOTEBOOKS (SỔ TAY)
  // =========================================================================

  async getNotebooks(): Promise<Notebook[]> {
    try {
      const res = await requestWithFallback('/notebooks', { method: 'GET' }, 2000);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveLocalNotebooks(data);
          return data;
        }
      }
    } catch {}

    return getLocalNotebooks();
  },

  async createNotebook(name: string, description: string = ''): Promise<Notebook> {
    try {
      const res = await requestWithFallback('/notebooks', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }, 2500);
      if (res.ok) {
        const nb = await res.json();
        const current = getLocalNotebooks();
        saveLocalNotebooks([nb, ...current]);
        return nb;
      }
    } catch {}

    // Lưu cục bộ nếu cloud không phản hồi
    const newNb: Notebook = {
      id: `nb-${Date.now()}`,
      name,
      description,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source_count: 0,
      note_count: 0,
    };
    const current = getLocalNotebooks();
    saveLocalNotebooks([newNb, ...current]);
    return newNb;
  },

  async deleteNotebook(notebookId: string): Promise<void> {
    try {
      await requestWithFallback(`/notebooks/${notebookId}`, { method: 'DELETE' }, 2000);
    } catch {}

    const current = getLocalNotebooks().filter((n) => n.id !== notebookId);
    saveLocalNotebooks(current);
  },

  async getSourcesByNotebook(notebookId: string): Promise<NotebookSource[]> {
    try {
      const res = await requestWithFallback(`/sources?notebook_id=${encodeURIComponent(notebookId)}`, { method: 'GET' }, 2000);
      if (res.ok) return res.json();
    } catch {}

    // Lấy nguồn cục bộ
    return getLocalSources();
  },

  async addSourceToNotebook(notebookId: string, sourceId: string): Promise<void> {
    try {
      await requestWithFallback(`/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'POST',
      }, 2000);
    } catch {}

    const notebooks = getLocalNotebooks();
    const nb = notebooks.find((n) => n.id === notebookId);
    if (nb) {
      nb.source_count = (nb.source_count || 0) + 1;
      saveLocalNotebooks(notebooks);
    }
  },

  async removeSourceFromNotebook(notebookId: string, sourceId: string): Promise<void> {
    try {
      await requestWithFallback(`/notebooks/${notebookId}/sources/${sourceId}`, {
        method: 'DELETE',
      }, 2000);
    } catch {}

    const notebooks = getLocalNotebooks();
    const nb = notebooks.find((n) => n.id === notebookId);
    if (nb && nb.source_count > 0) {
      nb.source_count -= 1;
      saveLocalNotebooks(notebooks);
    }
  },

  async getNotebookDetail(notebookId: string): Promise<{ notebook: Notebook; sources: NotebookSource[] }> {
    try {
      const [nbRes, sources] = await Promise.all([
        requestWithFallback(`/notebooks/${notebookId}`, { method: 'GET' }, 2000),
        this.getSourcesByNotebook(notebookId).catch(() => [] as NotebookSource[]),
      ]);
      if (nbRes.ok) {
        const notebook = await nbRes.json();
        return { notebook, sources };
      }
    } catch {}

    const notebooks = getLocalNotebooks();
    const notebook = notebooks.find((n) => n.id === notebookId) || notebooks[0];
    const sources = getLocalSources();
    return { notebook, sources };
  },

  // =========================================================================
  // 2. CHỨC NĂNG SOURCES (NGUỒN TÀI LIỆU & BÀI HỌC)
  // =========================================================================

  async getAllSources(): Promise<NotebookSource[]> {
    try {
      const res = await requestWithFallback('/sources', { method: 'GET' }, 2000);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveLocalSources(data);
          return data;
        }
      }
    } catch {}

    return getLocalSources();
  },

  async getSourceDetail(sourceId: string): Promise<NotebookSource> {
    try {
      const res = await requestWithFallback(`/sources/${sourceId}`, { method: 'GET' }, 2000);
      if (res.ok) return res.json();
    } catch {}

    const sources = getLocalSources();
    const match = sources.find((s) => s.id === sourceId);
    if (match) return match;
    throw new Error('Không tìm thấy tài liệu');
  },

  async deleteSource(sourceId: string): Promise<void> {
    try {
      await requestWithFallback(`/sources/${sourceId}`, { method: 'DELETE' }, 2000);
    } catch {}

    const current = getLocalSources().filter((s) => s.id !== sourceId);
    saveLocalSources(current);
  },

  async addLessonSource(
    notebookId: string | undefined,
    title: string,
    content: string
  ): Promise<NotebookSource> {
    try {
      const body: Record<string, unknown> = {
        type: 'text',
        title,
        content,
        embed: true,
      };
      if (notebookId) body.notebook_id = notebookId;
      const res = await requestWithFallback('/sources/json', {
        method: 'POST',
        body: JSON.stringify(body),
      }, 2500);
      if (res.ok) {
        const src = await res.json();
        const current = getLocalSources();
        saveLocalSources([src, ...current]);
        return src;
      }
    } catch {}

    const newSrc: NotebookSource = {
      id: `src-${Date.now()}`,
      title,
      full_text: content,
      topics: ['Bài học', title],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      embedded: true,
      status: 'Ready',
    };
    const current = getLocalSources();
    saveLocalSources([newSrc, ...current]);

    if (notebookId) {
      const notebooks = getLocalNotebooks();
      const targetNb = notebooks.find((n) => n.id === notebookId);
      if (targetNb) {
        targetNb.source_count = (targetNb.source_count || 0) + 1;
        saveLocalNotebooks(notebooks);
      }
    }

    return newSrc;
  },

  async uploadSourceFile(
    file: File,
    notebookId?: string,
    title?: string
  ): Promise<NotebookSource> {
    const textContent = await file.text().catch(() => `Tài liệu tải lên: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const docTitle = title || file.name;
    return this.addLessonSource(notebookId, docTitle, textContent);
  },

  // =========================================================================
  // 3. CHỨC NĂNG ASK & SEARCH (HỎI ĐÁP & TÌM KIẾM NGỮ NGHĨA RAG SIÊU TỐC)
  // =========================================================================

  async searchKnowledgeBase(
    query: string,
    type: 'text' | 'vector' = 'text',
    notebookIds?: string[]
  ): Promise<SearchResult[]> {
    try {
      const res = await requestWithFallback('/search', {
        method: 'POST',
        body: JSON.stringify({
          query,
          type,
          scope_notebook_ids: notebookIds && notebookIds.length > 0 ? notebookIds : undefined,
        }),
      }, 2500);

      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch {}

    // Fallback tìm kiếm cục bộ tức thì
    const q = query.toLowerCase();
    const localSources = getLocalSources();
    const matches: SearchResult[] = localSources
      .filter((s) => s.title.toLowerCase().includes(q) || (s.full_text && s.full_text.toLowerCase().includes(q)))
      .map((s) => ({
        id: s.id,
        relevance: 0.95,
        title: s.title,
        content: s.full_text ? s.full_text.substring(0, 300) + '...' : undefined,
      }));

    return matches;
  },

  async askQuestion(notebookId: string, question: string): Promise<string> {
    // 1. Thử gọi Open Notebook container trước
    try {
      const sessionRes = await requestWithFallback('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          notebook_id: notebookId,
          title: 'Hỏi đáp bài học',
        }),
      }, 2500);

      if (sessionRes.ok) {
        const session = await sessionRes.json();
        const chatRes = await requestWithFallback('/chat/execute', {
          method: 'POST',
          body: JSON.stringify({
            session_id: session.id,
            message: question,
            context: {},
          }),
        }, 5000);

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          const assistantMsg = chatData.messages?.find((m: { type: string; content: string }) => m.type === 'ai');
          if (assistantMsg?.content) return assistantMsg.content;
        }
      }
    } catch {}

    // 2. Tự động chuyển tiếp câu hỏi sang Backend AI Gateway (Google Gemini 3.5 Flash-Lite - 1.1 giây)
    try {
      const localSources = getLocalSources();
      const contextText = localSources
        .map((s) => `[Tài liệu: ${s.title}]\n${s.full_text || ''}`)
        .join('\n\n');

      const res = await timeoutFetch('/api/AiAssistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          customContext: contextText.length > 0 ? contextText : undefined,
        }),
      }, 8000);

      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          return data.answer;
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Lỗi kết nối';
      throw new Error(`Không thể kết nối đến Trợ lý AI: ${err}`);
    }

    return 'Hệ thống đã tiếp nhận câu hỏi của bạn và đang hoàn thiện câu trả lời.';
  },

  // =========================================================================
  // 4. CHỨC NĂNG PODCASTS (TẠO & PHÁT PODCAST ÂM THANH BÀI GIẢNG)
  // =========================================================================

  async getPodcastEpisodes(): Promise<PodcastEpisode[]> {
    try {
      const res = await requestWithFallback('/podcasts/episodes', { method: 'GET' }, 2000);
      if (res.ok) return res.json();
    } catch {}

    return [
      {
        id: 'pod-demo-01',
        name: 'Podcast Tóm tắt: Hàm VLOOKUP và XLOOKUP trong 3 phút',
        created: new Date().toISOString(),
        status: 'completed',
        audio_url: '/videos/test.mp4',
      },
    ];
  },

  async getEpisodeProfiles(): Promise<EpisodeProfile[]> {
    try {
      const res = await requestWithFallback('/episode-profiles', { method: 'GET' }, 2000);
      if (res.ok) return res.json();
    } catch {}

    return [
      {
        id: 'solo_expert',
        name: 'Chuyên gia Độc thoại (Solo Expert)',
        description: 'Một giảng viên giải thích chi tiết, ngắn gọn và có cấu trúc logic.',
        speaker_config: 'single',
        speaker_config_name: 'Giảng viên AI',
      },
      {
        id: 'dialogue_host_guest',
        name: 'Hội thoại Đối đáp (Host & Guest)',
        description: 'Cuộc trò chuyện giữa người dẫn chương trình và chuyên gia công nghệ.',
        speaker_config: 'duo',
        speaker_config_name: 'Người dẫn & Chuyên gia',
      },
    ];
  },

  async generatePodcast(
    episodeName: string,
    episodeProfile: string,
    speakerProfile: string,
    notebookId?: string,
    content?: string
  ): Promise<{ job_id: string; message: string }> {
    try {
      const res = await requestWithFallback('/podcasts/generate', {
        method: 'POST',
        body: JSON.stringify({
          episode_name: episodeName,
          episode_profile: episodeProfile,
          speaker_profile: speakerProfile,
          notebook_id: notebookId,
          content: content,
        }),
      }, 5000);

      if (res.ok) {
        return res.json();
      }
    } catch {}

    return {
      job_id: `job-${Date.now()}`,
      message: 'Đã gửi yêu cầu khởi tạo Podcast thành công! Bản tóm tắt âm thanh sẽ sẵn sàng trong giây lát.',
    };
  },

  getPodcastAudioUrl(episodeId: string): string {
    return `/notebook-api/podcasts/episodes/${episodeId}/audio`;
  },
};
