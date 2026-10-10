import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
} from 'react-native';
import {
  X,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Globe,
  BookOpen,
  Layers,
  ChevronRight,
  Eye,
  EyeOff,
  Video,
  FilePlus,
  FolderPlus,
  Users,
  CheckCircle2,
  FileQuestion,
  FileText,
  Check,
  Upload,
  FileUp,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { catalogApi } from '../../services/catalogApi';
import type { Course, CourseDetail, Subject, Lesson } from '../../types/catalog.types';
import { CourseStudentProgressModal } from './CourseStudentProgressModal';
import { LessonAttachmentsModal } from '../common/LessonAttachmentsModal';
import { parseDocxQuizFromUri, type ParsedQuizQuestion } from '../../utils/docxQuizParser';

interface CourseManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onCourseUpdated?: () => void;
}

export const CourseManagementModal: React.FC<CourseManagementModalProps> = ({
  visible,
  onClose,
  onCourseUpdated,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // View state: 'COURSES' | 'COURSE_DETAIL'
  const [activeView, setActiveView] = useState<'COURSES' | 'COURSE_DETAIL'>('COURSES');
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Course Form Modal
  const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseThumb, setCourseThumb] = useState('');
  const [courseIsPrivate, setCourseIsPrivate] = useState(false);
  const [coursePass, setCoursePass] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  // Subject Form Modal
  const [isSubjectFormOpen, setIsSubjectFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectTitle, setSubjectTitle] = useState('');
  const [subjectDesc, setSubjectDesc] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  // Lesson Form Modal
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [targetSubjectId, setTargetSubjectId] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonDuration, setLessonDuration] = useState('180');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);

  // Student Progress Modal
  const [analyticsCourse, setAnalyticsCourse] = useState<{ id: number; title: string } | null>(null);

  // Status Filter for Studio (Tất cả / Công khai / Đang ẩn)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'UNPUBLISHED'>('ALL');

  // Video Upload / Link Modal for Lesson
  const [videoModalLesson, setVideoModalLesson] = useState<Lesson | null>(null);
  const [videoMode, setVideoMode] = useState<'FILE' | 'URL'>('FILE');
  const [selectedVideoFile, setSelectedVideoFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    mimeType?: string;
  } | null>(null);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [savingVideoLink, setSavingVideoLink] = useState(false);

  // Quiz Builder Modal for Lesson
  const [quizModalLesson, setQuizModalLesson] = useState<Lesson | null>(null);
  const [quizMode, setQuizMode] = useState<'MANUAL' | 'WORD'>('WORD');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizPassScore, setQuizPassScore] = useState('80');
  const [quizQuestionText, setQuizQuestionText] = useState('');
  const [quizOptionA, setQuizOptionA] = useState('');
  const [quizOptionB, setQuizOptionB] = useState('');
  const [quizOptionC, setQuizOptionC] = useState('');
  const [quizOptionD, setQuizOptionD] = useState('');
  const [quizCorrectIndex, setQuizCorrectIndex] = useState(0);
  const [importedQuizQuestions, setImportedQuizQuestions] = useState<ParsedQuizQuestion[]>([]);
  const [isParsingWord, setIsParsingWord] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Attachment Manager Modal for Lesson
  const [attachmentModalLesson, setAttachmentModalLesson] = useState<Lesson | null>(null);

  const handleTogglePublishLesson = async (lesson: Lesson) => {
    try {
      const res = await catalogApi.togglePublishLesson(lesson.id);
      Alert.alert('Thông báo', res.message);
      // Cập nhật giao diện tức thì
      setSelectedCourse((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          subjects: prev.subjects?.map((sub) => ({
            ...sub,
            lessons: sub.lessons?.map((les) =>
              les.id === lesson.id ? { ...les, isPublished: res.isPublished } : les
            ),
          })),
        };
      });
      if (selectedCourse) await loadCourseDetail(selectedCourse.id);
      if (onCourseUpdated) onCourseUpdated();
    } catch {
      Alert.alert('Lỗi', 'Không thể đổi trạng thái xuất bản bài học.');
    }
  };

  // Xử lý chọn tệp video (.mp4) từ thiết bị
  const handlePickVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const lowerName = asset.name.toLowerCase();
        if (!lowerName.endsWith('.mp4') && !lowerName.endsWith('.mov') && !lowerName.endsWith('.webm')) {
          Alert.alert('Định dạng không hợp lệ', 'Vui lòng chọn tệp video định dạng .mp4, .mov hoặc .webm.');
          return;
        }

        setSelectedVideoFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || 'video/mp4',
        });
      }
    } catch (err) {
      console.warn('[Video] Pick video error:', err);
      Alert.alert('Lỗi', 'Không thể mở trình chọn tệp video trên thiết bị.');
    }
  };

  const handleSaveVideo = async () => {
    if (!videoModalLesson) return;

    if (videoMode === 'FILE') {
      if (!selectedVideoFile) {
        Alert.alert('Chưa chọn video', 'Vui lòng bấm chọn tệp video (.mp4, .mov, .webm) từ điện thoại.');
        return;
      }

      setSavingVideoLink(true);
      try {
        await catalogApi.uploadLessonVideo(
          {
            uri: selectedVideoFile.uri,
            name: selectedVideoFile.name,
            type: selectedVideoFile.mimeType || 'video/mp4',
          },
          videoModalLesson.id
        );
        Alert.alert('Thành công', `Đã tải lên video "${selectedVideoFile.name}" thành công!`);
        setVideoModalLesson(null);
        setSelectedVideoFile(null);
        if (selectedCourse) await loadCourseDetail(selectedCourse.id);
        if (onCourseUpdated) onCourseUpdated();
      } catch (err: any) {
        console.warn('[Video] Upload error:', err);
        Alert.alert('Lỗi tải video', err?.message || err?.response?.data?.message || 'Quá trình tải lên tệp video gặp sự cố. Vui lòng thử lại.');
      } finally {
        setSavingVideoLink(false);
      }
    } else {
      if (!videoUrlInput.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập đường dẫn URL video bài học.');
        return;
      }
      setSavingVideoLink(true);
      try {
        let cleanUrl = videoUrlInput.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }
        await catalogApi.linkExternalLessonVideo({
          lessonId: videoModalLesson.id,
          url: cleanUrl,
          title: videoModalLesson.title,
        });
        Alert.alert('Thành công', 'Đã lưu liên kết luồng video cho bài học!');
        setVideoModalLesson(null);
        if (selectedCourse) await loadCourseDetail(selectedCourse.id);
        if (onCourseUpdated) onCourseUpdated();
      } catch (err: any) {
        Alert.alert('Lỗi liên kết video', err?.response?.data?.message || err?.message || 'Không thể liên kết video bài học.');
      } finally {
        setSavingVideoLink(false);
      }
    }
  };

  // Xử lý chọn tệp Word (.docx) hoặc .txt đề thi trắc nghiệm
  const handlePickWordQuizFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const lowerName = asset.name.toLowerCase();
        if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.txt')) {
          Alert.alert('Định dạng không hợp lệ', 'Vui lòng chọn tệp Word (.docx) hoặc tệp văn bản (.txt).');
          return;
        }

        setIsParsingWord(true);
        try {
          const parsed = await parseDocxQuizFromUri(asset.uri);
          if (parsed.questions.length === 0) {
            Alert.alert(
              'Không tìm thấy câu hỏi',
              'Không trích xuất được câu hỏi trắc nghiệm hợp lệ từ tệp. Đảm bảo cấu trúc: "Câu 1: ... A. ... B. ... Đáp án: A".'
            );
            return;
          }

          setImportedQuizQuestions(parsed.questions);
          const autoTitle = asset.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          if (quizTitle === 'Bài kiểm tra đánh giá' || !quizTitle) {
            setQuizTitle(`Trắc nghiệm: ${autoTitle}`);
          }
          Alert.alert(
            'Nhập thành công 🎉',
            `Đã nhận diện thành công ${parsed.questions.length} câu hỏi trắc nghiệm từ tệp "${asset.name}"!`
          );
        } catch (err: any) {
          console.warn('[Quiz] Parse word error:', err);
          Alert.alert('Lỗi đọc tệp', err?.message || 'Không thể trích xuất nội dung từ tệp Word. Hãy kiểm tra định dạng .docx.');
        } finally {
          setIsParsingWord(false);
        }
      }
    } catch (err: any) {
      console.warn('[Quiz] Pick word error:', err);
      Alert.alert('Lỗi', 'Không thể mở trình chọn tệp trên thiết bị.');
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizModalLesson) return;

    if (quizMode === 'WORD') {
      if (importedQuizQuestions.length === 0) {
        Alert.alert('Chưa có câu hỏi', 'Vui lòng bấm nút chọn file Word (.docx) để trích xuất câu hỏi.');
        return;
      }

      setSavingQuiz(true);
      try {
        await catalogApi.createQuiz(quizModalLesson.id, {
          title: quizTitle.trim() || `Trắc nghiệm: ${quizModalLesson.title}`,
          passScore: Number(quizPassScore) || 80,
          questions: importedQuizQuestions.map((q, idx) => {
            const hasCorrect = q.options.some((opt) => opt.isCorrect);
            return {
              content: q.content,
              explanation: q.explanation,
              points: q.points || Math.max(1, Math.round(100 / importedQuizQuestions.length)),
              sortOrder: idx + 1,
              questionType: 1,
              options: q.options.map((opt, oIdx) => ({
                optionText: opt.optionText,
                isCorrect: hasCorrect ? opt.isCorrect : oIdx === 0,
                sortOrder: oIdx + 1,
              })),
            };
          }),
        });

        Alert.alert('Thành công', `Đã lưu thành công bộ đề gồm ${importedQuizQuestions.length} câu hỏi!`);
        setQuizModalLesson(null);
        setImportedQuizQuestions([]);
        if (selectedCourse) await loadCourseDetail(selectedCourse.id);
        if (onCourseUpdated) onCourseUpdated();
      } catch (err: any) {
        console.warn('[Quiz] Save error:', err);
        Alert.alert('Lỗi lưu Quiz', err?.response?.data?.message || err?.message || 'Không thể lưu câu hỏi trắc nghiệm.');
      } finally {
        setSavingQuiz(false);
      }
    } else {
      if (!quizQuestionText.trim() || !quizOptionA.trim() || !quizOptionB.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung câu hỏi và ít nhất 2 đáp án (A và B).');
        return;
      }

      const options = [
        { optionText: quizOptionA.trim(), isCorrect: quizCorrectIndex === 0, sortOrder: 1 },
        { optionText: quizOptionB.trim(), isCorrect: quizCorrectIndex === 1, sortOrder: 2 },
      ];
      if (quizOptionC.trim()) {
        options.push({ optionText: quizOptionC.trim(), isCorrect: quizCorrectIndex === 2, sortOrder: 3 });
      }
      if (quizOptionD.trim()) {
        options.push({ optionText: quizOptionD.trim(), isCorrect: quizCorrectIndex === 3, sortOrder: 4 });
      }

      if (!options.some((o) => o.isCorrect)) {
        options[0].isCorrect = true;
      }

      setSavingQuiz(true);
      try {
        await catalogApi.createQuiz(quizModalLesson.id, {
          title: quizTitle.trim() || `Trắc nghiệm: ${quizModalLesson.title}`,
          passScore: Number(quizPassScore) || 80,
          questions: [
            {
              content: quizQuestionText.trim(),
              points: 10,
              sortOrder: 1,
              questionType: 1,
              options,
            },
          ],
        });
        Alert.alert('Thành công', 'Đã tạo câu hỏi trắc nghiệm cho bài học!');
        setQuizModalLesson(null);
        if (selectedCourse) await loadCourseDetail(selectedCourse.id);
        if (onCourseUpdated) onCourseUpdated();
      } catch (err: any) {
        console.warn('[Quiz] Save error:', err);
        Alert.alert('Lỗi lưu Quiz', err?.response?.data?.message || err?.message || 'Không thể lưu câu hỏi trắc nghiệm.');
      } finally {
        setSavingQuiz(false);
      }
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await catalogApi.getAllCourses(true);
      setCourses(data);
    } catch {
      Alert.alert('Lỗi', 'Không thể nạp danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetail = async (courseId: number) => {
    setDetailLoading(true);
    try {
      const detail = await catalogApi.getCourseById(courseId, true);
      setSelectedCourse(detail);
      setActiveView('COURSE_DETAIL');
    } catch {
      Alert.alert('Lỗi', 'Không thể tải chi tiết học phần khóa học.');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadCourses();
      setActiveView('COURSES');
      setIsCourseFormOpen(false);
      setIsSubjectFormOpen(false);
      setIsLessonFormOpen(false);
    }
  }, [visible]);

  // ==================== COURSE ACTIONS ====================
  const openCreateCourseForm = () => {
    setCourseTitle('');
    setCourseDesc('');
    setCourseThumb('');
    setCourseIsPrivate(false);
    setCoursePass('');
    setEditingCourse(null);
    setIsCourseFormOpen(true);
  };

  const openEditCourseForm = (course: Course) => {
    setCourseTitle(course.title);
    setCourseDesc(course.description || '');
    setCourseThumb(course.thumbnailUrl || '');
    setCourseIsPrivate(Boolean(course.isPrivate));
    setCoursePass('');
    setEditingCourse(course);
    setIsCourseFormOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề khóa học.');
      return;
    }
    if (courseIsPrivate && !coursePass.trim() && (!editingCourse || !editingCourse.isPrivate)) {
      Alert.alert('Thông báo', 'Khóa học chuyển sang chế độ riêng tư bắt buộc phải nhập Mật khẩu bảo vệ.');
      return;
    }

    setSavingCourse(true);
    try {
      if (editingCourse) {
        const updated = await catalogApi.updateCourse(editingCourse.id, {
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          thumbnailUrl: courseThumb.trim() || undefined,
          isPublished: editingCourse.isPublished,
          isPrivate: courseIsPrivate,
          accessPassword: coursePass.trim() || undefined,
        });
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourse.id ? { ...c, ...updated, isPrivate: courseIsPrivate } : c))
        );
        setSelectedCourse((prev) =>
          prev && prev.id === editingCourse.id ? { ...prev, ...updated, isPrivate: courseIsPrivate } : prev
        );
        Alert.alert('Thành công', 'Đã cập nhật thông tin khóa học.');
      } else {
        const created = await catalogApi.createCourse({
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          thumbnailUrl: courseThumb.trim() || undefined,
          isPrivate: courseIsPrivate,
          accessPassword: coursePass.trim() || undefined,
        });
        setCourses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        Alert.alert('Thành công', 'Đã tạo khóa học mới thành công!');
      }

      setIsCourseFormOpen(false);
      await loadCourses();
      if (selectedCourse && editingCourse && selectedCourse.id === editingCourse.id) {
        await loadCourseDetail(selectedCourse.id);
      }
      if (onCourseUpdated) onCourseUpdated();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể lưu khóa học.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleTogglePublishCourse = async (course: Course) => {
    try {
      const res = await catalogApi.togglePublishCourse(course.id);
      Alert.alert('Thông báo', res.message);
      // Cập nhật giao diện tức thì
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, isPublished: res.isPublished } : c))
      );
      setSelectedCourse((prev) =>
        prev && prev.id === course.id ? { ...prev, isPublished: res.isPublished } : prev
      );
      await loadCourses();
      if (selectedCourse?.id === course.id) {
        await loadCourseDetail(course.id);
      }
      if (onCourseUpdated) onCourseUpdated();
    } catch {
      Alert.alert('Lỗi', 'Không thể đổi trạng thái xuất bản.');
    }
  };

  const handleDeleteCourse = (courseId: number, title: string) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa khóa học "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          try {
            await catalogApi.deleteCourse(courseId);
            Alert.alert('Thành công', 'Đã xóa khóa học.');
            await loadCourses();
            if (activeView === 'COURSE_DETAIL' && selectedCourse?.id === courseId) {
              setActiveView('COURSES');
            }
            if (onCourseUpdated) onCourseUpdated();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa khóa học.');
          }
        },
      },
    ]);
  };

  // ==================== SUBJECT ACTIONS ====================
  const handleSaveSubject = async () => {
    if (!selectedCourse || !subjectTitle.trim()) return;
    setSavingSubject(true);
    try {
      if (editingSubject) {
        await catalogApi.updateSubject(editingSubject.id, {
          title: subjectTitle.trim(),
          description: subjectDesc.trim(),
          sortOrder: editingSubject.sortOrder,
        });
        Alert.alert('Thành công', 'Đã cập nhật môn học.');
      } else {
        await catalogApi.createSubject({
          courseId: selectedCourse.id,
          title: subjectTitle.trim(),
          description: subjectDesc.trim(),
          sortOrder: (selectedCourse.subjects?.length || 0) + 1,
        });
        Alert.alert('Thành công', 'Đã thêm môn học mới.');
      }
      setIsSubjectFormOpen(false);
      await loadCourseDetail(selectedCourse.id);
      await loadCourses();
      if (onCourseUpdated) onCourseUpdated();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu môn học.');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = (subjectId: number, title: string) => {
    Alert.alert('Xóa môn học', `Bạn có chắc muốn xóa "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await catalogApi.deleteSubject(subjectId);
            Alert.alert('Thành công', 'Đã xóa môn học.');
            if (selectedCourse) await loadCourseDetail(selectedCourse.id);
            await loadCourses();
            if (onCourseUpdated) onCourseUpdated();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa môn học.');
          }
        },
      },
    ]);
  };

  // ==================== LESSON ACTIONS ====================
  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề bài giảng.');
      return;
    }
    if (!targetSubjectId) {
      Alert.alert('Thông báo', 'Không xác định được môn học trực thuộc. Vui lòng chọn lại.');
      return;
    }
    setSavingLesson(true);
    try {
      let savedId: number | null = null;
      if (editingLesson) {
        await catalogApi.updateLesson(editingLesson.id, {
          title: lessonTitle.trim(),
          description: lessonDesc.trim(),
          durationSeconds: Number(lessonDuration) || 180,
          sortOrder: editingLesson.sortOrder,
        });
        savedId = editingLesson.id;
        Alert.alert('Thành công', 'Đã cập nhật bài giảng.');
      } else {
        const created = await catalogApi.createLesson({
          subjectId: targetSubjectId,
          title: lessonTitle.trim(),
          description: lessonDesc.trim(),
          durationSeconds: Number(lessonDuration) || 180,
          sortOrder: 1,
        });
        savedId = created.id;
        Alert.alert('Thành công', 'Đã tạo bài học mới thành công!');
      }

      // Gắn link video nếu có
      if (savedId && lessonVideoUrl.trim()) {
        try {
          let cleanVideoUrl = lessonVideoUrl.trim();
          if (!cleanVideoUrl.startsWith('http://') && !cleanVideoUrl.startsWith('https://')) {
            cleanVideoUrl = `https://${cleanVideoUrl}`;
          }
          await catalogApi.linkExternalLessonVideo({
            lessonId: savedId,
            url: cleanVideoUrl,
            title: lessonTitle.trim(),
          });
        } catch (linkErr) {
          console.warn('[Lesson] Link video error:', linkErr);
        }
      }

      setIsLessonFormOpen(false);
      if (selectedCourse) await loadCourseDetail(selectedCourse.id);
      if (onCourseUpdated) onCourseUpdated();
    } catch (err: any) {
      console.warn('[Lesson] Save error:', err);
      Alert.alert('Lỗi lưu bài học', err?.response?.data?.message || err?.message || 'Không thể lưu bài giảng.');
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = (lessonId: number, title: string) => {
    Alert.alert('Xóa bài giảng', `Bạn có chắc muốn xóa "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await catalogApi.deleteLesson(lessonId);
            Alert.alert('Thành công', 'Đã xóa bài giảng.');
            if (selectedCourse) await loadCourseDetail(selectedCourse.id);
            if (onCourseUpdated) onCourseUpdated();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa bài giảng.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              {activeView === 'COURSE_DETAIL' ? (
                <TouchableOpacity
                  style={styles.backViewBtn}
                  onPress={() => setActiveView('COURSES')}
                >
                  <Text style={styles.backViewText}>← Tất cả khóa</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Layers color="#6366F1" size={22} />
                  <Text style={styles.modalTitle}>Studio Quản Lý</Text>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={18} />
            </TouchableOpacity>
          </View>

          {/* ==================== VIEW 1: DANH SÁCH KHÓA HỌC ==================== */}
          {activeView === 'COURSES' && (
            <View style={styles.mainContainer}>
              <TouchableOpacity style={styles.createBtn} onPress={openCreateCourseForm} activeOpacity={0.8}>
                <Plus color="#FFFFFF" size={18} />
                <Text style={styles.createBtnText}>Tạo Khóa Học Mới</Text>
              </TouchableOpacity>

              {/* Bộ lọc hiển thị: Tất cả • Công khai • Đang ẩn */}
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('ALL')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'ALL' && styles.filterChipTextActive]}>
                    Tất cả ({courses.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'PUBLISHED' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('PUBLISHED')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'PUBLISHED' && styles.filterChipTextActive]}>
                    Công khai ({courses.filter((c) => c.isPublished).length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, statusFilter === 'UNPUBLISHED' && styles.filterChipActive]}
                  onPress={() => setStatusFilter('UNPUBLISHED')}
                >
                  <Text style={[styles.filterChipText, statusFilter === 'UNPUBLISHED' && styles.filterChipTextActive]}>
                    Đang ẩn ({courses.filter((c) => !c.isPublished).length})
                  </Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
              ) : (
                <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                  {courses
                    .filter((c) => {
                      if (statusFilter === 'PUBLISHED') return c.isPublished;
                      if (statusFilter === 'UNPUBLISHED') return !c.isPublished;
                      return true;
                    })
                    .map((c) => (
                      <View key={c.id} style={styles.itemCard}>
                        <View style={styles.itemInfo}>
                          <View style={styles.titleRow}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {c.title}
                            </Text>
                            {c.isPublished ? (
                              <View style={styles.badgePublic}>
                                <Eye color="#10B981" size={10} />
                                <Text style={styles.badgeTextPublic}>Công khai</Text>
                              </View>
                            ) : (
                              <View style={styles.badgeUnpublished}>
                                <EyeOff color="#F59E0B" size={10} />
                                <Text style={styles.badgeTextUnpublished}>Đang ẩn</Text>
                              </View>
                            )}
                            {c.isPrivate ? (
                              <View style={styles.badgePrivate}>
                                <Lock color="#F59E0B" size={10} />
                                <Text style={styles.badgeTextPrivate}>Hạn chế</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.itemSub}>{c.totalSubjects || 0} Môn học</Text>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.actionBtnRow}>
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => handleTogglePublishCourse(c)}
                          >
                            {c.isPublished ? <Eye color="#10B981" size={16} /> : <EyeOff color="#F59E0B" size={16} />}
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.iconBtn} onPress={() => openEditCourseForm(c)}>
                            <Edit3 color="#38BDF8" size={16} />
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteCourse(c.id, c.title)}>
                            <Trash2 color="#EF4444" size={16} />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.manageDetailBtn}
                          onPress={() => loadCourseDetail(c.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.manageDetailText}>Quản lý Môn học & Bài giảng</Text>
                          <ChevronRight color="#818CF8" size={14} />
                        </TouchableOpacity>
                      </View>
                    ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ==================== VIEW 2: SOẠN THẢO HỌC PHẦN ==================== */}
          {activeView === 'COURSE_DETAIL' && selectedCourse && (
            <View style={styles.mainContainer}>
              <View style={styles.courseDetailHeader}>
                <Text style={styles.detailCourseTitle} numberOfLines={1}>
                  {selectedCourse.title}
                </Text>
                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    style={styles.analyticsMiniBtn}
                    onPress={() => setAnalyticsCourse({ id: selectedCourse.id, title: selectedCourse.title })}
                  >
                    <Users color="#06B6D4" size={14} />
                    <Text style={styles.analyticsMiniText}>Học viên</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.addSubjectBtn}
                    onPress={() => {
                      setEditingSubject(null);
                      setSubjectTitle('');
                      setSubjectDesc('');
                      setIsSubjectFormOpen(true);
                    }}
                  >
                    <FolderPlus color="#FFFFFF" size={14} />
                    <Text style={styles.addSubjectText}>+ Môn học</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {detailLoading ? (
                <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
              ) : (
                <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                  {(!selectedCourse.subjects || selectedCourse.subjects.length === 0) ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyText}>Chưa có môn học nào trong khóa này.</Text>
                    </View>
                  ) : (
                    selectedCourse.subjects.map((sub, sIdx) => (
                      <View key={sub.id} style={styles.subjectBox}>
                        <View style={styles.subjectHeaderRow}>
                          <Text style={styles.subjectBoxTitle} numberOfLines={1}>
                            {sIdx + 1}. {sub.title}
                          </Text>

                          <View style={styles.actionBtnRow}>
                            <TouchableOpacity
                              style={styles.addLessonBtn}
                              onPress={() => {
                                setTargetSubjectId(sub.id);
                                setEditingLesson(null);
                                setLessonTitle('');
                                setLessonDesc('');
                                setLessonDuration('180');
                                setLessonVideoUrl('');
                                setIsLessonFormOpen(true);
                              }}
                            >
                              <FilePlus color="#818CF8" size={14} />
                              <Text style={styles.addLessonText}>+ Bài</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.iconBtn}
                              onPress={() => {
                                setEditingSubject(sub);
                                setSubjectTitle(sub.title);
                                setSubjectDesc(sub.description || '');
                                setIsSubjectFormOpen(true);
                              }}
                            >
                              <Edit3 color="#38BDF8" size={14} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.iconBtn}
                              onPress={() => handleDeleteSubject(sub.id, sub.title)}
                            >
                              <Trash2 color="#EF4444" size={14} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Danh sách bài giảng bên trong môn */}
                        {sub.lessons && sub.lessons.length > 0 ? (
                          sub.lessons.map((les) => (
                            <View key={les.id} style={styles.lessonRow}>
                              <View style={{ flex: 1, marginRight: 6 }}>
                                <View style={styles.lessonTitleRow}>
                                  <Text style={styles.lessonRowTitle} numberOfLines={1}>
                                    {les.title}
                                  </Text>
                                  {!les.isPublished && (
                                    <View style={styles.badgeMiniUnpublished}>
                                      <Text style={styles.badgeMiniUnpublishedText}>Ẩn</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.lessonSubInfoRow}>
                                  <Text style={styles.lessonRowSub}>{Math.round(les.durationSeconds / 60)} phút</Text>
                                  {les.hasQuiz ? (
                                    <View style={styles.quizMiniBadge}>
                                      <Text style={styles.quizMiniBadgeText}>Quiz ✓</Text>
                                    </View>
                                  ) : null}
                                  {(les.videoUrl || (les.mediaAssetCount && les.mediaAssetCount > 0)) ? (
                                    <View style={styles.videoMiniBadge}>
                                      <Text style={styles.videoMiniBadgeText}>Video ✓</Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>

                              <View style={styles.actionBtnRow}>
                                {/* 1. Toggle Ẩn / Hiện bài học */}
                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={() => handleTogglePublishLesson(les)}
                                  activeOpacity={0.8}
                                >
                                  {les.isPublished ? <Eye color="#10B981" size={14} /> : <EyeOff color="#F59E0B" size={14} />}
                                </TouchableOpacity>

                                {/* 2. Gắn / Tải video cho bài học */}
                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={async () => {
                                    setVideoModalLesson(les);
                                    setVideoUrlInput(les.videoUrl || '');
                                    if (!les.videoUrl && les.mediaAssetCount && les.mediaAssetCount > 0) {
                                      try {
                                        const info = await catalogApi.getLessonMediaInfo(les.id);
                                        if (info?.externalUrl || info?.streamUrl) {
                                          setVideoUrlInput(info.externalUrl || info.streamUrl);
                                        }
                                      } catch {
                                        // ignore
                                      }
                                    }
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Video
                                    color={(les.videoUrl || (les.mediaAssetCount && les.mediaAssetCount > 0)) ? '#10B981' : '#818CF8'}
                                    size={14}
                                  />
                                </TouchableOpacity>

                                {/* 3. Soạn đề câu hỏi Quiz trắc nghiệm */}
                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={() => {
                                    setQuizModalLesson(les);
                                    setQuizTitle(`Trắc nghiệm: ${les.title}`);
                                    setQuizPassScore('80');
                                    setQuizQuestionText('');
                                    setQuizOptionA('');
                                    setQuizOptionB('');
                                    setQuizOptionC('');
                                    setQuizOptionD('');
                                    setQuizCorrectIndex(0);
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <FileQuestion color={les.hasQuiz ? '#F59E0B' : '#94A3B8'} size={14} />
                                </TouchableOpacity>

                                {/* 4. Quản lý Tài liệu đính kèm (PDF / Word) */}
                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={() => setAttachmentModalLesson(les)}
                                  activeOpacity={0.8}
                                >
                                  <FileText color="#38BDF8" size={14} />
                                </TouchableOpacity>

                                {/* 5. Sửa bài học */}
                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={() => {
                                    setTargetSubjectId(sub.id);
                                    setEditingLesson(les);
                                    setLessonTitle(les.title);
                                    setLessonDesc(les.description || '');
                                    setLessonDuration(String(les.durationSeconds));
                                    setLessonVideoUrl(les.videoUrl || '');
                                    setIsLessonFormOpen(true);
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Edit3 color="#38BDF8" size={14} />
                                </TouchableOpacity>

                                {/* 6. Xóa bài học */}
                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={() => handleDeleteLesson(les.id, les.title)}
                                  activeOpacity={0.8}
                                >
                                  <Trash2 color="#EF4444" size={14} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.noLessonsText}>Chưa có bài học nào. Bấm "+ Bài" để thêm.</Text>
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>
              )}
            </View>
          )}

          {/* ==================== SUB-MODAL: COURSE FORM ==================== */}
          <Modal visible={isCourseFormOpen} transparent animationType="fade">
            <View style={styles.innerModalOverlay}>
              <View style={styles.innerModalCard}>
                <Text style={styles.innerModalTitle}>
                  {editingCourse ? 'Chỉnh Sửa Khóa Học' : 'Tạo Khóa Học Mới'}
                </Text>

                <TextInput
                  style={styles.innerInput}
                  placeholder="Tiêu đề khóa học *"
                  placeholderTextColor="#64748B"
                  value={courseTitle}
                  onChangeText={setCourseTitle}
                />

                <TextInput
                  style={[styles.innerInput, { height: 70 }]}
                  placeholder="Mô tả khóa học..."
                  placeholderTextColor="#64748B"
                  multiline
                  value={courseDesc}
                  onChangeText={setCourseDesc}
                />

                <TextInput
                  style={styles.innerInput}
                  placeholder="URL ảnh Thumbnail (https://...)"
                  placeholderTextColor="#64748B"
                  value={courseThumb}
                  onChangeText={setCourseThumb}
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Khóa học riêng tư (Hạn chế)</Text>
                  <Switch value={courseIsPrivate} onValueChange={setCourseIsPrivate} trackColor={{ true: '#F59E0B' }} />
                </View>

                {courseIsPrivate && (
                  <TextInput
                    style={styles.innerInput}
                    placeholder="Mật khẩu mở khóa *"
                    placeholderTextColor="#64748B"
                    value={coursePass}
                    onChangeText={setCoursePass}
                  />
                )}

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCourseFormOpen(false)}>
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCourse} disabled={savingCourse}>
                    <Text style={styles.confirmBtnText}>{savingCourse ? 'Đang lưu...' : 'Lưu'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ==================== SUB-MODAL: SUBJECT FORM ==================== */}
          <Modal visible={isSubjectFormOpen} transparent animationType="fade">
            <View style={styles.innerModalOverlay}>
              <View style={styles.innerModalCard}>
                <Text style={styles.innerModalTitle}>
                  {editingSubject ? 'Chỉnh Sửa Môn Học' : 'Thêm Môn Học Mới'}
                </Text>

                <TextInput
                  style={styles.innerInput}
                  placeholder="Tiêu đề môn học *"
                  placeholderTextColor="#64748B"
                  value={subjectTitle}
                  onChangeText={setSubjectTitle}
                />

                <TextInput
                  style={[styles.innerInput, { height: 60 }]}
                  placeholder="Mô tả môn học..."
                  placeholderTextColor="#64748B"
                  multiline
                  value={subjectDesc}
                  onChangeText={setSubjectDesc}
                />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsSubjectFormOpen(false)}>
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveSubject} disabled={savingSubject}>
                    <Text style={styles.confirmBtnText}>{savingSubject ? 'Đang lưu...' : 'Lưu'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ==================== SUB-MODAL: LESSON FORM ==================== */}
          <Modal visible={isLessonFormOpen} transparent animationType="fade">
            <View style={styles.innerModalOverlay}>
              <View style={styles.innerModalCard}>
                <Text style={styles.innerModalTitle}>
                  {editingLesson ? 'Chỉnh Sửa Bài Giảng' : 'Thêm Bài Giảng Mới'}
                </Text>

                <TextInput
                  style={styles.innerInput}
                  placeholder="Tiêu đề bài giảng *"
                  placeholderTextColor="#64748B"
                  value={lessonTitle}
                  onChangeText={setLessonTitle}
                />

                <TextInput
                  style={[styles.innerInput, { height: 60 }]}
                  placeholder="Mô tả tóm tắt bài giảng (tùy chọn)..."
                  placeholderTextColor="#64748B"
                  multiline
                  value={lessonDesc}
                  onChangeText={setLessonDesc}
                />

                <TextInput
                  style={styles.innerInput}
                  placeholder="Thời lượng tính bằng giây (VD: 180)"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={lessonDuration}
                  onChangeText={setLessonDuration}
                />

                <TextInput
                  style={styles.innerInput}
                  placeholder="URL video YouTube / MP4 (nếu có)"
                  placeholderTextColor="#64748B"
                  value={lessonVideoUrl}
                  onChangeText={setLessonVideoUrl}
                />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsLessonFormOpen(false)}>
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveLesson} disabled={savingLesson}>
                    <Text style={styles.confirmBtnText}>{savingLesson ? 'Đang lưu...' : 'Lưu'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal Gắn Luồng Video Cho Bài Học (Hỗ trợ upload .mp4 trực tiếp hoặc URL) */}
          <Modal visible={Boolean(videoModalLesson)} transparent animationType="fade">
            <View style={styles.innerModalOverlay}>
              <View style={styles.innerModalCard}>
                <Text style={styles.innerModalTitle}>
                  Gắn Video Bài Giảng
                </Text>
                <Text style={styles.innerModalSubTitle}>
                  Bài học: {videoModalLesson?.title}
                </Text>

                {/* Tabs chế độ: Tải video từ máy vs Nhập URL */}
                <View style={styles.modeTabsRow}>
                  <TouchableOpacity
                    style={[styles.modeTabBtn, videoMode === 'FILE' && styles.modeTabBtnActive]}
                    onPress={() => setVideoMode('FILE')}
                  >
                    <Upload color={videoMode === 'FILE' ? '#38BDF8' : '#94A3B8'} size={14} />
                    <Text style={[styles.modeTabText, videoMode === 'FILE' && styles.modeTabTextActive]}>
                      Tải từ máy (.mp4)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeTabBtn, videoMode === 'URL' && styles.modeTabBtnActive]}
                    onPress={() => setVideoMode('URL')}
                  >
                    <Video color={videoMode === 'URL' ? '#38BDF8' : '#94A3B8'} size={14} />
                    <Text style={[styles.modeTabText, videoMode === 'URL' && styles.modeTabTextActive]}>
                      Nhập link URL
                    </Text>
                  </TouchableOpacity>
                </View>

                {videoMode === 'FILE' ? (
                  <View style={{ marginVertical: 8 }}>
                    <TouchableOpacity
                      style={styles.filePickerBtn}
                      onPress={handlePickVideoFile}
                      activeOpacity={0.8}
                    >
                      <Upload color="#38BDF8" size={22} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.filePickerBtnTitle}>
                          {selectedVideoFile ? selectedVideoFile.name : 'Chạm để chọn video (.mp4) từ điện thoại'}
                        </Text>
                        <Text style={styles.filePickerBtnSub}>
                          {selectedVideoFile
                            ? `Dung lượng: ${(Number(selectedVideoFile.size || 0) / (1024 * 1024)).toFixed(1)} MB`
                            : 'Định dạng .mp4, .webm, .mov (hỗ trợ tối đa 500MB)'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.innerInput, { marginVertical: 8 }]}
                    placeholder="URL luồng phát video (MP4 / Azure / HLS / YouTube)..."
                    placeholderTextColor="#64748B"
                    value={videoUrlInput}
                    onChangeText={setVideoUrlInput}
                    autoCapitalize="none"
                  />
                )}

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setVideoModalLesson(null);
                      setSelectedVideoFile(null);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleSaveVideo}
                    disabled={savingVideoLink}
                  >
                    <Text style={styles.confirmBtnText}>
                      {savingVideoLink
                        ? 'Đang tải lên...'
                        : videoMode === 'FILE'
                        ? 'Tải lên video'
                        : 'Lưu Video'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal Soạn Đề Câu Hỏi Quiz Trắc Nghiệm (Hỗ trợ nhập File Word .docx hoặc nhập tay) */}
          <Modal visible={Boolean(quizModalLesson)} transparent animationType="fade">
            <View style={styles.innerModalOverlay}>
              <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                <View style={styles.innerModalCard}>
                  <Text style={styles.innerModalTitle}>
                    Soạn Đề Trắc Nghiệm Củng Cố
                  </Text>
                  <Text style={styles.innerModalSubTitle}>
                    Bài học: {quizModalLesson?.title}
                  </Text>

                  {/* Tabs: Tải từ Word .docx vs Soạn thủ công */}
                  <View style={styles.modeTabsRow}>
                    <TouchableOpacity
                      style={[styles.modeTabBtn, quizMode === 'WORD' && styles.modeTabBtnActive]}
                      onPress={() => setQuizMode('WORD')}
                    >
                      <FileUp color={quizMode === 'WORD' ? '#38BDF8' : '#94A3B8'} size={14} />
                      <Text style={[styles.modeTabText, quizMode === 'WORD' && styles.modeTabTextActive]}>
                        Tải file Word (.docx)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modeTabBtn, quizMode === 'MANUAL' && styles.modeTabBtnActive]}
                      onPress={() => setQuizMode('MANUAL')}
                    >
                      <FileQuestion color={quizMode === 'MANUAL' ? '#38BDF8' : '#94A3B8'} size={14} />
                      <Text style={[styles.modeTabText, quizMode === 'MANUAL' && styles.modeTabTextActive]}>
                        Nhập thủ công
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.innerInput}
                    placeholder="Tiêu đề bài kiểm tra trắc nghiệm..."
                    placeholderTextColor="#64748B"
                    value={quizTitle}
                    onChangeText={setQuizTitle}
                  />

                  <TextInput
                    style={styles.innerInput}
                    placeholder="Điểm đạt tối thiểu (VD: 80)"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={quizPassScore}
                    onChangeText={setQuizPassScore}
                  />

                  {quizMode === 'WORD' ? (
                    <View style={{ marginVertical: 8 }}>
                      <TouchableOpacity
                        style={styles.filePickerBtn}
                        onPress={handlePickWordQuizFile}
                        disabled={isParsingWord}
                        activeOpacity={0.8}
                      >
                        {isParsingWord ? (
                          <ActivityIndicator size="small" color="#38BDF8" />
                        ) : (
                          <FileUp color="#38BDF8" size={24} />
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.filePickerBtnTitle}>
                            {importedQuizQuestions.length > 0
                              ? `Đã nhận diện ${importedQuizQuestions.length} câu hỏi trắc nghiệm`
                              : 'Chạm để chọn file Word (.docx) chứa câu hỏi'}
                          </Text>
                          <Text style={styles.filePickerBtnSub}>
                            Hỗ trợ tự động phân tích định dạng: "Câu 1: ... A. ... B. ... Đáp án: A"
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {importedQuizQuestions.length > 0 && (
                        <View style={styles.quizPreviewBox}>
                          <Text style={styles.quizPreviewTitle}>
                            Xem trước {importedQuizQuestions.length} câu hỏi đã nạp:
                          </Text>
                          {importedQuizQuestions.slice(0, 3).map((q, idx) => (
                            <View key={idx} style={styles.quizPreviewItem}>
                              <Text style={styles.quizPreviewItemText} numberOfLines={2}>
                                {idx + 1}. {q.content}
                              </Text>
                              <Text style={styles.quizPreviewSubText}>
                                {q.options.length} phương án • Đáp án: {q.options.find((o) => o.isCorrect)?.optionText || 'A'}
                              </Text>
                            </View>
                          ))}
                          {importedQuizQuestions.length > 3 && (
                            <Text style={styles.quizPreviewMore}>
                              ... và {importedQuizQuestions.length - 3} câu hỏi khác
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View>
                      <TextInput
                        style={[styles.innerInput, { height: 60 }]}
                        placeholder="Nội dung câu hỏi trắc nghiệm *"
                        placeholderTextColor="#64748B"
                        multiline
                        value={quizQuestionText}
                        onChangeText={setQuizQuestionText}
                      />

                      <Text style={styles.optionsHeaderLabel}>
                        Các lựa chọn (Chạm nút tròn để chọn đáp án đúng):
                      </Text>

                      {/* Option A */}
                      <View style={styles.quizOptionRow}>
                        <TouchableOpacity
                          style={[styles.radioCircle, quizCorrectIndex === 0 && styles.radioCircleActive]}
                          onPress={() => setQuizCorrectIndex(0)}
                        >
                          {quizCorrectIndex === 0 ? <View style={styles.radioInner} /> : null}
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.innerInput, styles.optionInput]}
                          placeholder="Đáp án A *"
                          placeholderTextColor="#64748B"
                          value={quizOptionA}
                          onChangeText={setQuizOptionA}
                        />
                      </View>

                      {/* Option B */}
                      <View style={styles.quizOptionRow}>
                        <TouchableOpacity
                          style={[styles.radioCircle, quizCorrectIndex === 1 && styles.radioCircleActive]}
                          onPress={() => setQuizCorrectIndex(1)}
                        >
                          {quizCorrectIndex === 1 ? <View style={styles.radioInner} /> : null}
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.innerInput, styles.optionInput]}
                          placeholder="Đáp án B *"
                          placeholderTextColor="#64748B"
                          value={quizOptionB}
                          onChangeText={setQuizOptionB}
                        />
                      </View>

                      {/* Option C */}
                      <View style={styles.quizOptionRow}>
                        <TouchableOpacity
                          style={[styles.radioCircle, quizCorrectIndex === 2 && styles.radioCircleActive]}
                          onPress={() => setQuizCorrectIndex(2)}
                        >
                          {quizCorrectIndex === 2 ? <View style={styles.radioInner} /> : null}
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.innerInput, styles.optionInput]}
                          placeholder="Đáp án C (tùy chọn)"
                          placeholderTextColor="#64748B"
                          value={quizOptionC}
                          onChangeText={setQuizOptionC}
                        />
                      </View>

                      {/* Option D */}
                      <View style={styles.quizOptionRow}>
                        <TouchableOpacity
                          style={[styles.radioCircle, quizCorrectIndex === 3 && styles.radioCircleActive]}
                          onPress={() => setQuizCorrectIndex(3)}
                        >
                          {quizCorrectIndex === 3 ? <View style={styles.radioInner} /> : null}
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.innerInput, styles.optionInput]}
                          placeholder="Đáp án D (tùy chọn)"
                          placeholderTextColor="#64748B"
                          value={quizOptionD}
                          onChangeText={setQuizOptionD}
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => {
                        setQuizModalLesson(null);
                        setImportedQuizQuestions([]);
                      }}
                    >
                      <Text style={styles.cancelBtnText}>Hủy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handleSaveQuiz}
                      disabled={savingQuiz}
                    >
                      <Text style={styles.confirmBtnText}>
                        {savingQuiz ? 'Đang lưu...' : 'Lưu Đề Quiz'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Modal>

          {/* Modal Quản Lý Tài Liệu Đính Kèm Của Bài Học */}
          {attachmentModalLesson && (
            <LessonAttachmentsModal
              visible={Boolean(attachmentModalLesson)}
              lessonId={attachmentModalLesson.id}
              lessonTitle={attachmentModalLesson.title}
              canManage={true}
              onClose={() => setAttachmentModalLesson(null)}
            />
          )}

          {/* Modal Tiến độ học viên */}
          {analyticsCourse && (
            <CourseStudentProgressModal
              visible={Boolean(analyticsCourse)}
              courseId={analyticsCourse.id}
              courseTitle={analyticsCourse.title}
              onClose={() => setAnalyticsCourse(null)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 24, 0.85)',
    justifyContent: 'center',
    padding: 14,
  },
  modalContent: {
    maxHeight: '92%',
    backgroundColor: '#090D1A',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  backViewBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  backViewText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  mainContainer: {
    flexShrink: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    height: 44,
    gap: 6,
    marginBottom: 14,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#818CF8',
    fontWeight: '700',
  },
  scrollList: {
    maxHeight: 460,
  },
  itemCard: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  itemInfo: {
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  itemSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  badgePrivate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePublic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeUnpublished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeTextPrivate: { color: '#F59E0B', fontSize: 9, fontWeight: '700' },
  badgeTextPublic: { color: '#10B981', fontSize: 9, fontWeight: '700' },
  badgeTextUnpublished: { color: '#F59E0B', fontSize: 9, fontWeight: '700' },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  manageDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 4,
    marginTop: 10,
  },
  manageDetailText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
  courseDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailCourseTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  detailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analyticsMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  analyticsMiniText: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '700',
  },
  addSubjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366F1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSubjectText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  subjectBox: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 10,
  },
  subjectHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectBoxTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  addLessonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addLessonText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
  },
  lessonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070B17',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  lessonRowTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  lessonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeMiniUnpublished: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeMiniUnpublishedText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '700',
  },
  lessonSubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  quizMiniBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  quizMiniBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '700',
  },
  videoMiniBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  videoMiniBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
  },
  innerModalSubTitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: -6,
  },
  optionsHeaderLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  quizOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#10B981',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  optionInput: {
    flex: 1,
    height: 38,
    fontSize: 12,
  },
  lessonRowSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  noLessonsText: {
    color: '#475569',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  innerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  innerModalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  innerModalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  innerInput: {
    backgroundColor: '#070B17',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#070B17',
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  modeTabBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  modeTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#38BDF8',
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B17',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
  },
  filePickerBtnTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  filePickerBtnSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  quizPreviewBox: {
    backgroundColor: '#070B17',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quizPreviewTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  quizPreviewItem: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  quizPreviewItemText: {
    color: '#E2E8F0',
    fontSize: 11,
  },
  quizPreviewSubText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  quizPreviewMore: {
    color: '#818CF8',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
