import { useState, useEffect, useCallback, useRef } from 'react';
import { notebookService } from '../services/notebookService';
import type {
  Notebook,
  NotebookSource,
  NotebookChatMessage,
  NotebookStatus,
  PodcastEpisode,
  EpisodeProfile,
  SearchResult,
} from '../types/notebook.types';
import type { Course, Lesson } from '../types/catalog.types';

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
      if (!activeNotebook) {
        setError('Vui lòng chọn một Sổ tay trước khi đặt câu hỏi!');
        return;
      }

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
        // Truyền lessonId và courseId thực tế để backend query SQL
        const aiAnswer = await notebookService.askQuestion(
          activeNotebook.id,
          questionText,
          activeLesson?.id,    // ID bài học từ SQL
          currentCourse?.id    // ID khóa học từ SQL
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
      }
    },
    [activeNotebook, activeLesson, currentCourse]
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

        // Nếu không có content, tự động lấy từ bài học hiện tại + sources
        let finalContent = content;
        if (!finalContent && activeLesson) {
          finalContent = [
            `Bài học: ${activeLesson.title}`,
            activeLesson.description ? `Nội dung: ${activeLesson.description}` : '',
            currentCourse ? `Khóa học: ${currentCourse.title}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        }

        await notebookService.generatePodcast(
          episodeName,
          episodeProfile,
          resolvedSpeaker,
          targetNbId,
          finalContent,
          voiceName || 'vi-VN-HoaiMyNeural'
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
