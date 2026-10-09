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
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  BookOpen,
  Lock,
  Globe,
  ChevronRight,
  X,
  ShieldAlert,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogApi } from '../../src/services/catalogApi';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { useAuthStore } from '../../src/store/useAuthStore';
import { CourseManagementModal } from '../../src/components/management/CourseManagementModal';
import { AdminUserManagementModal } from '../../src/components/management/AdminUserManagementModal';
import type { Course } from '../../src/types/catalog.types';

export default function CatalogScreen() {
  const router = useRouter();
  const { isTeacher, isAdmin, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Studio Modal State (Dành cho Giáo viên & Admin)
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState(false);

  // Unlock Modal State
  const [unlockCourseId, setUnlockCourseId] = useState<number | null>(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      // 1. Đọc từ SQLite Cache trước
      const cached = await catalogRepository.getAllCourses();
      if (cached.length > 0) {
        setCourses(cached);
      }

      // 2. Tải trực tiếp từ Azure API
      try {
        const apiData = await catalogApi.getAllCourses(isTeacher || isAdmin);
        if (Array.isArray(apiData)) {
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
  }, [isAdmin, isTeacher]);

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

  // Filter Logic: Danh mục động dựa trên khóa học thực tế (LUÔN GỌI TRƯỚC BẤT KỲ CONDITIONAL RETURN NÀO)
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    courses.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return cats.size > 0 ? ['ALL', ...Array.from(cats)] : ['ALL'];
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat =
        selectedCategory === 'ALL' || (c.category && c.category === selectedCategory);
      return matchesSearch && matchesCat;
    });
  }, [courses, searchQuery, selectedCategory]);

  if (loading) {
    return <LoadingIndicator message="Đang nạp danh mục khóa học Azure..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Khám phá"
        subtitle="Khóa học Microlearning chuẩn thực chiến"
        onProfilePress={() => router.push('/(tabs)/profile')}
        onLogoutPress={handleLogout}
      />

      {/* Banner Studio Dành cho Giáo viên & Admin */}
      {(isTeacher || isAdmin) && (
        <View style={styles.studioBannerContainer}>
          <TouchableOpacity
            style={styles.studioBannerBtn}
            onPress={() => setIsStudioOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.studioBannerLeft}>
              <View style={styles.studioIconBox}>
                <Layers color="#6366F1" size={18} />
              </View>
              <View>
                <Text style={styles.studioBannerTitle}>Studio Quản Lý Khóa Học</Text>
                <Text style={styles.studioBannerSub}>Tạo, sửa bài giảng & xem tiến độ học viên</Text>
              </View>
            </View>
            <ChevronRight color="#818CF8" size={18} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.studioBannerBtn, { marginTop: 8, borderColor: 'rgba(239, 68, 68, 0.4)' }]}
              onPress={() => setIsAdminUsersOpen(true)}
              activeOpacity={0.8}
            >
              <View style={styles.studioBannerLeft}>
                <View style={[styles.studioIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <ShieldCheck color="#EF4444" size={18} />
                </View>
                <View>
                  <Text style={styles.studioBannerTitle}>Quản Trị Người Dùng (Admin)</Text>
                  <Text style={styles.studioBannerSub}>Phân quyền, khóa/mở khóa & đổi mật khẩu</Text>
                </View>
              </View>
              <ChevronRight color="#EF4444" size={18} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <Search color="#64748B" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm khóa học, kỹ năng..."
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
                {cat === 'ALL' ? 'Tất cả' : cat}
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

        {filteredCourses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <BookOpen color="#818CF8" size={36} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có khóa học nào</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? 'Không tìm thấy khóa học nào phù hợp với từ khóa.'
                : 'Hệ thống hiện tại chưa có khóa học nào được xuất bản.'}
            </Text>
            {(isTeacher || isAdmin) && (
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => setIsStudioOpen(true)}
                activeOpacity={0.8}
              >
                <Layers color="#FFFFFF" size={16} />
                <Text style={styles.emptyCreateBtnText}>Tạo khóa học mới ngay</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredCourses.map((item) => (
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
              {/* Ảnh Thumbnail Thật của Khóa Học */}
              <View style={styles.cardThumbnailWrapper}>
                {item.thumbnailUrl ? (
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.cardThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardPlaceholderThumbnail}>
                    <BookOpen color="#818CF8" size={32} />
                  </View>
                )}

                {/* Badge Hạn Chế / Công Khai */}
                <View style={styles.cardBadgeContainer}>
                  {item.isPrivate ? (
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
              </View>

              {/* Thông tin Khóa Học */}
              <View style={styles.cardBody}>
                <Text style={styles.courseTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                {item.description ? (
                  <Text style={styles.courseDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooterRow}>
                  <Text style={styles.subjectsText}>{item.totalSubjects || 0} Môn học</Text>
                  <View style={styles.viewCourseRow}>
                    <Text style={styles.viewCourseText}>Xem chi tiết</Text>
                    <ChevronRight color="#818CF8" size={14} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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

      {/* Studio Modal Dành Cho Giáo Viên & Admin */}
      <CourseManagementModal
        visible={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        onCourseUpdated={fetchCourses}
      />

      <AdminUserManagementModal
        visible={isAdminUsersOpen}
        onClose={() => setIsAdminUsersOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  studioBannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  studioBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E1428',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  studioBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  studioIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioBannerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  studioBannerSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
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
    backgroundColor: '#090D1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardThumbnailWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  cardThumbnail: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  badgePrivate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePublic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeTextPrivate: { color: '#000000', fontSize: 10, fontWeight: '800' },
  badgeTextPublic: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  cardBody: {
    padding: 14,
  },
  courseTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  courseDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  subjectsText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  viewCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewCourseText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
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
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 12,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
