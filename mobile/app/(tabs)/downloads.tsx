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
import { HardDrive, Trash2, Play, Pin, PinOff, Sparkles, RefreshCw } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { downloadRepository } from '../../src/db/repositories/downloadRepository';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { mediaCleanupService } from '../../src/services/mediaCleanupService';
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
      const seenLessons = new Set<number>();

      for (const rec of records) {
        // Tránh trùng lặp đếm nếu 1 bài có nhiều tệp
        if (!seenLessons.has(rec.lessonId)) {
          seenLessons.add(rec.lessonId);
          const les = await catalogRepository.getLessonById(rec.lessonId);
          loaded.push({ record: rec, lesson: les });
        }
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

  const handleRunCleanup7Days = async () => {
    const deletedCount = await mediaCleanupService.runAutoCleanup7Days();
    Alert.alert(
      'Dọn dẹp bộ nhớ 7 ngày',
      deletedCount > 0
        ? `Đã dọn dẹp ${deletedCount} video bài học đã học xong quá 7 ngày.`
        : 'Bộ nhớ sạch sẽ! Không có video bài học nào thỏa điều kiện xóa.'
    );
    await loadOfflineMedia();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Kho Ngoại Tuyến & Dọn Dẹp" />

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

        {/* Nút kích hoạt dọn dẹp 7 ngày */}
        <TouchableOpacity style={styles.cleanupBannerBtn} onPress={handleRunCleanup7Days}>
          <Sparkles color="#F59E0B" size={18} />
          <Text style={styles.cleanupBannerText}>Dọn Dẹp Video Đã Học Xong ({'>'} 7 Ngày)</Text>
        </TouchableOpacity>

        {/* Danh sách video tải về */}
        <FlatList
          data={items}
          keyExtractor={(item) => `offline_${item.record.lessonId}_${item.record.mediaId}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const title = item.lesson?.title || `Bài học #${item.record.lessonId}`;
            const isPinned = item.record.isPinned === 1;

            return (
              <View style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={() => router.push(`/lesson/${item.record.lessonId}` as any)}
                >
                  <Play color="#FFFFFF" size={18} fill="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {formatBytes(item.record.fileSizeBytes)} • Tải ngày{' '}
                    {new Date(item.record.downloadedAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.pinBtn}
                    onPress={() => handleTogglePin(item.record.lessonId, isPinned)}
                  >
                    {isPinned ? (
                      <Pin color="#F59E0B" size={18} fill="#F59E0B" />
                    ) : (
                      <PinOff color="#64748B" size={18} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.record.lessonId, title)}
                  >
                    <Trash2 color="#EF4444" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <HardDrive color="#475569" size={48} />
                <Text style={styles.emptyTitle}>Chưa có bài học nào được tải về</Text>
                <Text style={styles.emptySub}>
                  Bấm nút "Tải bài học" trong màn hình học để xem video ngoại tuyến khi không có kết nối Internet.
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
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  storageIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontWeight: '600',
  },
  storageValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  storageCountBadge: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  storageCountText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  cleanupBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 16,
  },
  cleanupBannerText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinBtn: {
    padding: 8,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
    lineHeight: 18,
  },
});
