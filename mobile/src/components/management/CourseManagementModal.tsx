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
} from 'react-native';
import { X, Plus, Edit3, Trash2, Lock, Eye, BookOpen, Layers, CheckCircle2 } from 'lucide-react-native';
import { catalogApi } from '../../services/catalogApi';
import { apiClient } from '../../services/apiClient';
import type { Course, CourseDetail, Subject, Lesson } from '../../types/catalog.types';

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
  const [isCreating, setIsCreating] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await catalogApi.getAllCourses();
      setCourses(data);
    } catch {
      Alert.alert('Lỗi', 'Không thể nạp danh sách khóa học.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadCourses();
      setIsCreating(false);
      setEditingCourse(null);
    }
  }, [visible]);

  const openCreateForm = () => {
    setTitle('');
    setDescription('');
    setThumbnailUrl('');
    setIsPublished(true);
    setIsPrivate(false);
    setAccessPassword('');
    setEditingCourse(null);
    setIsCreating(true);
  };

  const openEditForm = (course: Course) => {
    setTitle(course.title);
    setDescription(course.description || '');
    setThumbnailUrl(course.thumbnailUrl || '');
    setIsPublished(course.isPublished);
    setIsPrivate(Boolean(course.isPrivate));
    setAccessPassword('');
    setEditingCourse(course);
    setIsCreating(true);
  };

  const handleSaveCourse = async () => {
    if (!title.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề khóa học.');
      return;
    }

    if (isPrivate && !accessPassword.trim() && !editingCourse) {
      Alert.alert('Thông báo', 'Khóa học riêng tư bắt buộc nhập Mật khẩu truy cập.');
      return;
    }

    setSaving(true);
    try {
      if (editingCourse) {
        // Cập nhật
        await apiClient.put(`/courses/${editingCourse.id}`, {
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
          isPublished,
          isPrivate,
          accessPassword: accessPassword.trim() || undefined,
        });
        Alert.alert('Thành công', 'Đã cập nhật thông tin khóa học.');
      } else {
        // Tạo mới
        await apiClient.post('/courses', {
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
          isPublished,
          isPrivate,
          accessPassword: accessPassword.trim(),
        });
        Alert.alert('Thành công', 'Đã tạo khóa học mới thành công!');
      }

      setIsCreating(false);
      setEditingCourse(null);
      await loadCourses();
      if (onCourseUpdated) onCourseUpdated();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể lưu khóa học.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = (courseId: number, courseTitle: string) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa khóa học "${courseTitle}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/courses/${courseId}`);
              Alert.alert('Thành công', 'Đã xóa khóa học.');
              await loadCourses();
              if (onCourseUpdated) onCourseUpdated();
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa khóa học.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <BookOpen color="#38BDF8" size={24} />
              <Text style={styles.modalTitle}>Studio Quản Lý Khóa Học</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {isCreating ? (
            /* CREATE / EDIT FORM */
            <ScrollView style={styles.formScroll}>
              <Text style={styles.formTitle}>
                {editingCourse ? 'Chỉnh Sửa Khóa Học' : 'Tạo Khóa Học Mới'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tiêu Đề Khóa Học *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: Khóa học Lập trình React Native & Expo"
                  placeholderTextColor="#64748B"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mô Tả Khóa Học</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Mô tả ngắn gọn nội dung khóa học..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Đường Dẫn Ảnh Thumbnail (URL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#64748B"
                  value={thumbnailUrl}
                  onChangeText={setThumbnailUrl}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Xuất Bản (Published)</Text>
                  <Text style={styles.switchSublabel}>Cho phép học viên nhìn thấy khóa học</Text>
                </View>
                <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ true: '#6366F1' }} />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Khóa Học Riêng Tư (Private)</Text>
                  <Text style={styles.switchSublabel}>Yêu cầu mật khẩu truy cập để mở khóa</Text>
                </View>
                <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: '#F59E0B' }} />
              </View>

              {isPrivate && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật Khẩu Truy Cập *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Mật khẩu mở khóa (VD: Private123)"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={accessPassword}
                    onChangeText={setAccessPassword}
                  />
                </View>
              )}

              <View style={styles.formActionRow}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => setIsCreating(false)}
                >
                  <Text style={styles.cancelFormText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveFormBtn}
                  onPress={handleSaveCourse}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveFormText}>Lưu Khóa Học</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* COURSE LIST */
            <View style={styles.listContainer}>
              <TouchableOpacity style={styles.createNewBtn} onPress={openCreateForm}>
                <Plus color="#FFFFFF" size={20} />
                <Text style={styles.createNewText}>Tạo Khóa Học Mới</Text>
              </TouchableOpacity>

              {loading ? (
                <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
              ) : (
                <ScrollView style={styles.courseList}>
                  {courses.map((c) => (
                    <View key={c.id} style={styles.courseCard}>
                      <View style={styles.courseInfo}>
                        <View style={styles.titleRow}>
                          <Text style={styles.courseTitle}>{c.title}</Text>
                          {c.isPrivate && <Lock color="#F59E0B" size={16} />}
                        </View>
                        <Text style={styles.courseSub}>
                          {c.totalSubjects || 0} Môn học • Version {c.version}
                        </Text>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => openEditForm(c)}
                        >
                          <Edit3 color="#38BDF8" size={18} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleDeleteCourse(c.id, c.title)}
                        >
                          <Trash2 color="#EF4444" size={18} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '90%',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  listContainer: {
    flexShrink: 1,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 48,
    gap: 8,
    marginBottom: 16,
  },
  createNewText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  courseList: {
    maxHeight: 400,
  },
  courseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  courseInfo: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courseTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  courseSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  formScroll: {
    maxHeight: 480,
  },
  formTitle: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: '#F8FAFC',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  switchLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  switchSublabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  formActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  cancelFormBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFormText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  saveFormBtn: {
    flex: 1,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFormText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
