import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { X, FileText, Download, ExternalLink, FileCode, Paperclip } from 'lucide-react-native';
import { attachmentApi } from '../../services/attachmentApi';
import type { LessonAttachment } from '../../types/catalog.types';
import { formatBytes } from '../../utils/formatters';

interface LessonAttachmentsModalProps {
  visible: boolean;
  lessonId: number;
  onClose: () => void;
}

export const LessonAttachmentsModal: React.FC<LessonAttachmentsModalProps> = ({
  visible,
  lessonId,
  onClose,
}) => {
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (visible && lessonId) {
      setLoading(true);
      attachmentApi
        .getAttachments(lessonId)
        .then((items) => {
          setAttachments(items);
        })
        .catch(() => setAttachments([]))
        .finally(() => setLoading(false));
    }
  }, [visible, lessonId]);

  const handleOpenAttachment = (item: LessonAttachment) => {
    if (!item.fileUrl) {
      Alert.alert('Thông báo', 'Đường dẫn tệp không khả dụng.');
      return;
    }
    Linking.openURL(item.fileUrl).catch(() => {
      Alert.alert('Lỗi', 'Không thể mở liên kết tệp.');
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Paperclip color="#38BDF8" size={20} />
              <Text style={styles.modalTitle}>Tài Liệu Đính Kèm Bài Học</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#38BDF8" size="large" />
              <Text style={styles.loadingText}>Đang nạp danh sách tệp đính kèm...</Text>
            </View>
          ) : attachments.length === 0 ? (
            <View style={styles.emptyBox}>
              <FileText color="#64748B" size={40} />
              <Text style={styles.emptyTitle}>Chưa có tài liệu đính kèm</Text>
              <Text style={styles.emptyDesc}>
                Bài học này hiện chưa có file đính kèm (PDF/DOCX/Slide).
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.attachmentsList}>
              {attachments.map((item) => (
                <View key={item.id} style={styles.attachmentCard}>
                  <View style={styles.fileIconBox}>
                    <FileCode color="#38BDF8" size={24} />
                  </View>
                  <View style={styles.fileInfoGroup}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.fileName}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {formatBytes(item.fileSizeBytes || 0)} • {item.fileType || 'Document'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.openBtn}
                    onPress={() => handleOpenAttachment(item)}
                    activeOpacity={0.7}
                  >
                    <ExternalLink color="#FFFFFF" size={16} />
                  </TouchableOpacity>
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
    backgroundColor: 'rgba(7, 11, 24, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#090D1A',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#0E1428',
    borderRadius: 12,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  attachmentsList: {
    maxHeight: 400,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B18',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfoGroup: {
    flex: 1,
  },
  fileName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  fileMeta: {
    color: '#64748B',
    fontSize: 11,
  },
  openBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
