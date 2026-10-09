import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import {
  X,
  FileText,
  Download,
  Trash2,
  Plus,
  ExternalLink,
  FileQuestion,
  AlertCircle,
  FileCheck,
} from 'lucide-react-native';
import { attachmentApi } from '../../services/attachmentApi';
import type { LessonAttachment } from '../../types/catalog.types';

interface LessonAttachmentsModalProps {
  visible: boolean;
  lessonId: number;
  lessonTitle: string;
  canManage?: boolean;
  onClose: () => void;
}

export const LessonAttachmentsModal: React.FC<LessonAttachmentsModalProps> = ({
  visible,
  lessonId,
  lessonTitle,
  canManage = false,
  onClose,
}) => {
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  const [newFileUrl, setNewFileUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadAttachments = async () => {
    if (!lessonId) return;
    setLoading(true);
    try {
      const data = await attachmentApi.getAttachments(lessonId);
      setAttachments(Array.isArray(data) ? data : []);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && lessonId) {
      loadAttachments();
      setIsAdding(false);
      setNewFileName('');
      setNewFileUrl('');
    }
  }, [visible, lessonId]);

  const handleOpenFile = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Không thể mở liên kết', 'Liên kết tài liệu không hợp lệ hoặc không có ứng dụng hỗ trợ.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể mở tài liệu đính kèm.');
    }
  };

  const handleDelete = (attachmentId: number, name: string) => {
    Alert.alert('Xóa tài liệu', `Bạn có chắc muốn xóa tài liệu "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa vĩnh viễn',
        style: 'destructive',
        onPress: async () => {
          try {
            await attachmentApi.deleteAttachment(lessonId, attachmentId);
            setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
            Alert.alert('Thành công', 'Đã xóa tài liệu đính kèm.');
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa tài liệu.');
          }
        },
      },
    ]);
  };

  const handleAddAttachment = async () => {
    if (!newFileName.trim() || !newFileUrl.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên tài liệu và đường dẫn URL.');
      return;
    }

    setSubmitting(true);
    try {
      // Gọi upload hoặc thêm tài liệu vào danh sách
      await attachmentApi.addAttachmentByUrl(lessonId, {
        fileName: newFileName.trim(),
        fileUrl: newFileUrl.trim(),
      });
      Alert.alert('Thành công', 'Đã thêm tài liệu đính kèm mới!');
      setIsAdding(false);
      setNewFileName('');
      setNewFileUrl('');
      await loadAttachments();
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm tài liệu đính kèm.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Đính kèm trực tuyến';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <FileText color="#38BDF8" size={20} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Tài Liệu Bài Giảng
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {lessonTitle}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X color="#94A3B8" size={18} />
            </TouchableOpacity>
          </View>

          {/* Action Bar for Teachers / Admins */}
          {canManage && !isAdding && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setIsAdding(true)}
              activeOpacity={0.8}
            >
              <Plus color="#FFFFFF" size={16} />
              <Text style={styles.addBtnText}>Thêm Tài Liệu Mới</Text>
            </TouchableOpacity>
          )}

          {/* Add Attachment Form */}
          {isAdding && (
            <View style={styles.addFormContainer}>
              <Text style={styles.addFormTitle}>Gắn tài liệu bài giảng mới</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Tên tài liệu (VD: Slide_Bai_1.pdf) *"
                placeholderTextColor="#64748B"
                value={newFileName}
                onChangeText={setNewFileName}
              />
              <TextInput
                style={styles.formInput}
                placeholder="URL tài liệu (https://...) *"
                placeholderTextColor="#64748B"
                value={newFileUrl}
                onChangeText={setNewFileUrl}
                autoCapitalize="none"
              />
              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => setIsAdding(false)}
                >
                  <Text style={styles.cancelFormBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitFormBtn}
                  onPress={handleAddAttachment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitFormBtnText}>Lưu tài liệu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Body */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#38BDF8" />
              <Text style={styles.loadingText}>Đang tải danh sách tài liệu...</Text>
            </View>
          ) : attachments.length === 0 ? (
            <View style={styles.emptyBox}>
              <FileQuestion color="#64748B" size={44} />
              <Text style={styles.emptyTitle}>Chưa có tài liệu đính kèm</Text>
              <Text style={styles.emptySub}>
                Bài học này hiện chưa có giáo trình hoặc tài liệu bổ trợ nào được tải lên.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
              {attachments.map((item) => (
                <View key={item.id} style={styles.attachmentCard}>
                  <View style={styles.itemIconBox}>
                    <FileCheck color="#10B981" size={20} />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemFileName} numberOfLines={2}>
                      {item.fileName}
                    </Text>
                    <View style={styles.itemMetaRow}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {(item.fileType || 'DOC').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.fileSizeText}>
                        {formatFileSize(item.fileSizeBytes)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.openBtn}
                      onPress={() => handleOpenFile(item.fileUrl)}
                      activeOpacity={0.8}
                    >
                      <ExternalLink color="#38BDF8" size={16} />
                    </TouchableOpacity>

                    {canManage && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.id, item.fileName)}
                        activeOpacity={0.8}
                      >
                        <Trash2 color="#EF4444" size={16} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  addFormContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addFormTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  formInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelFormBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelFormBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  submitFormBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  submitFormBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  listScroll: {
    marginTop: 14,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemFileName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  typeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  fileSizeText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 10,
  },
  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
