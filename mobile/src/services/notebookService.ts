import { getSQLiteDatabase } from '../db/sqliteClient';
import { apiClient } from './apiClient';
import { secureStorage } from '../utils/secureStorage';
import { ttsApi } from './ttsApi';
import type {
  Notebook,
  NotebookSource,
  NotebookStatus,
  PodcastEpisode,
  SearchResult,
} from '../types/notebook.types';
import type { Lesson, Course } from '../types/catalog.types';

export interface LessonNote {
  id: string;
  lessonId: number;
  content: string;
  timestampSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'microlearning_nb_';
const NOTEBOOKS_KEY = `${STORAGE_PREFIX}notebooks`;
const PODCASTS_KEY = `${STORAGE_PREFIX}podcasts`;
const OPEN_NOTEBOOK_API_URL = 'https://open-notebook-ai.wittydesert-f9ca7f08.eastasia-01.azurewebsites.net';

// Helper storage functions
async function getStoredNotebooks(): Promise<Notebook[]> {
  try {
    const raw = await secureStorage.getItem(NOTEBOOKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [
    {
      id: 'default-hub',
      name: 'Sổ tay tổng hợp MicroLearning',
      description: 'Tổng hợp tài liệu, bài giảng và trợ lý AI thông minh.',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source_count: 0,
      note_count: 0,
    },
  ];
}

async function saveStoredNotebooks(notebooks: Notebook[]): Promise<void> {
  try {
    await secureStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
  } catch {
    // ignore
  }
}

async function getStoredSourcesByNotebook(notebookId: string): Promise<NotebookSource[]> {
  try {
    const raw = await secureStorage.getItem(`${STORAGE_PREFIX}src_${notebookId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

async function saveStoredSourcesByNotebook(notebookId: string, sources: NotebookSource[]): Promise<void> {
  try {
    await secureStorage.setItem(`${STORAGE_PREFIX}src_${notebookId}`, JSON.stringify(sources));
  } catch {
    // ignore
  }
}

async function getAllStoredSources(): Promise<NotebookSource[]> {
  const notebooks = await getStoredNotebooks();
  const all: NotebookSource[] = [];
  const seen = new Set<string>();
  for (const nb of notebooks) {
    const srcs = await getStoredSourcesByNotebook(nb.id);
    for (const s of srcs) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        all.push(s);
      }
    }
  }
  return all;
}

async function getStoredPodcasts(): Promise<PodcastEpisode[]> {
  try {
    const raw = await secureStorage.getItem(PODCASTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

async function saveStoredPodcasts(podcasts: PodcastEpisode[]): Promise<void> {
  try {
    await secureStorage.setItem(PODCASTS_KEY, JSON.stringify(podcasts));
  } catch {
    // ignore
  }
}

export const notebookService = {
  // ---------------------------------------------------------
  // SQLite Local Lesson Notes (Legacy & In-lesson quick notes)
  // ---------------------------------------------------------
  async getNotesForLesson(lessonId: number): Promise<LessonNote[]> {
    try {
      const db = await getSQLiteDatabase();
      const rows = await db.getAllAsync<LessonNote>(
        `SELECT * FROM LocalNotes WHERE lessonId = ? ORDER BY createdAt DESC;`,
        [lessonId]
      );
      return rows;
    } catch {
      return [];
    }
  },

  async saveNote(lessonId: number, content: string, timestampSeconds?: number): Promise<LessonNote> {
    const db = await getSQLiteDatabase();
    const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `CREATE TABLE IF NOT EXISTS LocalNotes (
        id TEXT PRIMARY KEY,
        lessonId INTEGER,
        content TEXT,
        timestampSeconds INTEGER,
        createdAt TEXT,
        updatedAt TEXT
      );`
    );

    await db.runAsync(
      `INSERT INTO LocalNotes (id, lessonId, content, timestampSeconds, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [id, lessonId, content, timestampSeconds || 0, now, now]
    );

    return {
      id,
      lessonId,
      content,
      timestampSeconds,
      createdAt: now,
      updatedAt: now,
    };
  },

  async deleteNote(noteId: string): Promise<void> {
    try {
      const db = await getSQLiteDatabase();
      await db.runAsync(`DELETE FROM LocalNotes WHERE id = ?;`, [noteId]);
    } catch (err) {
      console.warn('[NotebookService] Delete error:', err);
    }
  },

  // ---------------------------------------------------------
  // AI Notebook Hub Management
  // ---------------------------------------------------------
  async checkStatus(): Promise<NotebookStatus> {
    try {
      const res = await apiClient.get<{ status?: string }>('/api/AiAssistant/status', {
        timeout: 4000,
      });
      if (res.status === 200) {
        return {
          isOnline: true,
          apiUrl: apiClient.defaults.baseURL || '',
          webUrl: OPEN_NOTEBOOK_API_URL,
          modelName: 'Google Gemini 2.0 (Azure AI Gateway)',
        };
      }
    } catch {
      // fallback
    }

    return {
      isOnline: false,
      apiUrl: apiClient.defaults.baseURL || '',
      webUrl: OPEN_NOTEBOOK_API_URL,
      modelName: 'Ngoại tuyến (Offline Knowledge)',
    };
  },

  async getNotebooks(): Promise<Notebook[]> {
    return getStoredNotebooks();
  },

  async createNotebook(name: string, description: string = ''): Promise<Notebook> {
    const notebooks = await getStoredNotebooks();
    const newNb: Notebook = {
      id: `nb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      description,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source_count: 0,
      note_count: 0,
    };

    notebooks.unshift(newNb);
    await saveStoredNotebooks(notebooks);
    return newNb;
  },

  async deleteNotebook(notebookId: string): Promise<void> {
    const notebooks = (await getStoredNotebooks()).filter((n) => n.id !== notebookId);
    await saveStoredNotebooks(notebooks);
    try {
      await secureStorage.removeItem(`${STORAGE_PREFIX}src_${notebookId}`);
    } catch {
      // ignore
    }
  },

  // ---------------------------------------------------------
  // Sources (Tài liệu đính kèm Notebook)
  // ---------------------------------------------------------
  async getSourcesByNotebook(notebookId: string): Promise<NotebookSource[]> {
    return getStoredSourcesByNotebook(notebookId);
  },

  async getAllSources(): Promise<NotebookSource[]> {
    return getAllStoredSources();
  },

  async addTextSource(
    notebookId: string,
    title: string,
    content: string,
    lessonId?: number,
    courseId?: number,
    lessonTitle?: string,
    courseTitle?: string
  ): Promise<NotebookSource> {
    const newSrc: NotebookSource = {
      id: `src-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      full_text: content,
      topics: ['Ghi chú', title],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      embedded: true,
      status: 'Ready',
      lesson_id: lessonId,
      course_id: courseId,
      lesson_title: lessonTitle,
      course_title: courseTitle,
    };

    const current = await getStoredSourcesByNotebook(notebookId);
    await saveStoredSourcesByNotebook(notebookId, [newSrc, ...current]);

    // Cập nhật source count
    const notebooks = await getStoredNotebooks();
    const target = notebooks.find((n) => n.id === notebookId);
    if (target) {
      target.source_count = (target.source_count || 0) + 1;
      await saveStoredNotebooks(notebooks);
    }

    return newSrc;
  },

  async addLessonSource(
    notebookId: string,
    lesson: Lesson,
    course: Course
  ): Promise<NotebookSource> {
    const durationMin = Math.round((lesson.durationSeconds || 0) / 60);
    const title = `[${course.title}] ${lesson.title}`;
    const content = [
      `KHÓA HỌC: ${course.title}`,
      course.description ? `Mô tả khóa học: ${course.description}` : '',
      `BÀI HỌC: ${lesson.title}`,
      lesson.description ? `Nội dung: ${lesson.description}` : '',
      `Thời lượng: ${durationMin} phút`,
      `ID bài học: ${lesson.id} | ID khóa học: ${course.id}`,
    ]
      .filter(Boolean)
      .join('\n');

    return this.addTextSource(
      notebookId,
      title,
      content,
      lesson.id,
      course.id,
      lesson.title,
      course.title
    );
  },

  async deleteSource(notebookId: string, sourceId: string): Promise<void> {
    const current = await getStoredSourcesByNotebook(notebookId);
    const updated = current.filter((s) => s.id !== sourceId);
    await saveStoredSourcesByNotebook(notebookId, updated);

    const notebooks = await getStoredNotebooks();
    const target = notebooks.find((n) => n.id === notebookId);
    if (target) {
      target.source_count = Math.max(0, (target.source_count || 1) - 1);
      await saveStoredNotebooks(notebooks);
    }
  },

  // ---------------------------------------------------------
  // RAG Search & Ask AI
  // ---------------------------------------------------------
  async searchKnowledge(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase();
    const all = await getAllStoredSources();
    return all
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.full_text && s.full_text.toLowerCase().includes(q))
      )
      .map((s) => ({
        id: s.id,
        relevance: 0.9,
        title: s.title,
        content: s.full_text ? s.full_text.substring(0, 300) + '...' : undefined,
      }));
  },

  async askQuestion(
    notebookId: string,
    question: string,
    lessonId?: number,
    courseId?: number,
    history?: Array<{ role: 'user' | 'assistant'; text: string }>
  ): Promise<string> {
    const localSources = notebookId
      ? await getStoredSourcesByNotebook(notebookId)
      : await getAllStoredSources();

    const localContextText =
      localSources.length > 0
        ? localSources
            .slice(0, 5)
            .map((s) => `[Tài liệu: ${s.title}]\n${(s.full_text || '').substring(0, 800)}`)
            .join('\n\n')
        : '';

    // Bước 1: Gửi lên AI Assistant Gateway của Backend
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

      const res = await apiClient.post<{ answer?: string; text?: string; success?: boolean }>(
        '/api/AiAssistant/ask',
        payload,
        { timeout: 15000 }
      );

      const ans = res.data.answer || res.data.text;
      if (ans && ans.trim().length > 10) {
        return ans;
      }
    } catch {
      // API call failed, proceed to fallback
    }

    // Bước 2: Offline Fallback với tài liệu đã lưu
    if (localSources.length > 0) {
      const matched = localSources.find(
        (s) =>
          s.title.toLowerCase().includes(question.toLowerCase().substring(0, 15)) ||
          (s.full_text && s.full_text.toLowerCase().includes(question.toLowerCase().substring(0, 20)))
      );
      if (matched) {
        return (
          `⚠️ Hiện đang ngoại tuyến hoặc kết nối AI bận, nhưng tôi tìm thấy tài liệu liên quan trong sổ tay của bạn:\n\n` +
          `📄 **${matched.title}**\n\n` +
          `${(matched.full_text || '').substring(0, 500)}...\n\n` +
          `_Hãy kết nối mạng để nhận câu trả lời phân tích chuyên sâu từ AI._`
        );
      }
    }

    return (
      `⚠️ Hiện tại không thể kết nối tới máy chủ AI MicroLearning.\n\n` +
      `Câu hỏi của bạn: "${question}" đã được lưu lại.\n\n` +
      `Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau vài giây.`
    );
  },

  // ---------------------------------------------------------
  // Podcast Audio Summary
  // ---------------------------------------------------------
  async getPodcastEpisodes(): Promise<PodcastEpisode[]> {
    return getStoredPodcasts();
  },

  async generatePodcast(
    episodeName: string,
    content: string,
    voiceName: string = 'vi-VN-HoaiMyNeural',
    lessonMeta?: {
      lessonId?: number;
      courseId?: number;
      lessonTitle?: string;
      courseTitle?: string;
      durationSeconds?: number;
    }
  ): Promise<PodcastEpisode> {
    let audioUrl = '';
    try {
      const cleanText = content
        .replace(/^#{1,6}\s+.*$/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .substring(0, 1500);

      const res = await ttsApi.synthesizeSpeech(cleanText, voiceName);
      if (res?.audioUrl) {
        audioUrl = res.audioUrl;
      }
    } catch (err) {
      console.warn('[NotebookService] Synthesize podcast speech error:', err);
    }

    const newEp: PodcastEpisode = {
      id: `pod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: episodeName,
      status: 'completed',
      created: new Date().toISOString(),
      audio_url: audioUrl || undefined,
      transcript: content,
      lesson_id: lessonMeta?.lessonId,
      course_id: lessonMeta?.courseId,
      lesson_title: lessonMeta?.lessonTitle,
      course_title: lessonMeta?.courseTitle,
      duration_seconds: lessonMeta?.durationSeconds,
    };

    const current = await getStoredPodcasts();
    await saveStoredPodcasts([newEp, ...current]);
    return newEp;
  },

  async deletePodcast(episodeId: string): Promise<void> {
    const current = await getStoredPodcasts();
    const updated = current.filter((p) => p.id !== episodeId);
    await saveStoredPodcasts(updated);
  },
};
