import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  X,
  Bookmark,
  Clock,
  Play,
  Trash2,
  BookOpen,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  mediaBookmarkService,
} from '../../services/mediaBookmarkService';
import type { MediaBookmark } from '../../types/mediaBookmark.types';

interface BookmarkLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBookmark?: (bm: MediaBookmark) => void;
}

export const BookmarkLibraryModal: React.FC<BookmarkLibraryModalProps> = ({
  visible,
  onClose,
  onSelectBookmark,
}) => {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<MediaBookmark[]>([]);

  const loadBookmarks = useCallback(async () => {
    const list = await mediaBookmarkService.getAllBookmarks();
    setBookmarks(list);
  }, []);

  useEffect(() => {
    if (visible) {
      loadBookmarks();
    }
  }, [visible, loadBookmarks]);

  const handleDelete = async (id: string) => {
    await mediaBookmarkService.deleteBookmark(id);
    loadBookmarks();
  };

  const handleOpenBookmark = (bm: MediaBookmark) => {
    onClose();
    if (onSelectBookmark) {
      onSelectBookmark(bm);
    } else {
      router.push({
        pathname: `/lesson/${bm.lessonId}`,
        params: { seekTimestamp: String(bm.timestamp) },
      } as any);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconBox}>
              <Bookmark color="#6366F1" size={20} fill="#6366F1" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Mục Đánh Dấu & Video Yêu Thích</Text>
              <Text style={styles.headerSubtitle}>Các mốc thời gian bài giảng bạn đã lưu lại</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X color="#94A3B8" size={22} />
          </TouchableOpacity>
        </View>

        {bookmarks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bookmark color="#475569" size={48} />
            <Text style={styles.emptyTitle}>Chưa có mốc đánh dấu nào</Text>
            <Text style={styles.emptyDesc}>
              Khi xem video bài giảng, hãy bấm biểu tượng Cắm Cờ hoặc Đánh Dấu để lưu lại khoảnh khắc quan trọng.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.countText}>Đang lưu {bookmarks.length} mốc đánh dấu</Text>

            {bookmarks.map((bm) => (
              <View key={bm.id} style={styles.bookmarkCard}>
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => handleOpenBookmark(bm)}
                  activeOpacity={0.8}
                >
                  <View style={styles.timeBadge}>
                    <Clock color="#6366F1" size={13} />
                    <Text style={styles.timeBadgeText}>{bm.formattedTime}</Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.bmTitle} numberOfLines={1}>
                      {bm.title || bm.lessonTitle}
                    </Text>
                    <Text style={styles.bmCourse} numberOfLines={1}>
                      {bm.courseTitle} • {bm.lessonTitle}
                    </Text>
                    {bm.note ? <Text style={styles.bmNote}>Ghi chú: {bm.note}</Text> : null}
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => handleOpenBookmark(bm)}
                    activeOpacity={0.7}
                  >
                    <Play color="#FFFFFF" size={14} fill="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(bm.id)}
                    activeOpacity={0.7}
                  >
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B17' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#94A3B8', fontSize: 11 },
  closeBtn: { padding: 4 },
  listContent: { padding: 16, gap: 10 },
  countText: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  bookmarkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
  },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
  cardInfo: { flex: 1 },
  bmTitle: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  bmCourse: { color: '#94A3B8', fontSize: 11 },
  bmNote: { color: '#38BDF8', fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
