import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HardDrive, Trash2, Play, Pin, PinOff } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { downloadRepository } from '../../src/db/repositories/downloadRepository';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { formatBytes } from '../../src/utils/formatters';
import type { DownloadedMediaRecord } from '../../src/types/offline.types';
import type { Lesson } from '../../src/types/catalog.types';

interface OfflineItem {
  record: DownloadedMediaRecord;
  lesson: Lesson | null;
}

export default function DownloadsScreen() {
  const router = useRouter();
  const { totalStorageBytes, deleteDownload, refreshStorageAndDownloads } = useDownloadStore();

  const [items, setItems] = useState<OfflineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOfflineMedia = useCallback(async () => {
    try {
      const records = await downloadRepository.getAllDownloaded();
      const loaded: OfflineItem[] = [];

      for (const rec of records) {
        const les = await catalogRepository.getLessonById(rec.lessonId);
        loaded.push({ record: rec, lesson: les });
      }

      setItems(loaded);
      await refreshStorageAndDownloads();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshStorageAndDownloads]);

  useEffect(() => {
    loadOfflineMedia();
  }, [loadOfflineMedia]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOfflineMedia();
  };

  const handleDelete = (lessonId: number, title: string) => {
    Alert.alert('Xác nhận xóa tệp', `Bạn có chắc chắn muốn xóa video "${title}" khỏi máy?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa tệp',
        style: 'destructive',
        onPress: async () => {
          await deleteDownload(lessonId);
          await loadOfflineMedia();
        },
      },
    ]);
  };

  const handleTogglePin = async (lessonId: number, currentlyPinned: boolean) => {
    await downloadRepository.togglePinned(lessonId, !currentlyPinned);
    await loadOfflineMedia();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Kho ngoại tuyến" />

      <View style={styles.container}>
        {/* Thống kê dung lượng */}
        <View style={styles.storageCard}>
          <View style={styles.storageIconWrapper}>
            <HardDrive color="#38BDF8" size={24} />
          </View>
          <View style={styles.storageDetails}>
            <Text style={styles.storageLabel}>Dung lượng đã sử dụng</Text>
            <Text style={styles.storageValue}>{formatBytes(totalStorageBytes)}</Text>
          </View>
          <View style={styles.storageCountBadge}>
            <Text style={styles.storageCountText}>{items.length} bài học</Text>
          </View>
        </View>

        {/* Danh sách video tải về */}
        <FlatList
          data={items}
          keyExtractor={(item) => item.record.mediaId.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
          renderItem={({ item }) => {
            const lessonTitle = item.lesson?.title || item.record.fileName;
            const isPinned = Boolean(item.record.isPinned);

            return (
              <View style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {lessonTitle}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemSize}>{formatBytes(item.record.fileSizeBytes)}</Text>
                    {isPinned && (
                      <View style={styles.pinnedBadge}>
                        <Text style={styles.pinnedText}>Đã ghim (Không tự xóa)</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Các nút hành động */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleTogglePin(item.record.lessonId, isPinned)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {isPinned ? <Pin color="#38BDF8" size={18} /> : <PinOff color="#64748B" size={18} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDelete(item.record.lessonId, lessonTitle)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 color="#EF4444" size={18} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => router.push(`/lesson/${item.record.lessonId}`)}
                  >
                    <Play color="#FFFFFF" size={15} />
                    <Text style={styles.playButtonText}>Phát</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <HardDrive color="#475569" size={48} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>Chưa có bài học tải về</Text>
                <Text style={styles.emptySubtitle}>
                  Bạn có thể bấm "Tải học offline" ở bất kỳ bài học nào để học khi mất mạng.
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B17',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  storageIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  storageDetails: {
    flex: 1,
  },
  storageLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  storageValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  storageCountBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  storageCountText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  itemInfo: {
    marginBottom: 12,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemSize: {
    color: '#64748B',
    fontSize: 12,
  },
  pinnedBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pinnedText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#070B17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
