import type {
  Notebook,
  NotebookSource,
  NotebookStatus,
  PodcastEpisode,
  EpisodeProfile,
  SearchResult,
} from '../types/notebook.types';
import type { Course, Lesson } from '../types/catalog.types';
import { callGeminiDirect, generatePodcastScript } from './geminiClient';
import { ttsApi } from './ttsApi';

// =========================================================================
// CONSTANTS & BASE URLs
// =========================================================================
const AZURE_NOTEBOOK_URL = (
  import.meta.env.VITE_OPEN_NOTEBOOK_API_URL ||
  'https://open-notebook-ai.wittydesert-f9ca7f08.eastasia.azurecontainerapps.io'
).replace(/\/$/, '');

const BACKEND_BASE = (
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD
    ? 'https://microlearning-backend-ezbafhfneja8gjfj.eastasia-01.azurewebsites.net'
    : '')
).replace(/\/$/, '');

const DIRECT_API_BASE = `${AZURE_NOTEBOOK_URL}/api`;
const LOCAL_FALLBACK_BASE = 'http://localhost:5055/api';

// =========================================================================
// STORAGE KEYS (Namespace riêng cho mỗi notebook/course)
// =========================================================================
const STORAGE_PREFIX = 'ml_nb_';
const PODCASTS_KEY = `${STORAGE_PREFIX}podcasts`;

// =========================================================================
// HTTP HELPERS
// =========================================================================

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.toLowerCase().includes('application/json');
}

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  try {
    if (!isJsonResponse(res)) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

async function timeoutFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Gọi Open Notebook Container có timeout - chỉ dùng cho features thật sự cần container
 */
async function requestNotebookApi(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 6000
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 1. Thử gọi trực tiếp Azure Container App
  try {
    const res = await timeoutFetch(
      `${DIRECT_API_BASE}${endpoint}`,
      { ...options, headers },
      timeoutMs
    );
    if (res.ok && isJsonResponse(res)) return res;
  } catch {
    // fallback
  }

  // 2. Thử qua Vite proxy khi dev
  if (import.meta.env.DEV) {
    try {
      const res = await timeoutFetch(
        `/notebook-api${endpoint}`,
        { ...options, headers },
        4000
      );
      if (res.ok && isJsonResponse(res)) return res;
    } catch {
      // fallback
    }

    // 3. Fallback localhost Docker khi dev
    try {
      const res = await timeoutFetch(
        `${LOCAL_FALLBACK_BASE}${endpoint}`,
        { ...options, headers },
        3000
      );
      if (res.ok && isJsonResponse(res)) return res;
    } catch {
      // ignore
    }
  }

  throw new Error(`Notebook Container không phản hồi: ${endpoint}`);
}

// =========================================================================
// LOCAL STORAGE HELPERS - CHỈ DÙNG CHO PODCASTS VÀ NOTEBOOKS META
// KHÔNG còn dùng dummy data mặc định
// =========================================================================

function getLocalNotebooks(): Notebook[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}notebooks`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalNotebooks(notebooks: Notebook[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}notebooks`, JSON.stringify(notebooks));
  } catch {}
}

/** Lưu sources của notebook cụ thể vào local cache */
function getLocalSourcesByNotebook(notebookId: string): NotebookSource[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}src_${notebookId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalSourcesByNotebook(notebookId: string, sources: NotebookSource[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}src_${notebookId}`, JSON.stringify(sources));
  } catch {}
}

function getAllLocalSources(): NotebookSource[] {
  const notebooks = getLocalNotebooks();
  const all: NotebookSource[] = [];
  const seen = new Set<string>();
  for (const nb of notebooks) {
    const srcs = getLocalSourcesByNotebook(nb.id);
    for (const s of srcs) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        all.push(s);
      }
    }
  }
  return all;
}

function getLocalPodcasts(): PodcastEpisode[] {
  try {
    const raw = localStorage.getItem(PODCASTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalPodcasts(podcasts: PodcastEpisode[]): void {
  try {
    localStorage.setItem(PODCASTS_KEY, JSON.stringify(podcasts));
  } catch {}
}

// =========================================================================
// NOTEBOOK SERVICE - REBUILT
// =========================================================================

export const notebookService = {
  // =========================================================================
  // STATUS CHECK
  // =========================================================================

  async checkStatus(): Promise<NotebookStatus> {
    // 1. Kiểm tra Backend AI Gateway (.NET) trước - đây là nguồn chính
    try {
      const res = await timeoutFetch(
        `${BACKEND_BASE}/api/AiAssistant/status`,
        { method: 'GET', headers: getAuthHeaders() },
        4000
      );
      if (res.ok && isJsonResponse(res)) {
        return {
          isOnline: true,
          apiUrl: `${BACKEND_BASE}/api/AiAssistant`,
          webUrl: AZURE_NOTEBOOK_URL,
          modelName: 'Google Gemini 2.0 Flash (kết nối SQL thực tế)',
        };
      }
    } catch {}

    // 2. Kiểm tra Open Notebook Container
    try {
      const res = await timeoutFetch(
        `${DIRECT_API_BASE}/config`,
        { method: 'GET' },
        3000
      );
      if (res.ok) {
        return {
          isOnline: true,
          apiUrl: AZURE_NOTEBOOK_URL,
          webUrl: AZURE_NOTEBOOK_URL,
          modelName: 'Open Notebook AI Container',
        };
      }
    } catch {}

    // 3. Thử Gemini Direct để xác nhận có internet
    try {
      const testRes = await timeoutFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY || 'invalid'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }),
        },
        3000
      );
      // 400 = API key sai nhưng server online; 200 = hoạt động
      if (testRes.status !== 0) {
        return {
          isOnline: true,
          apiUrl: 'https://generativelanguage.googleapis.com',
          webUrl: AZURE_NOTEBOOK_URL,
          modelName: 'Google Gemini Direct (không qua backend)',
        };
      }
    } catch {}

    return {
      isOnline: false,
      apiUrl: BACKEND_BASE,
      webUrl: AZURE_NOTEBOOK_URL,
      modelName: 'Ngoại tuyến (Offline)',
    };
  },

  // =========================================================================
  // NOTEBOOKS MANAGEMENT
  // =========================================================================

  async getNotebooks(): Promise<Notebook[]> {
    // 1. Lấy từ Open Notebook Container
    try {
      const res = await requestNotebookApi('/notebooks', { method: 'GET' }, 6000);
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<Notebook[]>(res, []);
        if (Array.isArray(data) && data.length > 0) {
          saveLocalNotebooks(data);
          return data;
        }
      }
    } catch {}

    // 2. Dùng local cache nếu container offline
    return getLocalNotebooks();
  },

  async createNotebook(name: string, description: string = ''): Promise<Notebook> {
    // 1. Tạo trên Container
    try {
      const res = await requestNotebookApi(
        '/notebooks',
        {
          method: 'POST',
          body: JSON.stringify({ name, description }),
        },
        6000
      );
      if (res.ok && isJsonResponse(res)) {
        const nb = await safeJson<Notebook | null>(res, null);
        if (nb && nb.id) {
          const current = getLocalNotebooks();
          saveLocalNotebooks([nb, ...current.filter((n) => n.id !== nb.id)]);
          return nb;
        }
      }
    } catch {}

    // 2. Tạo local khi container offline
    const newNb: Notebook = {
      id: `nb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      await requestNotebookApi(`/notebooks/${notebookId}`, { method: 'DELETE' }, 5000);
    } catch {}

    const current = getLocalNotebooks().filter((n) => n.id !== notebookId);
    saveLocalNotebooks(current);
    localStorage.removeItem(`${STORAGE_PREFIX}src_${notebookId}`);
  },

  async getNotebookDetail(
    notebookId: string
  ): Promise<{ notebook: Notebook; sources: NotebookSource[] }> {
    const [notebookRes, sources] = await Promise.allSettled([
      requestNotebookApi(`/notebooks/${notebookId}`, { method: 'GET' }, 6000).catch(() => null),
      this.getSourcesByNotebook(notebookId),
    ]);

    const localNotebooks = getLocalNotebooks();
    let notebook =
      localNotebooks.find((n) => n.id === notebookId) || localNotebooks[0];

    if (
      notebookRes.status === 'fulfilled' &&
      notebookRes.value &&
      isJsonResponse(notebookRes.value)
    ) {
      const nb = await safeJson<Notebook | null>(notebookRes.value, null);
      if (nb) notebook = nb;
    }

    const srcList =
      sources.status === 'fulfilled' ? sources.value : getLocalSourcesByNotebook(notebookId);

    return { notebook, sources: srcList };
  },

  // =========================================================================
  // SOURCES MANAGEMENT - KẾT NỐI SQL THỰC TẾ
  // =========================================================================

  async getAllSources(): Promise<NotebookSource[]> {
    try {
      const res = await requestNotebookApi('/sources', { method: 'GET' }, 6000);
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<NotebookSource[]>(res, []);
        if (Array.isArray(data) && data.length > 0) {
          // Cache theo notebook
          const notebooks = getLocalNotebooks();
          for (const nb of notebooks) {
            const nbSrcs = data.filter((s) =>
              (s as NotebookSource & { notebook_id?: string }).notebook_id === nb.id
            );
            if (nbSrcs.length > 0) {
              saveLocalSourcesByNotebook(nb.id, nbSrcs);
            }
          }
          return data;
        }
      }
    } catch {}
    return getAllLocalSources();
  },

  async getSourcesByNotebook(notebookId: string): Promise<NotebookSource[]> {
    try {
      const res = await requestNotebookApi(
        `/sources?notebook_id=${encodeURIComponent(notebookId)}`,
        { method: 'GET' },
        6000
      );
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<NotebookSource[]>(res, []);
        if (Array.isArray(data)) {
          saveLocalSourcesByNotebook(notebookId, data);
          return data;
        }
      }
    } catch {}
    return getLocalSourcesByNotebook(notebookId);
  },

  async getSourceDetail(sourceId: string): Promise<NotebookSource> {
    try {
      const res = await requestNotebookApi(`/sources/${sourceId}`, { method: 'GET' }, 6000);
      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<NotebookSource | null>(res, null);
        if (data) return data;
      }
    } catch {}
    const all = getAllLocalSources();
    const match = all.find((s) => s.id === sourceId);
    if (match) return match;
    throw new Error('Không tìm thấy tài liệu');
  },

  async deleteSource(sourceId: string): Promise<void> {
    try {
      await requestNotebookApi(`/sources/${sourceId}`, { method: 'DELETE' }, 5000);
    } catch {}
    const notebooks = getLocalNotebooks();
    for (const nb of notebooks) {
      const srcs = getLocalSourcesByNotebook(nb.id).filter((s) => s.id !== sourceId);
      saveLocalSourcesByNotebook(nb.id, srcs);
    }
  },

  /**
   * Nạp nội dung bài học THỰC TẾ từ SQL vào Notebook
   * QUAN TRỌNG: Phải truyền lesson/course object đầy đủ để AI có context thật
   */
  async addLessonSourceFromSql(
    notebookId: string | undefined,
    lesson: Lesson,
    course: Course,
    subjectTitle?: string
  ): Promise<NotebookSource> {
    const durationMin = Math.round((lesson.durationSeconds || 0) / 60);
    const lessonTitle = `[${course.title}] ${lesson.title}`;
    const lessonContent = [
      `KHÓA HỌC: ${course.title}`,
      course.description ? `Mô tả khóa học: ${course.description}` : '',
      `MÔN HỌC: ${subjectTitle || 'N/A'}`,
      `BÀI HỌC: ${lesson.title}`,
      lesson.description ? `Nội dung bài học: ${lesson.description}` : '',
      `Thời lượng: ${durationMin} phút`,
      `ID bài học: ${lesson.id} | ID khóa học: ${course.id}`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.addLessonSource(
      notebookId,
      lessonTitle,
      lessonContent,
      lesson.id,
      course.id,
      lesson.title,
      course.title
    );
  },

  /**
   * Nạp nguồn tài liệu text vào Notebook
   * @param lessonId - ID bài học thật từ SQL (quan trọng để AI biết context)
   * @param courseId - ID khóa học thật từ SQL
   */
  async addLessonSource(
    notebookId: string | undefined,
    title: string,
    content: string,
    lessonId?: number,
    courseId?: number,
    lessonTitle?: string,
    courseTitle?: string
  ): Promise<NotebookSource> {
    // 1. Thử nạp lên Open Notebook Container để có vector search
    try {
      const body: Record<string, unknown> = {
        type: 'text',
        title,
        content,
        embed: true,
        metadata: {
          lesson_id: lessonId,
          course_id: courseId,
          lesson_title: lessonTitle,
          course_title: courseTitle,
          source_type: 'microlearning_lesson',
        },
      };
      if (notebookId) body.notebook_id = notebookId;

      const res = await requestNotebookApi(
        '/sources/json',
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        8000
      );
      if (res.ok && isJsonResponse(res)) {
        const src = await safeJson<NotebookSource | null>(res, null);
        if (src && src.id) {
          src.lesson_id = lessonId;
          src.course_id = courseId;
          src.lesson_title = lessonTitle;
          src.course_title = courseTitle;

          if (notebookId) {
            const current = getLocalSourcesByNotebook(notebookId);
            saveLocalSourcesByNotebook(notebookId, [src, ...current.filter((s) => s.id !== src.id)]);
            // Cập nhật source_count trong notebook cache
            const notebooks = getLocalNotebooks();
            const nb = notebooks.find((n) => n.id === notebookId);
            if (nb) {
              nb.source_count = (nb.source_count || 0) + 1;
              saveLocalNotebooks(notebooks);
            }
          }
          return src;
        }
      }
    } catch {}

    // 2. Tạo local source khi container offline
    const newSrc: NotebookSource = {
      id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      full_text: content,
      topics: ['Bài học', title].filter(Boolean),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      embedded: true,
      status: 'Ready (Local)',
      lesson_id: lessonId,
      course_id: courseId,
      lesson_title: lessonTitle,
      course_title: courseTitle,
    };

    if (notebookId) {
      const current = getLocalSourcesByNotebook(notebookId);
      saveLocalSourcesByNotebook(notebookId, [newSrc, ...current]);
      const notebooks = getLocalNotebooks();
      const nb = notebooks.find((n) => n.id === notebookId);
      if (nb) {
        nb.source_count = (nb.source_count || 0) + 1;
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
    const docTitle = title || file.name;

    // Đọc nội dung file text (hỗ trợ PDF text, TXT, MD, DOCX text)
    let textContent = '';
    try {
      textContent = await file.text();
    } catch {
      textContent = `[File tải lên: ${file.name} - ${(file.size / 1024).toFixed(1)} KB]`;
    }

    return this.addLessonSource(notebookId, docTitle, textContent);
  },

  async addSourceToNotebook(notebookId: string, sourceId: string): Promise<void> {
    try {
      await requestNotebookApi(
        `/notebooks/${notebookId}/sources/${sourceId}`,
        { method: 'POST' },
        5000
      );
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
      await requestNotebookApi(
        `/notebooks/${notebookId}/sources/${sourceId}`,
        { method: 'DELETE' },
        5000
      );
    } catch {}

    const srcs = getLocalSourcesByNotebook(notebookId).filter((s) => s.id !== sourceId);
    saveLocalSourcesByNotebook(notebookId, srcs);
    const notebooks = getLocalNotebooks();
    const nb = notebooks.find((n) => n.id === notebookId);
    if (nb && nb.source_count > 0) {
      nb.source_count -= 1;
      saveLocalNotebooks(notebooks);
    }
  },

  // =========================================================================
  // SEARCH
  // =========================================================================

  async searchKnowledgeBase(
    query: string,
    type: 'text' | 'vector' = 'text',
    notebookIds?: string[]
  ): Promise<SearchResult[]> {
    // 1. Thử vector search trên Container
    try {
      const res = await requestNotebookApi(
        '/search',
        {
          method: 'POST',
          body: JSON.stringify({
            query,
            type,
            scope_notebook_ids:
              notebookIds && notebookIds.length > 0 ? notebookIds : undefined,
          }),
        },
        8000
      );

      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<{ results?: SearchResult[] }>(res, {});
        if (Array.isArray(data.results) && data.results.length > 0) return data.results;
      }
    } catch {}

    // 2. Fallback: full-text search trên local sources
    const q = query.toLowerCase();
    const allSources = getAllLocalSources();
    return allSources
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.full_text && s.full_text.toLowerCase().includes(q))
      )
      .map((s) => ({
        id: s.id,
        relevance: 0.85,
        title: s.title,
        content: s.full_text ? s.full_text.substring(0, 400) + '...' : undefined,
      }));
  },

  // =========================================================================
  // ASK AI - KẾT NỐI SQL THỰC TẾ
  // Pipeline: Backend API (với SQL context) → Gemini Direct (với local context) → Offline message
  // =========================================================================

  /**
   * Hỏi đáp AI với context bài học THỰC TẾ từ database
   * @param notebookId - ID notebook đang dùng
   * @param question - Câu hỏi của học viên
   * @param lessonId - ID bài học thật từ SQL (truyền vào để AI lấy ngữ cảnh)
   * @param courseId - ID khóa học thật từ SQL
   * @param history - Lịch sử hội thoại trước đó để AI duy trì mạch trò chuyện
   */
  async askQuestion(
    notebookId: string,
    question: string,
    lessonId?: number,
    courseId?: number,
    history?: Array<{ role: 'user' | 'assistant'; text: string }>
  ): Promise<string> {
    // Lấy context từ local sources đã cache
    const localSources = notebookId
      ? getLocalSourcesByNotebook(notebookId)
      : getAllLocalSources();

    const localContextText =
      localSources.length > 0
        ? localSources
            .slice(0, 5) // Giới hạn 5 sources để tránh vượt token limit
            .map((s) => `[Tài liệu: ${s.title}]\n${(s.full_text || '').substring(0, 800)}`)
            .join('\n\n')
        : '';

    // =========================================================
    // BƯỚC 1: Gọi Backend AI Gateway (.NET) - HỖ TRỢ MULTI-TURN + SQL CONTEXT
    // =========================================================
    try {
      const payload: Record<string, unknown> = { question };
      if (lessonId && lessonId > 0) payload.lessonId = lessonId;
      if (courseId && courseId > 0) payload.courseId = courseId;
      if (localContextText) payload.customContext = localContextText;
      if (history && history.length > 0) {
        payload.history = history.slice(-6).map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          text: h.text,
        }));
      }

      const res = await timeoutFetch(
        `${BACKEND_BASE}/api/AiAssistant/ask`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        15000 // Tăng lên 15s để backend kịp query SQL + gọi Gemini
      );

      if (res.ok && isJsonResponse(res)) {
        const data = await safeJson<{ answer?: string; success?: boolean }>(res, {});
        if (
          data.answer &&
          data.answer.trim().length > 20 &&
          // Loại bỏ các câu trả lời fallback vô nghĩa từ backend cũ
          !data.answer.includes('đã được ghi nhận. Vui lòng thử lại')
        ) {
          return data.answer;
        }
      }
    } catch {
      // Backend offline hoặc timeout → thử Gemini Direct
    }

    // =========================================================
    // BƯỚC 2: Gọi Gemini trực tiếp từ Browser với context local + history
    // =========================================================
    try {
      const directAnswer = await callGeminiDirect(
        question,
        localContextText || undefined,
        undefined,
        12000,
        history
      );
      if (directAnswer && directAnswer.trim().length > 20) {
        return directAnswer;
      }
    } catch {
      // Gemini cũng lỗi → offline message
    }

    // =========================================================
    // BƯỚC 3: Thông báo offline thông minh (không fake trả lời)
    // =========================================================
    if (localSources.length > 0) {
      const relevantSource = localSources.find(
        (s) =>
          s.title.toLowerCase().includes(question.toLowerCase().substring(0, 15)) ||
          (s.full_text && s.full_text.toLowerCase().includes(question.toLowerCase().substring(0, 20)))
      );
      if (relevantSource) {
        return (
          `⚠️ AI đang không thể kết nối, nhưng tôi tìm thấy tài liệu liên quan:\n\n` +
          `📄 **${relevantSource.title}**\n\n` +
          `${(relevantSource.full_text || '').substring(0, 500)}...\n\n` +
          `_Vui lòng thử lại sau khi kết nối được khôi phục để nhận câu trả lời AI đầy đủ._`
        );
      }
    }

    return (
      `⚠️ Hiện tại không thể kết nối tới AI (backend và Gemini đều không phản hồi).\n\n` +
      `Câu hỏi của bạn: **"${question}"** đã được ghi nhận.\n\n` +
      `Để nhận được câu trả lời:\n` +
      `1. Kiểm tra kết nối internet\n` +
      `2. Đảm bảo đã cấu hình **VITE_GEMINI_API_KEY** trong file \`.env\`\n` +
      `3. Thử lại sau vài giây`
    );
  },

  // =========================================================================
  // PODCASTS
  // =========================================================================

  async getPodcastEpisodes(): Promise<PodcastEpisode[]> {
    const localList = getLocalPodcasts();

    try {
      const res = await requestNotebookApi('/podcasts/episodes', { method: 'GET' }, 5000);
      if (res.ok && isJsonResponse(res)) {
        const remoteList = await safeJson<PodcastEpisode[]>(res, []);
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          // Merge: ưu tiên local (có audio URL đã sinh)
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
      const res = await requestNotebookApi('/episode-profiles', { method: 'GET' }, 5000);
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
    voiceName: string = 'vi-VN-HoaiMyNeural',
    lessonMeta?: {
      lessonId?: number;
      courseId?: number;
      lessonTitle?: string;
      courseTitle?: string;
      durationSeconds?: number;
    }
  ): Promise<{ job_id: string; message: string }> {
    // 1. Lấy context thực tế từ notebook nếu không có content
    let lessonContext = content;
    if (!lessonContext && notebookId) {
      const srcs = getLocalSourcesByNotebook(notebookId);
      if (srcs.length > 0) {
        lessonContext = srcs
          .slice(0, 3)
          .map((s) => `${s.title}:\n${(s.full_text || '').substring(0, 600)}`)
          .join('\n\n');
      }
    }

    // 2. Sinh kịch bản với AI Gemini (có context thật)
    let script = '';
    try {
      script = await generatePodcastScript(episodeName, episodeProfile, lessonContext);
    } catch {
      script = `### Kịch bản Podcast: ${episodeName}\n\n**Host:** Chào mừng các bạn đến với tập Podcast hôm nay!\n**Chuyên gia:** Cùng nhau điểm qua các kiến thức quan trọng nhất của bài học nhé!`;
    }

    // 3. Sinh file âm thanh Edge-TTS tiếng Việt
    let audioUrl = '';
    if (voiceName.startsWith('vi-VN-')) {
      try {
        const cleanText = script
          .replace(/^#{1,6}\s+.*$/gm, '')
          .replace(/\[.*?\]/g, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
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
        console.warn('TTS thất bại khi sinh podcast:', err);
      }
    }

    // 4. Lưu podcast vào local storage với liên kết bài học nguồn
    const newEpisode: PodcastEpisode = {
      id: `pod-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: episodeName,
      episode_profile: episodeProfile,
      speaker_profile: speakerProfile,
      status: 'completed',
      created: new Date().toISOString(),
      audio_url: audioUrl || undefined,
      transcript: script,
      lesson_id: lessonMeta?.lessonId,
      course_id: lessonMeta?.courseId,
      lesson_title: lessonMeta?.lessonTitle,
      course_title: lessonMeta?.courseTitle,
      duration_seconds: lessonMeta?.durationSeconds,
    };

    const currentList = getLocalPodcasts();
    saveLocalPodcasts([newEpisode, ...currentList]);

    // 5. Gửi lên Container (background, không block UI)
    requestNotebookApi(
      '/podcasts/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          episode_name: episodeName,
          episode_profile: episodeProfile,
          speaker_profile: speakerProfile,
          notebook_id: notebookId,
          content: lessonContext,
        }),
      },
      5000
    ).catch(() => {});

    return {
      job_id: newEpisode.id,
      message: 'Tập Podcast AI tiếng Việt đã được khởi tạo thành công!',
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
    const list = getLocalPodcasts().filter((p) => p.id !== episodeId);
    saveLocalPodcasts(list);

    try {
      await requestNotebookApi(`/podcasts/episodes/${episodeId}`, { method: 'DELETE' }, 4000);
    } catch {}
    return true;
  },

  getPodcastAudioUrl(episodeId: string): string {
    const ep = getLocalPodcasts().find((p) => p.id === episodeId);
    return ep?.audio_url || '';
  },
};

// Re-export helper để các component khác có thể dùng
export { getLocalNotebooks, getLocalSourcesByNotebook, saveLocalNotebooks };
