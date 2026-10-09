import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Settings,
  LogOut,
  BookOpen,
  Users,
  Heart,
  AlertTriangle,
  Bookmark,
  ChevronRight,
  Shield,
  Crown,
} from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { useAuthStore } from '../../src/store/useAuthStore';
import { UserProfileModal } from '../../src/components/profile/UserProfileModal';
import { CourseManagementModal } from '../../src/components/management/CourseManagementModal';
import { AdminUserManagementModal } from '../../src/components/management/AdminUserManagementModal';
import { FavoriteSubjectsModal } from '../../src/components/common/FavoriteSubjectsModal';
import { MistakeVaultModal } from '../../src/components/quiz/MistakeVaultModal';
import { BookmarkLibraryModal } from '../../src/components/bookmarks/BookmarkLibraryModal';
import { SyncCenterModal } from '../../src/components/sync/SyncCenterModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isAdmin, isTeacher } = useAuthStore();

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCourseManagement, setShowCourseManagement] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showSyncCenter, setShowSyncCenter] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <AppHeader title="Hồ sơ & Quản trị" />
        <TouchableOpacity style={styles.settingsIconBtn} onPress={() => setShowSyncCenter(true)}>
          <Settings color="#38BDF8" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card Thông tin cá nhân (Bấm vào mở Profile Modal) */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <Text style={styles.avatarText}>{(user?.fullName || 'H').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.fullName || 'Học viên Microlearning'}</Text>
            <Text style={styles.userPhone}>{user?.phoneNumber || 'Chưa cập nhật SĐT'}</Text>

            <View style={styles.roleBadgeRow}>
              {isAdmin && (
                <View style={[styles.roleBadge, styles.adminBadge]}>
                  <Crown color="#F59E0B" size={12} />
                  <Text style={styles.adminRoleText}>Quản trị viên</Text>
                </View>
              )}
              {isTeacher && !isAdmin && (
                <View style={[styles.roleBadge, styles.teacherBadge]}>
                  <Shield color="#38BDF8" size={12} />
                  <Text style={styles.teacherRoleText}>Giáo viên</Text>
                </View>
              )}
              {!isAdmin && !isTeacher && (
                <View style={[styles.roleBadge, styles.studentBadge]}>
                  <Text style={styles.studentRoleText}>Học viên tích cực</Text>
                </View>
              )}
            </View>
          </View>
          <ChevronRight color="#64748B" size={20} />
        </TouchableOpacity>

        {/* SECTION 1: CÔNG CỤ QUẢN TRỊ (ADMIN & TEACHER ONLY) */}
        {(isAdmin || isTeacher) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Studio Quản Trị Hệ Thống</Text>

            {/* Studio Đăng tải Khóa học */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => setShowCourseManagement(true)}
            >
              <View style={[styles.menuIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <BookOpen color="#6366F1" size={20} />
              </View>
              <View style={styles.menuTextWrapper}>
                <Text style={styles.menuTitle}>Studio Đăng Tải Khóa Học</Text>
                <Text style={styles.menuSub}>Tạo khóa học mới, sửa bài giảng & mật khẩu riêng tư</Text>
              </View>
              <ChevronRight color="#64748B" size={18} />
            </TouchableOpacity>

            {/* Quản lý Người dùng (Admin Only) */}
            {isAdmin && (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => setShowUserManagement(true)}
              >
                <View style={[styles.menuIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Users color="#38BDF8" size={20} />
                </View>
                <View style={styles.menuTextWrapper}>
                  <Text style={styles.menuTitle}>Quản Lý Người Dùng (Admin)</Text>
                  <Text style={styles.menuSub}>Xem danh sách toàn bộ học viên, phân quyền & khóa tài khoản</Text>
                </View>
                <ChevronRight color="#64748B" size={18} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* SECTION 2: CÔNG CỤ HỌC TẬP CÁ NHÂN (STUDENT TOOLS) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Góc Học Tập Cá Nhân</Text>

          {/* Môn học Yêu thích */}
          <TouchableOpacity style={styles.menuRow} onPress={() => setShowFavorites(true)}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Heart color="#EF4444" size={20} fill="#EF4444" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Môn Học Yêu Thích</Text>
              <Text style={styles.menuSub}>Danh sách các môn học bạn đã lưu để truy cập nhanh</Text>
            </View>
            <ChevronRight color="#64748B" size={18} />
          </TouchableOpacity>

          {/* Kho Ôn lại Bài sai */}
          <TouchableOpacity style={styles.menuRow} onPress={() => setShowMistakes(true)}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <AlertTriangle color="#F59E0B" size={20} />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Kho Ôn Lại Bài Thi Sai</Text>
              <Text style={styles.menuSub}>Tự động tổng hợp các câu hỏi trắc nghiệm bạn làm sai</Text>
            </View>
            <ChevronRight color="#64748B" size={18} />
          </TouchableOpacity>

          {/* Thư viện Đánh dấu */}
          <TouchableOpacity style={styles.menuRow} onPress={() => setShowBookmarks(true)}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Bookmark color="#10B981" size={20} />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Thư Viện Đánh Dấu Bài Học</Text>
              <Text style={styles.menuSub}>Các mốc thời gian video & ghi chú bài học đã lưu</Text>
            </View>
            <ChevronRight color="#64748B" size={18} />
          </TouchableOpacity>
        </View>

        {/* Nút Đăng xuất */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#EF4444" size={20} />
          <Text style={styles.logoutText}>Đăng Xuất Tài Khoản</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ALL MODALS */}
      <UserProfileModal visible={showProfileModal} onClose={() => setShowProfileModal(false)} />

      <CourseManagementModal
        visible={showCourseManagement}
        onClose={() => setShowCourseManagement(false)}
      />

      <AdminUserManagementModal
        visible={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />

      <FavoriteSubjectsModal visible={showFavorites} onClose={() => setShowFavorites(false)} />

      <MistakeVaultModal visible={showMistakes} onClose={() => setShowMistakes(false)} />

      <BookmarkLibraryModal visible={showBookmarks} onClose={() => setShowBookmarks(false)} />

      <SyncCenterModal visible={showSyncCenter} onClose={() => setShowSyncCenter(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  headerRow: {
    position: 'relative',
  },
  settingsIconBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  userPhone: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
  },
  adminRoleText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  teacherBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
  },
  teacherRoleText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  studentBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  studentRoleText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionContainer: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextWrapper: {
    flex: 1,
    marginRight: 8,
  },
  menuTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  menuSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    height: 52,
    gap: 10,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
