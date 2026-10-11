import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  FlatList,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Sparkles,
  Bot,
  User,
  Send,
  BookMarked,
  FileText,
  Mic,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Volume2,
  Layers,
  ChevronDown,
  Paperclip,
  Upload,
  Link2,
  Check,
  X,
} from 'lucide-react-native';
import { parseDocxQuizFromUri } from '../../src/utils/docxQuizParser';
import { extractTextFromFileUri, extractTextFromRemoteUrl, formatExtractedDocumentContent } from '../../src/utils/documentExtractor';
import { attachmentApi } from '../../src/services/attachmentApi';
import { notebookService } from '../../src/services/notebookService';
import { catalogApi } from '../../src/services/catalogApi';
import type {
  Notebook,
  NotebookSource,
  NotebookStatus,
  PodcastEpisode,
  NotebookChatMessage,
} from '../../src/types/notebook.types';
import type { Course, CourseDetail, Lesson, LessonAttachment } from '../../src/types/catalog.types';

type ActiveTab = 'CHAT' | 'NOTEBOOKS' | 'SOURCES' | 'PODCASTS';

export default function AiNotebookScreen() {
  const routeParams = useLocalSearchParams<{
    courseId?: string;
    courseTitle?: string;
    lessonId?: string;
    lessonTitle?: string;
  }>();

  const [activeTab, setActiveTab] = useState<ActiveTab>('CHAT');
  const [status, setStatus] = useState<NotebookStatus>({
    isOnline: false,
    apiUrl: '',
    webUrl: '',
    modelName: 'Đang kiểm tra kết nối...',
  });

  // State quản lý Notebooks & Sources
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [sources, setSources] = useState<NotebookSource[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([]);

  // State cho Chat RAG
  const [messages, setMessages] = useState<NotebookChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Xin chào! Tôi là Trợ lý AI MicroLearning. Tôi có thể giúp bạn giải đáp thắc mắc, tóm tắt bài giảng hoặc phân tích tài liệu trong sổ tay.',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Quick prompt suggestions
  const suggestedPrompts = [
    'Tóm tắt nội dung chính khóa học',
    'Tạo 3 câu hỏi ôn tập nhanh',
    'Giải thích khái niệm khó nhất',
  ];

  // State Modal / New notebook & new source form
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [newNotebookDesc, setNewNotebookDesc] = useState('');

  // State tạo tài liệu mới
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceContent, setNewSourceContent] = useState('');

  // Course selector for auto syncing source
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  // State nạp file từ máy
  const [isUploadingDeviceFile, setIsUploadingDeviceFile] = useState(false);

  // State Modal Gắn Source có sẵn (Tài liệu khóa học & Kho source hệ thống)
  const [isExistingSourceModalOpen, setIsExistingSourceModalOpen] = useState(false);
  const [existingSourceTab, setExistingSourceTab] = useState<'COURSE_DOCS' | 'ALL_SOURCES'>('COURSE_DOCS');
  const [existingSourceSearch, setExistingSourceSearch] = useState('');
  const [allSystemSources, setAllSystemSources] = useState<NotebookSource[]>([]);
  const [courseAttachments, setCourseAttachments] = useState<
    Array<LessonAttachment & { courseTitle?: string; lessonTitle?: string }>
  >([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [selectedCourseForDocs, setSelectedCourseForDocs] = useState<Course | null>(null);
  const [attachingDocId, setAttachingDocId] = useState<number | string | null>(null);

  // Loading indicator
  const [isLoadingData, setIsLoadingData] = useState(false);
  const flatListRef = useRef<FlatList<NotebookChatMessage> | null>(null);

  // 1. Tải dữ liệu ban đầu
  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const [st, nbsInit, pods, allCourses] = await Promise.all([
        notebookService.checkStatus(),
        notebookService.getNotebooks(),
        notebookService.getPodcastEpisodes(),
        catalogApi.getAllCourses(),
      ]);

      let nbs = [...nbsInit];
      setStatus(st);
      setPodcasts(pods);
      setCourses(allCourses);

      let currentNb = nbs[0] || null;

      // Xử lý tạo / mở nhanh sổ tay theo Khóa học khi chuyển từ Bài học sang
      if (routeParams.courseTitle) {
        const titleQuery = routeParams.courseTitle.trim().toLowerCase();
        let matched = nbs.find(
          (n) =>
            n.name.toLowerCase() === `sổ tay: ${titleQuery}` ||
            n.name.toLowerCase().includes(titleQuery)
        );

        if (!matched) {
          matched = await notebookService.createNotebook(
            `Sổ tay: ${routeParams.courseTitle.trim()}`,
            `Sổ tay trợ lý AI thông minh cho khóa học "${routeParams.courseTitle.trim()}".`
          );
          nbs = [matched, ...nbs];
        }
        currentNb = matched;
      }

      setNotebooks(nbs);
      setActiveNotebook(currentNb);

      if (currentNb) {
        let srcs = await notebookService.getSourcesByNotebook(currentNb.id);

        // Tự động gắn bài học vào sổ tay nếu có lessonId/lessonTitle
        if (routeParams.lessonId && routeParams.lessonTitle) {
          const lId = Number(routeParams.lessonId);
          const alreadyHasLesson = srcs.some(
            (s) => s.lesson_id === lId || s.title.includes(routeParams.lessonTitle!)
          );
          if (!alreadyHasLesson) {
            const lessonSrc = await notebookService.addTextSource(
              currentNb.id,
              `[Bài học] ${routeParams.lessonTitle}`,
              [
                `BÀI HỌC: ${routeParams.lessonTitle}`,
                routeParams.courseTitle ? `Khóa học: ${routeParams.courseTitle}` : '',
                `ID bài học: ${routeParams.lessonId}`,
                `Thời gian nạp: ${new Date().toLocaleString('vi-VN')}`,
                `Nội dung bài học đã được liên kết trực tiếp vào Sổ tay AI. Người học có thể hỏi bất kỳ thắc mắc nào để AI giải đáp.`,
              ]
                .filter(Boolean)
                .join('\n'),
              lId,
              routeParams.courseId ? Number(routeParams.courseId) : undefined,
              routeParams.lessonTitle,
              routeParams.courseTitle
            );
            srcs = [lessonSrc, ...srcs];
          }
        }

        setSources(srcs);
      }

      if (routeParams.lessonTitle) {
        setMessages((prev) => [
          ...prev,
          {
            id: `init-${Date.now()}`,
            sender: 'assistant',
            text: `Tôi đã mở sổ tay cho bài học "${routeParams.lessonTitle}". Bạn có câu hỏi nào về nội dung bài học này không?`,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.warn('[AiScreen] Error loading data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [routeParams.courseId, routeParams.lessonId]);

  // 2. Chuyển đổi notebook
  const handleSelectNotebook = async (nb: Notebook) => {
    setActiveNotebook(nb);
    try {
      const srcs = await notebookService.getSourcesByNotebook(nb.id);
      setSources(srcs);
    } catch {
      setSources([]);
    }
  };

  // 3. Gửi tin nhắn hỏi đáp AI
  const handleSendMessage = async (textToSend?: string) => {
    const question = (textToSend || inputText).trim();
    if (!question || isAsking) return;

    setInputText('');
    const userMsg: NotebookChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAsking(true);

    try {
      const chatHistory = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.sender,
          text: m.text,
        }));

      const answer = await notebookService.askQuestion(
        activeNotebook?.id || '',
        question,
        undefined,
        selectedCourse?.id,
        chatHistory
      );

      const aiMsg: NotebookChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: NotebookChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        text: 'Xin lỗi, đã xảy ra lỗi trong quá trình xử lý câu hỏi. Vui lòng kiểm tra lại kết nối mạng.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  // 4. Tạo Sổ tay mới
  const handleCreateNotebook = async () => {
    if (!newNotebookTitle.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên sổ tay');
      return;
    }

    try {
      const created = await notebookService.createNotebook(
        newNotebookTitle.trim(),
        newNotebookDesc.trim()
      );
      setNotebooks((prev) => [created, ...prev]);
      setActiveNotebook(created);
      setSources([]);
      setNewNotebookTitle('');
      setNewNotebookDesc('');
      setIsCreatingNotebook(false);
      Alert.alert('Thành công', `Đã tạo sổ tay: ${created.name}`);
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo sổ tay');
    }
  };

  // 5. Xóa Sổ tay
  const handleDeleteNotebook = (nb: Notebook) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa sổ tay "${nb.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await notebookService.deleteNotebook(nb.id);
          const updated = notebooks.filter((n) => n.id !== nb.id);
          setNotebooks(updated);
          if (activeNotebook?.id === nb.id) {
            const next = updated[0] || null;
            setActiveNotebook(next);
            if (next) {
              const srcs = await notebookService.getSourcesByNotebook(next.id);
              setSources(srcs);
            } else {
              setSources([]);
            }
          }
        },
      },
    ]);
  };

  // 6. Thêm Tài liệu (Text/Ghi chú) vào Sổ tay hiện tại
  const handleAddSource = async () => {
    if (!activeNotebook) {
      Alert.alert('Thông báo', 'Vui lòng chọn một sổ tay trước');
      return;
    }
    if (!newSourceTitle.trim() || !newSourceContent.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ tiêu đề và nội dung tài liệu');
      return;
    }

    try {
      const src = await notebookService.addTextSource(
        activeNotebook.id,
        newSourceTitle.trim(),
        newSourceContent.trim()
      );
      setSources((prev) => [src, ...prev]);
      setNewSourceTitle('');
      setNewSourceContent('');
      setIsAddingSource(false);
      Alert.alert('Thành công', 'Đã thêm tài liệu vào sổ tay AI');
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu tài liệu');
    }
  };

  // 7. Đồng bộ bài học của một khóa học vào Sổ tay
  const handleSyncCourseLessons = async (course: Course) => {
    if (!activeNotebook) {
      Alert.alert('Thông báo', 'Vui lòng chọn một sổ tay trước');
      return;
    }

    try {
      setIsLoadingCourses(true);
      const detail = await catalogApi.getCourseById(course.id);
      if (!detail || !detail.subjects) {
        Alert.alert('Thông báo', 'Không có bài học trong khóa học này');
        return;
      }

      let count = 0;
      for (const subject of detail.subjects) {
        if (subject.lessons) {
          for (const lesson of subject.lessons) {
            await notebookService.addLessonSource(activeNotebook.id, lesson, course);
            count++;
          }
        }
      }

      const updatedSrcs = await notebookService.getSourcesByNotebook(activeNotebook.id);
      setSources(updatedSrcs);
      Alert.alert('Thành công', `Đã đồng bộ ${count} bài học vào sổ tay "${activeNotebook.name}"`);
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể đồng bộ nội dung bài học');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // 7.1. Mở modal Gắn Source có sẵn
  const handleOpenExistingSourceModal = async () => {
    if (!activeNotebook) {
      Alert.alert('Thông báo', 'Vui lòng chọn hoặc tạo một sổ tay trước.');
      return;
    }
    setIsExistingSourceModalOpen(true);
    setExistingSourceSearch('');

    // Load tất cả system sources
    try {
      const all = await notebookService.getAllSources();
      setAllSystemSources(all);
    } catch {
      setAllSystemSources([]);
    }

    // Chọn course đầu tiên hoặc course hiện tại để nạp attachments
    const targetCourse = selectedCourse || courses[0] || null;
    setSelectedCourseForDocs(targetCourse);
    if (targetCourse) {
      loadAttachmentsForCourse(targetCourse);
    }
  };

  const loadAttachmentsForCourse = async (c: Course) => {
    setIsLoadingAttachments(true);
    try {
      const detail = await catalogApi.getCourseById(c.id);
      const docs: Array<LessonAttachment & { courseTitle?: string; lessonTitle?: string }> = [];
      if (detail && detail.subjects) {
        for (const sub of detail.subjects) {
          if (sub.lessons) {
            for (const les of sub.lessons) {
              const atts = await attachmentApi.getAttachments(les.id);
              if (Array.isArray(atts)) {
                for (const att of atts) {
                  docs.push({
                    ...att,
                    courseTitle: c.title,
                    lessonTitle: les.title,
                  });
                }
              }
            }
          }
        }
      }
      setCourseAttachments(docs);
    } catch (err) {
      console.warn('[AiNotebook] Error loading attachments for course:', err);
      setCourseAttachments([]);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const handleAttachCourseDoc = async (
    doc: LessonAttachment & { courseTitle?: string; lessonTitle?: string }
  ) => {
    if (!activeNotebook) return;
    setAttachingDocId(doc.id);
    try {
      const newSrc = await notebookService.attachCourseAttachmentToNotebook(
        activeNotebook.id,
        doc,
        doc.courseTitle,
        doc.lessonTitle
      );
      setSources((prev) => [newSrc, ...prev.filter((s) => s.id !== newSrc.id)]);
      setNotebooks((prev) =>
        prev.map((nb) =>
          nb.id === activeNotebook.id ? { ...nb, source_count: (nb.source_count || 0) + 1 } : nb
        )
      );
      Alert.alert('Thành công! 📎', `Đã gắn tài liệu "${doc.fileName}" vào sổ tay "${activeNotebook.name}".`);
    } catch {
      Alert.alert('Lỗi', 'Không thể gắn tài liệu vào sổ tay.');
    } finally {
      setAttachingDocId(null);
    }
  };

  const handleAttachSystemSource = async (s: NotebookSource) => {
    if (!activeNotebook) return;
    setAttachingDocId(s.id);
    try {
      await notebookService.addSourceToNotebook(activeNotebook.id, s.id);
      setSources((prev) => [s, ...prev.filter((item) => item.id !== s.id)]);
      setNotebooks((prev) =>
        prev.map((nb) =>
          nb.id === activeNotebook.id ? { ...nb, source_count: (nb.source_count || 0) + 1 } : nb
        )
      );
      Alert.alert('Thành công! 🔗', `Đã gắn tài liệu "${s.title}" vào sổ tay "${activeNotebook.name}".`);
    } catch {
      Alert.alert('Lỗi', 'Không thể gắn tài liệu vào sổ tay.');
    } finally {
      setAttachingDocId(null);
    }
  };

  // 7.2. Tải tệp từ bộ nhớ máy lên (PDF, Word .docx, TXT)
  const handleUploadFileFromDevice = async () => {
    if (!activeNotebook) {
      Alert.alert('Thông báo', 'Vui lòng chọn hoặc tạo một sổ tay trước.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setIsUploadingDeviceFile(true);

      const fileName = file.name || 'Tài liệu từ máy';
      const fileLower = fileName.toLowerCase();

      // Trích xuất toàn bộ văn bản thực tế từ tệp trong máy (.docx, .doc, .pdf, .txt...)
      let rawText = '';
      try {
        rawText = await extractTextFromFileUri(file.uri, fileName);
      } catch (extractErr) {
        console.warn('[AiNotebook] Error extracting file from URI:', extractErr);
      }

      const extractedContent = formatExtractedDocumentContent(fileName, rawText, {
        sizeBytes: file.size,
        fileType: file.mimeType || fileLower.split('.').pop()?.toUpperCase() || 'Tài liệu',
      });

      const newSrc = await notebookService.addTextSource(
        activeNotebook.id,
        fileName,
        extractedContent
      );

      setSources((prev) => [newSrc, ...prev]);
      setNotebooks((prev) =>
        prev.map((nb) =>
          nb.id === activeNotebook.id ? { ...nb, source_count: (nb.source_count || 0) + 1 } : nb
        )
      );
      Alert.alert('Thành công! 📄', `Đã nạp tệp "${fileName}" vào sổ tay "${activeNotebook.name}".`);
    } catch (err) {
      console.warn('[AiNotebook] Upload device file error:', err);
      Alert.alert('Lỗi', 'Không thể đọc hoặc nạp tài liệu từ tệp này.');
    } finally {
      setIsUploadingDeviceFile(false);
    }
  };

  // 8. Tạo tập Podcast tóm tắt âm thanh từ tài liệu nguồn thực tế
  const handleCreatePodcast = async () => {
    if (!sources || sources.length === 0) {
      Alert.alert('Thông báo', 'Cần có ít nhất 1 tài liệu trong sổ tay để sinh Podcast tóm tắt.');
      return;
    }

    try {
      setIsLoadingData(true);

      // Tự động kiểm tra và hồi phục nội dung (Auto-hydrate) nếu tài liệu mới chỉ lưu placeholder URL
      for (const src of sources) {
        const isMissing =
          !src.full_text ||
          src.full_text.length < 500 ||
          (src.full_text.includes('Đường dẫn tài liệu: http') && !src.full_text.includes('--- NỘI DUNG VĂN BẢN TRÍCH XUẤT ---'));

        if (isMissing) {
          const urlMatch = (src.full_text || '').match(/Đường dẫn tài liệu:\s*(https?:\/\/[^\s\n\r]+)/i);
          if (urlMatch && urlMatch[1]) {
            try {
              const rawExtracted = await extractTextFromRemoteUrl(urlMatch[1], src.title);
              if (rawExtracted && rawExtracted.trim().length > 20) {
                src.full_text = formatExtractedDocumentContent(src.title.replace(/^\[Tài liệu\]\s*/i, ''), rawExtracted, {
                  lessonTitle: src.lesson_title,
                  courseTitle: src.course_title,
                  fileUrl: urlMatch[1],
                });
              }
            } catch (healErr) {
              console.warn('[AiNotebook] Auto-hydrate failed for podcast:', healErr);
            }
          }
        }
      }

      const validSources = sources.filter((s) => s.full_text && s.full_text.trim().length > 20);
      if (validSources.length === 0) {
        Alert.alert('Thông báo', 'Các tài liệu trong sổ tay chưa có nội dung văn bản. Vui lòng kiểm tra lại tài liệu!');
        return;
      }

      const sourcesText = validSources
        .slice(0, 5)
        .map((s, idx) => `=== TÀI LIỆU NGUỒN ${idx + 1}: ${s.title} ===\n${(s.full_text || '').substring(0, 5000)}`)
        .join('\n\n');

      const sampleText = `=== TỔNG HỢP TOÀN BỘ TÀI LIỆU HỌC TẬP TỪ SỔ TAY "${activeNotebook?.name || 'Khóa học'}" ===\n\n${sourcesText}`;

      const ep = await notebookService.generatePodcast(
        `[Podcast] ${activeNotebook?.name || 'Tổng hợp'}`,
        sampleText
      );

      setPodcasts((prev) => [ep, ...prev]);
      setActiveTab('PODCASTS');
      Alert.alert('Thành công 🎉', `Đã tạo Podcast AI từ ${validSources.length} tài liệu trong sổ tay "${activeNotebook?.name}"! Bạn có thể bấm phát để nghe ngay.`);
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo tập Podcast');
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconCircle}>
              <Sparkles color="#818CF8" size={20} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Sổ Tay Trợ Lý AI</Text>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: status.isOnline ? '#10B981' : '#F59E0B' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {status.isOnline ? 'RAG Sẵn sàng' : 'Chế độ ngoại tuyến'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadInitialData}
            activeOpacity={0.7}
          >
            <RefreshCw color="#94A3B8" size={18} />
          </TouchableOpacity>
        </View>

        {/* Notebook Selector Bar */}
        <View style={styles.notebookBar}>
          <View style={styles.activeNotebookInfo}>
            <FolderOpen color="#6366F1" size={16} />
            <Text style={styles.activeNotebookLabel} numberOfLines={1}>
              {activeNotebook ? activeNotebook.name : 'Chưa chọn sổ tay'}
            </Text>
            <Text style={styles.sourceCountBadge}>{sources.length} tài liệu</Text>
          </View>
          <TouchableOpacity
            style={styles.newNotebookBtn}
            onPress={() => setIsCreatingNotebook(true)}
            activeOpacity={0.8}
          >
            <Plus color="#FFFFFF" size={14} />
            <Text style={styles.newNotebookBtnText}>Tạo sổ</Text>
          </TouchableOpacity>
        </View>

        {/* Sub Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'CHAT' && styles.tabButtonActive]}
            onPress={() => setActiveTab('CHAT')}
          >
            <Bot
              color={activeTab === 'CHAT' ? '#818CF8' : '#94A3B8'}
              size={16}
            />
            <Text
              style={[styles.tabText, activeTab === 'CHAT' && styles.tabTextActive]}
            >
              Hỏi đáp AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'SOURCES' && styles.tabButtonActive]}
            onPress={() => setActiveTab('SOURCES')}
          >
            <FileText
              color={activeTab === 'SOURCES' ? '#818CF8' : '#94A3B8'}
              size={16}
            />
            <Text
              style={[styles.tabText, activeTab === 'SOURCES' && styles.tabTextActive]}
            >
              Tài liệu ({sources.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'NOTEBOOKS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('NOTEBOOKS')}
          >
            <BookMarked
              color={activeTab === 'NOTEBOOKS' ? '#818CF8' : '#94A3B8'}
              size={16}
            />
            <Text
              style={[styles.tabText, activeTab === 'NOTEBOOKS' && styles.tabTextActive]}
            >
              Sổ tay ({notebooks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'PODCASTS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('PODCASTS')}
          >
            <Mic
              color={activeTab === 'PODCASTS' ? '#818CF8' : '#94A3B8'}
              size={16}
            />
            <Text
              style={[styles.tabText, activeTab === 'PODCASTS' && styles.tabTextActive]}
            >
              Podcast
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {/* TAB 1: HỎI ĐÁP RAG CHAT */}
          {activeTab === 'CHAT' && (
            <View style={styles.chatSection}>
              {/* Context Bar hiển thị Sổ tay & Tài liệu đang kết nối RAG */}
              <View style={styles.chatContextBar}>
                <View style={styles.chatContextInfo}>
                  <BookMarked color="#818CF8" size={13} />
                  <Text style={styles.chatContextText} numberOfLines={1}>
                    {activeNotebook?.name || 'Sổ tay AI'} ({sources.length} tài liệu đã gắn)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.chatAttachBtn}
                  onPress={handleOpenExistingSourceModal}
                  activeOpacity={0.8}
                >
                  <Link2 color="#818CF8" size={12} />
                  <Text style={styles.chatAttachBtnText}>+ Gắn Source</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatListContent}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.messageBubble,
                      item.sender === 'user' ? styles.userBubble : styles.aiBubble,
                    ]}
                  >
                    <View style={styles.senderHeader}>
                      {item.sender === 'user' ? (
                        <User color="#818CF8" size={14} />
                      ) : (
                        <Bot color="#10B981" size={14} />
                      )}
                      <Text style={styles.senderName}>
                        {item.sender === 'user' ? 'Bạn' : 'Trợ lý MicroLearning AI'}
                      </Text>
                      <Text style={styles.messageTime}>{item.timestamp}</Text>
                    </View>
                    <Text style={styles.messageText}>{item.text}</Text>
                  </View>
                )}
                ListFooterComponent={
                  isAsking ? (
                    <View style={styles.aiThinkingBox}>
                      <ActivityIndicator size="small" color="#818CF8" />
                      <Text style={styles.aiThinkingText}>
                        AI đang tra cứu tài liệu và suy luận...
                      </Text>
                    </View>
                  ) : null
                }
              />

              {/* Gợi ý câu hỏi nhanh */}
              <View style={styles.suggestionsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {suggestedPrompts.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => handleSendMessage(p)}
                      activeOpacity={0.7}
                    >
                      <Sparkles color="#818CF8" size={12} />
                      <Text style={styles.suggestionChipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Chat Input Bar */}
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Đặt câu hỏi về bài giảng hoặc tài liệu..."
                  placeholderTextColor="#64748B"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isAsking) && styles.sendButtonDisabled,
                  ]}
                  onPress={() => handleSendMessage()}
                  disabled={!inputText.trim() || isAsking}
                  activeOpacity={0.8}
                >
                  <Send color="#FFFFFF" size={18} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 2: QUẢN LÝ TÀI LIỆU (SOURCES) */}
          {activeTab === 'SOURCES' && (
            <ScrollView style={styles.tabContentScroll}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>
                  Tài liệu trong sổ: {activeNotebook?.name}
                </Text>
              </View>

              {/* Action Toolbar: Gắn Source có sẵn, Tải tệp từ máy, Thêm ghi chú */}
              <View style={styles.sourceActionRow}>
                <TouchableOpacity
                  style={styles.sourceActionBtnAttach}
                  onPress={handleOpenExistingSourceModal}
                  activeOpacity={0.8}
                >
                  <Link2 color="#FFFFFF" size={14} />
                  <Text style={styles.sourceActionBtnText}>Gắn Source có sẵn</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sourceActionBtnUpload}
                  onPress={handleUploadFileFromDevice}
                  disabled={isUploadingDeviceFile}
                  activeOpacity={0.8}
                >
                  {isUploadingDeviceFile ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Upload color="#FFFFFF" size={14} />
                  )}
                  <Text style={styles.sourceActionBtnText}>Tải tệp từ máy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sourceActionBtnManual}
                  onPress={() => setIsAddingSource((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Plus color="#94A3B8" size={14} />
                  <Text style={[styles.sourceActionBtnText, { color: '#E2E8F0' }]}>Ghi chú</Text>
                </TouchableOpacity>
              </View>

              {/* Nút nạp nhanh từ Khóa học */}
              <View style={styles.syncCard}>
                <View style={styles.syncCardHeader}>
                  <Layers color="#818CF8" size={18} />
                  <Text style={styles.syncCardTitle}>Đồng bộ bài giảng khóa học</Text>
                </View>
                <Text style={styles.syncCardSubtitle}>
                  Nạp toàn bộ văn bản và mô tả bài học của khóa học vào sổ tay để AI trả lời sát kiến thức.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseChipRow}>
                  {courses.slice(0, 8).map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      style={styles.courseChip}
                      onPress={() => handleSyncCourseLessons(course)}
                      disabled={isLoadingCourses}
                    >
                      <Text style={styles.courseChipText} numberOfLines={1}>
                        + {course.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Form thêm tài liệu thủ công nếu mở */}
              {isAddingSource && (
                <View style={styles.inputCard}>
                  <Text style={styles.inputCardTitle}>Thêm ghi chú / kiến thức mới</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tiêu đề tài liệu..."
                    placeholderTextColor="#64748B"
                    value={newSourceTitle}
                    onChangeText={setNewSourceTitle}
                  />
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Nội dung kiến thức, ghi chú tóm tắt..."
                    placeholderTextColor="#64748B"
                    value={newSourceContent}
                    onChangeText={setNewSourceContent}
                    multiline
                    numberOfLines={4}
                  />
                  <View style={styles.formBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setIsAddingSource(false)}
                    >
                      <Text style={styles.cancelBtnText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleAddSource}
                    >
                      <Text style={styles.saveBtnText}>Lưu vào Sổ AI</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Danh sách các tài liệu hiện có */}
              {sources.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FileText color="#475569" size={40} />
                  <Text style={styles.emptyTitle}>Chưa có tài liệu nào</Text>
                  <Text style={styles.emptySubtitle}>
                    Hãy thêm ghi chú hoặc nhấn vào một khóa học phía trên để nạp tài liệu vào sổ tay AI.
                  </Text>
                </View>
              ) : (
                sources.map((src) => (
                  <View key={src.id} style={styles.sourceCard}>
                    <View style={styles.sourceCardHeader}>
                      <View style={styles.sourceIconWrap}>
                        <FileText color="#38BDF8" size={16} />
                      </View>
                      <View style={styles.sourceInfo}>
                        <Text style={styles.sourceTitle} numberOfLines={1}>
                          {src.title}
                        </Text>
                        <Text style={styles.sourceMeta}>
                          {src.course_title ? `Khóa: ${src.course_title}` : 'Ghi chú tự tạo'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={() => {
                          if (activeNotebook) {
                            notebookService
                              .deleteSource(activeNotebook.id, src.id)
                              .then(() => {
                                setSources((prev) => prev.filter((s) => s.id !== src.id));
                              });
                          }
                        }}
                      >
                        <Trash2 color="#EF4444" size={16} />
                      </TouchableOpacity>
                    </View>
                    {src.full_text && (
                      <Text style={styles.sourceExcerpt} numberOfLines={3}>
                        {src.full_text}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* TAB 3: DANH SÁCH SỔ TAY (NOTEBOOKS) */}
          {activeTab === 'NOTEBOOKS' && (
            <ScrollView style={styles.tabContentScroll}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Danh mục sổ tay AI</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={handleOpenExistingSourceModal}
                    activeOpacity={0.8}
                  >
                    <Link2 color="#818CF8" size={13} />
                    <Text style={styles.actionBtnSecondaryText}>Gắn Source</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPress={() => setIsCreatingNotebook(true)}
                  >
                    <Plus color="#FFFFFF" size={14} />
                    <Text style={styles.actionBtnText}>Tạo sổ</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form tạo Notebook */}
              {isCreatingNotebook && (
                <View style={styles.inputCard}>
                  <Text style={styles.inputCardTitle}>Tạo sổ tay kiến thức mới</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tên sổ tay (ví dụ: React Native Chuyên sâu)..."
                    placeholderTextColor="#64748B"
                    value={newNotebookTitle}
                    onChangeText={setNewNotebookTitle}
                  />
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Mô tả mục tiêu học tập..."
                    placeholderTextColor="#64748B"
                    value={newNotebookDesc}
                    onChangeText={setNewNotebookDesc}
                    multiline
                    numberOfLines={2}
                  />
                  <View style={styles.formBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setIsCreatingNotebook(false)}
                    >
                      <Text style={styles.cancelBtnText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={handleCreateNotebook}
                    >
                      <Text style={styles.saveBtnText}>Tạo Sổ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Danh sách Sổ tay */}
              {notebooks.map((nb) => {
                const isSelected = activeNotebook?.id === nb.id;
                return (
                  <TouchableOpacity
                    key={nb.id}
                    style={[styles.notebookCard, isSelected && styles.notebookCardSelected]}
                    onPress={() => handleSelectNotebook(nb)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.notebookCardTop}>
                      <View style={styles.notebookIconCircle}>
                        <BookMarked
                          color={isSelected ? '#818CF8' : '#94A3B8'}
                          size={18}
                        />
                      </View>
                      <View style={styles.notebookTitleBox}>
                        <Text
                          style={[
                            styles.notebookCardTitle,
                            isSelected && styles.notebookCardTitleSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {nb.name}
                        </Text>
                        <Text style={styles.notebookCardDesc} numberOfLines={2}>
                          {nb.description || 'Không có mô tả'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={() => handleDeleteNotebook(nb)}
                      >
                        <Trash2 color="#64748B" size={16} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.notebookCardFooter}>
                      <Text style={styles.notebookCountBadge}>
                        {nb.source_count || 0} tài liệu
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Nút Gắn Source trực tiếp vào Sổ tay này */}
                        <TouchableOpacity
                          style={styles.nbAttachSourceBtn}
                          onPress={async () => {
                            await handleSelectNotebook(nb);
                            handleOpenExistingSourceModal();
                          }}
                          activeOpacity={0.8}
                        >
                          <Link2 color="#818CF8" size={12} />
                          <Text style={styles.nbAttachSourceBtnText}>Gắn Source</Text>
                        </TouchableOpacity>

                        {isSelected ? (
                          <View style={styles.activePill}>
                            <CheckCircle2 color="#10B981" size={12} />
                            <Text style={styles.activePillText}>Đang dùng</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.selectNbBtn}
                            onPress={() => handleSelectNotebook(nb)}
                          >
                            <Text style={styles.selectNbBtnText}>Chọn</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* TAB 4: PODCAST TÓM TẮT ÂM THANH */}
          {activeTab === 'PODCASTS' && (
            <ScrollView style={styles.tabContentScroll}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Podcast Tóm Tắt AI</Text>
                <TouchableOpacity
                  style={styles.actionBtnPrimary}
                  onPress={handleCreatePodcast}
                  disabled={isLoadingData}
                >
                  <Mic color="#FFFFFF" size={14} />
                  <Text style={styles.actionBtnText}>Sinh Podcast Mới</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.podcastIntro}>
                AI tự động đọc tóm tắt các tài liệu trong sổ tay bằng giọng thuyết minh tiếng Việt chuẩn.
              </Text>

              {podcasts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Volume2 color="#475569" size={40} />
                  <Text style={styles.emptyTitle}>Chưa có tập Podcast nào</Text>
                  <Text style={styles.emptySubtitle}>
                    Nhấn "Sinh Podcast Mới" để AI chuyển đổi các ghi chú trong sổ tay thành bản nghe âm thanh.
                  </Text>
                </View>
              ) : (
                podcasts.map((pod) => (
                  <View key={pod.id} style={styles.podcastCard}>
                    <View style={styles.podcastCardHeader}>
                      <View style={styles.podcastIconBox}>
                        <Volume2 color="#818CF8" size={18} />
                      </View>
                      <View style={styles.podcastInfo}>
                        <Text style={styles.podcastTitle} numberOfLines={1}>
                          {pod.name}
                        </Text>
                        <Text style={styles.podcastDate}>
                          {new Date(pod.created || Date.now()).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={async () => {
                          await notebookService.deletePodcast(pod.id);
                          setPodcasts((prev) => prev.filter((p) => p.id !== pod.id));
                        }}
                      >
                        <Trash2 color="#EF4444" size={16} />
                      </TouchableOpacity>
                    </View>
                    {pod.transcript && (
                      <Text style={styles.podcastTranscript} numberOfLines={3}>
                        {pod.transcript}
                      </Text>
                    )}
                    {pod.audio_url && (
                      <View style={styles.audioBadge}>
                        <CheckCircle2 color="#10B981" size={12} />
                        <Text style={styles.audioBadgeText}>Đã tạo file âm thanh AI</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>

        {/* =========================================================================
            MODAL GẮN SOURCE CÓ SẴN (TÀI LIỆU KHÓA HỌC & KHO SOURCE HỆ THỐNG)
        ========================================================================= */}
        <Modal
          visible={isExistingSourceModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsExistingSourceModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Gắn tài liệu vào Sổ tay AI</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    Sổ tay: {activeNotebook?.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsExistingSourceModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <X color="#94A3B8" size={20} />
                </TouchableOpacity>
              </View>

              {/* Segmented Tabs */}
              <View style={styles.modalTabBar}>
                <TouchableOpacity
                  style={[
                    styles.modalTabBtn,
                    existingSourceTab === 'COURSE_DOCS' && styles.modalTabBtnActive,
                  ]}
                  onPress={() => setExistingSourceTab('COURSE_DOCS')}
                  activeOpacity={0.8}
                >
                  <Paperclip
                    color={existingSourceTab === 'COURSE_DOCS' ? '#818CF8' : '#94A3B8'}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.modalTabBtnText,
                      existingSourceTab === 'COURSE_DOCS' && styles.modalTabBtnTextActive,
                    ]}
                  >
                    Tài liệu khóa học ({courseAttachments.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalTabBtn,
                    existingSourceTab === 'ALL_SOURCES' && styles.modalTabBtnActive,
                  ]}
                  onPress={() => setExistingSourceTab('ALL_SOURCES')}
                  activeOpacity={0.8}
                >
                  <Layers
                    color={existingSourceTab === 'ALL_SOURCES' ? '#818CF8' : '#94A3B8'}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.modalTabBtnText,
                      existingSourceTab === 'ALL_SOURCES' && styles.modalTabBtnTextActive,
                    ]}
                  >
                    Kho tài liệu hệ thống
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: TÀI LIỆU KHÓA HỌC */}
              {existingSourceTab === 'COURSE_DOCS' && (
                <View style={styles.modalBody}>
                  {/* Selector chọn khóa học */}
                  <Text style={styles.courseSelectLabel}>Chọn khóa học để lấy tài liệu:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.courseChipsScroll}
                  >
                    {courses.map((c) => {
                      const isSelected = selectedCourseForDocs?.id === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.modalCourseChip,
                            isSelected && styles.modalCourseChipActive,
                          ]}
                          onPress={() => {
                            setSelectedCourseForDocs(c);
                            loadAttachmentsForCourse(c);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.modalCourseChipText,
                              isSelected && styles.modalCourseChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {c.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Danh sách attachment của khóa học được chọn */}
                  {isLoadingAttachments ? (
                    <View style={styles.modalLoadingBox}>
                      <ActivityIndicator size="small" color="#818CF8" />
                      <Text style={styles.modalLoadingText}>Đang tải danh sách tài liệu...</Text>
                    </View>
                  ) : courseAttachments.length === 0 ? (
                    <View style={styles.modalEmptyBox}>
                      <Paperclip color="#475569" size={32} />
                      <Text style={styles.modalEmptyTitle}>Chưa có tài liệu đính kèm</Text>
                      <Text style={styles.modalEmptySubtitle}>
                        Khóa học này chưa có tệp tài liệu nào được giảng viên tải lên.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.modalListScroll}>
                      {courseAttachments.map((doc) => {
                        const isAttached = sources.some(
                          (s) =>
                            s.title.includes(doc.fileName) ||
                            (s.lesson_id === doc.lessonId && s.title.includes(doc.fileName))
                        );
                        const isAttaching = attachingDocId === doc.id;
                        const fileSizeKb = doc.fileSizeBytes
                          ? (doc.fileSizeBytes / 1024).toFixed(1)
                          : 'N/A';

                        return (
                          <View key={doc.id} style={styles.modalItemRow}>
                            <View style={styles.modalItemInfo}>
                              <View style={styles.modalItemBadgeRow}>
                                <View style={styles.docTypeBadge}>
                                  <Text style={styles.docTypeBadgeText}>
                                    {doc.fileType || 'FILE'}
                                  </Text>
                                </View>
                                <Text style={styles.modalItemTitle} numberOfLines={1}>
                                  {doc.fileName}
                                </Text>
                              </View>
                              <Text style={styles.modalItemMeta} numberOfLines={1}>
                                {doc.lessonTitle ? `Bài: ${doc.lessonTitle}` : 'Tài liệu bài học'} • {fileSizeKb} KB
                              </Text>
                            </View>

                            {isAttached ? (
                              <View style={styles.attachedBadge}>
                                <Check color="#10B981" size={12} />
                                <Text style={styles.attachedBadgeText}>Đã gắn</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.attachBtn}
                                onPress={() => handleAttachCourseDoc(doc)}
                                disabled={isAttaching}
                                activeOpacity={0.8}
                              >
                                {isAttaching ? (
                                  <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                  <>
                                    <Plus color="#FFFFFF" size={13} />
                                    <Text style={styles.attachBtnText}>Gắn vào AI</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* TAB 2: KHO SOURCE HỆ THỐNG */}
              {existingSourceTab === 'ALL_SOURCES' && (
                <View style={styles.modalBody}>
                  {/* Search Bar */}
                  <View style={styles.modalSearchBar}>
                    <Search color="#64748B" size={16} />
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Tìm tài liệu theo tên..."
                      placeholderTextColor="#64748B"
                      value={existingSourceSearch}
                      onChangeText={setExistingSourceSearch}
                    />
                    {existingSourceSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setExistingSourceSearch('')}>
                        <X color="#94A3B8" size={14} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* List of system sources */}
                  <ScrollView style={styles.modalListScroll}>
                    {(() => {
                      const unattached = allSystemSources
                        .filter((s) => !sources.some((curr) => curr.id === s.id))
                        .filter((s) =>
                          existingSourceSearch.trim()
                            ? s.title.toLowerCase().includes(existingSourceSearch.toLowerCase())
                            : true
                        );

                      if (unattached.length === 0) {
                        return (
                          <View style={styles.modalEmptyBox}>
                            <FileText color="#475569" size={32} />
                            <Text style={styles.modalEmptyTitle}>Không có tài liệu nào khác</Text>
                            <Text style={styles.modalEmptySubtitle}>
                              Tất cả tài liệu hệ thống đã được gắn vào sổ này hoặc không tìm thấy kết quả phù hợp.
                            </Text>
                          </View>
                        );
                      }

                      return unattached.map((s) => {
                        const isAttaching = attachingDocId === s.id;
                        return (
                          <View key={s.id} style={styles.modalItemRow}>
                            <View style={styles.modalItemInfo}>
                              <View style={styles.modalItemBadgeRow}>
                                <View style={styles.docTypeBadgeAlt}>
                                  <Text style={styles.docTypeBadgeText}>KHO</Text>
                                </View>
                                <Text style={styles.modalItemTitle} numberOfLines={1}>
                                  {s.title}
                                </Text>
                              </View>
                              <Text style={styles.modalItemMeta} numberOfLines={1}>
                                {s.course_title ? `Khóa: ${s.course_title}` : 'Kiến thức hệ thống'}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.attachBtn}
                              onPress={() => handleAttachSystemSource(s)}
                              disabled={isAttaching}
                              activeOpacity={0.8}
                            >
                              {isAttaching ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <Plus color="#FFFFFF" size={13} />
                                  <Text style={styles.attachBtnText}>Gắn vào Sổ</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>
              )}

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCloseFooterBtn}
                  onPress={() => setIsExistingSourceModalOpen(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseFooterBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B18',
  },
  container: {
    flex: 1,
    backgroundColor: '#070B18',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#090D1A',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  headerTextGroup: {
    gap: 2,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  notebookBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0D1424',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeNotebookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  activeNotebookLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 180,
  },
  sourceCountBadge: {
    color: '#818CF8',
    fontSize: 11,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newNotebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newNotebookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#070B18',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#818CF8',
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
  },
  chatSection: {
    flex: 1,
  },
  chatListContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#312E81',
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderBottomLeftRadius: 2,
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  senderName: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  messageTime: {
    color: '#64748B',
    fontSize: 10,
    marginLeft: 'auto',
  },
  messageText: {
    color: '#F1F5F9',
    fontSize: 14,
    lineHeight: 20,
  },
  aiThinkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: 8,
    marginTop: 8,
  },
  aiThinkingText: {
    color: '#818CF8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#090D1A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  suggestionChipText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#090D1A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sendButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  tabContentScroll: {
    flex: 1,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  syncCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  syncCardTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  syncCardSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 16,
  },
  courseChipRow: {
    flexDirection: 'row',
  },
  courseChip: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  courseChipText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputCardTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#070B18',
    color: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  sourceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sourceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sourceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  sourceMeta: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  trashBtn: {
    padding: 6,
  },
  sourceExcerpt: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  notebookCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  notebookCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  notebookCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notebookIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notebookTitleBox: {
    flex: 1,
  },
  notebookCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  notebookCardTitleSelected: {
    color: '#818CF8',
  },
  notebookCardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  notebookCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  notebookCountBadge: {
    color: '#64748B',
    fontSize: 11,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  podcastIntro: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  podcastCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  podcastCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  podcastIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podcastInfo: {
    flex: 1,
  },
  podcastTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  podcastDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  podcastTranscript: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  audioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  audioBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  sourceActionBtnAttach: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sourceActionBtnUpload: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0D9488',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sourceActionBtnManual: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sourceActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#090D1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  modalTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0D1424',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  modalTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  modalTabBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  modalTabBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalTabBtnTextActive: {
    color: '#818CF8',
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 380,
  },
  courseSelectLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  courseChipsScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  modalCourseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalCourseChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: '#6366F1',
  },
  modalCourseChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 160,
  },
  modalCourseChipTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  modalLoadingBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  modalLoadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  modalEmptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  modalEmptyTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  modalEmptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  modalListScroll: {
    maxHeight: 300,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  docTypeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  docTypeBadgeAlt: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  docTypeBadgeText: {
    color: '#34D399',
    fontSize: 9,
    fontWeight: '700',
  },
  modalItemTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  modalItemMeta: {
    color: '#64748B',
    fontSize: 11,
  },
  attachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  attachedBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attachBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
    height: 40,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    alignItems: 'flex-end',
  },
  modalCloseFooterBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalCloseFooterBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  chatContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D1424',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  chatContextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  chatContextText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  chatAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  chatAttachBtnText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  actionBtnSecondaryText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
  nbAttachSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  nbAttachSourceBtnText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  selectNbBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectNbBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
});
