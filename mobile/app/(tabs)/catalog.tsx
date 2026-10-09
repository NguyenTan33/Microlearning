import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Filter, BookOpen, Lock, Unlock, ChevronRight, X, ShieldAlert } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogApi } from '../../src/services/catalogApi';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import type { Course } from '../../src/types/catalog.types';

export default function CatalogScreen() {
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Unlock Modal State
  const [unlockCourseId, setUnlockCourseId] = useState<number | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      // 1. Read SQLite Cache first
      const cached = await catalogRepository.getAllCourses();
      if (cached.length > 0) {
        setCourses(cached);
      }

      // 2. Fetch from API if online
      try {
        const apiData = await catalogApi.getAllCourses();
        if (apiData.length > 0) {
          await catalogRepository.saveCourses(apiData);
          setCourses(apiData);
        }
      } catch {
        // Fallback SQLite
      }
    } catch (err) {
      console.warn('[Catalog] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
  };

  const handleUnlockSubmit = async () => {
    if (!unlockCourseId || !passkeyInput) return;
    setUnlocking(true);
    setUnlockError('');

    try {
      const res = await catalogApi.unlockCourse(unlockCourseId, passkeyInput);
      if (res.success) {
        setUnlockCourseId(null);
        setPasskeyInput('');
        fetchCourses();
      } else {
        setUnlockError(res.message || 'Mật khẩu mở khóa không đúng.');
      }
    } catch {
      setUnlockError('Không thể kết nối đến máy chủ.');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Đang khám phá danh mục khóa học..." />;
  }

  // Filter Logic
  const categories = ['ALL', 'CNTT & Lập trình', 'Ngoại ngữ', 'Kỹ năng mềm', 'Kinh doanh'];

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat =
      selectedCategory === 'ALL' || (c.category && c.category === selectedCategory);
    return matchesSearch && matchesCat;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Khám phá" subtitle="Danh mục bài giảng Microlearning" />
      <OfflineBanner />

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Search color="#64748B" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm khóa học, chủ đề..."
            placeholderTextColor="#475569"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color="#64748B" size={16} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories Chips */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                {cat === 'ALL' ? 'Tất cả khóa' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Course Cards List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <Text style={styles.resultCountText}>Hiển thị {filteredCourses.length} khóa học</Text>

        {filteredCourses.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.courseCard}
            onPress={() => {
              if (item.isLocked) {
                setUnlockCourseId(item.id);
              } else {
                router.push(`/course/${item.id}`);
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.courseIconBox}>
                <BookOpen color="#818CF8" size={24} />
              </View>

              <View style={styles.courseMainInfo}>
                <Text style={styles.courseTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.courseAuthor}>Giảng viên: {item.authorName || 'Microlearning'}</Text>
              </View>

              {item.isLocked ? (
                <View style={styles.lockedBadge}>
                  <Lock color="#F43F5E" size={14} />
                </View>
              ) : (
                <ChevronRight color="#475569" size={20} />
              )}
            </View>

            {item.description ? (
              <Text style={styles.courseDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.cardFooterRow}>
              <View style={styles.subjectsBadge}>
                <Text style={styles.subjectsBadgeText}>{item.totalSubjects || 0} Môn học</Text>
              </View>

              {item.isEnrolled && (
                <View style={styles.enrolledBadge}>
                  <Unlock color="#10B981" size={12} />
                  <Text style={styles.enrolledText}>Đã tham gia</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Unlock Course Modal */}
      <Modal visible={unlockCourseId !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <ShieldAlert color="#F59E0B" size={28} />
              <Text style={styles.modalTitle}>Khóa học Yêu cầu Mật khẩu</Text>
            </View>

            <Text style={styles.modalDesc}>
              Khóa học này được bảo vệ. Vui lòng nhập mật khẩu mở khóa do giảng viên cấp:
            </Text>

            {unlockError ? <Text style={styles.modalError}>{unlockError}</Text> : null}

            <TextInput
              style={styles.modalInput}
              placeholder="Nhập mã mở khóa..."
              placeholderTextColor="#475569"
              value={passkeyInput}
              onChangeText={setPasskeyInput}
              secureTextEntry
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setUnlockCourseId(null)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleUnlockSubmit} disabled={unlocking}>
                <Text style={styles.confirmBtnText}>{unlocking ? 'Đang mở...' : 'Mở khóa'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  searchSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  categoriesWrapper: { marginBottom: 8 },
  categoriesScroll: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  categoryChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  categoryChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  categoryChipTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  resultCountText: { color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  courseCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  courseIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseMainInfo: { flex: 1 },
  courseTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  courseAuthor: { color: '#94A3B8', fontSize: 12 },
  lockedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjectsBadge: { backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  subjectsBadgeText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  enrolledBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  enrolledText: { color: '#10B981', fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#0F172A', borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: '#1E293B' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  modalDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  modalError: { color: '#F43F5E', fontSize: 12, marginBottom: 10 },
  modalInput: { backgroundColor: '#070B17', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#F8FAFC', borderWidth: 1, borderColor: '#1E293B', marginBottom: 18 },
  modalActionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1E293B', alignItems: 'center' },
  cancelBtnText: { color: '#94A3B8', fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center' },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
