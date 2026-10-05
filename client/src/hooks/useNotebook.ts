import { useState, useEffect, useCallback } from 'react';
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

export type NotebookTab = 'SOURCES' | 'NOTEBOOKS' | 'ASK_SEARCH' | 'PODCASTS';

export function useNotebook(initialCourseName?: string) {
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
    apiUrl: 'http://localhost:5055',
    webUrl: 'http://localhost:8502',
    modelName: 'Đang kết nối...',
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Nạp toàn bộ dữ liệu từ Open Notebook
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const serverStatus = await notebookService.checkStatus();
      setStatus(serverStatus);

      if (serverStatus.isOnline) {
        // Tải đồng thời danh sách Notebook, Sources, Podcasts & Profiles
        const [nbList, srcList, podList, profList] = await Promise.allSettled([
          notebookService.getNotebooks(),
          notebookService.getAllSources(),
          notebookService.getPodcastEpisodes(),
          notebookService.getEpisodeProfiles(),
        ]);

        if (nbList.status === 'fulfilled') {
          const list = nbList.value;
          setNotebooks(list);
          if (list.length > 0) {
            const matched = initialCourseName
              ? list.find((n) => n.name.toLowerCase().includes(initialCourseName.toLowerCase()))
              : null;
            const chosen = matched || list[0];
            setActiveNotebook(chosen);
            loadNotebookDetail(chosen.id);
          }
        }

        if (srcList.status === 'fulfilled') {
          setAllSources(srcList.value);
        }

        if (podList.status === 'fulfilled') {
          setPodcasts(podList.value);
        }

        if (profList.status === 'fulfilled') {
          setEpisodeProfiles(profList.value);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối Notebook';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [initialCourseName]);

  const loadNotebookDetail = async (notebookId: string) => {
    try {
      const detail = await notebookService.getNotebookDetail(notebookId);
      setSources(detail.sources || []);
    } catch {
      // Ignored for smoother experience
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Chọn Notebook
  const selectNotebook = useCallback((nb: Notebook) => {
    setActiveNotebook(nb);
    loadNotebookDetail(nb.id);
  }, []);

  // Tạo Notebook mới
  const createNotebook = useCallback(async (name: string, description: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const newNb = await notebookService.createNotebook(name, description);
      setNotebooks((prev) => [newNb, ...prev]);
      setActiveNotebook(newNb);
      setSources([]);
      return newNb;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo Notebook';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Xóa Notebook
  const removeNotebook = useCallback(async (notebookId: string) => {
    setIsLoading(true);
    try {
      await notebookService.deleteNotebook(notebookId);
      setNotebooks((prev) => prev.filter((n) => n.id !== notebookId));
      if (activeNotebook?.id === notebookId) {
        setActiveNotebook(null);
        setSources([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa Notebook';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeNotebook]);

  // Nạp bài giảng / nguồn tài liệu mới vào Notebook
  const syncLessonSource = useCallback(
    async (lessonTitle: string, lessonSummary: string) => {
      if (!activeNotebook) {
        setError('Vui lòng chọn hoặc tạo một Notebook trước khi nạp bài giảng!');
        return;
      }
      setIsSyncing(true);
      setError(null);
      try {
        const newSource = await notebookService.addLessonSource(
          activeNotebook.id,
          lessonTitle,
          lessonSummary
        );
        setSources((prev) => [newSource, ...prev]);
        setAllSources((prev) => [newSource, ...prev]);
        setNotebooks((prev) =>
          prev.map((nb) =>
            nb.id === activeNotebook.id
              ? { ...nb, source_count: (nb.source_count || 0) + 1 }
              : nb
          )
        );
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

  // Xóa một nguồn tài liệu (Source)
  const removeSource = useCallback(async (sourceId: string) => {
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
  }, [selectedSourceDetail]);

  // Xem chi tiết toàn văn một nguồn tài liệu
  const viewSourceDetail = useCallback(async (sourceId: string) => {
    try {
      const detail = await notebookService.getSourceDetail(sourceId);
      setSelectedSourceDetail(detail);
    } catch {
      // Ignored
    }
  }, []);

  // Tìm kiếm kiến thức (Search)
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

  // Hỏi đáp AI với Gemini 3.5 Flash-Lite (Ask RAG)
  const askQuestion = useCallback(
    async (questionText: string) => {
      if (!activeNotebook) {
        setError('Vui lòng chọn một Notebook trước khi đặt câu hỏi!');
        return;
      }

      const userMsg: NotebookChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: questionText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsAsking(true);
      setError(null);

      try {
        const aiAnswer = await notebookService.askQuestion(activeNotebook.id, questionText);

        const aiMsg: NotebookChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: aiAnswer,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi gọi AI';
        setError(msg);

        const errorMsg: NotebookChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ ${msg}`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsAsking(false);
      }
    },
    [activeNotebook]
  );

  // Tạo Podcast AI
  const createPodcast = useCallback(
    async (
      episodeName: string,
      episodeProfile: string,
      speakerProfile: string,
      content?: string
    ) => {
      setIsGeneratingPodcast(true);
      setError(null);
      try {
        await notebookService.generatePodcast(
          episodeName,
          episodeProfile,
          speakerProfile,
          activeNotebook?.id,
          content
        );
        // Refresh danh sách podcasts
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
    [activeNotebook]
  );

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
    removeSource,
    viewSourceDetail,
    searchKnowledge,
    askQuestion,
    createPodcast,
  };
}
