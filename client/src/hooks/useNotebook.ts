import { useState, useEffect, useCallback, useRef } from 'react';
import { notebookService } from '../services/notebookService';
import { extractTextFromRemoteUrl, formatExtractedDocumentContent } from '../utils/documentExtractor';
import type {
  Notebook,
  NotebookSource,
  NotebookChatMessage,
  NotebookStatus,
  PodcastEpisode,
  EpisodeProfile,
  SearchResult,
} from '../types/notebook.types';
import type { Course, Lesson, LessonAttachment } from '../types/catalog.types';

export type NotebookTab = 'SOURCES' | 'NOTEBOOKS' | 'ASK_SEARCH' | 'PODCASTS';

interface UseNotebookOptions {
  initialCourseName?: string;
  /** Bài học đang xem - dùng để truyền context thực tế vào AI */
  activeLesson?: Lesson;
  /** Khóa học đang xem - dùng để truyền context thực tế vào AI */
  currentCourse?: Course;
}

export function useNotebook(options: UseNotebookOptions = {}) {
  const { initialCourseName, activeLesson, currentCourse } = options;

  const [currentTab, setCurrentTab] = useState<NotebookTab>('NOTEBOOKS');
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [allSources, setAllSources] = useState<NotebookSource[]>([]);
  const [selectedSourceDetail, setSelectedSourceDetail] = useState<NotebookSource | null>(null);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [messages, setMessages] = useState<NotebookChatMessage[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);
  const [episodeProfiles, setEpisodeProfiles] = useState<EpisodeProfile[]>([]);

  const [status, setStatus] = useState<NotebookStatus>({
    isOnline: false,
    apiUrl: '',
    webUrl: '',
    modelName: 'Đang kết nối...',
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ref để tránh gọi loadInitialData nhiều lần
  const hasLoadedRef = useRef<boolean>(false);
  // Ref để prevent double-submit khi user click nhanh liên tiếp
  const isAskingRef = useRef<boolean>(false);

  // =========================================================================
  // LOAD INITIAL DATA
  // =========================================================================
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Kiểm tra status đồng thời với load data (không chờ status xong mới load)
      const [serverStatusResult, nbListResult, podListResult, profListResult] =
        await Promise.allSettled([
          notebookService.checkStatus(),
          notebookService.getNotebooks(),
          notebookService.getPodcastEpisodes(),
          notebookService.getEpisodeProfiles(),
        ]);

      if (serverStatusResult.status === 'fulfilled') {
        setStatus(serverStatusResult.value);
      }

      if (nbListResult.status === 'fulfilled') {
        const list = nbListResult.value;
        setNotebooks(list);

        if (list.length > 0) {
          // Auto-select notebook khớp với course đang học
          const matchByName = initialCourseName
            ? list.find((n) => n.name.toLowerCase().includes(initialCourseName.toLowerCase()))
            : null;

          // Hoặc khớp theo courseId nếu có
          const matchByCourse = currentCourse
            ? list.find(
                (n) =>
                  n.name.toLowerCase().includes(currentCourse.title.toLowerCase()) ||
                  n.description?.toLowerCase().includes(currentCourse.title.toLowerCase())
              )
            : null;

          const chosen = matchByCourse || matchByName || list[0];
          setActiveNotebook(chosen);
          void loadNotebookSources(chosen.id);
        } else {
          // Tự động khởi tạo sổ tay mặc định cho khóa học/hệ thống khi truy cập trên thiết bị di động mới
          const defaultNb: Notebook = {
            id: currentCourse ? `course-${currentCourse.id}` : 'default-notebook',
            name: currentCourse ? `Sổ tay: ${currentCourse.title}` : 'Sổ tay AI Tri Thức',
            description: currentCourse?.description || 'Trợ lý AI và tài liệu học tập toàn diện',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            source_count: 0,
            note_count: 0,
          };
          setNotebooks([defaultNb]);
          setActiveNotebook(defaultNb);
        }
      }

      if (podListResult.status === 'fulfilled') {
        setPodcasts(podListResult.value);
      }

      if (profListResult.status === 'fulfilled') {
        setEpisodeProfiles(profListResult.value);
      }

      // Load tất cả sources sau
      const srcList = await notebookService.getAllSources().catch(() => [] as NotebookSource[]);
      setAllSources(srcList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối Notebook';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [initialCourseName, currentCourse?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotebookSources = useCallback(async (notebookId: string) => {
    try {
      const { sources: srcs } = await notebookService.getNotebookDetail(notebookId);
      setSources(srcs || []);
    } catch {
      // Ignored for smoother experience
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void loadInitialData();
    }
  }, []); // Chỉ gọi 1 lần khi mount

  // =========================================================================
  // NOTEBOOK OPERATIONS
  // =========================================================================

  const selectNotebook = useCallback(
    (nb: Notebook) => {
      setActiveNotebook(nb);
      void loadNotebookSources(nb.id);
      // Clear messages khi đổi notebook
      setMessages([]);
      setSearchResults([]);
    },
    [loadNotebookSources]
  );

  const createNotebook = useCallback(async (name: string, description: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const newNb = await notebookService.createNotebook(name, description);
      setNotebooks((prev) => [newNb, ...prev]);
      setActiveNotebook(newNb);
      setSources([]);
      setMessages([]);
      return newNb;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo Notebook';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeNotebook = useCallback(
    async (notebookId: string) => {
      setIsLoading(true);
      try {
        await notebookService.deleteNotebook(notebookId);
        setNotebooks((prev) => prev.filter((n) => n.id !== notebookId));
        if (activeNotebook?.id === notebookId) {
          setActiveNotebook(null);
          setSources([]);
          setMessages([]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể xóa Notebook';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [activeNotebook]
  );

  // =========================================================================
  // SOURCE OPERATIONS - KẾT NỐI SQL THỰC TẾ
  // =========================================================================

  /**
   * Nạp bài học hiện tại vào Notebook với context SQL thực tế
   * Tự động truyền lessonId, courseId để AI biết đang hỏi về bài nào
   */
  const syncLessonSource = useCallback(
    async (lessonTitle: string, lessonSummary: string, targetNotebookId?: string) => {
      const nbId = targetNotebookId || activeNotebook?.id;
      setIsSyncing(true);
      setError(null);
      try {
        // Sử dụng addLessonSource có lessonId và courseId thật
        const newSource = await notebookService.addLessonSource(
          nbId,
          lessonTitle,
          lessonSummary,
          activeLesson?.id,
          currentCourse?.id
        );
        setAllSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        if (nbId && (!activeNotebook || activeNotebook.id === nbId)) {
          setSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        }
        if (nbId) {
          setNotebooks((prev) =>
            prev.map((nb) =>
              nb.id === nbId ? { ...nb, source_count: (nb.source_count || 0) + 1 } : nb
            )
          );
        }
        return newSource;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể nạp bài giảng';
        setError(msg);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeNotebook, activeLesson, currentCourse]
  );

  /**
   * Nạp bài học từ đối tượng Lesson + Course đầy đủ (recommended)
   */
  const syncCurrentLessonFull = useCallback(
    async (lesson: Lesson, course: Course, subjectTitle?: string, targetNotebookId?: string) => {
      const nbId = targetNotebookId || activeNotebook?.id;
      setIsSyncing(true);
      setError(null);
      try {
        const newSource = await notebookService.addLessonSourceFromSql(
          nbId,
          lesson,
          course,
          subjectTitle
        );
        setAllSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        if (nbId && (!activeNotebook || activeNotebook.id === nbId)) {
          setSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        }
        if (nbId) {
          setNotebooks((prev) =>
            prev.map((nb) =>
              nb.id === nbId ? { ...nb, source_count: (nb.source_count || 0) + 1 } : nb
            )
          );
        }
        return newSource;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể nạp bài giảng';
        setError(msg);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeNotebook]
  );

  const attachCourseAttachmentToNotebook = useCallback(
    async (attachment: LessonAttachment, targetNotebookId?: string, course?: Course) => {
      const nbId = targetNotebookId || activeNotebook?.id;
      setIsSyncing(true);
      setError(null);
      try {
        const fileName = attachment.originalFileName || attachment.fileName;
        const docTitle = `[Tài liệu] ${fileName}`;

        // 1. Tự động tải tệp từ Azure Blob Storage và trích xuất nội dung văn bản thực tế (.docx, .doc, .pdf, .txt)
        let extractedText = '';
        if (attachment.fileUrl) {
          try {
            extractedText = await extractTextFromRemoteUrl(attachment.fileUrl, fileName);
          } catch (extractErr) {
            console.warn('[useNotebook] Error extracting text from attachment URL:', extractErr);
          }
        }

        // 2. Định dạng nội dung nguồn với toàn bộ văn bản thực tế để AI đọc hiểu
        const content = formatExtractedDocumentContent(fileName, extractedText, {
          courseTitle: course?.title || currentCourse?.title,
          fileType: attachment.fileType,
          sizeBytes: attachment.fileSizeBytes,
          fileUrl: attachment.fileUrl,
        });

        const newSource = await notebookService.addLessonSource(
          nbId,
          docTitle,
          content,
          attachment.lessonId,
          course?.id || currentCourse?.id,
          fileName,
          course?.title || currentCourse?.title
        );

        setAllSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        if (nbId && (!activeNotebook || activeNotebook.id === nbId)) {
          setSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        }
        if (nbId) {
          setNotebooks((prev) =>
            prev.map((nb) =>
              nb.id === nbId ? { ...nb, source_count: (nb.source_count || 0) + 1 } : nb
            )
          );
        }
        return newSource;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể gắn tài liệu vào Sổ tay';
        setError(msg);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeNotebook, currentCourse]
  );

  const uploadFileSource = useCallback(
    async (file: File, targetNotebookId?: string, customTitle?: string) => {
      const nbId = targetNotebookId || activeNotebook?.id;
      setIsSyncing(true);
      setError(null);
      try {
        const newSource = await notebookService.uploadSourceFile(file, nbId, customTitle);
        setAllSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        if (nbId && (!activeNotebook || activeNotebook.id === nbId)) {
          setSources((prev) => [newSource, ...prev.filter((s) => s.id !== newSource.id)]);
        }
        if (nbId) {
          setNotebooks((prev) =>
            prev.map((nb) =>
              nb.id === nbId ? { ...nb, source_count: (nb.source_count || 0) + 1 } : nb
            )
          );
        }
        return newSource;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Tải file lên thất bại';
        setError(msg);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeNotebook]
  );

  const attachSourceToNotebook = useCallback(
    async (sourceId: string, targetNotebookId?: string) => {
      const nbId = targetNotebookId || activeNotebook?.id;
      if (!nbId) return;
      setIsSyncing(true);
      setError(null);
      try {
        await notebookService.addSourceToNotebook(nbId, sourceId);
        const updatedSources = await notebookService.getSourcesByNotebook(nbId);
        if (activeNotebook?.id === nbId) {
          setSources(updatedSources);
        }
        setNotebooks((prev) =>
          prev.map((nb) =>
            nb.id === nbId ? { ...nb, source_count: updatedSources.length } : nb
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể gắn tài liệu vào Sổ tay';
        setError(msg);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeNotebook]
  );

  const detachSourceFromNotebook = useCallback(
    async (sourceId: string, targetNotebookId?: string) => {
      const nbId = targetNotebookId || activeNotebook?.id;
      if (!nbId) return;
      setIsSyncing(true);
      setError(null);
      try {
        await notebookService.removeSourceFromNotebook(nbId, sourceId);
        if (activeNotebook?.id === nbId) {
          setSources((prev) => prev.filter((s) => s.id !== sourceId));
        }
        setNotebooks((prev) =>
          prev.map((nb) =>
            nb.id === nbId
              ? { ...nb, source_count: Math.max(0, (nb.source_count || 1) - 1) }
              : nb
          )
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể gỡ tài liệu khỏi Sổ tay';
        setError(msg);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [activeNotebook]
  );

  const removeSource = useCallback(
    async (sourceId: string) => {
      setIsLoading(true);
      try {
        await notebookService.deleteSource(sourceId);
        setAllSources((prev) => prev.filter((s) => s.id !== sourceId));
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
        if (selectedSourceDetail?.id === sourceId) {
          setSelectedSourceDetail(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Xóa tài liệu thất bại';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedSourceDetail]
  );

  const viewSourceDetail = useCallback(async (sourceId: string) => {
    try {
      const detail = await notebookService.getSourceDetail(sourceId);
      setSelectedSourceDetail(detail);
    } catch {
      // Ignored
    }
  }, []);

  // =========================================================================
  // ASK & SEARCH - TRUYỀN LESSONID + COURSEID THẬT VÀO AI
  // =========================================================================

  const searchKnowledge = useCallback(
    async (query: string, type: 'text' | 'vector' = 'text') => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      setError(null);
      try {
        const results = await notebookService.searchKnowledgeBase(
          query.trim(),
          type,
          activeNotebook ? [activeNotebook.id] : undefined
        );
        setSearchResults(results);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Tìm kiếm thất bại';
        setError(msg);
      } finally {
        setIsSearching(false);
      }
    },
    [activeNotebook]
  );

  /**
   * Hỏi đáp AI - tự động truyền lessonId và courseId từ bài học đang xem
   * để AI nhận được context SQL thực tế từ database
   */
  const askQuestion = useCallback(
    async (questionText: string) => {
      // Prevent double-submit
      if (isAskingRef.current) return;
      if (!questionText.trim()) return;

      let notebookToUse = activeNotebook;
      if (!notebookToUse) {
        notebookToUse = {
          id: currentCourse ? `course-${currentCourse.id}` : 'default-notebook',
          name: currentCourse ? `Sổ tay: ${currentCourse.title}` : 'Sổ tay AI Tri Thức',
          description: currentCourse?.description || 'Trợ lý AI và tài liệu học tập toàn diện',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          source_count: 0,
          note_count: 0,
        };
        setActiveNotebook(notebookToUse);
      }

      isAskingRef.current = true;

      const userMsg: NotebookChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: questionText,
        timestamp: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsAsking(true);
      setError(null);


      try {
        // Lấy lịch sử 6 tin nhắn trước đó (bỏ tin nhắn lỗi) để AI duy trì mạch hội thoại
        const chatHistory = messages
          .filter((m) => !m.isError && m.text.trim().length > 0)
          .slice(-6)
          .map((m) => ({
            role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
            text: m.text,
          }));

        // Truyền lessonId, courseId và chatHistory thực tế để backend query SQL & duy trì ngữ cảnh
        const aiAnswer = await notebookService.askQuestion(
          (activeNotebook?.id || notebookToUse.id),
          questionText,
          activeLesson?.id,    // ID bài học từ SQL
          currentCourse?.id,   // ID khóa học từ SQL
          chatHistory
        );

        const aiMsg: NotebookChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: aiAnswer,
          timestamp: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          // Hiển thị nguồn tham khảo nếu có
          sources: activeLesson
            ? [`Bài học: ${activeLesson.title}`]
            : undefined,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi gọi AI';
        setError(msg);

        const errorMsg: NotebookChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ ${msg}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsAsking(false);
        isAskingRef.current = false;
      }
    },
    [activeNotebook, activeLesson, currentCourse, messages]
  );

  // =========================================================================
  // PODCASTS
  // =========================================================================

  const createPodcast = useCallback(
    async (
      episodeName: string,
      episodeProfile: string,
      speakerProfile?: string,
      content?: string,
      customNotebookId?: string,
      voiceName?: string
    ) => {
      setIsGeneratingPodcast(true);
      setError(null);
      try {
        const ep = episodeProfiles.find((p) => p.name === episodeProfile);
        const resolvedSpeaker =
          speakerProfile || ep?.speaker_config_name || ep?.speaker_config || 'solo_expert';
        const targetNbId = customNotebookId || activeNotebook?.id;

        // Ưu tiên nạp tài liệu từ Notebook được chọn nếu chưa có finalContent
        let finalContent = content;
        if (!finalContent && targetNbId) {
          try {
            const nbSources = await notebookService.getSourcesByNotebook(targetNbId);
            const valid = nbSources.filter((s) => s.full_text && s.full_text.trim().length > 20);
            if (valid.length > 0) {
              finalContent = valid
                .slice(0, 5)
                .map((s, idx) => `=== TÀI LIỆU NGUỒN ${idx + 1}: ${s.title} ===\n${(s.full_text || '').substring(0, 5000)}`)
                .join('\n\n');
            }
          } catch (e) {
            console.warn('[useNotebook] Failed to read notebook sources for podcast:', e);
          }
        }

        // Nếu vẫn chưa có content, mới lấy từ bài học hiện tại
        if (!finalContent && activeLesson) {
          finalContent = [
            `Bài học: ${activeLesson.title}`,
            activeLesson.description ? `Nội dung: ${activeLesson.description}` : '',
            currentCourse ? `Khóa học: ${currentCourse.title}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        }

        const lessonMeta = activeLesson
          ? {
              lessonId: activeLesson.id,
              courseId: currentCourse?.id,
              lessonTitle: activeLesson.title,
              courseTitle: currentCourse?.title,
              durationSeconds: activeLesson.durationSeconds,
            }
          : undefined;

        await notebookService.generatePodcast(
          episodeName,
          episodeProfile,
          resolvedSpeaker,
          targetNbId,
          finalContent,
          voiceName || 'vi-VN-HoaiMyNeural',
          lessonMeta
        );

        const updatedList = await notebookService.getPodcastEpisodes();
        setPodcasts(updatedList);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Tạo Podcast thất bại';
        setError(msg);
        throw err;
      } finally {
        setIsGeneratingPodcast(false);
      }
    },
    [activeNotebook, episodeProfiles, activeLesson, currentCourse]
  );

  const removePodcast = useCallback(async (podcastId: string) => {
    try {
      await notebookService.deletePodcastEpisode(podcastId);
      setPodcasts((prev) => prev.filter((p) => p.id !== podcastId));
    } catch {
      // Ignored
    }
  }, []);

  // =========================================================================
  // RETURN
  // =========================================================================
  return {
    currentTab,
    setCurrentTab,
    notebooks,
    activeNotebook,
    allSources,
    selectedSourceDetail,
    setSelectedSourceDetail,
    sources,
    messages,
    setMessages,
    clearMessages: () => setMessages([]),
    searchResults,
    podcasts,
    episodeProfiles,
    status,
    isLoading,
    isAsking,
    isSyncing,
    isSearching,
    isGeneratingPodcast,
    error,
    refreshAll: loadInitialData,
    selectNotebook,
    createNotebook,
    removeNotebook,
    syncLessonSource,
    syncCurrentLessonFull,
    uploadFileSource,
    attachSourceToNotebook,
    attachCourseAttachmentToNotebook,
    detachSourceFromNotebook,
    loadNotebookDetail: loadNotebookSources,
    removeSource,
    viewSourceDetail,
    searchKnowledge,
    askQuestion,
    createPodcast,
    removePodcast,
  };
}
