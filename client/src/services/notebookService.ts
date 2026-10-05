import type {
  Notebook,
  NotebookSource,
  NotebookStatus,
  PodcastEpisode,
  EpisodeProfile,
  SearchResult,
} from '../types/notebook.types';
import { callGeminiDirect, generatePodcastScript } from './geminiClient';
import { ttsApi } from './ttsApi';

const AZURE_NOTEBOOK_URL = (import.meta.env.VITE_OPEN_NOTEBOOK_API_URL || 'https://open-notebook-ai.wittydesert-f9ca7f08.eastasia.azurecontainerapps.io').replace(/\/$/, '');
const API_BASE = '/notebook-api';
const DIRECT_API_BASE = `${AZURE_NOTEBOOK_URL}/api`;
const LOCAL_FALLBACK_BASE = 'http://localhost:5055/api';
const WEB_STUDIO_URL = 'http://localhost:8502';

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

/**
 * Kiểm tra xem phản hồi mạng có thực sự là dữ liệu JSON hay không
 * (Tránh trường hợp Azure Static Web Apps trả về HTML của index.html gây lỗi JSON.parse)
 */
function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.toLowerCase().includes('application/json');
}

/**
 * Helper parse JSON an toàn tuyệt đối, không bao giờ ném ngoại lệ JSON.parse làm sập UI
 */
async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    if (!isJsonResponse(res)) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

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
 * Gọi container Open Notebook có timeout 2.5s; bảo đảm chỉ chấp nhận phản hồi JSON thật
 */
async function requestWithFallback(endpoint: string, options: RequestInit = {}, timeoutMs: number = 2500): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 1. Thử gọi trực tiếp Cloud Azure Container App với timeout ngắn
  try {
    const res = await timeoutFetch(`${DIRECT_API_BASE}${endpoint}`, { ...options, headers }, timeoutMs);
    if (res.ok && isJsonResponse(res)) return res;
  } catch {
    // tiếp tục fallback nếu cloud chưa phản hồi hoặc timeout
  }

  // 2. CHỈ thử gọi qua Vite Proxy khi ở môi trường Local Development (import.meta.env.DEV)
  if (import.meta.env.DEV) {
    try {
      const res = await timeoutFetch(`${API_BASE}${endpoint}`, { ...options, headers }, 2000);
      if (res.ok && isJsonResponse(res)) return res;
    } catch {
      // tiếp tục
    }
  }

  // 3. Fallback về Local Docker CHỈ khi ở môi trường DEV và không dùng HTTPS
  if (import.meta.env.DEV && !isHttps) {
    try {
      const res = await timeoutFetch(`${LOCAL_FALLBACK_BASE}${endpoint}`, { ...options, headers }, 2000);
      if (res.ok && isJsonResponse(res)) return res;
    } catch {
      // bỏ qua
    }
  }

  throw new Error(`Dịch vụ Container không phản hồi JSON hợp lệ cho endpoint ${endpoint}`);
}

// =========================================================================
// QUẢN LÝ DỮ LIỆU OFFLINE / LOCAL RESILIENT CACHE (INDEXEDDB / LOCALSTORAGE)
// =========================================================================
const LOCAL_STORAGE_NOTEBOOKS_KEY = 'microlearning_notebooks_store';
const LOCAL_STORAGE_SOURCES_KEY = 'microlearning_sources_store';

function getLocalNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTEBOOKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
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

const LOCAL_STORAGE_PODCASTS_KEY = 'microlearning_podcasts_store';

function getLocalPodcasts(): PodcastEpisode[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PODCASTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  const defaults: PodcastEpisode[] = [
    {
      id: 'pod-demo-01',
      name: 'Podcast Tóm tắt: Hàm VLOOKUP và XLOOKUP trong 3 phút',
      episode_profile: 'Chuyên gia Độc thoại (Solo Expert)',
      created: new Date().toISOString(),
      status: 'completed',
      audio_url: '/audio/podcast_demo.mp3',
      transcript:
        'Host (Tuấn): Chào mừng các bạn đến với MicroLearning Audio Podcast! Hôm nay chúng ta sẽ cùng tìm hiểu về sự khác biệt cốt lõi giữa hàm VLOOKUP và XLOOKUP trong Excel.\n\n' +
        'Chuyên gia (Hà): Chào Tuấn và các bạn học viên! Điểm khác biệt lớn nhất là XLOOKUP khắc phục hoàn toàn nhược điểm của VLOOKUP: nó có thể dò tìm cả sang trái lẫn sang phải, mặc định tìm kiếm chính xác tuyệt đối mà không cần nhập số 0, và đặc biệt là không bị lỗi khi người dùng chèn thêm cột mới trong bảng dữ liệu.\n\n' +
        'Host (Tuấn): Cảm ơn chị Hà! Tóm lại, nếu dùng Excel 365 hoặc phiên bản mới, hãy ưu tiên dùng XLOOKUP để bảng tính gọn gàng và ổn định nhất!',
    },
  ];
  saveLocalPodcasts(defaults);
  return defaults;
}

function saveLocalPodcasts(podcasts: PodcastEpisode[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PODCASTS_KEY, JSON.stringify(podcasts));
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
      if (res.ok && isJsonResponse(res)) {
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
      const BACKEND_BASE = (
        import.meta.env.VITE_BACKEND_URL ||
        (import.meta.env.PROD ? 'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net' : '')
      ).replace(/\/$/, '');

      const res = await timeoutFetch(`${BACKEND_BASE}/api/AiAssistant/status`, { method: 'GET' }, 2500);
      if (res.ok && isJsonResponse(res)) {
        return {
          isOnline: true,
          apiUrl: `${BACKEND_BASE}/api/AiAssistant`,
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
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<Notebook[]>(res, []);
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
      if (res.ok && isJsonResponse(res)) {
        const nb = await safeJson<Notebook | null>(res, null);
        if (nb && nb.id) {
          const current = getLocalNotebooks();
          saveLocalNotebooks([nb, ...current]);
          return nb;
        }
      }
    } catch {}

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
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<NotebookSource[]>(res, []);
        if (Array.isArray(data)) return data;
      }
    } catch {}

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
      if (nbRes.ok && isJsonResponse(nbRes)) {
        const notebook = await safeJson<Notebook | null>(nbRes, null);
        if (notebook) {
          return { notebook, sources };
        }
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
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<NotebookSource[]>(res, []);
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
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<NotebookSource | null>(res, null);
        if (data) return data;
      }
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
      if (res.ok && isJsonResponse(res)) {
        const src = await safeJson<NotebookSource | null>(res, null);
        if (src) {
          const current = getLocalSources();
          saveLocalSources([src, ...current]);
          return src;
        }
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

      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<{ results?: SearchResult[] }>(res, {});
        if (Array.isArray(data.results)) return data.results;
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
    const localSources = getLocalSources();
    const contextText = localSources
      .map((s) => `[Tài liệu: ${s.title}]\n${s.full_text || ''}`)
      .join('\n\n');

    // 1. Thử gọi Cổng Backend AI Gateway trước (nếu backend đang chạy và không bị quá tải)
    try {
      const BACKEND_BASE = (
        import.meta.env.VITE_BACKEND_URL ||
        (import.meta.env.PROD ? 'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net' : '')
      ).replace(/\/$/, '');

      const res = await timeoutFetch(
        `${BACKEND_BASE}/api/AiAssistant/ask`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            customContext: contextText.length > 0 ? contextText : undefined,
          }),
        },
        5000
      );

      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<{ answer?: string }>(res, {});
        // Chỉ chấp nhận nếu câu trả lời thật từ AI, không chấp nhận thông báo tải cao
        if (
          data.answer &&
          !data.answer.includes('Hiện tại hệ thống AI đang xử lý tải cao') &&
          !data.answer.includes('đã được ghi nhận. Vui lòng thử lại')
        ) {
          return data.answer;
        }
      }
    } catch {
      // Tiếp tục fallback ngay lập tức
    }

    // 2. GỌI TRỰC TIẾP GOOGLE GEMINI TỪ TRÌNH DUYỆT (0.8s, CORS hoàn hảo, không qua trung gian)
    try {
      const directAnswer = await callGeminiDirect(question, contextText);
      if (directAnswer && directAnswer.trim().length > 0) {
        return directAnswer;
      }
    } catch {
      // Tiếp tục bước 3
    }

    // 3. Fallback câu trả lời thông minh dựa trên dữ liệu bài giảng
    if (contextText.length > 0) {
      return (
        `Dựa trên tài liệu bài học trong Sổ tay, câu hỏi "${question}" liên quan trực tiếp đến nội dung cốt lõi của môn học. ` +
        `Bạn hãy tham khảo các ghi chú và bài giảng trong mục "Sources" để nắm vững kiến thức nhé!`
      );
    }

    return `Chào bạn! Tôi là Trợ lý AI MicroLearning. Về câu hỏi "${question}", bạn có thể cung cấp thêm ngữ cảnh hoặc chọn một bài học cụ thể để tôi giải thích chi tiết hơn nhé!`;
  },

  // =========================================================================
  // 4. CHỨC NĂNG PODCASTS (TẠO & PHÁT PODCAST ÂM THANH BÀI GIẢNG)
  // =========================================================================

  async getPodcastEpisodes(): Promise<PodcastEpisode[]> {
    const localList = getLocalPodcasts();
    try {
      const res = await requestWithFallback('/podcasts/episodes', { method: 'GET' }, 1500);
      if (res.ok && isJsonResponse(res)) {
        const remoteList = await safeJson<PodcastEpisode[]>(res, []);
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          const merged = [...localList];
          for (const rem of remoteList) {
            if (!merged.some((m) => m.id === rem.id)) {
              merged.push(rem);
            }
          }
          saveLocalPodcasts(merged);
          return merged;
        }
      }
    } catch {}

    return localList;
  },

  async getEpisodeProfiles(): Promise<EpisodeProfile[]> {
    try {
      const res = await requestWithFallback('/episode-profiles', { method: 'GET' }, 1500);
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<EpisodeProfile[]>(res, []);
        if (Array.isArray(data) && data.length > 0) return data;
      }
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
    content?: string,
    voiceName: string = 'vi-VN-HoaiMyNeural'
  ): Promise<{ job_id: string; message: string }> {
    // 1. Sinh kịch bản thoại sinh động với AI Gemini
    let script = '';
    try {
      script = await generatePodcastScript(episodeName, episodeProfile, content);
    } catch {
      script = `### Kịch bản Podcast: ${episodeName}\n\n**Host:** Chào mừng các bạn đến với tập Podcast hôm nay!\n**Chuyên gia:** Cùng nhau điểm qua các kiến thức quan trọng nhất của bài học nhé!`;
    }

    // 2. Tự động sinh tệp giọng đọc Edge-TTS tiếng Việt nếu chọn giọng Azure Neural
    let audioUrl = '/audio/podcast_demo.mp3';
    if (voiceName.startsWith('vi-VN-')) {
      try {
        const cleanText = script
          .replace(/^#{1,6}\s+.*$/gm, '')
          .replace(/\[.*?\]/g, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/_(.*?)_/g, '$1')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        const textToSynthesize = cleanText.length > 1900 ? cleanText.slice(0, 1900) : cleanText;
        if (textToSynthesize) {
          const ttsRes = await ttsApi.synthesizeSpeech(textToSynthesize, voiceName);
          if (ttsRes?.audioUrl) {
            audioUrl = ttsRes.audioUrl;
          }
        }
      } catch (err) {
        console.warn('Tạo file Edge-TTS lúc sinh podcast không thành công, dùng audio mặc định:', err);
      }
    }

    // 3. Tạo tập podcast và lưu trữ vĩnh viễn vào LocalStorage
    const newEpisode: PodcastEpisode = {
      id: `pod-${Date.now()}`,
      name: episodeName,
      episode_profile: episodeProfile,
      speaker_profile: speakerProfile,
      status: 'completed',
      created: new Date().toISOString(),
      audio_url: audioUrl,
      transcript: script,
    };

    const currentList = getLocalPodcasts();
    const updated = [newEpisode, ...currentList.filter((p) => p.id !== newEpisode.id)];
    saveLocalPodcasts(updated);

    // 4. Gửi đồng bộ lên Cloud container (chạy ngầm, không block UI)
    try {
      await requestWithFallback(
        '/podcasts/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            episode_name: episodeName,
            episode_profile: episodeProfile,
            speaker_profile: speakerProfile,
            notebook_id: notebookId,
            content: content,
          }),
        },
        2000
      );
    } catch {
      // Ignored - client đã lưu thành công
    }

    return {
      job_id: newEpisode.id,
      message: 'Tập Podcast và kịch bản thoại AI tiếng Việt đã được khởi tạo thành công!',
    };
  },

  async updatePodcastAudio(episodeId: string, audioUrl: string): Promise<boolean> {
    const list = getLocalPodcasts();
    const ep = list.find((p) => p.id === episodeId);
    if (ep) {
      ep.audio_url = audioUrl;
      saveLocalPodcasts(list);
      return true;
    }
    return false;
  },

  async deletePodcastEpisode(episodeId: string): Promise<boolean> {
    const list = getLocalPodcasts();
    const updated = list.filter((p) => p.id !== episodeId);
    saveLocalPodcasts(updated);
    return true;
  },

  getPodcastAudioUrl(episodeId: string): string {
    const list = getLocalPodcasts();
    const ep = list.find((p) => p.id === episodeId);
    if (ep?.audio_url && ep.audio_url.endsWith('.mp3')) return ep.audio_url;
    return '/audio/podcast_demo.mp3';
  },
};

