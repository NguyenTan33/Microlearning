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
} from 'lucide-react-native';
import { catalogApi } from '../../services/catalogApi';
import type { Course, CourseDetail, Subject, Lesson } from '../../types/catalog.types';
import { CourseStudentProgressModal } from './CourseStudentProgressModal';

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
    if (courseIsPrivate && !coursePass.trim() && !editingCourse) {
      Alert.alert('Thông báo', 'Khóa học riêng tư bắt buộc nhập Mật khẩu bảo vệ.');
      return;
    }

    setSavingCourse(true);
    try {
      if (editingCourse) {
        await catalogApi.updateCourse(editingCourse.id, {
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          thumbnailUrl: courseThumb.trim() || undefined,
          isPrivate: courseIsPrivate,
          accessPassword: coursePass.trim() || undefined,
        });
        Alert.alert('Thành công', 'Đã cập nhật thông tin khóa học.');
      } else {
        await catalogApi.createCourse({
          title: courseTitle.trim(),
          description: courseDesc.trim(),
          thumbnailUrl: courseThumb.trim() || undefined,
          isPrivate: courseIsPrivate,
          accessPassword: coursePass.trim() || undefined,
        });
        Alert.alert('Thành công', 'Đã tạo khóa học mới thành công!');
      }

      setIsCourseFormOpen(false);
      await loadCourses();
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
    if (!targetSubjectId || !lessonTitle.trim()) return;
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
          await catalogApi.linkExternalLessonVideo({
            lessonId: savedId,
            url: lessonVideoUrl.trim(),
            title: lessonTitle.trim(),
          });
        } catch {
          // ignore link error
        }
      }

      setIsLessonFormOpen(false);
      if (selectedCourse) await loadCourseDetail(selectedCourse.id);
      if (onCourseUpdated) onCourseUpdated();
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu bài giảng.');
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

              {loading ? (
                <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
              ) : (
                <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                  {courses.map((c) => (
                    <View key={c.id} style={styles.itemCard}>
                      <View style={styles.itemInfo}>
                        <View style={styles.titleRow}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {c.title}
                          </Text>
                          {c.isPrivate ? (
                            <View style={styles.badgePrivate}>
                              <Lock color="#F59E0B" size={10} />
                              <Text style={styles.badgeTextPrivate}>Hạn chế</Text>
                            </View>
                          ) : (
                            <View style={styles.badgePublic}>
                              <Globe color="#10B981" size={10} />
                              <Text style={styles.badgeTextPublic}>Công khai</Text>
                            </View>
                          )}
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
                              <View style={{ flex: 1 }}>
                                <Text style={styles.lessonRowTitle} numberOfLines={1}>
                                  {les.title}
                                </Text>
                                <Text style={styles.lessonRowSub}>{Math.round(les.durationSeconds / 60)} phút</Text>
                              </View>

                              <View style={styles.actionBtnRow}>
                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={() => {
                                    setTargetSubjectId(sub.id);
                                    setEditingLesson(les);
                                    setLessonTitle(les.title);
                                    setLessonDesc(les.description || '');
                                    setLessonDuration(String(les.durationSeconds));
                                    setLessonVideoUrl('');
                                    setIsLessonFormOpen(true);
                                  }}
                                >
                                  <Edit3 color="#38BDF8" size={14} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.iconBtn}
                                  onPress={() => handleDeleteLesson(les.id, les.title)}
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
  badgeTextPrivate: { color: '#F59E0B', fontSize: 9, fontWeight: '700' },
  badgeTextPublic: { color: '#10B981', fontSize: 9, fontWeight: '700' },
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
});
