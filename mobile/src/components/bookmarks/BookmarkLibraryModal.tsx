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
} from 'react-native';
import { X, Bookmark, Clock, Trash2, ArrowRight } from 'lucide-react-native';
import { mediaBookmarkService, MediaBookmarkItem } from '../../services/mediaBookmarkService';
import { formatDuration } from '../../utils/formatters';

interface BookmarkLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToBookmark?: (lessonId: number, timestampSeconds: number) => void;
}

export const BookmarkLibraryModal: React.FC<BookmarkLibraryModalProps> = ({
  visible,
  onClose,
  onNavigateToBookmark,
}) => {
  const [bookmarks, setBookmarks] = useState<MediaBookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const data = await mediaBookmarkService.getBookmarks();
      setBookmarks(data);
    } catch {
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadBookmarks();
    }
  }, [visible]);

  const handleRemove = async (id: number) => {
    try {
      await mediaBookmarkService.removeBookmark(id);
      setBookmarks(bookmarks.filter((b) => b.id !== id));
    } catch {
      Alert.alert('Lỗi', 'Không thể xóa mốc đánh dấu.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Bookmark color="#38BDF8" size={24} fill="#38BDF8" />
              <Text style={styles.modalTitle}>Thư Viện Đánh Dấu Bài Học</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
          ) : bookmarks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Bookmark color="#64748B" size={48} />
              <Text style={styles.emptyTitle}>Chưa có mốc đánh dấu nào</Text>
              <Text style={styles.emptySub}>
                Khi xem video bài giảng, bấm Đánh dấu để lưu lại các mốc thời gian quan trọng.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.bookmarksList}>
              {bookmarks.map((bm) => (
                <View key={bm.id} style={styles.bmCard}>
                  <View style={styles.bmInfo}>
                    <Text style={styles.bmLesson}>{bm.lessonTitle}</Text>
                    <View style={styles.timeTag}>
                      <Clock color="#38BDF8" size={12} />
                      <Text style={styles.timeText}>{formatDuration(bm.timestampSeconds)}</Text>
                    </View>
                    {bm.noteText && <Text style={styles.bmNote}>"{bm.noteText}"</Text>}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemove(bm.id)}
                    >
                      <Trash2 color="#EF4444" size={18} />
                    </TouchableOpacity>

                    {onNavigateToBookmark && (
                      <TouchableOpacity
                        style={styles.openBtn}
                        onPress={() => {
                          onClose();
                          onNavigateToBookmark(bm.lessonId, bm.timestampSeconds);
                        }}
                      >
                        <ArrowRight color="#FFFFFF" size={18} />
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '85%',
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
  titleRow: {
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
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  bookmarksList: {
    maxHeight: 400,
  },
  bmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  bmInfo: {
    flex: 1,
    marginRight: 10,
  },
  bmLesson: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  bmNote: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  openBtn: {
    padding: 8,
    backgroundColor: '#6366F1',
    borderRadius: 10,
  },
});
