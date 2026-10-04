import React, { useState, useEffect, useCallback } from 'react';
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
  Check,
} from 'lucide-react';
import { catalogApi } from '../../services/catalogApi';
import type { Course, CourseDetail, Subject, Lesson } from '../../types/catalog.types';

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

  // Modal dialog states
  const [showCourseModal, setShowCourseModal] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', thumbnailUrl: '' });

  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ title: '', description: '', sortOrder: 1 });

  const [showLessonModal, setShowLessonModal] = useState<boolean>(false);
  const [targetSubjectId, setTargetSubjectId] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    durationSeconds: 180,
    sortOrder: 1,
  });

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

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Tải danh sách khóa học
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await catalogApi.getAllCourses();
      setCourses(data);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi tải danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Tải chi tiết khóa học được chọn
  const loadCourseDetail = useCallback(async (courseId: number) => {
    setDetailLoading(true);
    try {
      const data = await catalogApi.getCourseById(courseId);
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

  // =================== COURSE ACTIONS ===================
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) {
      showToast('error', 'Tiêu đề khóa học không được để trống.');
      return;
    }
    setActionLoading(true);
    try {
      if (editingCourse) {
        await catalogApi.updateCourse(editingCourse.id, courseForm);
        showToast('success', 'Đã cập nhật thông tin khóa học thành công.');
      } else {
        await catalogApi.createCourse(courseForm);
        showToast('success', 'Đã tạo khóa học mới thành công.');
      }
      setShowCourseModal(false);
      setEditingCourse(null);
      fetchCourses();
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
      showToast('success', res.message);
      fetchCourses();
      if (selectedCourseDetail?.id === course.id) {
        loadCourseDetail(course.id);
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
      showToast('success', 'Đã xóa khóa học thành công.');
      if (selectedCourseDetail?.id === courseId) {
        setSelectedCourseDetail(null);
      }
      fetchCourses();
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
        await catalogApi.updateSubject(editingSubject.id, {
          title: subjectForm.title,
          description: subjectForm.description,
          sortOrder: Number(subjectForm.sortOrder),
        });
        showToast('success', 'Đã cập nhật môn học.');
      } else {
        await catalogApi.createSubject({
          courseId: selectedCourseDetail.id,
          title: subjectForm.title,
          description: subjectForm.description,
          sortOrder: Number(subjectForm.sortOrder),
        });
        showToast('success', 'Đã thêm môn học mới.');
      }
      setShowSubjectModal(false);
      setEditingSubject(null);
      loadCourseDetail(selectedCourseDetail.id);
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
      showToast('success', 'Đã xóa môn học thành công.');
      if (selectedCourseDetail) loadCourseDetail(selectedCourseDetail.id);
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
      if (editingLesson) {
        await catalogApi.updateLesson(editingLesson.id, {
          title: lessonForm.title,
          description: lessonForm.description,
          durationSeconds: Number(lessonForm.durationSeconds),
          sortOrder: Number(lessonForm.sortOrder),
        });
        showToast('success', 'Đã cập nhật bài giảng.');
      } else {
        await catalogApi.createLesson({
          subjectId: targetSubjectId,
          title: lessonForm.title,
          description: lessonForm.description,
          durationSeconds: Number(lessonForm.durationSeconds),
          sortOrder: Number(lessonForm.sortOrder),
        });
        showToast('success', 'Đã tạo bài giảng mới.');
      }
      setShowLessonModal(false);
      setEditingLesson(null);
      if (selectedCourseDetail) loadCourseDetail(selectedCourseDetail.id);
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
      showToast('success', res.message);
      if (selectedCourseDetail) loadCourseDetail(selectedCourseDetail.id);
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi cập nhật trạng thái bài giảng.');
    }
  };

  const handleDeleteLesson = async (lessonId: number, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa bài giảng "${title}"?`)) return;
    try {
      await catalogApi.deleteLesson(lessonId);
      showToast('success', 'Đã xóa bài giảng thành công.');
      if (selectedCourseDetail) loadCourseDetail(selectedCourseDetail.id);
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi xóa bài giảng.');
    }
  };

  // =================== QUIZ BUILDER ACTIONS ===================
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLessonForQuiz) return;
    setActionLoading(true);
    try {
      await catalogApi.createQuiz(targetLessonForQuiz.id, {
        title: quizTitle,
        passScore: Number(quizPassScore),
        questions: quizQuestions.map((q, qIdx) => ({
          content: q.content,
          explanation: q.explanation,
          points: Number(q.points),
          sortOrder: qIdx + 1,
          questionType: 1, // Single choice
          options: q.options.map((opt, oIdx) => ({
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            sortOrder: oIdx + 1,
          })),
        })),
      });

      showToast('success', `Đã tạo đề thi trắc nghiệm cho bài "${targetLessonForQuiz.title}".`);
      setShowQuizModal(false);
      setTargetLessonForQuiz(null);
      if (selectedCourseDetail) loadCourseDetail(selectedCourseDetail.id);
      if (onDataChanged) onDataChanged();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi tạo đề trắc nghiệm.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#0A0F1F] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Modal */}
        <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0D1429]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Studio Quản Lý Khóa Học & Bài Giảng
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300">
                  TEACHER & ADMIN
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Thêm, sửa, xóa khóa học, học phần, bài giảng vi mô và ngân hàng đề thi trắc nghiệm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedCourseDetail ? (
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setCourseForm({ title: '', description: '', thumbnailUrl: '' });
                  setShowCourseModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Khóa Học Mới</span>
              </button>
            ) : (
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Danh sách khóa học</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thông báo Alert */}
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
            loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs">Đang tải danh sách khóa học...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">Chưa có khóa học nào được tạo.</p>
                <p className="text-xs text-slate-400 mt-1">Bấm nút "Tạo Khóa Học Mới" ở trên để bắt đầu soạn bài giảng.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 rounded-2xl bg-[#090D1A] border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            course.isPublished
                              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                              : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                          }`}
                        >
                          {course.isPublished ? 'Đã xuất bản' : 'Bản nháp (Ẩn)'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCourse(course);
                              setCourseForm({
                                title: course.title,
                                description: course.description || '',
                                thumbnailUrl: course.thumbnailUrl || '',
                              });
                              setShowCourseModal(true);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Sửa khóa học"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleTogglePublishCourse(course)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                            title={course.isPublished ? 'Ẩn khóa học' : 'Xuất bản khóa học'}
                          >
                            {course.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id, course.title)}
                            className="p-1 rounded-lg hover:bg-rose-950/80 text-slate-400 hover:text-rose-400"
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

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-white/5">
                        <span>{course.totalSubjects} môn học</span>
                      </div>
                    </div>

                    <button
                      onClick={() => loadCourseDetail(course.id)}
                      className="mt-4 w-full py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/40 text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Quản lý nội dung bài giảng</span>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                    </button>
                  </div>
                ))}
              </div>
            )
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
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                        selectedCourseDetail.isPublished
                          ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950 border-amber-500/40 text-amber-300'
                      }`}>
                        {selectedCourseDetail.isPublished ? 'Xuất bản' : 'Bản nháp'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{selectedCourseDetail.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedCourseDetail.description}</p>
                  </div>

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
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-white text-xs">
                                        {lesson.title}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                                          lesson.isPublished
                                            ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                                            : 'bg-amber-950 border-amber-500/40 text-amber-300'
                                        }`}
                                      >
                                        {lesson.isPublished ? 'Xuất bản' : 'Ẩn'}
                                      </span>
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

                                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                  {/* Tạo / Soạn Đề thi trắc nghiệm */}
                                  <button
                                    onClick={() => {
                                      setTargetLessonForQuiz(lesson);
                                      setQuizTitle(`Bài tập trắc nghiệm: ${lesson.title}`);
                                      setShowQuizModal(true);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 hover:bg-purple-900 text-purple-300 text-[11px] font-semibold cursor-pointer"
                                    title="Soạn đề thi trắc nghiệm cho bài học này"
                                  >
                                    <HelpCircle className="w-3 h-3" />
                                    <span>Tạo Quiz</span>
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
                                      setShowLessonModal(true);
                                    }}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                    title="Sửa bài học"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  {/* Ẩn / Xuất bản */}
                                  <button
                                    onClick={() => handleTogglePublishLesson(lesson.id)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                                    title={lesson.isPublished ? 'Ẩn bài học' : 'Xuất bản bài học'}
                                  >
                                    {lesson.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>

                                  {/* Xóa bài học */}
                                  <button
                                    onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                                    title="Xóa bài học"
                                  >
                                    <Trash2 className="w-3 h-3" />
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
                  placeholder="Ví dụ: Lập trình React Native Thực chiến"
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
                  placeholder="Ví dụ: Chương 1: Kiến trúc Cơ bản"
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

      {/* DIALOG C: TẠO / SỬA BÀI HỌC */}
      {showLessonModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingLesson ? 'Chỉnh sửa bài giảng' : 'Tạo bài giảng mới'}
              </h3>
              <button onClick={() => setShowLessonModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Tiêu đề bài học *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bài 1: Giới thiệu Nguyên lý Vi mô"
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

      {/* DIALOG D: QUIZ BUILDER (SOẠN ĐỀ TRẮC NGHIỆM) */}
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

              {/* Danh sách câu hỏi */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Danh sách câu hỏi ({quizQuestions.length} câu)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizQuestions([
                        ...quizQuestions,
                        {
                          content: `Câu hỏi số ${quizQuestions.length + 1}`,
                          explanation: 'Giải thích câu trả lời đúng',
                          points: 50,
                          options: [
                            { optionText: 'Đáp án A (Đúng)', isCorrect: true },
                            { optionText: 'Đáp án B', isCorrect: false },
                          ],
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-950 border border-purple-500/30 text-purple-300 hover:bg-purple-900 text-[11px] font-semibold"
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
                          className="text-rose-400 hover:text-rose-300 text-[11px]"
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Đề Trắc Nghiệm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
