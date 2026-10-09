import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Download, Trash2, Pin, Play, HardDrive, CheckCircle2 } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { downloadRepository } from '../../src/db/repositories/downloadRepository';
import { downloadManager } from '../../src/services/downloadManager';
import { useDownloadStore } from '../../src/store/useDownloadStore';
import { formatBytes, formatDate } from '../../src/utils/formatters';
import type { DownloadedMediaItem } from '../../src/types/sync.types';

export default function DownloadsScreen() {
  const router = useRouter();
  const { refreshDownloads } = useDownloadStore();

  const [downloads, setDownloads] = useState<DownloadedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDownloads = useCallback(async () => {
    try {
      const items = await downloadRepository.getAllDownloads();
      setDownloads(items);
    } catch (err) {
      console.warn('[Downloads] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDownloads();
  };

  const handleDelete = (item: DownloadedMediaItem) => {
    Alert.alert(
      'Xóa bài học ngoại tuyến',
      `Bạn có chắc muốn xóa video "${item.fileName}" khỏi bộ nhớ thiết bị?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: async () => {
            await downloadManager.deleteDownloadedVideo(item.lessonId, item.localPath);
            await refreshDownloads();
            await loadDownloads();
          },
        },
      ]
    );
  };

  const handleTogglePin = async (item: DownloadedMediaItem) => {
    const nextPinState = item.isPinned === 0;
    await downloadRepository.togglePin(item.lessonId, nextPinState);
    await loadDownloads();
  };

  if (loading) {
    return <LoadingIndicator message="Đang kiểm tra thư viện ngoại tuyến..." />;
  }

  // Calculate total used storage space
  const totalSizeBytes = downloads.reduce((acc, curr) => acc + (curr.fileSizeBytes || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Kho Ngoại Tuyến" subtitle="Quản lý bài học đã tải về" />
      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* Storage Quota Visualizer Bar */}
        <View style={styles.storageCard}>
          <View style={styles.storageHeaderRow}>
            <View style={styles.storageTitleRow}>
              <HardDrive color="#818CF8" size={18} />
              <Text style={styles.storageTitle}>Dung lượng bộ nhớ</Text>
            </View>
            <Text style={styles.storageSizeText}>{formatBytes(totalSizeBytes)}</Text>
          </View>

          <View style={styles.storageBarTrack}>
            <View style={[styles.storageBarFill, { width: downloads.length > 0 ? '35%' : '0%' }]} />
          </View>

          <View style={styles.storageLegendRow}>
            <View style={styles.legendItem}>
              <View style={styles.legendDotVideo} />
              <Text style={styles.legendText}>{downloads.length} Video bài học</Text>
            </View>
            <Text style={styles.cleanupPolicyText}>Tự động dọn dẹp sau 7 ngày</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Danh sách bài giảng ({downloads.length})</Text>

        {downloads.length === 0 ? (
          <View style={styles.emptyCard}>
            <Download color="#475569" size={40} />
            <Text style={styles.emptyTitle}>Chưa có bài học ngoại tuyến</Text>
            <Text style={styles.emptyDesc}>
              Bấm biểu tượng tải xuống trong bất kỳ bài học nào để học tập khi không có Internet.
            </Text>
          </View>
        ) : (
          downloads.map((item) => (
            <View key={item.lessonId} style={styles.downloadRow}>
              <TouchableOpacity
                style={styles.downloadLeft}
                onPress={() => router.push(`/lesson/${item.lessonId}`)}
                activeOpacity={0.7}
              >
                <View style={styles.playIconBox}>
                  <Play color="#6366F1" size={18} fill="#6366F1" />
                </View>

                <View style={styles.downloadTextContainer}>
                  <Text style={styles.downloadTitle} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <View style={styles.downloadSubMeta}>
                    <Text style={styles.downloadMetaText}>{formatBytes(item.fileSizeBytes)}</Text>
                    <Text style={styles.downloadMetaDot}>•</Text>
                    <Text style={styles.downloadMetaText}>Tải ngày {formatDate(item.downloadedAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.pinBtn, item.isPinned === 1 && styles.pinBtnActive]}
                  onPress={() => handleTogglePin(item)}
                >
                  <Pin color={item.isPinned === 1 ? '#F59E0B' : '#64748B'} size={16} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Trash2 color="#F43F5E" size={16} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  storageCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  storageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  storageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  storageTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  storageSizeText: { color: '#818CF8', fontSize: 15, fontWeight: '700' },
  storageBarTrack: { height: 10, backgroundColor: '#1E293B', borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  storageBarFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 5 },
  storageLegendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDotVideo: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
  legendText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  cleanupPolicyText: { color: '#64748B', fontSize: 11 },
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  emptyTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  emptyDesc: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  downloadLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  playIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadTextContainer: { marginLeft: 12, flex: 1 },
  downloadTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  downloadSubMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  downloadMetaText: { color: '#64748B', fontSize: 11 },
  downloadMetaDot: { color: '#475569', fontSize: 10 },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#070B17', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B' },
  pinBtnActive: { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(244, 63, 94, 0.15)', alignItems: 'center', justifyContent: 'center' },
});
