import { useState, useCallback, useEffect, useRef } from 'react';

export interface NavLocationState {
  view: 'catalog' | 'course' | 'lesson' | 'quiz' | 'management';
  courseId?: number;
  subjectId?: number;
  lessonId?: number;
  title?: string;
}

export interface UseAppHistoryNavigationResult {
  currentState: NavLocationState;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => NavLocationState | null;
  goForward: () => NavLocationState | null;
  pushState: (state: NavLocationState) => void;
  replaceState: (state: NavLocationState) => void;
  breadcrumbs: string[];
}

export function useAppHistoryNavigation(
  initialState: NavLocationState = { view: 'catalog', title: 'Trang chủ' },
  onNavigate?: (state: NavLocationState) => void
): UseAppHistoryNavigationResult {
  const [historyStack, setHistoryStack] = useState<NavLocationState[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const currentState = historyStack[currentIndex] || initialState;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < historyStack.length - 1;

  const pushState = useCallback((newState: NavLocationState) => {
    setHistoryStack((prev) => {
      // Bỏ các state tương lai nếu push state mới từ giữa stack
      const newStack = prev.slice(0, currentIndex + 1);
      // Kiểm tra trùng lặp với state hiện tại
      const current = newStack[newStack.length - 1];
      if (
        current &&
        current.view === newState.view &&
        current.courseId === newState.courseId &&
        current.subjectId === newState.subjectId &&
        current.lessonId === newState.lessonId
      ) {
        return prev;
      }
      return [...newStack, newState];
    });
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex]);

  const replaceState = useCallback((newState: NavLocationState) => {
    setHistoryStack((prev) => {
      const copy = [...prev];
      copy[currentIndex] = newState;
      return copy;
    });
  }, [currentIndex]);

  const goBack = useCallback((): NavLocationState | null => {
    if (currentIndex <= 0) return null;
    const nextIdx = currentIndex - 1;
    setCurrentIndex(nextIdx);
    const targetState = historyStack[nextIdx];
    if (onNavigateRef.current && targetState) {
      onNavigateRef.current(targetState);
    }
    return targetState;
  }, [currentIndex, historyStack]);

  const goForward = useCallback((): NavLocationState | null => {
    if (currentIndex >= historyStack.length - 1) return null;
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    const targetState = historyStack[nextIdx];
    if (onNavigateRef.current && targetState) {
      onNavigateRef.current(targetState);
    }
    return targetState;
  }, [currentIndex, historyStack]);

  // Sinh Breadcrumbs hiển thị điều hướng
  const breadcrumbs = useCallback(() => {
    const list: string[] = ['Trang chủ'];
    if (currentState.view === 'course' || currentState.view === 'lesson' || currentState.view === 'quiz') {
      list.push(currentState.title ? `Khóa học: ${currentState.title}` : 'Khóa học');
    }
    if (currentState.view === 'lesson') {
      list.push('Bài học');
    } else if (currentState.view === 'quiz') {
      list.push('Bài kiểm tra');
    } else if (currentState.view === 'management') {
      list.push('Quản trị');
    }
    return list;
  }, [currentState])();

  return {
    currentState,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    pushState,
    replaceState,
    breadcrumbs,
  };
}
