import React, { useState, useRef, useEffect } from 'react';
import {
  BookMarked,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Bot,
  User,
  Search,
  Mic,
  HelpCircle,
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  Loader2,
  FolderOpen,
  Upload,
  FileUp,
  Layers,
  Unlink,
  Paperclip,
  Check,
  File,
  AlertTriangle,
} from 'lucide-react';
import { useNotebook, type NotebookTab } from '../../hooks/useNotebook';
import { notebookService } from '../../services/notebookService';
import { attachmentApi } from '../../services/attachmentApi';
import { ttsApi } from '../../services/ttsApi';
import { extractTextFromRemoteUrl, formatExtractedDocumentContent } from '../../utils/documentExtractor';
import type { Course, CourseDetail, Lesson, LessonAttachment } from '../../types/catalog.types';
import type { NotebookSource } from '../../types/notebook.types';
import type { UserTokenPayload } from '../../utils/tokenHelper';

interface NotebookHubViewProps {
  currentCourse?: CourseDetail | Course;
  activeLesson?: Lesson;
  onBackToWorkspace?: () => void;
  currentUser?: UserTokenPayload | null;
}

export const NotebookHubView: React.FC<NotebookHubViewProps> = ({
  currentCourse,
  activeLesson,
  onBackToWorkspace,
  currentUser,
}) => {
  const isTeacherOrAdmin = Boolean(currentUser?.isAdmin || currentUser?.isTeacher);
  const {
    currentTab,
    setCurrentTab,
    notebooks,
    activeNotebook,
    allSources,
    selectedSourceDetail,
    setSelectedSourceDetail,
    sources,
    messages,
    clearMessages,
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
    refreshAll,
    selectNotebook,
    createNotebook,
    removeNotebook,
    syncLessonSource,
    syncCurrentLessonFull,
    uploadFileSource,
    attachSourceToNotebook,
    attachCourseAttachmentToNotebook,
    detachSourceFromNotebook,
    removeSource,
    viewSourceDetail,
    searchKnowledge,
    askQuestion,
    createPodcast,
    removePodcast,
  } = useNotebook({
    initialCourseName: currentCourse?.title,
    activeLesson,
    currentCourse,
  });

  // States cho Modals & Forms
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'NOTEBOOK' | 'SOURCE' | 'PODCAST'>('NOTEBOOK');
  const [sourceAddMode, setSourceAddMode] = useState<'UPLOAD' | 'TEXT' | 'LESSON'>('UPLOAD');
  const [targetNotebookId, setTargetNotebookId] = useState<string>('');

  // Existing source attachment modal & Course attachments state
  const [isExistingSourceModalOpen, setIsExistingSourceModalOpen] = useState<boolean>(false);
  const [existingSourceSearch, setExistingSourceSearch] = useState<string>('');
  const [existingSourceTab, setExistingSourceTab] = useState<'COURSE_DOCS' | 'ALL_SOURCES'>('COURSE_DOCS');
  const [courseAttachments, setCourseAttachments] = useState<LessonAttachment[]>([]);
  const [isLoadingCourseDocs, setIsLoadingCourseDocs] = useState<boolean>(false);
  const [attachingDocId, setAttachingDocId] = useState<number | null>(null);
  const [attachedDocNotice, setAttachedDocNotice] = useState<string | null>(null);

  // Tự động tải danh sách tài liệu khóa học khi mở modal gắn Source
  useEffect(() => {
    if (isExistingSourceModalOpen) {
      setIsLoadingCourseDocs(true);
      setAttachedDocNotice(null);

      const fetchDocs = async () => {
        try {
          let docs: LessonAttachment[] = [];

          // 1. Thử lấy từ endpoint cấp khóa học: /api/courses/{courseId}/attachments
          if (currentCourse?.id && currentCourse.id > 0) {
            try {
              docs = await attachmentApi.getCourseAttachments(currentCourse.id);
            } catch {
              docs = [];
            }
          }

          // 2. Nếu danh sách rỗng nhưng đang mở một bài học cụ thể, truy vấn trực tiếp bài học đó
          if ((!docs || docs.length === 0) && activeLesson?.id) {
            try {
              const lessonDocs = await attachmentApi.getAttachments(activeLesson.id);
              if (Array.isArray(lessonDocs) && lessonDocs.length > 0) {
                docs = lessonDocs;
              }
            } catch {
              // ignore
            }
          }

          // 3. Nếu vẫn rỗng, lặp qua tất cả các bài học thuộc môn học của khóa học để gom tài liệu
          const courseDetail = currentCourse && 'subjects' in currentCourse ? (currentCourse as CourseDetail) : null;
          if ((!docs || docs.length === 0) && courseDetail?.subjects) {
            const allLessonIds: number[] = [];
            courseDetail.subjects.forEach((subj) => {
              subj.lessons?.forEach((les) => {
                if (les.id && !allLessonIds.includes(les.id)) {
                  allLessonIds.push(les.id);
                }
              });
            });

            if (allLessonIds.length > 0) {
              const nestedResults = await Promise.all(
                allLessonIds.map(async (lesId) => {
                  try {
                    return await attachmentApi.getAttachments(lesId);
                  } catch {
                    return [];
                  }
                })
              );
              const flat = nestedResults.flat();
              // Lọc trùng theo id
              const seen = new Set<number>();
              docs = flat.filter((item) => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              });
            }
          }

          setCourseAttachments(Array.isArray(docs) ? docs : []);
        } catch {
          setCourseAttachments([]);
        } finally {
          setIsLoadingCourseDocs(false);
        }
      };

      fetchDocs();
    }
  }, [isExistingSourceModalOpen, currentCourse, activeLesson?.id]);

  // Source form states
  const [newSourceTitle, setNewSourceTitle] = useState<string>('');
  const [newSourceContent, setNewSourceContent] = useState<string>('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notebook form states
  const [newNotebookTitle, setNewNotebookTitle] = useState<string>('');
  const [newNotebookDesc, setNewNotebookDesc] = useState<string>('');

  // Podcast form states
  const [newPodcastName, setNewPodcastName] = useState<string>('');
  const [newPodcastProfile, setNewPodcastProfile] = useState<string>('solo_expert');
  const [newPodcastContent, setNewPodcastContent] = useState<string>('');
  const [podcastTargetNbId, setPodcastTargetNbId] = useState<string>('');
  const [podcastPreviewSources, setPodcastPreviewSources] = useState<NotebookSource[]>([]);
  const [isLoadingPodcastSources, setIsLoadingPodcastSources] = useState<boolean>(false);

  // Tự động tải danh sách tài liệu của Sổ tay nguồn để xem trước khi tạo Podcast
  useEffect(() => {
    if (isNewModalOpen && modalType === 'PODCAST') {
      const validNbs = notebooks.filter((nb) => (nb.source_count || 0) > 0);
      const effectiveId =
        podcastTargetNbId ||
        (activeNotebook && (activeNotebook.source_count || 0) > 0
          ? activeNotebook.id
          : validNbs[0]?.id || '');

      if (effectiveId) {
        if (!podcastTargetNbId) setPodcastTargetNbId(effectiveId);
        setIsLoadingPodcastSources(true);
        notebookService
          .getSourcesByNotebook(effectiveId)
          .then((res) => setPodcastPreviewSources(res))
          .catch(() => setPodcastPreviewSources([]))
          .finally(() => setIsLoadingPodcastSources(false));
      } else {
        setPodcastPreviewSources([]);
      }
    }
  }, [isNewModalOpen, modalType, podcastTargetNbId, activeNotebook, notebooks]);

  // Search & Ask states
  const [searchQueryInput, setSearchQueryInput] = useState<string>('');
  const [askQuestionInput, setAskQuestionInput] = useState<string>('');
  const [searchFilterType, setSearchFilterType] = useState<'text' | 'vector'>('text');

  // Audio Podcast Player & Vietnamese Voice States
  const [playingPodcastId, setPlayingPodcastId] = useState<string | null>(null);
  const [viewingTranscriptId, setViewingTranscriptId] = useState<string | null>(null);
  const [isSynthesizingAudioId, setIsSynthesizingAudioId] = useState<string | null>(null);
  const [vietnameseVoices, setVietnameseVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [globalVoiceType, setGlobalVoiceType] = useState<string>('vi-VN-HoaiMyNeural');
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1.0);
  const [playbackSourceType, setPlaybackSourceType] = useState<'AUDIO' | 'SYNTHESIS'>('AUDIO');
  const [newPodcastVoice, setNewPodcastVoice] = useState<string>('vi-VN-HoaiMyNeural');
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Tự động cuộn xuống tin nhắn mới nhất trong khung chat RAG
  useEffect(() => {
    if (currentTab === 'ASK_SEARCH') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAsking, currentTab]);

  // Phát hiện và nạp danh sách giọng tiếng Việt của trình duyệt (Web Speech API)
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const vi = allVoices.filter(
        (v) =>
          v.lang === 'vi-VN' ||
          v.lang.toLowerCase().startsWith('vi') ||
          v.name.toLowerCase().includes('vietnam') ||
          v.name.toLowerCase().includes('tiếng việt') ||
          v.name.toLowerCase().includes('hoaimy') ||
          v.name.toLowerCase().includes('namminh')
      );
      setVietnameseVoices(vi);
      if (vi.length > 0) {
        const preferred =
          vi.find(
            (v) =>
              v.name.includes('Natural') ||
              v.name.includes('Online') ||
              v.name.includes('Neural') ||
              v.name.toLowerCase().includes('google')
          ) || vi[0];
        setSelectedBrowserVoice((prev) => prev || preferred);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  // Làm sạch văn bản kịch bản để giọng đọc lưu loát, tự nhiên
  const cleanScriptForSpeech = (rawText: string): string => {
    if (!rawText || typeof rawText !== 'string') return '';
    return rawText
      .replace(/^#{1,6}\s+.*$/gm, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/`{1,3}.*?`{1,3}/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleTogglePlayPodcast = async (ep: any) => {
    // 1. Nếu đang phát tập này thì bấm sẽ dừng lại
    if (playingPodcastId === ep.id) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setPlayingPodcastId(null);
      return;
    }

    // Dừng âm thanh hiện tại nếu đang phát tập khác
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    // 2. Chế độ phát giọng đọc trình duyệt (Web Speech API với giọng tiếng Việt gán trực tiếp)
    if (globalVoiceType === 'browser') {
      const rawText = cleanScriptForSpeech(ep.transcript || ep.name);
      if (rawText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(rawText);
        const targetVoice = selectedBrowserVoice || vietnameseVoices[0];
        if (targetVoice) {
          utter.voice = targetVoice;
          utter.lang = targetVoice.lang || 'vi-VN';
        } else {
          utter.lang = 'vi-VN';
        }
        utter.rate = audioPlaybackRate;
        utter.onend = () => {
          setPlayingPodcastId(null);
        };
        utter.onerror = () => {
          setPlayingPodcastId(null);
        };
        setPlaybackSourceType('SYNTHESIS');
        setPlayingPodcastId(ep.id);
        window.speechSynthesis.speak(utter);
        return;
      }
    }

    // 3. Chế độ phát âm thanh AI Microsoft Edge-TTS tiếng Việt (Hoài My / Nam Minh)
    const isLiveAudioUrl =
      ep.audio_url &&
      (ep.audio_url.startsWith('http') || ep.audio_url.includes('/Audios/'));

    if (isLiveAudioUrl) {
      // Đã có audio chuẩn từ Azure -> phát trực tiếp
      setPlaybackSourceType('AUDIO');
      setPlayingPodcastId(ep.id);
      setTimeout(() => {
        if (audioElementRef.current) {
          audioElementRef.current.playbackRate = audioPlaybackRate;
          audioElementRef.current.play().catch(() => {});
        }
      }, 50);
      return;
    }

    // Nếu chưa có file audio riêng của tập này, gọi Azure Edge-TTS sinh ngay lập tức
    const scriptText = cleanScriptForSpeech(ep.transcript || ep.name);
    if (scriptText) {
      setIsSynthesizingAudioId(ep.id);
      try {
        const voiceToUse = globalVoiceType.startsWith('vi-VN-') ? globalVoiceType : 'vi-VN-HoaiMyNeural';
        const textToSynthesize = scriptText.length > 1900 ? scriptText.slice(0, 1900) : scriptText;
        const res = await ttsApi.synthesizeSpeech(textToSynthesize, voiceToUse);
        if (res?.audioUrl) {
          ep.audio_url = res.audioUrl;
          await notebookService.updatePodcastAudio(ep.id, res.audioUrl);
          setPlaybackSourceType('AUDIO');
          setPlayingPodcastId(ep.id);
          setTimeout(() => {
            if (audioElementRef.current) {
              audioElementRef.current.playbackRate = audioPlaybackRate;
              audioElementRef.current.play().catch(() => {});
            }
          }, 50);
          return;
        }
      } catch (err) {
        console.warn('Lỗi sinh giọng AI Edge-TTS, tự động fallback sang giọng tiếng Việt của trình duyệt:', err);
      } finally {
        setIsSynthesizingAudioId(null);
      }
    }

    // Fallback sang Web Speech API với giọng tiếng Việt nếu API Edge-TTS gặp sự cố
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(cleanScriptForSpeech(ep.transcript || ep.name));
      const targetVoice = selectedBrowserVoice || vietnameseVoices[0];
      if (targetVoice) {
        utter.voice = targetVoice;
        utter.lang = targetVoice.lang || 'vi-VN';
      } else {
        utter.lang = 'vi-VN';
      }
      utter.rate = audioPlaybackRate;
      utter.onend = () => setPlayingPodcastId(null);
      utter.onerror = () => setPlayingPodcastId(null);
      setPlaybackSourceType('SYNTHESIS');
      setPlayingPodcastId(ep.id);
      window.speechSynthesis.speak(utter);
      return;
    }

    // Fallback cuối cùng: phát tệp âm thanh demo tiếng Việt
    setPlaybackSourceType('AUDIO');
    setPlayingPodcastId(ep.id);
  };

  // Mở modal thêm Source có chỉ định trước Sổ tay đích
  const openAddSourceModal = (initialNotebookId?: string, defaultMode: 'UPLOAD' | 'TEXT' | 'LESSON' = 'UPLOAD') => {
    setModalType('SOURCE');
    setSourceAddMode(defaultMode);
    setTargetNotebookId(initialNotebookId || activeNotebook?.id || '');
    setNewSourceTitle('');
    setNewSourceContent('');
    setSelectedUploadFile(null);
    setIsNewModalOpen(true);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedUploadFile(file);
    if (!newSourceTitle.trim()) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setNewSourceTitle(nameWithoutExt);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Nạp nhanh bài giảng hiện tại vào Notebook với đầy đủ context SQL thực tế
  const handleQuickSyncCurrentLesson = async (customNbId?: string) => {
    if (!activeLesson || !currentCourse) return;
    await syncCurrentLessonFull(
      activeLesson,
      currentCourse,
      undefined, // subjectTitle (optional)
      customNbId || activeNotebook?.id
    );
  };

  // Xử lý tạo mới từ Modal
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'NOTEBOOK' && newNotebookTitle.trim()) {
        await createNotebook(newNotebookTitle.trim(), newNotebookDesc.trim());
        setNewNotebookTitle('');
        setNewNotebookDesc('');
        setIsNewModalOpen(false);
      } else if (modalType === 'SOURCE') {
        if (sourceAddMode === 'UPLOAD') {
          if (!selectedUploadFile) return;
          await uploadFileSource(
            selectedUploadFile,
            targetNotebookId || undefined,
            newSourceTitle.trim() || selectedUploadFile.name
          );
          setSelectedUploadFile(null);
          setNewSourceTitle('');
          setIsNewModalOpen(false);
        } else if (sourceAddMode === 'TEXT') {
          if (!newSourceTitle.trim() || !newSourceContent.trim()) return;
          await syncLessonSource(
            newSourceTitle.trim(),
            newSourceContent.trim(),
            targetNotebookId || undefined
          );
          setNewSourceTitle('');
          setNewSourceContent('');
          setIsNewModalOpen(false);
        } else if (sourceAddMode === 'LESSON') {
          // Dùng syncCurrentLessonFull để có lessonId/courseId thật
          if (!activeLesson || !currentCourse) return;
          await syncCurrentLessonFull(
            activeLesson,
            currentCourse,
            undefined,
            targetNotebookId || undefined
          );
          setIsNewModalOpen(false);
        }
      } else if (modalType === 'PODCAST' && newPodcastName.trim()) {
        const selectedProfile = episodeProfiles.find((p) => p.name === newPodcastProfile);
        const resolvedSpeaker =
          selectedProfile?.speaker_config_name || selectedProfile?.speaker_config || 'solo_expert';

        // 1. Xác định Sổ tay mục tiêu (bắt buộc phải có tài liệu)
        const validNbs = notebooks.filter((nb) => (nb.source_count || 0) > 0);
        const targetNbId =
          podcastTargetNbId ||
          (activeNotebook && (activeNotebook.source_count || 0) > 0 ? activeNotebook.id : validNbs[0]?.id);

        if (!targetNbId) {
          alert('Vui lòng chọn một Sổ tay có gắn ít nhất 1 tài liệu để AI có dữ liệu tạo Podcast!');
          return;
        }

        const targetNb = notebooks.find((nb) => nb.id === targetNbId) || activeNotebook;

        // 2. Lấy toàn bộ tài liệu nguồn từ Sổ tay đó
        let nbSources = await notebookService.getSourcesByNotebook(targetNbId);

        // 3. Tự động phục hồi nội dung (Auto-hydrate) nếu tài liệu mới chỉ lưu placeholder URL
        for (const src of nbSources) {
          const isMissing =
            !src.full_text ||
            src.full_text.length < 500 ||
            (src.full_text.includes('Đường dẫn tệp gốc: http') && !src.full_text.includes('--- NỘI DUNG VĂN BẢN TRÍCH XUẤT ---'));

          if (isMissing) {
            const urlMatch = (src.full_text || '').match(/Đường dẫn tệp gốc:\s*(https?:\/\/[^\s\n\r]+)/i);
            if (urlMatch && urlMatch[1]) {
              try {
                const rawExtracted = await extractTextFromRemoteUrl(urlMatch[1], src.title);
                if (rawExtracted && rawExtracted.trim().length > 20) {
                  src.full_text = formatExtractedDocumentContent(
                    src.title.replace(/^\[Tài liệu\]\s*/i, ''),
                    rawExtracted,
                    {
                      courseTitle: currentCourse?.title,
                      fileUrl: urlMatch[1],
                    }
                  );
                }
              } catch (healErr) {
                console.warn('Auto-hydrate failed in podcast submit:', healErr);
              }
            }
          }
        }

        const validSources = nbSources.filter((s) => s.full_text && s.full_text.trim().length > 20);
        if (validSources.length === 0) {
          alert(`Sổ tay "${targetNb?.name}" chưa có nội dung tài liệu thực tế. Vui lòng gắn ít nhất 1 tệp tài liệu trước khi tạo Podcast!`);
          return;
        }

        // 4. Định dạng toàn bộ tài liệu nguồn với dung lượng đầy đủ (tối đa 5.000 ký tự mỗi tệp)
        const sourcesText = validSources
          .slice(0, 5)
          .map((s, idx) => `=== TÀI LIỆU NGUỒN ${idx + 1}: ${s.title} ===\n${(s.full_text || '').substring(0, 5000)}`)
          .join('\n\n');

        let contentToUse = `=== TỔNG HỢP TOÀN BỘ TÀI LIỆU HỌC TẬP TỪ SỔ TAY: "${targetNb?.name || 'Khóa học'}" ===\n\n${sourcesText}`;

        if (newPodcastContent.trim()) {
          contentToUse += `\n\n=== GHI CHÚ / YÊU CẦU ĐẶC BIỆT CỦA HỌC VIÊN ===\n${newPodcastContent.trim()}`;
        }

        await createPodcast(
          newPodcastName.trim(),
          newPodcastProfile,
          resolvedSpeaker,
          contentToUse,
          targetNbId,
          newPodcastVoice
        );
        setNewPodcastName('');
        setNewPodcastContent('');
        setIsNewModalOpen(false);
      }
    } catch {
      // Error handled by hook
    }
  };


  const QUICK_PROMPTS = [
    'Tóm tắt các điểm quan trọng nhất trong bài học này',
    'Giải thích các khái niệm cốt lõi bằng ví dụ dễ hiểu',
    'Tạo 3 câu hỏi trắc nghiệm ôn tập kèm đáp án',
  ];

  return (
    <div className="w-full flex-1 flex flex-col bg-[#070b18] text-slate-100 rounded-2xl sm:rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl h-[calc(100vh-130px)] min-h-[640px] max-h-[960px]">
      {/* =========================================================================
          TOP ACTION BAR
      ========================================================================= */}
      <header className="px-4 sm:px-6 py-3 bg-slate-900/95 backdrop-blur-md border-b border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBackToWorkspace && (
            <button
              onClick={onBackToWorkspace}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Quay lại Phòng học"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Phòng học</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {activeNotebook ? activeNotebook.name : 'Chưa chọn Sổ tay'}
            </span>
            {activeNotebook && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                {sources.length} tài liệu
              </span>
            )}
            {/* Badge bài học đang xem */}
            {activeLesson && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-500/30 max-w-[160px]">
                <Play className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{activeLesson.title}</span>
              </span>
            )}
          </div>
        </div>

        {/* Trạng thái AI an toàn (Không hiển thị tên model cụ thể hay port kết nối) */}
        <div className="flex items-center gap-2.5 ml-auto">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              status.isOnline
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="text-[11px]">{status.isOnline ? 'AI Sẵn sàng' : 'AI Ngoại tuyến'}</span>
          </div>

          <button
            onClick={() => refreshAll()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-white/10"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN LAYOUT: SIDEBAR (4 MỤC) + MAIN CONTENT
      ========================================================================= */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* =========================================================================
            SIDEBAR GIAO DIỆN NATIVE
        ========================================================================= */}
        <aside className="w-full md:w-64 bg-[#0d121f] border-b md:border-b-0 md:border-r border-indigo-500/20 flex flex-col shrink-0 min-h-0">
          {/* Header macOS Dots + Logo */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="font-bold text-sm text-white ml-1.5 flex items-center gap-1.5">
                Sổ Tay AI Tri Thức
              </span>
            </div>
          </div>

          {/* Nút to màu xanh lá "+ New" - Chỉ hiển thị cho Teacher & Admin */}
          {isTeacherOrAdmin && (
            <div className="p-3">
              <button
                onClick={() => {
                  if (currentTab === 'SOURCES') {
                    openAddSourceModal(undefined, 'UPLOAD');
                  } else if (currentTab === 'NOTEBOOKS') {
                    setModalType('NOTEBOOK');
                    setIsNewModalOpen(true);
                  } else if (currentTab === 'PODCASTS') {
                    setModalType('PODCAST');
                    setIsNewModalOpen(true);
                  } else {
                    openAddSourceModal(undefined, 'UPLOAD');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-98"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="text-sm">New</span>
              </button>
            </div>
          )}

          {/* Menu Navigation 4 Chức Năng Chuẩn */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 custom-scrollbar">
            {/* 1. COLLECT */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                COLLECT
              </p>
              <button
                onClick={() => setCurrentTab('SOURCES')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  currentTab === 'SOURCES'
                    ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className={`w-4 h-4 ${currentTab === 'SOURCES' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Sources</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">
                  {allSources.length}
                </span>
              </button>
            </div>

            {/* 2. PROCESS */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                PROCESS
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setCurrentTab('NOTEBOOKS')}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentTab === 'NOTEBOOKS'
                      ? 'bg-purple-950/70 border border-purple-500/40 text-purple-300 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BookMarked className={`w-4 h-4 ${currentTab === 'NOTEBOOKS' ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span>Notebooks</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">
                    {notebooks.length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentTab('ASK_SEARCH')}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentTab === 'ASK_SEARCH'
                      ? 'bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Search className={`w-4 h-4 ${currentTab === 'ASK_SEARCH' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>Ask and Search</span>
                </button>
              </div>
            </div>

            {/* 3. CREATE */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
                CREATE
              </p>
              <button
                onClick={() => setCurrentTab('PODCASTS')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  currentTab === 'PODCASTS'
                    ? 'bg-pink-950/70 border border-pink-500/40 text-pink-300 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mic className={`w-4 h-4 ${currentTab === 'PODCASTS' ? 'text-pink-400' : 'text-slate-500'}`} />
                <span>Podcasts</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">
                  {podcasts.length}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            MAIN CONTENT AREA CHO 4 CHỨC NĂNG
        ========================================================================= */}
        <main className={`flex-1 flex flex-col bg-[#050814] min-h-0 ${currentTab === 'ASK_SEARCH' ? 'overflow-hidden p-3 sm:p-5' : 'overflow-y-auto custom-scrollbar p-4 sm:p-6'}`}>
          {error && (
            <div className="mb-4 px-3.5 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* =====================================================================
              VIEW 1: SOURCES (QUẢN LÝ TÀI LIỆU & NGUỒN TRI THỨC)
          ===================================================================== */}
          {currentTab === 'SOURCES' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Quản Lý Nguồn Tri Thức (Sources)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toàn bộ tài liệu, slide, văn bản bài giảng đã được nạp để AI học và trích dẫn.
                  </p>
                </div>

                {isTeacherOrAdmin && (
                  <div className="flex items-center gap-2">
                    {activeLesson && (
                      <button
                        onClick={() => handleQuickSyncCurrentLesson()}
                        disabled={isSyncing}
                        className="px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        title="Nạp bài giảng đang xem vào nguồn tài liệu"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isSyncing ? 'Đang nạp...' : 'Nạp bài giảng hiện tại'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => openAddSourceModal(undefined, 'UPLOAD')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-600/30"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>Thêm tài liệu (Tải file / Chữ)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Grid danh sách Sources */}
              {allSources.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Chưa có nguồn tài liệu nào</p>
                  <p className="text-xs mt-1">
                    {isTeacherOrAdmin
                      ? 'Bấm "Thêm tài liệu" để tải file PDF, Word, TXT hoặc nạp bài giảng cho AI.'
                      : 'Các tài liệu học tập sẽ được giảng viên cập nhật tại đây.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {allSources.map((source) => {
                    const fileName = source.asset?.file_path ? source.asset.file_path.split('/').pop() : null;
                    const fileExt = fileName ? fileName.split('.').pop()?.toUpperCase() : (source.asset ? 'FILE' : 'TEXT');
                    return (
                      <div
                        key={source.id}
                        className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold text-slate-300 shrink-0">
                                {fileExt}
                              </span>
                              <h3 className="text-xs font-bold text-white line-clamp-2" title={source.title}>
                                {source.title}
                              </h3>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                source.embedded
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {source.embedded ? 'Vector OK' : 'Đang xử lý'}
                            </span>
                          </div>

                          {fileName && (
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 font-mono">
                              <Paperclip className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>{fileName}</span>
                            </p>
                          )}

                          <p className="text-[11px] text-slate-500 font-mono">
                            ID: {source.id}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5">
                          <button
                            onClick={() => viewSourceDetail(source.id)}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Xem toàn văn</span>
                          </button>

                          {isTeacherOrAdmin && (
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa vĩnh viễn tài liệu "${source.title}"?`)) {
                                  removeSource(source.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                              title="Xóa tài liệu này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VIEW 2: NOTEBOOKS (QUẢN LÝ SỔ TAY BÀI HỌC)
          ===================================================================== */}
          {currentTab === 'NOTEBOOKS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookMarked className="w-5 h-5 text-purple-400" />
                    Quản Lý Sổ Tay Bài Học (Notebooks)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mỗi sổ tay là một không gian tri thức chứa tài liệu và lịch sử hỏi đáp của từng môn học.
                  </p>
                </div>

                {isTeacherOrAdmin && (
                  <div className="flex items-center gap-2">
                    {currentCourse && (
                      <button
                        onClick={async () => {
                          await createNotebook(`Khóa học: ${currentCourse.title}`, currentCourse.description);
                        }}
                        className="px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-purple-300" />
                        <span>Tạo từ Khóa học này</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setModalType('NOTEBOOK');
                        setIsNewModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-purple-600/30"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tạo Sổ tay mới</span>
                    </button>
                  </div>
                )}
              </div>

                {/* Grid danh sách Notebooks */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Danh sách Sổ tay ({notebooks.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {notebooks.map((nb) => {
                      const isCurrent = activeNotebook?.id === nb.id;
                      return (
                        <div
                          key={nb.id}
                          onClick={() => selectNotebook(nb)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                            isCurrent
                              ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-500/30'
                              : 'bg-slate-900/60 hover:bg-slate-900 border-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-xs font-bold truncate">
                                {nb.name}
                              </h3>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Đang chọn
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {nb.description || 'Không có mô tả'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] text-slate-400">
                            <span className="font-semibold">{nb.source_count || 0} tài liệu</span>
                            {isTeacherOrAdmin && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddSourceModal(nb.id, 'UPLOAD');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Thêm source vào sổ tay này"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Thêm Source</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Bạn có chắc muốn xóa sổ tay "${nb.name}"?`)) {
                                      removeNotebook(nb.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                                  title="Xóa sổ tay này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* KHU VỰC CHI TIẾT SỔ TAY ĐANG CHỌN & QUẢN LÝ SOURCES CỦA SỔ TAY */}
                {activeNotebook ? (
                  <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/70 to-slate-900/90 border border-purple-500/30 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-lg shadow-purple-950/20">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                            <BookMarked className="w-4 h-4 text-purple-300" />
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                            {activeNotebook.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-semibold text-xs border border-purple-500/30 flex items-center gap-1.5 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            {sources.length} tài liệu liên kết
                          </span>
                        </div>
                        {activeNotebook.description && (
                          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed pl-10">
                            {activeNotebook.description}
                          </p>
                        )}
                      </div>

                      {/* Toolbar thao tác sổ tay: Đều nhau, chuẩn chiều cao h-9, decor hiện đại */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 shrink-0">
                        {isTeacherOrAdmin && (
                          <>
                            {/* Nút Thêm Source mới */}
                            <button
                              onClick={() => openAddSourceModal(activeNotebook.id, 'UPLOAD')}
                              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer whitespace-nowrap border border-emerald-400/20"
                              title="Tải file hoặc nhập văn bản mới vào Sổ tay này"
                            >
                              <FileUp className="w-4 h-4 text-emerald-100" />
                              <span>Thêm Source mới</span>
                            </button>

                            {/* Nút Gắn Source có sẵn */}
                            <button
                              onClick={() => setIsExistingSourceModalOpen(true)}
                              className="h-9 px-3.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-sm"
                              title="Chọn tài liệu đã có trong kho để gắn vào Sổ tay này"
                            >
                              <Layers className="w-4 h-4 text-indigo-300" />
                              <span>Gắn Source có sẵn</span>
                            </button>
                          </>
                        )}

                        {/* Nút Chuyển sang Hỏi đáp về Sổ tay này */}
                        <button
                          onClick={() => setCurrentTab('ASK_SEARCH')}
                          className="h-9 px-3.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-500/30 text-purple-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-sm"
                          title="Hỏi đáp AI về các tài liệu trong Sổ tay này"
                        >
                          <Sparkles className="w-4 h-4 text-purple-300" />
                          <span>Hỏi đáp RAG</span>
                        </button>
                      </div>
                    </div>

                    {/* Danh sách Sources của Sổ tay */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <span>Tài liệu trong Sổ tay này ({sources.length})</span>
                        </h4>
                        {activeLesson && isTeacherOrAdmin && (
                          <button
                            onClick={() => handleQuickSyncCurrentLesson(activeNotebook.id)}
                            disabled={isSyncing}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Nạp bài giảng hiện tại</span>
                          </button>
                        )}
                      </div>

                      {sources.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-slate-900/30 border border-dashed border-white/10 text-center space-y-3">
                          <FileText className="w-10 h-10 mx-auto text-slate-600" />
                          <div>
                            <p className="text-xs font-bold text-slate-300">Sổ tay này chưa có tài liệu nào</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {isTeacherOrAdmin
                                ? 'Hãy tải file tài liệu (PDF, Word, TXT) hoặc gắn tài liệu từ kho để AI tra cứu bài học.'
                                : 'Giáo viên chưa bổ sung tài liệu học tập vào sổ tay này.'}
                            </p>
                          </div>
                          {isTeacherOrAdmin && (
                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                              <button
                                onClick={() => openAddSourceModal(activeNotebook.id, 'UPLOAD')}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                              >
                                <FileUp className="w-3.5 h-3.5" />
                                <span>Tải file lên</span>
                              </button>
                              <button
                                onClick={() => setIsExistingSourceModalOpen(true)}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Gắn tài liệu có sẵn</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {sources.map((src) => {
                            const fileName = src.asset?.file_path ? src.asset.file_path.split('/').pop() : null;
                            const fileExt = fileName ? fileName.split('.').pop()?.toUpperCase() : (src.asset ? 'FILE' : 'TEXT');
                            return (
                              <div
                                key={src.id}
                                className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between group"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold text-slate-300 shrink-0">
                                        {fileExt}
                                      </span>
                                      <h5 className="text-xs font-bold text-white truncate" title={src.title}>
                                        {src.title}
                                      </h5>
                                    </div>
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                                        src.embedded
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-amber-500/20 text-amber-400'
                                      }`}
                                    >
                                      {src.embedded ? 'Vector OK' : 'Đang xử lý'}
                                    </span>
                                  </div>

                                  {fileName && (
                                    <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-mono">
                                      <Paperclip className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span>{fileName}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/5 text-[11px]">
                                  <button
                                    onClick={() => viewSourceDetail(src.id)}
                                    className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    <span>Toàn văn</span>
                                  </button>

                                  {isTeacherOrAdmin && (
                                    <div className="flex items-center gap-1">
                                      {/* Gỡ khỏi sổ tay */}
                                      <button
                                        onClick={() => {
                                          if (confirm(`Bạn có muốn gỡ tài liệu "${src.title}" ra khỏi Sổ tay này? (Tài liệu vẫn được giữ trong kho)`)) {
                                            detachSourceFromNotebook(src.id, activeNotebook.id);
                                          }
                                        }}
                                        className="p-1 text-slate-400 hover:text-amber-400 transition-all rounded hover:bg-white/5 cursor-pointer"
                                        title="Gỡ khỏi Sổ tay này"
                                      >
                                        <Unlink className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Xóa vĩnh viễn */}
                                      <button
                                        onClick={() => {
                                          if (confirm(`Bạn có chắc muốn xóa VĨNH VIỄN tài liệu "${src.title}" khỏi toàn bộ hệ thống?`)) {
                                            removeSource(src.id);
                                          }
                                        }}
                                        className="p-1 text-slate-500 hover:text-rose-400 transition-all rounded hover:bg-white/5 cursor-pointer"
                                        title="Xóa vĩnh viễn tài liệu"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 p-8 rounded-2xl bg-slate-900/30 border border-dashed border-white/10 text-center">
                    <p className="text-xs text-slate-400">Chọn một Sổ tay ở trên để xem chi tiết và quản lý các tài liệu của sổ tay đó.</p>
                  </div>
                )}
              </div>
            )}

          {/* =====================================================================
              VIEW 3: ASK AND SEARCH (HỎI ĐÁP & TÌM KIẾM THÔNG MINH RAG)
          ===================================================================== */}
          {currentTab === 'ASK_SEARCH' && (
            <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
              {/* Tab con: Tìm kiếm kiến thức VS Hỏi đáp RAG */}
              <div className="mb-3.5 pb-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>Hỏi Đáp &amp; Tìm Kiếm Tri Thức (Ask and Search)</span>
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Tra cứu RAG trực tiếp từ tài liệu bài giảng và sổ tay học tập
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tìm kiếm nhanh */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQueryInput}
                      onChange={(e) => setSearchQueryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchKnowledge(searchQueryInput, searchFilterType);
                        }
                      }}
                      placeholder="Tìm từ khóa trong tài liệu..."
                      className="w-48 sm:w-64 px-3 py-1.5 pl-8 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    onClick={() => searchKnowledge(searchQueryInput, searchFilterType)}
                    disabled={isSearching}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {isSearching ? 'Tìm...' : 'Tìm'}
                  </button>
                </div>
              </div>

              {/* Nếu có kết quả tìm kiếm, hiển thị bảng kết quả */}
              {searchResults.length > 0 && (
                <div className="mb-3 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2 shrink-0 max-h-40 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">
                      Kết quả tìm kiếm ({searchResults.length})
                    </span>
                    <button
                      onClick={() => searchKnowledge('')}
                      className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.map((r) => (
                      <div key={r.id} className="p-2 rounded-xl bg-slate-900/60 text-xs flex items-center justify-between">
                        <span className="font-semibold text-white">{r.title}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Độ khớp: {Math.round(r.relevance)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Khung Chat RAG với AI - CỐ ĐỊNH, CHỈ CUỘN NỘI BỘ, KHÔNG KÉO DÀI WEB */}
              <div className="flex-1 flex flex-col bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden min-h-0 shadow-2xl">
                {/* Header Context của đoạn Chat */}
                <div className="px-4 py-2.5 bg-slate-950/80 border-b border-white/5 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-white truncate">
                      {activeNotebook ? activeNotebook.name : 'Sổ tay toàn hệ thống'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-semibold border border-indigo-500/25 shrink-0">
                      {sources.length} tài liệu RAG
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Phản hồi từ tài liệu</span>
                    {messages.length > 0 && (
                      <button
                        onClick={clearMessages}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer"
                        title="Xóa lịch sử tin nhắn của phiên này"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa lịch sử</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tin nhắn - KHUNG TRƯỢT BÊN TRONG CÓ THANH CUỘN */}
                <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar min-h-0 scroll-smooth">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center mb-3">
                        <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">
                        Trợ Lý AI Tri Thức Sẵn Sàng
                      </h3>
                      <p className="text-xs text-slate-400 mb-5">
                        Tốc độ phản hồi ~2 giây! Đặt câu hỏi để AI tra cứu tài liệu bài học và trả lời chính xác.
                      </p>

                      <div className="w-full space-y-2">
                        {QUICK_PROMPTS.map((p, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              askQuestion(p);
                            }}
                            className="w-full p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/40 text-left text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between"
                          >
                            <span>{p}</span>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((m) => {
                        const isUser = m.sender === 'user';
                        return (
                          <div
                            key={m.id}
                            className={`flex gap-3 max-w-3xl ${
                              isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                            }`}
                          >
                            <div
                              className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                                isUser ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                              }`}
                            >
                              {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>

                            <div
                              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                isUser
                                  ? 'bg-indigo-600 text-white rounded-tr-none'
                                  : m.isError
                                  ? 'bg-rose-950/80 border border-rose-500/30 text-rose-200 rounded-tl-none'
                                  : 'bg-slate-900/90 border border-indigo-500/20 text-slate-200 rounded-tl-none shadow-sm'
                              }`}
                            >
                              {/* Nội dung tin nhắn - render markdown cơ bản */}
                              <div className="whitespace-pre-wrap">
                                {m.text.split('\n').map((line, li) => {
                                  // Bold: **text**
                                  const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                                  // Bullet list
                                  if (line.match(/^[-•*]\s+/)) {
                                    return (
                                      <div key={li} className="flex items-start gap-1.5 my-0.5">
                                        <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                                        <span dangerouslySetInnerHTML={{ __html: boldLine.replace(/^[-•*]\s+/, '') }} />
                                      </div>
                                    );
                                  }
                                  // Numbered list
                                  if (line.match(/^\d+\.\s+/)) {
                                    const num = line.match(/^(\d+)\./)?.[1];
                                    return (
                                      <div key={li} className="flex items-start gap-1.5 my-0.5">
                                        <span className="text-indigo-400 font-bold shrink-0 min-w-[16px]">{num}.</span>
                                        <span dangerouslySetInnerHTML={{ __html: boldLine.replace(/^\d+\.\s+/, '') }} />
                                      </div>
                                    );
                                  }
                                  return (
                                    <p key={li} className={line === '' ? 'h-2' : 'my-0.5'}
                                      dangerouslySetInnerHTML={{ __html: boldLine }} />
                                  );
                                })}
                              </div>

                              {/* Source reference - hiển thị bài học nguồn */}
                              {!isUser && m.sources && m.sources.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-indigo-500/20 flex flex-wrap gap-1">
                                  {m.sources.map((src, si) => (
                                    <span
                                      key={si}
                                      className="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-[10px] text-indigo-300 font-semibold flex items-center gap-1"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      {src}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <span className="block text-[10px] text-slate-500 mt-1.5 text-right font-mono">
                                {m.timestamp}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}

                  {isAsking && (
                    <div className="flex gap-3 max-w-xl mr-auto">
                      <div className="w-7 h-7 rounded-lg bg-purple-600 text-white shrink-0 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 animate-spin" />
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                        <span>AI đang đọc tài liệu và phân tích...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input gửi câu hỏi - CỐ ĐỊNH Ở ĐÁY KHUNG CHAT (shrink-0) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (askQuestionInput.trim()) {
                      askQuestion(askQuestionInput.trim());
                      setAskQuestionInput('');
                    }
                  }}
                  className="p-3 sm:p-3.5 border-t border-white/10 flex items-center gap-2 bg-slate-950/95 backdrop-blur-md shrink-0"
                >
                  <input
                    type="text"
                    value={askQuestionInput}
                    onChange={(e) => setAskQuestionInput(e.target.value)}
                    placeholder={activeNotebook ? `Hỏi đáp về "${activeNotebook.name}"...` : 'Hỏi bất kỳ điều gì về bài học này...'}
                    disabled={isAsking}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!askQuestionInput.trim() || isAsking}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Gửi</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* =====================================================================
              VIEW 4: PODCASTS (TẠO & PHÁT PODCAST AI BÀI HỌC)
          ===================================================================== */}
          {currentTab === 'PODCASTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Mic className="w-5 h-5 text-pink-400" />
                    Podcast Âm Thanh Bài Giảng AI (Podcasts)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Chuyển đổi bài học thành tập Podcast đối thoại âm thanh sống động để học mọi lúc mọi nơi.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refreshAll()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
                    title="Cập nhật danh sách podcasts"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Làm mới</span>
                  </button>

                  <button
                    onClick={() => {
                      setModalType('PODCAST');
                      setIsNewModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>+ Generate Podcast (Tạo mới)</span>
                  </button>
                </div>
              </div>

              {/* Thanh công cụ Cấu hình Giọng đọc Tiếng Việt & Tốc độ phát */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Volume2 className="w-4 h-4 text-pink-400" />
                    <span>Giọng đọc Tiếng Việt:</span>
                  </div>

                  {/* Dropdown chọn giọng */}
                  <select
                    value={globalVoiceType}
                    onChange={(e) => {
                      const newVoice = e.target.value;
                      setGlobalVoiceType(newVoice);
                      if (playingPodcastId) {
                        if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                        if (audioElementRef.current) audioElementRef.current.pause();
                        setPlayingPodcastId(null);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="vi-VN-HoaiMyNeural">🎙️ Hoài My (Nữ - AI Tự nhiên Microsoft Azure)</option>
                    <option value="vi-VN-NamMinhNeural">🎙️ Nam Minh (Nam - AI Trầm ấm Microsoft Azure)</option>
                    {vietnameseVoices.map((v) => (
                      <option key={v.name} value="browser">
                        🔊 Trình duyệt: {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>

                  {/* Tốc độ đọc */}
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Tốc độ:</span>
                    {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setAudioPlaybackRate(rate);
                          if (audioElementRef.current) audioElementRef.current.playbackRate = rate;
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          audioPlaybackRate === rate
                            ? 'bg-pink-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-pink-300/90 bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>Phát âm tiếng Việt chuẩn 100% tự nhiên</span>
                </div>
              </div>

              {/* Danh sách Podcasts */}
              {podcasts.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-900/30 border border-dashed border-white/10 rounded-3xl">
                  <Mic className="w-12 h-12 mx-auto opacity-30 text-pink-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-300">Chưa có tập Podcast nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Bấm "Generate Podcast" để AI tự động phân tích bài học và sinh giọng nói đối thoại sống động.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setModalType('PODCAST');
                      setIsNewModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tạo Podcast đầu tiên ngay</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {podcasts.map((ep) => {
                    const profileLabel =
                      typeof ep.episode_profile === 'object' && ep.episode_profile !== null
                        ? ep.episode_profile.name || 'AI Audio'
                        : ep.episode_profile || 'AI Audio';
                    const isJobRunning = ep.job_status === 'running' || ep.job_status === 'submitted';

                    return (
                      <div
                        key={ep.id}
                        className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-pink-500/40 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs font-bold text-white truncate" title={ep.name}>
                              {ep.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 shrink-0">
                              {profileLabel}
                            </span>
                          </div>

                          {/* Metadata bài học và khóa học thực tế */}
                          <div className="space-y-1">
                            {ep.lesson_title ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 truncate font-medium">
                                <FileText className="w-3 h-3 shrink-0 text-cyan-400" />
                                <span className="truncate">Bài học: {ep.lesson_title}</span>
                              </div>
                            ) : null}
                            {ep.course_title ? (
                              <div className="text-[10px] text-slate-400 truncate">
                                Khóa học: {ep.course_title}
                              </div>
                            ) : null}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                              <span>
                                {ep.created
                                  ? new Date(ep.created).toLocaleDateString('vi-VN', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    })
                                  : 'Gần đây'}
                              </span>
                              {ep.audio_url && (
                                <span className="text-emerald-400 flex items-center gap-1 font-sans text-[10px]">
                                  <Sparkles className="w-2.5 h-2.5" /> Âm thanh sẵn sàng
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                          {isJobRunning ? (
                            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/30">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              <span>Đang tổng hợp âm thanh...</span>
                            </div>
                          ) : isSynthesizingAudioId === ep.id ? (
                            <div className="flex items-center gap-2 text-xs text-pink-300 bg-pink-950/40 px-3 py-1.5 rounded-xl border border-pink-500/30">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                              <span>Đang tạo giọng tiếng Việt...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleTogglePlayPodcast(ep)}
                                className="px-3 py-1.5 rounded-xl bg-pink-600/80 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-pink-600/20"
                              >
                                {playingPodcastId === ep.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                <span>{playingPodcastId === ep.id ? 'Dừng phát' : 'Nghe Podcast'}</span>
                              </button>

                              {ep.transcript && (
                                <button
                                  onClick={() => {
                                    setViewingTranscriptId(viewingTranscriptId === ep.id ? null : ep.id);
                                  }}
                                  className={`p-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                                    viewingTranscriptId === ep.id
                                      ? 'bg-purple-900/50 border-purple-500/50 text-purple-200'
                                      : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-300'
                                  }`}
                                  title="Xem kịch bản thoại AI"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span className="text-[11px]">Kịch bản</span>
                                </button>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa tập Podcast "${ep.name}"?`)) {
                                removePodcast(ep.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Xóa tập Podcast này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Trình phát âm thanh khi bấm play */}
                        {playingPodcastId === ep.id && !isJobRunning && isSynthesizingAudioId !== ep.id && (
                          <div className="mt-3 pt-2 border-t border-white/5 space-y-2">
                            {/* Thanh sóng âm Equalizer sinh động */}
                            <div className="flex items-center justify-between text-xs text-pink-300 bg-pink-950/40 border border-pink-500/20 px-3 py-1.5 rounded-xl">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="w-1 h-3 bg-pink-400 rounded-full animate-pulse" />
                                  <span className="w-1 h-5 bg-pink-300 rounded-full animate-pulse [animation-delay:0.15s]" />
                                  <span className="w-1 h-2 bg-pink-500 rounded-full animate-pulse [animation-delay:0.3s]" />
                                  <span className="w-1 h-4 bg-pink-400 rounded-full animate-pulse [animation-delay:0.2s]" />
                                </div>
                                <span className="font-semibold text-[11px] text-pink-200">
                                  {playbackSourceType === 'AUDIO'
                                    ? 'Đang phát âm thanh AI chuẩn tiếng Việt (Edge-TTS)'
                                    : 'Đang đọc bằng giọng tiếng Việt của trình duyệt'}
                                </span>
                              </div>
                              <button
                                onClick={() => handleTogglePlayPodcast(ep)}
                                className="text-[10px] text-pink-300 hover:text-white underline cursor-pointer"
                              >
                                Dừng
                              </button>
                            </div>

                            {playbackSourceType === 'AUDIO' && (
                              <audio
                                ref={audioElementRef}
                                src={notebookService.getPodcastAudioUrl(ep.id)}
                                controls
                                autoPlay
                                onEnded={() => setPlayingPodcastId(null)}
                                className="w-full h-8 rounded-lg"
                              />
                            )}
                          </div>
                        )}

                        {/* Kịch bản đối thoại chi tiết (Transcript) */}
                        {viewingTranscriptId === ep.id && ep.transcript && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 text-xs text-slate-200 space-y-2 max-h-56 overflow-y-auto animate-fadeIn">
                            <div className="flex items-center justify-between pb-1 border-b border-white/10">
                              <span className="font-semibold text-purple-300 text-[11px] flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Kịch bản thoại AI
                              </span>
                              <button
                                onClick={() => setViewingTranscriptId(null)}
                                className="text-slate-400 hover:text-white text-[10px]"
                              >
                                Đóng
                              </button>
                            </div>
                            <div className="text-[11px] leading-relaxed whitespace-pre-line text-slate-300">
                              {typeof ep.transcript === 'string'
                                ? ep.transcript
                                : JSON.stringify(ep.transcript, null, 2)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODAL TẠO MỚI (NOTEBOOK / SOURCE / PODCAST)
      ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1423] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {modalType === 'NOTEBOOK' && 'Tạo Sổ Tay Mới'}
                {modalType === 'SOURCE' && 'Thêm Nguồn Tài Liệu (Source)'}
                {modalType === 'PODCAST' && 'Tạo & Sinh Podcast AI (Generate Audio)'}
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-3.5">
              {modalType === 'NOTEBOOK' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tên Sổ tay *
                    </label>
                    <input
                      type="text"
                      value={newNotebookTitle}
                      onChange={(e) => setNewNotebookTitle(e.target.value)}
                      placeholder="Ví dụ: Lập trình C# nâng cao..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mô tả (Tùy chọn)
                    </label>
                    <textarea
                      value={newNotebookDesc}
                      onChange={(e) => setNewNotebookDesc(e.target.value)}
                      placeholder="Ghi chú thêm về sổ tay..."
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </>
              )}

              {modalType === 'SOURCE' && (
                <>
                  {/* Tab chọn hình thức nạp tài liệu */}
                  <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/5 gap-1">
                    <button
                      type="button"
                      onClick={() => setSourceAddMode('UPLOAD')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        sourceAddMode === 'UPLOAD'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Tải File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceAddMode('TEXT')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        sourceAddMode === 'TEXT'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Nhập Chữ</span>
                    </button>
                    {activeLesson && (
                      <button
                        type="button"
                        onClick={() => setSourceAddMode('LESSON')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          sourceAddMode === 'LESSON'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        <span>Bài Giảng</span>
                      </button>
                    )}
                  </div>

                  {/* Chọn Sổ tay đích để gắn */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gắn vào Sổ tay nào?
                    </label>
                    <select
                      value={targetNotebookId}
                      onChange={(e) => setTargetNotebookId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    >
                      <option value="">Kho tài liệu chung (Không gắn vào Sổ tay)</option>
                      {notebooks.map((nb) => (
                        <option key={nb.id} value={nb.id}>
                          Sổ tay: {nb.name} ({nb.source_count || 0} tài liệu)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mode 1: Tải File Lên */}
                  {sourceAddMode === 'UPLOAD' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          File tài liệu (PDF, Word DOCX, TXT, MD, EPUB) *
                        </label>
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(true);
                          }}
                          onDragLeave={() => setIsDraggingFile(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingFile(false);
                            const droppedFile = e.dataTransfer.files?.[0];
                            if (droppedFile) handleFileChange(droppedFile);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                            isDraggingFile
                              ? 'border-emerald-400 bg-emerald-950/40'
                              : selectedUploadFile
                              ? 'border-emerald-500/50 bg-slate-900/90'
                              : 'border-white/10 hover:border-emerald-500/40 bg-slate-900/50 hover:bg-slate-900'
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.docx,.doc,.txt,.md,.epub"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileChange(f);
                            }}
                          />
                          {selectedUploadFile ? (
                            <div className="space-y-1">
                              <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <Check className="w-5 h-5" />
                              </div>
                              <p className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                                {selectedUploadFile.name}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {formatFileSize(selectedUploadFile.size)} • Nhấn để đổi file khác
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="w-8 h-8 mx-auto text-slate-500" />
                              <p className="text-xs font-semibold text-slate-300">
                                Kéo thả file vào đây hoặc <span className="text-emerald-400 font-bold">chọn file</span>
                              </p>
                              <p className="text-[10px] text-slate-500">
                                Hỗ trợ: PDF, Word (DOCX/DOC), Text (TXT), Markdown (MD), EPUB
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Tiêu đề tài liệu (Tùy chọn)
                        </label>
                        <input
                          type="text"
                          value={newSourceTitle}
                          onChange={(e) => setNewSourceTitle(e.target.value)}
                          placeholder="Mặc định lấy theo tên file..."
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Nhập Văn Bản */}
                  {sourceAddMode === 'TEXT' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Tiêu đề tài liệu *
                        </label>
                        <input
                          type="text"
                          value={newSourceTitle}
                          onChange={(e) => setNewSourceTitle(e.target.value)}
                          placeholder="Ví dụ: Tóm tắt bài 1 hoặc ghi chú..."
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          required
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Nội dung văn bản tài liệu *
                        </label>
                        <textarea
                          value={newSourceContent}
                          onChange={(e) => setNewSourceContent(e.target.value)}
                          placeholder="Dán nội dung lý thuyết, bài giảng hoặc ghi chú vào đây..."
                          rows={4}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Mode 3: Nạp Bài Giảng Đang Học */}
                  {sourceAddMode === 'LESSON' && activeLesson && (
                    <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1.5 text-xs">
                      <p className="font-bold text-cyan-300">Bài giảng: {activeLesson.title}</p>
                      <p className="text-slate-300 line-clamp-2">{activeLesson.description || 'Nội dung cốt lõi của bài học.'}</p>
                      <p className="text-[10px] text-cyan-400/80 font-mono">
                        Khóa học: {currentCourse?.title || 'Chưa phân loại'} • Thời lượng: {Math.round((activeLesson.durationSeconds || 0) / 60)} phút
                      </p>
                    </div>
                  )}
                </>
              )}

              {modalType === 'PODCAST' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Tên tập Podcast *
                      </label>
                      {activeLesson && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewPodcastName(`[Podcast] ${activeLesson.title}`);
                          }}
                          className="text-[10px] text-pink-400 hover:text-pink-300 underline cursor-pointer"
                        >
                          💡 Dùng tên bài học hiện tại
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newPodcastName}
                      onChange={(e) => setNewPodcastName(e.target.value)}
                      placeholder="Ví dụ: Thảo luận về Kiến trúc React và State..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kịch bản Podcast
                    </label>
                    <select
                      value={newPodcastProfile}
                      onChange={(e) => setNewPodcastProfile(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                    >
                      {episodeProfiles.length > 0 ? (
                        episodeProfiles.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} - {p.description}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="solo_expert">solo_expert - Chuyên gia đơn thoại giải thích</option>
                          <option value="tech_discussion">tech_discussion - Hai chuyên gia công nghệ đàm đạo</option>
                          <option value="business_analysis">business_analysis - Ban chuyên gia phân tích</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Giọng đọc AI Tiếng Việt
                    </label>
                    <select
                      value={newPodcastVoice}
                      onChange={(e) => setNewPodcastVoice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                    >
                      <option value="vi-VN-HoaiMyNeural">🎙️ Hoài My (Nữ - Truyền cảm, chuẩn phát thanh viên Microsoft Azure)</option>
                      <option value="vi-VN-NamMinhNeural">🎙️ Nam Minh (Nam - Trầm ấm, thuyết phục Microsoft Azure)</option>
                      {vietnameseVoices.map((v) => (
                        <option key={v.name} value="browser">
                          🔊 Trình duyệt: {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* CHỌN SỔ TAY TÀI LIỆU NGUỒN (BẮT BUỘC CÓ ÍT NHẤT 1 TÀI LIỆU) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-300">
                        Chọn Sổ tay tài liệu nguồn (Bắt buộc có ít nhất 1 tài liệu) *
                      </label>
                      <span className="text-[10px] text-pink-400 font-medium">AI đọc trực tiếp file tài liệu</span>
                    </div>

                    {(() => {
                      const validNbs = notebooks.filter((nb) => (nb.source_count || 0) > 0);

                      if (validNbs.length === 0) {
                        return (
                          <div className="p-3.5 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs space-y-2">
                            <div className="flex items-center gap-2 font-bold text-amber-300">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>Chưa có Sổ tay nào có tài liệu đính kèm</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-300">
                              Để AI có thể biên soạn kịch bản và đọc Podcast chuẩn xác, bạn cần gắn ít nhất 1 tài liệu (Word .docx/.doc, PDF, TXT) vào một Sổ tay.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsNewModalOpen(false);
                                if (activeNotebook) {
                                  setIsExistingSourceModalOpen(true);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Gắn tài liệu vào Sổ tay hiện tại ngay</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <>
                          <select
                            value={
                              podcastTargetNbId ||
                              (activeNotebook && (activeNotebook.source_count || 0) > 0
                                ? activeNotebook.id
                                : validNbs[0]?.id)
                            }
                            onChange={(e) => setPodcastTargetNbId(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                          >
                            {validNbs.map((nb) => (
                              <option key={nb.id} value={nb.id}>
                                📚 Sổ tay: {nb.name} ({nb.source_count} tài liệu đã gắn)
                              </option>
                            ))}
                          </select>

                          {/* KHUNG XEM TRƯỚC TÀI LIỆU SẼ ĐƯỢC AI ĐỌC */}
                          <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Tài liệu nguồn sẽ được gửi vào AI để biên soạn Podcast:</span>
                              </span>
                              {isLoadingPodcastSources && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                              )}
                            </div>

                            {podcastPreviewSources.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                                {podcastPreviewSources.map((s) => (
                                  <span
                                    key={s.id}
                                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/40 text-purple-200 font-medium"
                                    title={s.title}
                                  >
                                    <span>📄</span>
                                    <span className="truncate max-w-[200px]">{s.title.replace(/^\[Tài liệu\]\s*/i, '')}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">
                                {isLoadingPodcastSources ? 'Đang tải danh sách tài liệu...' : 'Đang chuẩn bị dữ liệu tài liệu...'}
                              </p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Ghi chú / Yêu cầu thảo luận bổ sung (Tùy chọn)
                    </label>
                    <textarea
                      value={newPodcastContent}
                      onChange={(e) => setNewPodcastContent(e.target.value)}
                      placeholder="Ví dụ: Nhấn mạnh bài học thực tế, phong cách hài hước và đúc kết 3 hành động quan trọng..."
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-pink-400 placeholder-slate-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    isSyncing ||
                    isGeneratingPodcast ||
                    (modalType === 'SOURCE' && sourceAddMode === 'UPLOAD' && !selectedUploadFile)
                  }
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all disabled:opacity-50"
                >
                  {isSyncing
                    ? 'Đang tải lên & xử lý vector...'
                    : isGeneratingPodcast
                    ? 'AI đang biên soạn & tạo giọng nói...'
                    : modalType === 'SOURCE'
                    ? sourceAddMode === 'UPLOAD'
                      ? 'Tải lên & Vector hóa'
                      : sourceAddMode === 'LESSON'
                      ? 'Nạp bài giảng vào Sổ tay'
                      : 'Lưu & Vector hóa'
                    : modalType === 'PODCAST'
                    ? 'Bắt đầu Sinh Podcast (Generate Audio)'
                    : 'Xác nhận tạo'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL GẮN SOURCE CÓ SẴN VÀO SỔ TAY (ADD EXISTING SOURCE)
      ========================================================================= */}
      {isExistingSourceModalOpen && activeNotebook && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1423] border border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Gắn Source có sẵn vào Sổ tay</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Sổ tay đích: <span className="font-semibold text-purple-300">{activeNotebook.name}</span>
                  {currentCourse && (
                    <span className="ml-2 text-indigo-400">• Khóa học: {currentCourse.title}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsExistingSourceModalOpen(false);
                  setExistingSourceSearch('');
                  setAttachedDocNotice(null);
                }}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông báo gắn thành công */}
            {attachedDocNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{attachedDocNotice}</span>
              </div>
            )}

            {/* Chuyển tab giữa Tài liệu khóa học đã tải lên & Kho Source tổng */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setExistingSourceTab('COURSE_DOCS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  existingSourceTab === 'COURSE_DOCS'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Tài liệu đã tải của Khóa học</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white">
                  {courseAttachments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setExistingSourceTab('ALL_SOURCES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  existingSourceTab === 'ALL_SOURCES'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kho Source hệ thống</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white">
                  {allSources.filter((s) => !sources.some((existing) => existing.id === s.id)).length}
                </span>
              </button>
            </div>

            {/* Tìm kiếm nhanh */}
            <div className="relative">
              <input
                type="text"
                value={existingSourceSearch}
                onChange={(e) => setExistingSourceSearch(e.target.value)}
                placeholder={
                  existingSourceTab === 'COURSE_DOCS'
                    ? 'Tìm tài liệu Word / PDF đã tải lên...'
                    : 'Tìm tài liệu trong hệ thống theo tên...'
                }
                className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            </div>

            {/* TAB 1: TÀI LIỆU KHÓA HỌC ĐÃ TẢI LÊN */}
            {existingSourceTab === 'COURSE_DOCS' && (
              <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar max-h-72 pr-1">
                {isLoadingCourseDocs ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Đang kiểm tra tài liệu đã tải lên của khóa học...</span>
                  </div>
                ) : (() => {
                  const query = existingSourceSearch.trim().toLowerCase();
                  const filteredDocs = courseAttachments.filter((doc) => {
                    const name = (doc.originalFileName || doc.fileName || '').toLowerCase();
                    return query ? name.includes(query) : true;
                  });

                  if (filteredDocs.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                        <FileText className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                        <p>
                          {existingSourceSearch
                            ? 'Không tìm thấy tài liệu nào khớp với từ khóa tìm kiếm.'
                            : 'Khóa học này hiện chưa có tài liệu Word hoặc PDF nào được tải lên.'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Bạn có thể dùng tab <strong>"Kho Source hệ thống"</strong> hoặc tải trực tiếp file mới vào sổ tay.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsExistingSourceModalOpen(false);
                            openAddSourceModal(activeNotebook.id, 'UPLOAD');
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                        >
                          + Tải file mới vào Sổ tay này ngay
                        </button>
                      </div>
                    );
                  }

                  return filteredDocs.map((doc) => {
                    const fileName = doc.originalFileName || doc.fileName;
                    const isAlreadyAttached = sources.some(
                      (s) =>
                        s.title.toLowerCase().includes(fileName.toLowerCase()) ||
                        (doc.originalFileName && s.title.toLowerCase().includes(doc.originalFileName.toLowerCase()))
                    );
                    const isAttaching = attachingDocId === doc.id;
                    const fileSizeKb = doc.fileSizeBytes
                      ? (doc.fileSizeBytes / 1024).toFixed(1)
                      : 'N/A';

                    return (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-slate-900/90 border border-white/5 hover:border-emerald-500/40 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                                doc.fileType === 'PDF'
                                  ? 'bg-rose-950/80 border border-rose-500/30 text-rose-300'
                                  : 'bg-blue-950/80 border border-blue-500/30 text-blue-300'
                              }`}
                            >
                              {doc.fileType}
                            </span>
                            <h4 className="text-xs font-bold text-white truncate" title={fileName}>
                              {fileName}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{fileSizeKb} KB</span>
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>

                        {isAlreadyAttached ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Đã gắn</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              setAttachingDocId(doc.id);
                              try {
                                await attachCourseAttachmentToNotebook(doc, activeNotebook.id, currentCourse);
                                setAttachedDocNotice(`Đã gắn tài liệu "${fileName}" vào Sổ tay AI thành công!`);
                              } catch (err: unknown) {
                                alert(err instanceof Error ? err.message : 'Có lỗi khi gắn tài liệu vào Sổ tay.');
                              } finally {
                                setAttachingDocId(null);
                              }
                            }}
                            disabled={isAttaching || isSyncing}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shrink-0 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            {isAttaching ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>Gắn vào AI</span>
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* TAB 2: KHO SOURCE HỆ THỐNG */}
            {existingSourceTab === 'ALL_SOURCES' && (
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-72 pr-1">
                {(() => {
                  const unattachedSources = allSources
                    .filter((s) => !sources.some((existing) => existing.id === s.id))
                    .filter((s) =>
                      existingSourceSearch.trim()
                        ? s.title.toLowerCase().includes(existingSourceSearch.toLowerCase())
                        : true
                    );

                  if (unattachedSources.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                        <FileText className="w-8 h-8 mx-auto opacity-30" />
                        <p>
                          {existingSourceSearch
                            ? 'Không tìm thấy tài liệu phù hợp trong hệ thống.'
                            : 'Tất cả tài liệu hệ thống đã được gắn vào sổ tay này, hoặc chưa có tài liệu nào khác.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsExistingSourceModalOpen(false);
                            openAddSourceModal(activeNotebook.id, 'UPLOAD');
                          }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                        >
                          + Tải file mới vào Sổ tay này ngay
                        </button>
                      </div>
                    );
                  }

                  return unattachedSources.map((s) => {
                    const fileName = s.asset?.file_path ? s.asset.file_path.split('/').pop() : null;
                    const fileExt = fileName ? fileName.split('.').pop()?.toUpperCase() : (s.asset ? 'FILE' : 'TEXT');
                    return (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-white/5 hover:border-indigo-500/30 flex items-center justify-between gap-3 transition-all"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono font-bold text-slate-300 shrink-0">
                              {fileExt}
                            </span>
                            <h4 className="text-xs font-bold text-white truncate" title={s.title}>
                              {s.title}
                            </h4>
                          </div>
                          {fileName && (
                            <p className="text-[10px] text-slate-500 truncate font-mono">
                              {fileName}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            await attachSourceToNotebook(s.id, activeNotebook.id);
                          }}
                          disabled={isSyncing}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Gắn vào Sổ tay</span>
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsExistingSourceModalOpen(false);
                  setExistingSourceSearch('');
                  setAttachedDocNotice(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL XEM TOÀN VĂN TÀI LIỆU (SOURCE DETAIL)
      ========================================================================= */}
      {selectedSourceDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1423] border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-emerald-400" />
                {selectedSourceDetail.title}
              </h3>
              <button
                onClick={() => setSelectedSourceDetail(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {selectedSourceDetail.full_text || 'Không có văn bản chi tiết'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
