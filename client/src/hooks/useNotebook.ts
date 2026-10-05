import { useState, useEffect, useCallback } from 'react';
import { notebookService } from '../services/notebookService';
import type {
  Notebook,
  NotebookSource,
  NotebookChatMessage,
  NotebookStatus,
} from '../types/notebook.types';

export function useNotebook(initialCourseName?: string) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [messages, setMessages] = useState<NotebookChatMessage[]>([]);
  const [status, setStatus] = useState<NotebookStatus>({
    isOnline: false,
    apiUrl: 'http://localhost:5055',
    webUrl: 'http://localhost:8502',
    modelName: 'Đang kết nối...',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Tải trạng thái và danh sách Notebook ban đầu
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const serverStatus = await notebookService.checkStatus();
      setStatus(serverStatus);

      if (serverStatus.isOnline) {
        const list = await notebookService.getNotebooks();
        setNotebooks(list);

        if (list.length > 0) {
          // Ưu tiên chọn notebook trùng tên khóa học nếu có
          const matched = initialCourseName
            ? list.find((n) => n.name.toLowerCase().includes(initialCourseName.toLowerCase()))
            : null;
          const chosen = matched || list[0];
          setActiveNotebook(chosen);
          loadNotebookDetail(chosen.id);
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
      // Ignored for smooth UX
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Chọn Notebook
  const selectNotebook = useCallback((nb: Notebook) => {
    setActiveNotebook(nb);
    loadNotebookDetail(nb.id);
    setMessages([]);
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

  // Nạp bài giảng hiện tại vào Notebook làm nguồn tri thức (Source)
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
        // Cập nhật lại số lượng source trên danh sách
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

  // Gửi câu hỏi và chat hỏi đáp AI
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

  return {
    notebooks,
    activeNotebook,
    sources,
    messages,
    status,
    isLoading,
    isAsking,
    isSyncing,
    error,
    refreshNotebooks: loadInitialData,
    selectNotebook,
    createNotebook,
    removeNotebook,
    syncLessonSource,
    askQuestion,
  };
}
