import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  FilePlus,
  ArrowLeft,
  Video,
  Upload,
  Search,
  Filter,
  Sparkles,
  FileText,
  Download,
  FileCheck,
  Info,
  Link2,
  Globe,
  ExternalLink,
  BarChart3,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { catalogApi } from '../../services/catalogApi';
import { quizApi } from '../../services/quizApi';
import type { Course, CourseDetail, Subject, Lesson } from '../../types/catalog.types';
import { parseVideoUrl } from '../../types/media.types';
import { parseDocxQuizFile, parseQuizText, type ParsedQuizQuestion } from '../../utils/docxQuizParser';
import { LessonAttachmentsTab } from '../player/LessonAttachmentsTab';
import { CourseStudentProgressModal } from './CourseStudentProgressModal';

interface CourseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

export const CourseManagementModal: React.FC<CourseManagementModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter & Search in Studio
  const [courseFilter, setCourseFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Course Modal
  const [showCourseModal, setShowCourseModal] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    isPrivate: false,
    accessPassword: '',
  });

  // Feature 7: Student Progress Analytics Modal
  const [analyticsCourse, setAnalyticsCourse] = useState<{ id: number; title: string } | null>(null);

  // Feature 1: Lesson Attachment Manager Modal
  const [targetLessonForAttachment, setTargetLessonForAttachment] = useState<Lesson | null>(null);

  // Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ title: '', description: '', sortOrder: 1 });

  // Lesson Modal
  const [showLessonModal, setShowLessonModal] = useState<boolean>(false);
  const [targetSubjectId, setTargetSubjectId] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    durationSeconds: 180,
    sortOrder: 1,
  });
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);

  // Dedicated Video Upload / Embed Modal
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [videoTab, setVideoTab] = useState<'upload' | 'embed'>('upload');
  const [targetLessonForVideo, setTargetLessonForVideo] = useState<Lesson | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [externalVideoUrl, setExternalVideoUrl] = useState<string>('');
  const [externalVideoTitle, setExternalVideoTitle] = useState<string>('');
  const [linkingExternalVideo, setLinkingExternalVideo] = useState<boolean>(false);

  // Quiz Builder Modal
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [targetLessonForQuiz, setTargetLessonForQuiz] = useState<Lesson | null>(null);
  const [quizTitle, setQuizTitle] = useState<string>('Bài kiểm tra đánh giá');
  const [quizPassScore, setQuizPassScore] = useState<number>(80);
  const [quizQuestions, setQuizQuestions] = useState<
    Array<{
      content: string;
      explanation: string;
      points: number;
      options: Array<{ optionText: string; isCorrect: boolean }>;
    }>
  >([
    {
      content: 'Khái niệm chính của bài học này là gì?',
      explanation: 'Đây là đáp án chính xác theo nội dung bài học.',
      points: 50,
      options: [
        { optionText: 'Lựa chọn A (Chính xác)', isCorrect: true },
        { optionText: 'Lựa chọn B', isCorrect: false },
        { optionText: 'Lựa chọn C', isCorrect: false },
      ],
    },
    {
      content: 'Mục tiêu ứng dụng thực tiễn là gì?',
      explanation: 'Áp dụng trực tiếp vào công việc thực tế.',
      points: 50,
      options: [
        { optionText: 'Áp dụng vào thực tế ngay (Chính xác)', isCorrect: true },
        { optionText: 'Không cần áp dụng', isCorrect: false },
      ],
    },
  ]);

  // Word (.docx) Import for Quiz
  const wordFileInputRef = useRef<HTMLInputElement>(null);
  const [isParsingWord, setIsParsingWord] = useState<boolean>(false);
  const [showWordGuide, setShowWordGuide] = useState<boolean>(false);
  const [showPasteTextModal, setShowPasteTextModal] = useState<boolean>(false);
  const [wordTextDraft, setWordTextDraft] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Tải danh sách khóa học (BẬT includeUnpublished=true ĐỂ KHÔNG BỊ BIẾN MẤT KHI ẨN)
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await catalogApi.getAllCourses(true);
      setCourses(data);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Tải chi tiết khóa học được chọn (BẬT includeUnpublished=true)
  const loadCourseDetail = useCallback(async (courseId: number) => {
    setDetailLoading(true);
    try {
      const data = await catalogApi.getCourseById(courseId, true);
      setSelectedCourseDetail(data);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi tải chi tiết khóa học.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen, fetchCourses]);

  // Clean up object URL when modal closes or video changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // =================== COURSE ACTIONS ===================
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) {
      showToast('error', 'Tiêu đề khóa học không được để trống.');
      return;
    }
    if (courseForm.isPrivate && (!editingCourse || !editingCourse.isPrivate) && !courseForm.accessPassword.trim()) {
      showToast('error', 'Vui lòng đặt mật khẩu bảo vệ khi chuyển khóa học sang chế độ riêng tư.');
      return;
    }
    setActionLoading(true);
    try {
      if (editingCourse) {
        const updated = await catalogApi.updateCourse(editingCourse.id, {
          title: courseForm.title,
          description: courseForm.description,
          thumbnailUrl: courseForm.thumbnailUrl,
          isPublished: editingCourse.isPublished,
          isPrivate: courseForm.isPrivate,
          accessPassword: courseForm.accessPassword.trim() || undefined,
        });
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (selectedCourseDetail?.id === updated.id) {
          setSelectedCourseDetail((prev) => (prev ? { ...prev, ...updated } : null));
        }
        showToast('success', 'Đã cập nhật thông tin khóa học thành công.');
      } else {
        const created = await catalogApi.createCourse({
          title: courseForm.title,
          description: courseForm.description,
          thumbnailUrl: courseForm.thumbnailUrl,
          isPrivate: courseForm.isPrivate,
          accessPassword: courseForm.accessPassword.trim() || undefined,
        });
        setCourses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        showToast('success', 'Đã tạo khóa học mới thành công.');
      }
      setShowCourseModal(false);
      setEditingCourse(null);
      await fetchCourses();
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi lưu khóa học.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePublishCourse = async (course: Course) => {
    try {
      const res = await catalogApi.togglePublishCourse(course.id);
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, isPublished: res.isPublished } : c))
      );
      showToast('success', res.message);
      await fetchCourses();
      if (selectedCourseDetail?.id === course.id) {
        await loadCourseDetail(course.id);
      }
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái xuất bản.');
    }
  };

  const handleDeleteCourse = async (courseId: number, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khóa học "${title}"? Mọi môn học và bài học bên trong sẽ bị xóa.`)) {
      return;
    }
    try {
      await catalogApi.deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      if (selectedCourseDetail?.id === courseId) {
        setSelectedCourseDetail(null);
      }
      showToast('success', 'Đã xóa khóa học thành công.');
      await fetchCourses();
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi xóa khóa học.');
    }
  };

  // =================== SUBJECT ACTIONS ===================
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseDetail || !subjectForm.title.trim()) return;
    setActionLoading(true);
    try {
      if (editingSubject) {
        const updated = await catalogApi.updateSubject(editingSubject.id, {
          title: subjectForm.title,
          description: subjectForm.description,
          sortOrder: Number(subjectForm.sortOrder),
        });
        setSelectedCourseDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            subjects: prev.subjects.map((s) => (s.id === editingSubject.id ? { ...s, ...updated } : s)),
          };
        });
        showToast('success', 'Đã cập nhật môn học.');
      } else {
        const created = await catalogApi.createSubject({
          courseId: selectedCourseDetail.id,
          title: subjectForm.title,
          description: subjectForm.description,
          sortOrder: Number(subjectForm.sortOrder),
        });
        setSelectedCourseDetail((prev) => {
          if (!prev) return prev;
          const newSubj: Subject = {
            ...created,
            totalLessons: 0,
            lessons: [],
          };
          const nextSubjects = [...(prev.subjects || []), newSubj];
          return {
            ...prev,
            totalSubjects: nextSubjects.length,
            subjects: nextSubjects,
          };
        });
        setCourses((prev) =>
          prev.map((c) =>
            c.id === selectedCourseDetail.id
              ? { ...c, totalSubjects: (c.totalSubjects || 0) + 1 }
              : c
          )
        );
        showToast('success', 'Đã thêm môn học mới.');
      }
      setShowSubjectModal(false);
      setEditingSubject(null);
      await loadCourseDetail(selectedCourseDetail.id);
      await fetchCourses();
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi lưu môn học.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId: number, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa môn học "${title}"?`)) return;
    try {
      await catalogApi.deleteSubject(subjectId);
      setSelectedCourseDetail((prev) => {
        if (!prev) return prev;
        const nextSubjects = prev.subjects.filter((s) => s.id !== subjectId);
        return {
          ...prev,
          totalSubjects: nextSubjects.length,
          subjects: nextSubjects,
        };
      });
      setCourses((prev) =>
        prev.map((c) =>
          c.id === selectedCourseDetail?.id
            ? { ...c, totalSubjects: Math.max(0, (c.totalSubjects || 1) - 1) }
            : c
        )
      );
      showToast('success', 'Đã xóa môn học thành công.');
      if (selectedCourseDetail) await loadCourseDetail(selectedCourseDetail.id);
      await fetchCourses();
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi xóa môn học.');
    }
  };

  // =================== LESSON ACTIONS ===================
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSubjectId || !lessonForm.title.trim()) return;
    setActionLoading(true);
    try {
      let savedLessonId: number | null = null;
      if (editingLesson) {
        const updated = await catalogApi.updateLesson(editingLesson.id, {
          title: lessonForm.title,
          description: lessonForm.description,
          durationSeconds: Number(lessonForm.durationSeconds),
          sortOrder: Number(lessonForm.sortOrder),
        });
        savedLessonId = editingLesson.id;
        setSelectedCourseDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            subjects: prev.subjects.map((s) => {
              if (s.id !== targetSubjectId) return s;
              return {
                ...s,
                lessons: (s.lessons || []).map((l) => (l.id === editingLesson.id ? { ...l, ...updated } : l)),
              };
            }),
          };
        });
        showToast('success', 'Đã cập nhật bài giảng.');
      } else {
        const created = await catalogApi.createLesson({
          subjectId: targetSubjectId,
          title: lessonForm.title,
          description: lessonForm.description,
          durationSeconds: Number(lessonForm.durationSeconds),
          sortOrder: Number(lessonForm.sortOrder),
        });
        savedLessonId = created.id;
        setSelectedCourseDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            subjects: prev.subjects.map((s) => {
              if (s.id !== targetSubjectId) return s;
              const nextLessons = [...(s.lessons || []), created];
              return {
                ...s,
                totalLessons: nextLessons.length,
                lessons: nextLessons,
              };
            }),
          };
        });
        showToast('success', 'Đã tạo bài giảng mới.');
      }

      // Tải video đính kèm nếu người dùng đã chọn
      if (lessonVideoFile && savedLessonId) {
        showToast('success', 'Đang tải file video lên hệ thống...');
        await catalogApi.uploadLessonVideo(lessonVideoFile, savedLessonId);
        showToast('success', 'Đã tải lên và gắn video vào bài học thành công!');
      }

      setShowLessonModal(false);
      setEditingLesson(null);
      setLessonVideoFile(null);
      if (selectedCourseDetail) await loadCourseDetail(selectedCourseDetail.id);
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi lưu bài giảng.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePublishLesson = async (lessonId: number) => {
    try {
      const res = await catalogApi.togglePublishLesson(lessonId);
      setSelectedCourseDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subjects: prev.subjects.map((s) => ({
            ...s,
            lessons: (s.lessons || []).map((l) =>
              l.id === lessonId ? { ...l, isPublished: res.isPublished } : l
            ),
          })),
        };
      });
      showToast('success', res.message);
      // Cập nhật reactive UI ngay lập tức
      setSelectedCourseDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          subjects: prev.subjects?.map((sub) => ({
            ...sub,
            lessons: sub.lessons?.map((les) =>
              les.id === lessonId ? { ...les, isPublished: res.isPublished } : les
            ),
          })),
        };
      });
      if (selectedCourseDetail) await loadCourseDetail(selectedCourseDetail.id);
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái bài giảng.');
    }
  };

  const handleDeleteLesson = async (lessonId: number, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa bài giảng "${title}"?`)) return;
    try {
      await catalogApi.deleteLesson(lessonId);
      setSelectedCourseDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subjects: prev.subjects.map((s) => {
            const nextLessons = (s.lessons || []).filter((l) => l.id !== lessonId);
            return {
              ...s,
              totalLessons: nextLessons.length,
              lessons: nextLessons,
            };
          }),
        };
      });
      showToast('success', 'Đã xóa bài giảng thành công.');
      if (selectedCourseDetail) await loadCourseDetail(selectedCourseDetail.id);
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi xóa bài giảng.');
    }
  };

  // =================== DEDICATED VIDEO UPLOAD & EMBED ===================
  const handleOpenVideoUpload = (lesson: Lesson) => {
    setTargetLessonForVideo(lesson);
    setVideoTab('upload');
    setVideoFile(null);
    setExternalVideoUrl('');
    setExternalVideoTitle('');
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    setShowVideoModal(true);
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024 * 1024) {
        showToast('error', 'Kích thước video không được vượt quá 500MB.');
        return;
      }
      setVideoFile(file);
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setVideoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonForVideo || !videoFile) {
      showToast('error', 'Vui lòng chọn file video để tải lên.');
      return;
    }

    setUploadingVideo(true);
    try {
      await catalogApi.uploadLessonVideo(videoFile, targetLessonForVideo.id);
      showToast('success', `Đã tải lên video "${videoFile.name}" thành công!`);
      setShowVideoModal(false);
      setVideoFile(null);
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(null);
      }
      if (selectedCourseDetail) {
        await loadCourseDetail(selectedCourseDetail.id);
      }
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi tải video lên hệ thống.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleLinkExternalVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonForVideo || !externalVideoUrl.trim()) {
      showToast('error', 'Vui lòng dán liên kết URL video.');
      return;
    }

    const parsed = parseVideoUrl(externalVideoUrl.trim());
    if (parsed.sourceType === 'unknown') {
      showToast('error', 'Đường dẫn URL không hợp lệ. Vui lòng nhập link YouTube, Vimeo, hoặc file video trực tiếp (http/https).');
      return;
    }

    setLinkingExternalVideo(true);
    try {
      await catalogApi.linkExternalLessonVideo({
        lessonId: targetLessonForVideo.id,
        url: externalVideoUrl.trim(),
        title: externalVideoTitle.trim() || undefined,
      });

      showToast('success', `Đã gắn liên kết ${parsed.platformName} cho bài giảng thành công!`);
      setShowVideoModal(false);
      setExternalVideoUrl('');
      setExternalVideoTitle('');
      if (selectedCourseDetail) {
        await loadCourseDetail(selectedCourseDetail.id);
      }
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi gắn liên kết video.');
    } finally {
      setLinkingExternalVideo(false);
    }
  };

  // =================== QUIZ BUILDER ACTIONS ===================
  const handleOpenQuizModal = async (lesson: Lesson) => {
    setTargetLessonForQuiz(lesson);
    setQuizTitle(`Bài tập trắc nghiệm: ${lesson.title}`);
    setActionLoading(true);
    setShowQuizModal(true);

    try {
      const existing = await quizApi.getQuizByLesson(lesson.id);
      if (existing && Array.isArray(existing.questions) && existing.questions.length > 0) {
        setQuizTitle(existing.title || `Bài tập trắc nghiệm: ${lesson.title}`);
        setQuizPassScore(existing.passScore || 80);
        setQuizQuestions(
          existing.questions.map((q) => ({
            content: q.content,
            explanation: q.explanation || '',
            points: q.points || Math.max(1, Math.round(100 / existing.questions.length)),
            options: (q.options || []).map((opt) => ({
              optionText: opt.optionText,
              isCorrect: Boolean(opt.isCorrect),
            })),
          }))
        );
        showToast('success', `Đã tải ${existing.questions.length} câu hỏi hiện có của bài học.`);
      } else {
        setQuizPassScore(80);
        setQuizQuestions([
          {
            content: 'Khái niệm chính của bài học này là gì?',
            explanation: 'Đây là đáp án chính xác theo nội dung bài học.',
            points: 100,
            options: [
              { optionText: 'Phương án A (Đáp án đúng)', isCorrect: true },
              { optionText: 'Phương án B', isCorrect: false },
              { optionText: 'Phương án C', isCorrect: false },
              { optionText: 'Phương án D', isCorrect: false },
            ],
          },
        ]);
      }
    } catch {
      // Giữ mặc định 1 câu hỏi ban đầu
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonForQuiz) return;
    if (quizQuestions.length === 0) {
      showToast('error', 'Đề thi phải có ít nhất 1 câu hỏi.');
      return;
    }
    setActionLoading(true);
    try {
      await catalogApi.createQuiz(targetLessonForQuiz.id, {
        title: quizTitle,
        passScore: Number(quizPassScore),
        questions: quizQuestions.map((q, qIdx) => ({
          content: q.content,
          explanation: q.explanation,
          points: Number(q.points) || Math.max(1, Math.round(100 / quizQuestions.length)),
          sortOrder: qIdx + 1,
          questionType: 1, // Single choice
          options: q.options.map((opt, oIdx) => ({
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            sortOrder: oIdx + 1,
          })),
        })),
      });

      showToast('success', `Đã lưu thành công ${quizQuestions.length} câu hỏi trắc nghiệm cho bài "${targetLessonForQuiz.title}".`);
      setShowQuizModal(false);
      setTargetLessonForQuiz(null);

      // Cập nhật trạng thái hasQuiz trực tiếp trên state để UI phản hồi ngay lập tức
      setSelectedCourseDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subjects: prev.subjects.map((s) => ({
            ...s,
            lessons: (s.lessons || []).map((l) =>
              l.id === targetLessonForQuiz.id ? { ...l, hasQuiz: true } : l
            ),
          })),
        };
      });

      if (selectedCourseDetail) await loadCourseDetail(selectedCourseDetail.id);
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi lưu đề trắc nghiệm.');
    } finally {
      setActionLoading(false);
    }
  };

  // =================== WORD QUIZ IMPORT ACTIONS ===================
  const handleWordFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.txt')) {
      showToast('error', 'Vui lòng chọn tệp Word định dạng .docx (hoặc .txt).');
      return;
    }

    setIsParsingWord(true);
    try {
      let parsed: ParsedQuizQuestion[] = [];
      if (lowerName.endsWith('.docx')) {
        const res = await parseDocxQuizFile(file);
        parsed = res.questions;
      } else {
        const text = await file.text();
        parsed = parseQuizText(text);
      }

      if (parsed.length === 0) {
        showToast('error', 'Không tìm thấy câu hỏi trắc nghiệm hợp lệ trong tệp. Bấm "Hướng dẫn" để xem cấu trúc chuẩn.');
        return;
      }

      setQuizQuestions(parsed);
      const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      if (quizTitle === 'Bài kiểm tra đánh giá' || !quizTitle) {
        setQuizTitle(`Bài kiểm tra: ${autoTitle}`);
      }
      showToast('success', `Đã nhập thành công ${parsed.length} câu hỏi từ tệp "${file.name}"!`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi trích xuất tệp Word.');
    } finally {
      setIsParsingWord(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleParseFromTextDraft = () => {
    if (!wordTextDraft.trim()) {
      showToast('error', 'Vui lòng dán văn bản câu hỏi trước khi xác nhận.');
      return;
    }

    const parsed = parseQuizText(wordTextDraft);
    if (parsed.length === 0) {
      showToast('error', 'Không tìm thấy câu hỏi hợp lệ trong đoạn văn bản đã dán. Vui lòng kiểm tra định dạng.');
      return;
    }

    setQuizQuestions(parsed);
    setShowPasteTextModal(false);
    setWordTextDraft('');
    showToast('success', `Đã trích xuất thành công ${parsed.length} câu hỏi từ văn bản!`);
  };

  const handleDownloadSampleFormat = () => {
    const sampleText = `Câu 1: Hàm nào trong Excel dùng để tìm kiếm giá trị theo cột dọc?
*A. VLOOKUP
B. SUM
C. AVERAGE
D. COUNT
Giải thích: Hàm VLOOKUP tìm kiếm giá trị ở cột đầu tiên và trả về dữ liệu tương ứng.

Câu 2: Đâu là một phương pháp cốt lõi của Microlearning?
A. Học dồn 8 tiếng liên tục
*B. Chia nhỏ kiến thức thành bài học 3-5 phút
C. Bỏ qua các bài kiểm tra thực hành
D. Chỉ học lý thuyết sách vở
Giải thích: Microlearning tập trung vào các bài học vi mô ngắn gọn, súc tích và có bài tập ứng dụng ngay.

Câu 3: Đâu là câu lệnh git dùng để tạo commit theo chuẩn Conventional Commits?
A. git push origin main
*B. git commit -m "feat: thêm tính năng mới"
C. git status
D. git pull
Giải thích: Chuẩn Conventional Commits bắt đầu bằng feat:, fix:, refactor:, etc.`;

    const blob = new Blob([sampleText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mau_De_Thi_Trac_Nghiem_MicroLearn.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered courses in Studio
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (courseFilter === 'published') return c.isPublished;
    if (courseFilter === 'draft') return !c.isPublished;
    return true;
  });

  const publishedCount = courses.filter((c) => c.isPublished).length;
  const draftCount = courses.filter((c) => !c.isPublished).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#0A0F1F] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Modal */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-white/10 bg-[#0D1429] flex flex-col gap-2.5 sm:gap-3">
          {/* Hàng 1 (Top Row): Logo/Icon + Tiêu đề + Badge bên trái, Nút đóng [X] & Nút Desktop bên phải */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Layers className="w-4.5 sm:w-5 h-4.5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-lg font-bold text-white tracking-tight">
                    Studio Quản Lý Khóa Học & Bài Giảng
                  </h2>
                  <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 whitespace-nowrap">
                    TEACHER & ADMIN
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">
                  Soạn thảo khóa học, đăng tải video MP4, tạo đề thi trắc nghiệm và điều khiển hiển thị
                </p>
              </div>
            </div>

            {/* Desktop Actions & Nút đóng [X] */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                {!selectedCourseDetail ? (
                  <button
                    onClick={() => {
                      setEditingCourse(null);
                      setCourseForm({ title: '', description: '', thumbnailUrl: '', isPrivate: false, accessPassword: '' });
                      setShowCourseModal(true);
                    }}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tạo Khóa Học Mới</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedCourseDetail(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Danh sách khóa học</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Đóng Studio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hàng 2 (Mô tả chi tiết nằm riêng biệt trên Mobile) */}
          <p className="text-[11px] text-slate-400 sm:hidden leading-relaxed">
            Soạn thảo khóa học, đăng tải video MP4, tạo đề thi trắc nghiệm và điều khiển hiển thị
          </p>

          {/* Hàng 3 (Nút hành động nằm riêng thành 1 hàng bên dưới trên Mobile để không bị bể chữ) */}
          <div className="sm:hidden flex items-center gap-2 pt-1 border-t border-white/5">
            {!selectedCourseDetail ? (
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setCourseForm({ title: '', description: '', thumbnailUrl: '', isPrivate: false, accessPassword: '' });
                  setShowCourseModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Khóa Học Mới</span>
              </button>
            ) : (
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại danh sách khóa học</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông báo Toast Alert */}
        {notification && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border flex items-center gap-3 text-xs ${
              notification.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Nội dung chính */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* VIEW 1: DANH SÁCH KHÓA HỌC */}
          {!selectedCourseDetail ? (
            <div className="space-y-4">
              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setCourseFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      courseFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Tất cả ({courses.length})
                  </button>
                  <button
                    onClick={() => setCourseFilter('published')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      courseFilter === 'published'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-emerald-300 border border-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Đang công khai ({publishedCount})</span>
                  </button>
                  <button
                    onClick={() => setCourseFilter('draft')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      courseFilter === 'draft'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-amber-300 border border-white/5'
                    }`}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Đang ẩn ({draftCount})</span>
                  </button>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên khóa học..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">Đang tải danh sách khóa học...</span>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="py-16 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-white/10">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40 text-indigo-400" />
                  <p className="text-sm font-semibold text-slate-300">Không tìm thấy khóa học nào phù hợp.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {courses.length === 0
                      ? 'Bấm nút "Tạo Khóa Học Mới" ở trên để bắt đầu.'
                      : 'Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCourses.map((course) => (
                    <div
                      key={course.id}
                      className={`p-4 rounded-2xl bg-[#090D1A] border transition-all flex flex-col justify-between group shadow-lg ${
                        course.isPublished
                          ? 'border-white/10 hover:border-indigo-500/40'
                          : 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          {/* Duy nhất 1 huy hiệu: Hạn chế (khi riêng tư) hoặc Công khai */}
                          {course.isPrivate ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-400" />
                              <span>Hạn chế</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Công khai</span>
                            </span>
                          )}

                          <div className="flex items-center gap-1">
                            {/* Feature 7: Nút xem % tiến độ toàn bộ học viên */}
                            <button
                              onClick={() => setAnalyticsCourse({ id: course.id, title: course.title })}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 transition-colors"
                              title="Xem thống kê % tiến độ học viên của khóa này"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingCourse(course);
                                setCourseForm({
                                  title: course.title,
                                  description: course.description || '',
                                  thumbnailUrl: course.thumbnailUrl || '',
                                  isPrivate: Boolean(course.isPrivate),
                                  accessPassword: '',
                                });
                                setShowCourseModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white"
                              title="Sửa khóa học"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTogglePublishCourse(course)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                course.isPublished
                                  ? 'bg-amber-950/60 border-amber-500/30 text-amber-300 hover:bg-amber-900'
                                  : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900'
                              }`}
                              title={course.isPublished ? 'Bấm để ẩn khóa học khỏi học viên' : 'Bấm để công khai khóa học cho học viên'}
                            >
                              {course.isPublished ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id, course.title)}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400"
                              title="Xóa khóa học"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {course.title}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {course.description || 'Không có mô tả.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                          <span>{course.totalSubjects} môn học</span>
                          <span className={course.isPublished ? 'text-emerald-400' : 'text-amber-400'}>
                            {course.isPublished ? 'Học viên xem được' : 'Chỉ hiển thị tại Studio'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => loadCourseDetail(course.id)}
                        className="mt-4 w-full py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>Quản lý học phần & Video bài giảng</span>
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: CHI TIẾT CẤU TRÚC KHÓA HỌC (MÔN & BÀI HỌC) */
            detailLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs">Đang tải cấu trúc bài giảng...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Thanh thông tin khóa học hiện tại */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-400 font-semibold uppercase">Đang soạn thảo khóa học:</span>
                      {selectedCourseDetail.isPrivate ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 border border-amber-500/40 text-amber-300 flex items-center gap-1 shadow-sm">
                          <Lock className="w-2.5 h-2.5 text-amber-400" />
                          <span>Hạn chế</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 shadow-sm">
                          <Globe className="w-2.5 h-2.5 text-emerald-400" />
                          <span>Công khai</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{selectedCourseDetail.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedCourseDetail.description || 'Không có mô tả.'}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Feature 7: Thống kê % tiến độ học viên của khóa */}
                    <button
                      onClick={() => setAnalyticsCourse({ id: selectedCourseDetail.id, title: selectedCourseDetail.title })}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-xs font-semibold text-indigo-300 hover:text-white transition-colors cursor-pointer"
                      title="Xem % tiến độ toàn bộ học viên đã đăng ký khóa học này"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Tiến độ học viên</span>
                    </button>

                    <button
                      onClick={() => handleTogglePublishCourse(selectedCourseDetail)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                        selectedCourseDetail.isPublished
                          ? 'bg-amber-950/50 border-amber-500/30 text-amber-300 hover:bg-amber-900'
                          : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900'
                      }`}
                    >
                      {selectedCourseDetail.isPublished ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ẩn khóa học</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xuất bản ngay</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setEditingSubject(null);
                        setSubjectForm({
                          title: '',
                          description: '',
                          sortOrder: (selectedCourseDetail.subjects?.length || 0) + 1,
                        });
                        setShowSubjectModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>Thêm Môn Học Mới</span>
                    </button>
                  </div>
                </div>

                {/* Danh sách các Môn học & Bài giảng bên trong */}
                {(!selectedCourseDetail.subjects || selectedCourseDetail.subjects.length === 0) ? (
                  <div className="py-12 text-center text-slate-500 border border-dashed border-white/10 rounded-2xl">
                    <FolderPlus className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Khóa học này chưa có môn học nào. Bấm nút "Thêm Môn Học Mới" ở trên.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedCourseDetail.subjects.map((subj) => (
                      <div
                        key={subj.id}
                        className="p-4 rounded-2xl bg-[#090D1A] border border-white/10 space-y-3"
                      >
                        {/* Header Môn học */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                              {subj.sortOrder}
                            </span>
                            <div>
                              <h4 className="font-bold text-white text-sm">{subj.title}</h4>
                              {subj.description && (
                                <p className="text-xs text-slate-400">{subj.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => {
                                setTargetSubjectId(subj.id);
                                setEditingLesson(null);
                                setLessonForm({
                                  title: '',
                                  description: '',
                                  durationSeconds: 180,
                                  sortOrder: (subj.lessons?.length || 0) + 1,
                                });
                                setLessonVideoFile(null);
                                setShowLessonModal(true);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-500/30 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold cursor-pointer"
                            >
                              <FilePlus className="w-3.5 h-3.5" />
                              <span>Thêm Bài Học</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingSubject(subj);
                                setSubjectForm({
                                  title: subj.title,
                                  description: subj.description || '',
                                  sortOrder: subj.sortOrder,
                                });
                                setShowSubjectModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white"
                              title="Sửa môn học"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteSubject(subj.id, subj.title)}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400"
                              title="Xóa môn học"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Danh sách bài giảng bên trong Môn học */}
                        {(!subj.lessons || subj.lessons.length === 0) ? (
                          <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 text-center text-xs text-slate-500">
                            Chưa có bài giảng nào trong môn học này.
                          </div>
                        ) : (
                          <div className="space-y-2 pl-2 sm:pl-4">
                            {subj.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-colors"
                              >
                                <div className="flex items-start sm:items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                                    {lesson.sortOrder}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-white text-xs">
                                        {lesson.title}
                                      </span>
                                      
                                      {/* Trạng thái Xuất bản / Ẩn bài học */}
                                      <span
                                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                                          lesson.isPublished
                                            ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                                            : 'bg-amber-950 border-amber-500/40 text-amber-300'
                                        }`}
                                      >
                                        {lesson.isPublished ? 'Xuất bản' : 'Ẩn'}
                                      </span>

                                      {/* Trạng thái Video */}
                                      <span
                                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border flex items-center gap-1 ${
                                          lesson.mediaAssetCount > 0
                                            ? 'bg-indigo-950 border-indigo-500/40 text-indigo-300'
                                            : 'bg-slate-800 border-white/10 text-slate-400'
                                        }`}
                                      >
                                        <Video className="w-2.5 h-2.5" />
                                        <span>{lesson.mediaAssetCount > 0 ? 'Có Video' : 'Chưa có Video'}</span>
                                      </span>

                                      {/* Trạng thái Quiz */}
                                      {lesson.hasQuiz && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-950 border border-purple-500/40 text-purple-300">
                                          Có trắc nghiệm
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                      <Clock className="w-3 h-3 text-slate-500" />
                                      <span>{Math.round(lesson.durationSeconds / 60)} phút</span>
                                      <span>•</span>
                                      <span className="line-clamp-1">{lesson.description || 'Không có mô tả'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
                                  {/* ĐĂNG TẢI / ĐỔI VIDEO BÀI GIẢNG */}
                                  <button
                                    onClick={() => handleOpenVideoUpload(lesson)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                                      lesson.mediaAssetCount > 0
                                        ? 'bg-indigo-950/80 border-indigo-500/40 hover:bg-indigo-900 text-indigo-300'
                                        : 'bg-emerald-950/80 border-emerald-500/40 hover:bg-emerald-900 text-emerald-300'
                                    }`}
                                    title={lesson.mediaAssetCount > 0 ? 'Bấm để thay thế file video bài học' : 'Bấm để đăng tải video mới'}
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span>{lesson.mediaAssetCount > 0 ? 'Đổi Video' : 'Tải Video'}</span>
                                  </button>

                                  {/* Tạo / Soạn Đề thi trắc nghiệm */}
                                  <button
                                    onClick={() => handleOpenQuizModal(lesson)}
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                                      lesson.hasQuiz
                                        ? 'bg-purple-900/80 border-purple-500/50 hover:bg-purple-800 text-purple-200'
                                        : 'bg-purple-950/60 border-purple-500/30 hover:bg-purple-900 text-purple-300'
                                    }`}
                                    title={lesson.hasQuiz ? 'Chỉnh sửa / Cập nhật đề thi trắc nghiệm' : 'Soạn đề thi trắc nghiệm cho bài học này'}
                                  >
                                    <HelpCircle className="w-3 h-3 text-purple-400" />
                                    <span>{lesson.hasQuiz ? 'Sửa Quiz' : 'Tạo Quiz'}</span>
                                  </button>

                                  {/* Feature 1: Quản lý Tài liệu đính kèm (Word, PDF) */}
                                  <button
                                    onClick={() => setTargetLessonForAttachment(lesson)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-cyan-300 text-[11px] font-semibold cursor-pointer transition-colors"
                                    title="Quản lý và tải lên tài liệu đính kèm (Word, PDF)"
                                  >
                                    <FileText className="w-3 h-3 text-cyan-400" />
                                    <span>Tài liệu</span>
                                  </button>

                                  {/* Sửa bài học */}
                                  <button
                                    onClick={() => {
                                      setTargetSubjectId(subj.id);
                                      setEditingLesson(lesson);
                                      setLessonForm({
                                        title: lesson.title,
                                        description: lesson.description || '',
                                        durationSeconds: lesson.durationSeconds,
                                        sortOrder: lesson.sortOrder,
                                      });
                                      setLessonVideoFile(null);
                                      setShowLessonModal(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                    title="Sửa bài học"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  {/* Ẩn / Xuất bản */}
                                  <button
                                    onClick={() => handleTogglePublishLesson(lesson.id)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                    title={lesson.isPublished ? 'Ẩn bài học' : 'Xuất bản bài học'}
                                  >
                                    {lesson.isPublished ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                                  </button>

                                  {/* Xóa bài học */}
                                  <button
                                    onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                                    title="Xóa bài học"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* DIALOG A: TẠO / SỬA KHÓA HỌC */}
      {showCourseModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingCourse ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Tiêu đề khóa học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kỹ năng Excel Nâng cao & Dashboard"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Mô tả tóm tắt</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả mục tiêu và nội dung khóa học..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">URL Ảnh Thumbnail</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={courseForm.thumbnailUrl}
                  onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              {/* Feature 6: Chế độ Khóa học Riêng tư (Private) & Mật khẩu */}
              <div className="pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      {courseForm.isPrivate ? (
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      <span>Khóa học Riêng tư (Bảo vệ bằng Mật khẩu)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {courseForm.isPrivate
                        ? 'Học viên bắt buộc phải nhập đúng mật khẩu để mở khóa và học.'
                        : 'Mọi học viên đều có thể tự do truy cập học khóa học này.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={courseForm.isPrivate}
                      onChange={(e) => setCourseForm({ ...courseForm, isPrivate: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {courseForm.isPrivate && (
                  <div className="space-y-2 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 animate-in fade-in">
                    <label className="block text-amber-300 font-medium">
                      {editingCourse ? 'Mật khẩu truy cập mới (để trống nếu giữ nguyên)' : 'Mật khẩu truy cập *'}
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                      <input
                        type="text"
                        required={!editingCourse}
                        placeholder={editingCourse ? 'Nhập mật khẩu mới nếu muốn đổi...' : 'Nhập mật khẩu truy cập...'}
                        value={courseForm.accessPassword}
                        onChange={(e) => setCourseForm({ ...courseForm, accessPassword: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400 text-xs"
                      />
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-300/80 leading-relaxed pt-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                      <span>
                        Lưu ý: Khi bạn đổi mật khẩu cho khóa học riêng tư, toàn bộ mã ủy quyền trước đây của học viên sẽ bị thu hồi và họ sẽ phải nhập mật khẩu mới.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCourse ? 'Lưu thay đổi' : 'Tạo khóa học'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG B: TẠO / SỬA MÔN HỌC */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
              </h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Tiêu đề môn học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chương 1: Hàm Thống kê và Xử lý Chuỗi"
                  value={subjectForm.title}
                  onChange={(e) => setSubjectForm({ ...subjectForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Mô tả môn học</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả nội dung môn học..."
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Thứ tự hiển thị</label>
                <input
                  type="number"
                  min={1}
                  value={subjectForm.sortOrder}
                  onChange={(e) => setSubjectForm({ ...subjectForm, sortOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingSubject ? 'Lưu thay đổi' : 'Thêm môn học'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG C: TẠO / SỬA BÀI HỌC CÓ ĐÍNH KÈM VIDEO */}
      {showLessonModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingLesson ? 'Chỉnh sửa bài giảng' : 'Tạo bài giảng mới'}
              </h3>
              <button onClick={() => setShowLessonModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Tiêu đề bài học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kỹ thuật dùng hàm XLOOKUP thay thế VLOOKUP"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Mô tả bài giảng</label>
                <textarea
                  rows={2}
                  placeholder="Tóm tắt nội dung kiến thức cốt lõi..."
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Thời lượng (giây)</label>
                  <input
                    type="number"
                    min={30}
                    value={lessonForm.durationSeconds}
                    onChange={(e) => setLessonForm({ ...lessonForm, durationSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ~{Math.round(lessonForm.durationSeconds / 60)} phút
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min={1}
                    value={lessonForm.sortOrder}
                    onChange={(e) => setLessonForm({ ...lessonForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Đính kèm file Video bài giảng */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Đính kèm File Video (MP4, WebM - Tùy chọn tải ngay)
                </label>
                <div className="relative border border-dashed border-white/20 hover:border-indigo-500/50 rounded-xl p-3 bg-slate-900/60 text-center transition-colors">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 500 * 1024 * 1024) {
                          showToast('error', 'Kích thước file vượt quá giới hạn 500MB.');
                          return;
                        }
                        setLessonVideoFile(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {lessonVideoFile ? (
                    <div className="flex items-center justify-center gap-2 text-indigo-300 py-1">
                      <Video className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-xs truncate max-w-[200px]">{lessonVideoFile.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({(lessonVideoFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-slate-400 py-1">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs">Kéo thả hoặc nhấp để chọn tệp video MP4</span>
                      <span className="text-[10px] text-slate-500">Dung lượng tối đa 500MB</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLessonModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingLesson ? 'Lưu bài giảng' : 'Tạo bài giảng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG D: TẢI VIDEO & NHÚNG LIÊN KẾT (DEDICATED VIDEO UPLOAD & EMBED) */}
      {showVideoModal && targetLessonForVideo && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Quản Lý Video Bài Giảng</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{targetLessonForVideo.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoFile(null);
                  setExternalVideoUrl('');
                  setExternalVideoTitle('');
                  if (videoPreviewUrl) {
                    URL.revokeObjectURL(videoPreviewUrl);
                    setVideoPreviewUrl(null);
                  }
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selector: Tải tệp lên vs Nhúng URL */}
            <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setVideoTab('upload')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                  videoTab === 'upload'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải tệp tin lên</span>
              </button>
              <button
                type="button"
                onClick={() => setVideoTab('embed')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                  videoTab === 'embed'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Nhúng liên kết URL</span>
              </button>
            </div>

            {/* TAB 1: TẢI TỆP TRỰC TIẾP */}
            {videoTab === 'upload' && (
              <form onSubmit={handleUploadVideo} className="space-y-4 text-xs">
              {/* Dropzone */}
              <div className="relative border-2 border-dashed border-white/20 hover:border-indigo-500/50 rounded-2xl p-6 bg-slate-900/60 text-center transition-colors">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                  onChange={handleVideoFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Upload className="w-8 h-8 text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">Kéo thả file video vào đây hoặc bấm để chọn tệp</p>
                    <p className="text-xs text-slate-400 mt-0.5">Hỗ trợ MP4, WebM, QuickTime (Tối đa 500MB)</p>
                  </div>
                </div>
              </div>

              {/* Selected file preview */}
              {videoFile && (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Video className="w-4 h-4 text-indigo-400" />
                      <span className="truncate max-w-xs">{videoFile.name}</span>
                    </div>
                    <span className="text-indigo-300 font-mono text-[11px]">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>

                  {videoPreviewUrl && (
                    <div className="rounded-lg overflow-hidden border border-white/10 bg-black aspect-video max-h-52 flex items-center justify-center">
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowVideoModal(false);
                    setVideoFile(null);
                    if (videoPreviewUrl) {
                      URL.revokeObjectURL(videoPreviewUrl);
                      setVideoPreviewUrl(null);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!videoFile || uploadingVideo}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang tải lên máy chủ...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Bắt đầu Tải Lên</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: NHÚNG LIÊN KẾT NGOÀI (YOUTUBE, VIMEO, DIRECT URL) */}
          {videoTab === 'embed' && (
            <form onSubmit={handleLinkExternalVideo} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Đường dẫn URL Video</span>
                  <span className="text-[11px] text-indigo-400 font-normal">YouTube, Vimeo, hoặc Direct MP4</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={externalVideoUrl}
                    onChange={(e) => setExternalVideoUrl(e.target.value)}
                    placeholder="Dán link ví dụ: https://www.youtube.com/watch?v=... hoặc https://vimeo.com/..."
                    className="w-full bg-slate-900 border border-white/15 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <Globe className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              {/* Nhận diện nền tảng & Xem trước */}
              {externalVideoUrl.trim() && (() => {
                const parsed = parseVideoUrl(externalVideoUrl);
                return (
                  <div className="space-y-2.5 p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Nguồn nhận diện:</span>
                      {parsed.sourceType === 'youtube' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-[11px]">
                          YouTube Video
                        </span>
                      )}
                      {parsed.sourceType === 'vimeo' && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold text-[11px]">
                          Vimeo Video
                        </span>
                      )}
                      {parsed.sourceType === 'direct_url' && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold text-[11px]">
                          {parsed.platformName}
                        </span>
                      )}
                      {parsed.sourceType === 'unknown' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px]">
                          Chưa nhận diện được định dạng
                        </span>
                      )}
                    </div>

                    {/* Khung xem trước Embed Preview */}
                    {parsed.embedUrl ? (
                      <div className="rounded-lg overflow-hidden border border-white/10 bg-black aspect-video max-h-52">
                        <iframe
                          src={parsed.embedUrl}
                          title="Video Preview"
                          className="w-full h-full border-0"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : parsed.sourceType === 'direct_url' ? (
                      <div className="rounded-lg overflow-hidden border border-white/10 bg-black aspect-video max-h-52 flex items-center justify-center">
                        <video
                          src={externalVideoUrl}
                          controls
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })()}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Tiêu đề ghi chú video (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={externalVideoTitle}
                  onChange={(e) => setExternalVideoTitle(e.target.value)}
                  placeholder={`Mặc định: Video bài giảng ${targetLessonForVideo.title}`}
                  className="w-full bg-slate-900 border border-white/15 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-400 space-y-1 leading-relaxed">
                <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Lợi ích khi nhúng video:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li>Không tốn dung lượng và chi phí lưu trữ kho Azure.</li>
                  <li>Phát video siêu tốc qua CDN toàn cầu của YouTube / Vimeo.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowVideoModal(false);
                    setExternalVideoUrl('');
                    setExternalVideoTitle('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!externalVideoUrl.trim() || linkingExternalVideo}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {linkingExternalVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang gắn liên kết...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      <span>Xác nhận Nhúng Video</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          </div>
        </div>
      )}

      {/* DIALOG E: QUIZ BUILDER (SOẠN ĐỀ TRẮC NGHIỆM) */}
      {showQuizModal && targetLessonForQuiz && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 text-slate-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <span>Soạn đề trắc nghiệm cho: {targetLessonForQuiz.title}</span>
              </h3>
              <button onClick={() => setShowQuizModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Tiêu đề đề thi</label>
                  <input
                    type="text"
                    required
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Điểm chuẩn đạt (Pass Score)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={quizPassScore}
                    onChange={(e) => setQuizPassScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>

              {/* Input file ẩn cho tải Word */}
              <input
                type="file"
                ref={wordFileInputRef}
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt"
                onChange={handleWordFileUpload}
                className="hidden"
              />

              {/* Thanh công cụ Tải Word (.docx) & Tùy chọn nhập câu hỏi */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Nhập câu hỏi tự động từ File Word</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tải file .docx hoặc dán văn bản trắc nghiệm chuẩn để hệ thống tự động nhận diện câu hỏi &amp; đáp án
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Nút 1: Tải file Word (.docx) */}
                    <button
                      type="button"
                      disabled={isParsingWord}
                      onClick={() => wordFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 cursor-pointer transition-all disabled:opacity-50"
                      title="Tải file Word (.docx) chứa câu hỏi trắc nghiệm"
                    >
                      {isParsingWord ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang đọc file Word...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          <span>Tải File Word (.docx)</span>
                        </>
                      )}
                    </button>

                    {/* Nút 2: Dán văn bản */}
                    <button
                      type="button"
                      onClick={() => setShowPasteTextModal(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-purple-500/40 text-purple-300 text-xs font-semibold cursor-pointer transition-colors"
                      title="Dán nhanh văn bản câu hỏi từ Word hoặc Notepad"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Dán Văn Bản</span>
                    </button>

                    {/* Nút 3: Tải file mẫu */}
                    <button
                      type="button"
                      onClick={handleDownloadSampleFormat}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                      title="Tải file mẫu định dạng câu hỏi"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>File mẫu</span>
                    </button>

                    {/* Nút 4: Xem hướng dẫn */}
                    <button
                      type="button"
                      onClick={() => setShowWordGuide(!showWordGuide)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
                      title="Xem cú pháp chuẩn cho file Word"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{showWordGuide ? 'Ẩn HD' : 'Hướng dẫn'}</span>
                    </button>
                  </div>
                </div>

                {/* Khung hướng dẫn định dạng chi tiết */}
                {showWordGuide && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-2 text-[11px] text-slate-300">
                    <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>Cấu trúc chuẩn file Word (.docx) được hỗ trợ tự động:</span>
                    </div>
                    <pre className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[10.5px] text-purple-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`Câu 1: Hàm nào trong Excel dùng để tìm kiếm giá trị theo cột dọc?
*A. VLOOKUP
B. SUM
C. AVERAGE
D. COUNT
Giải thích: Hàm VLOOKUP tìm kiếm theo cột dọc đầu tiên của bảng.

Câu 2: Đâu là định nghĩa của vi học (Microlearning)?
A. Học dồn nhiều giờ liên tục
*B. Chia nhỏ bài giảng thành các phần 3-5 phút (Đúng)
C. Không cần làm bài tập
D. Chỉ học lý thuyết`}
                    </pre>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10.5px]">
                      <li>Đánh dấu đáp án đúng: Đặt dấu <strong>*</strong> ở đầu hoặc cuối phương án (ví dụ: <code className="text-purple-300">*A. ...</code>), hoặc ghi <code className="text-purple-300">[x] A. ...</code> hoặc <code className="text-purple-300">Đáp án: A</code> ở dòng dưới.</li>
                      <li>Hỗ trợ cả định dạng "Câu 1:", "1.", "Bài 1:" hoặc "Question 1:".</li>
                      <li>Có thể thêm dòng "Giải thích: ..." hoặc "Lời giải: ..." cho từng câu hỏi.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Danh sách câu hỏi */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      Danh sách câu hỏi ({quizQuestions.length} câu)
                    </span>
                    {quizQuestions.length > 0 && (
                      <span className="text-[10px] text-purple-400 font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30">
                        ~{Math.max(1, Math.round(100 / quizQuestions.length))} điểm/câu
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuizQuestions([
                        ...quizQuestions,
                        {
                          content: `Câu hỏi số ${quizQuestions.length + 1}`,
                          explanation: 'Giải thích câu trả lời đúng',
                          points: Math.max(1, Math.round(100 / (quizQuestions.length + 1))),
                          options: [
                            { optionText: 'Đáp án A (Đúng)', isCorrect: true },
                            { optionText: 'Đáp án B', isCorrect: false },
                          ],
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-500/30 text-purple-300 hover:bg-purple-900 text-[11px] font-semibold cursor-pointer"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>

                {quizQuestions.map((q, qIndex) => (
                  <div key={qIndex} className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-purple-400">Câu hỏi #{qIndex + 1}</span>
                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setQuizQuestions(quizQuestions.filter((_, idx) => idx !== qIndex))}
                          className="text-rose-400 hover:text-rose-300 text-[11px] cursor-pointer"
                        >
                          Xóa câu
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Nội dung câu hỏi..."
                      value={q.content}
                      onChange={(e) => {
                        const updated = [...quizQuestions];
                        updated[qIndex].content = e.target.value;
                        setQuizQuestions(updated);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none"
                    />

                    {/* Danh sách đáp án */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">Đáp án (Tích chọn ô đáp án đúng):</span>
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={opt.isCorrect}
                            onChange={(e) => {
                              const updated = [...quizQuestions];
                              updated[qIndex].options[oIndex].isCorrect = e.target.checked;
                              setQuizQuestions(updated);
                            }}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt.optionText}
                            onChange={(e) => {
                              const updated = [...quizQuestions];
                              updated[qIndex].options[oIndex].optionText = e.target.value;
                              setQuizQuestions(updated);
                            }}
                            className="flex-1 px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-white text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Đề Trắc Nghiệm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-DIALOG: DÁN VĂN BẢN TRẮC NGHIỆM */}
      {showPasteTextModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-[#0D1429] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col space-y-3.5 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-purple-400" />
                <span>Dán Văn Bản Câu Hỏi Từ Word / Bộ Nhớ Tạm</span>
              </h4>
              <button
                onClick={() => setShowPasteTextModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Sao chép nội dung câu hỏi trong file Word và dán vào ô bên dưới. Hệ thống sẽ tự động tách câu hỏi, phương án và nhận diện đáp án đúng.
            </p>

            <textarea
              rows={10}
              value={wordTextDraft}
              onChange={(e) => setWordTextDraft(e.target.value)}
              placeholder={`Ví dụ:
Câu 1: HTML là viết tắt của từ gì?
*A. HyperText Markup Language
B. Hyper Transfer Markup Language
C. High Tech Markup Language
D. Home Tool Multi Language
Giải thích: HTML là ngôn ngữ đánh dấu siêu văn bản.`}
              className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-500/50 resize-y"
            />

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowPasteTextModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 hover:text-white"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleParseFromTextDraft}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold cursor-pointer shadow-md"
              >
                Xác Nhận & Trích Xuất Câu Hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature 7: MODAL THEO DÕI % TIẾN ĐỘ HỌC VIÊN CỦA KHÓA HỌC */}
      {analyticsCourse && (
        <CourseStudentProgressModal
          isOpen={true}
          courseId={analyticsCourse.id}
          courseTitle={analyticsCourse.title}
          onClose={() => setAnalyticsCourse(null)}
        />
      )}

      {/* Feature 1: MODAL QUẢN LÝ TÀI LIỆU ĐÍNH KÈM BÀI GIẢNG (WORD, PDF) */}
      {targetLessonForAttachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0D1429] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Tài liệu đính kèm: {targetLessonForAttachment.title}
                </h3>
              </div>
              <button
                onClick={() => setTargetLessonForAttachment(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <LessonAttachmentsTab
                lessonId={targetLessonForAttachment.id}
                canManage={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
