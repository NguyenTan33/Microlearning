import { useState, useCallback, useEffect, useRef } from 'react';

export interface NavLocationState {
  view: 'catalog' | 'course' | 'lesson' | 'quiz' | 'management' | 'notebook' | 'bookmarks';
  courseId?: number;
  subjectId?: number;
  lessonId?: number;
  title?: string;
}

export interface UseAppHistoryNavigationResult {
  currentState: NavLocationState;
  pushState: (state: NavLocationState) => void;
  replaceState: (state: NavLocationState) => void;
  breadcrumbs: string[];
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
}

function computeHashFromState(state: NavLocationState): string {
  if (state.view === 'catalog') return '#catalog';
  if (state.view === 'notebook') return '#notebook';
  if (state.view === 'bookmarks') return '#bookmarks';
  if (state.view === 'lesson' && state.lessonId) {
    return `#course-${state.courseId || 1}-lesson-${state.lessonId}`;
  }
  if (state.view === 'course' && state.courseId) {
    return `#course-${state.courseId}`;
  }
  return '#home';
}

function parseStateFromHash(hash: string): NavLocationState {
  const clean = hash.replace(/^#/, '');
  if (clean === 'catalog') return { view: 'catalog', title: 'Khám phá khóa học' };
  if (clean === 'notebook') return { view: 'notebook', title: 'NoteBook AI' };
  if (clean === 'bookmarks') return { view: 'bookmarks', title: 'Mục đánh dấu' };

  const matchLesson = clean.match(/^course-(\d+)-lesson-(\d+)$/);
  if (matchLesson) {
    return {
      view: 'lesson',
      courseId: parseInt(matchLesson[1], 10),
      lessonId: parseInt(matchLesson[2], 10),
      title: 'Phòng học',
    };
  }

  const matchCourse = clean.match(/^course-(\d+)$/);
  if (matchCourse) {
    return {
      view: 'course',
      courseId: parseInt(matchCourse[1], 10),
      title: 'Phòng học',
    };
  }

  return { view: 'catalog', title: 'Khám phá khóa học' };
}

export function useAppHistoryNavigation(
  initialState: NavLocationState = { view: 'catalog', title: 'Khám phá khóa học' },
  onNavigate?: (state: NavLocationState) => void
): UseAppHistoryNavigationResult {
  const [currentState, setCurrentState] = useState<NavLocationState>(() => {
    if (typeof window !== 'undefined') {
      if (window.history.state && window.history.state.view) {
        return window.history.state as NavLocationState;
      }
      if (window.location.hash) {
        return parseStateFromHash(window.location.hash);
      }
    }
    return initialState;
  });

  const onNavigateRef = useRef(onNavigate);
  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  // Khởi tạo trạng thái ban đầu vào Browser History API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.history.state || !window.history.state.view) {
      const hash = computeHashFromState(currentState);
      window.history.replaceState(currentState, currentState.title || '', hash);
    }

    const handlePopState = (event: PopStateEvent) => {
      let targetState = event.state as NavLocationState | null;
      if (!targetState || !targetState.view) {
        targetState = parseStateFromHash(window.location.hash);
      }

      setCurrentState(targetState);
      if (onNavigateRef.current) {
        onNavigateRef.current(targetState);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const pushState = useCallback((newState: NavLocationState) => {
    setCurrentState((prev) => {
      // Tránh duplicate state liên tiếp
      if (
        prev.view === newState.view &&
        prev.courseId === newState.courseId &&
        prev.subjectId === newState.subjectId &&
        prev.lessonId === newState.lessonId
      ) {
        return prev;
      }

      if (typeof window !== 'undefined') {
        const hash = computeHashFromState(newState);
        window.history.pushState(newState, newState.title || '', hash);
      }
      return newState;
    });
  }, []);

  const replaceState = useCallback((newState: NavLocationState) => {
    setCurrentState(newState);
    if (typeof window !== 'undefined') {
      const hash = computeHashFromState(newState);
      window.history.replaceState(newState, newState.title || '', hash);
    }
  }, []);

  // Gọi trực tiếp Browser Window Native Navigation
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  const goForward = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }, []);

  // Sinh breadcrumbs điều hướng theo vị trí học tập hiện tại
  const breadcrumbs = useCallback(() => {
    const list: string[] = ['Trang chủ'];
    if (currentState.view === 'catalog') {
      list.push('Khám phá khóa học');
    } else if (currentState.view === 'notebook') {
      list.push('NoteBook AI');
    } else if (currentState.view === 'bookmarks') {
      list.push('Mục đánh dấu');
    } else if (currentState.view === 'course' || currentState.view === 'lesson') {
      list.push(currentState.title ? currentState.title : 'Phòng học');
    }
    return list;
  }, [currentState])();

  return {
    currentState,
    pushState,
    replaceState,
    breadcrumbs,
    canGoBack: true,
    canGoForward: true,
    goBack,
    goForward,
  };
}
