import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User as UserIcon,
  LogOut,
  Flame,
  Trophy,
  BookOpen,
  Clock,
  CheckCircle2,
  Lock,
  KeyRound,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Percent,
  Sparkles,
  Phone,
  Mail,
  Edit2,
  Save,
  RotateCcw,
  HelpCircle,
  Bookmark,
  Heart,
  Layers,
} from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { MistakeVaultModal } from '../../src/components/quiz/MistakeVaultModal';
import { BookmarkLibraryModal } from '../../src/components/bookmarks/BookmarkLibraryModal';
import { FavoriteSubjectsModal } from '../../src/components/common/FavoriteSubjectsModal';
import { CourseManagementModal } from '../../src/components/management/CourseManagementModal';
import { AdminUserManagementModal } from '../../src/components/management/AdminUserManagementModal';
import { useAuthStore } from '../../src/store/useAuthStore';
import { userProfileService } from '../../src/services/userProfileService';
import { catalogApi } from '../../src/services/catalogApi';
import { progressRepository } from '../../src/db/repositories/progressRepository';
import { streakApi, type StreakInfo } from '../../src/services/streakApi';
import { authApi } from '../../src/services/authApi';
import type { UserProfile, UserLearningStats, CourseLearningProgress } from '../../src/types/userProfile.types';
import type { CourseDetail } from '../../src/types/catalog.types';

type ActiveTab = 'PROGRESS' | 'INFO' | 'PASSWORD';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isTeacher, isAdmin } = useAuthStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('PROGRESS');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Learning stats & real streak
  const [stats, setStats] = useState<UserLearningStats | null>(null);
  const [courseProgressList, setCourseProgressList] = useState<CourseLearningProgress[]>([]);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Forgot password OTP flow inside password tab
  const [isForgotFlow, setIsForgotFlow] = useState<boolean>(false);
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotResetToken, setForgotResetToken] = useState<string>('');
  const [forgotStep, setForgotStep] = useState<'SEND_OTP' | 'VERIFY_OTP' | 'RESET_PASS'>('SEND_OTP');
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);

  // Upgrade features modals
  const [isMistakesOpen, setIsMistakesOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const userId = user?.id || 'guest';
      const roleStr = isAdmin ? 'Quản trị viên' : isTeacher ? 'Giáo viên' : 'Học viên';

      // 1. Tải Profile
      const prof = await userProfileService.getUserProfile(userId, {
        fullName: user?.fullName,
        phoneNumber: user?.phoneNumber,
        email: user?.email,
        role: roleStr,
      });
      setProfile(prof);
      setFullName(prof.fullName);
      setEmail(prof.email);
      setPhoneNumber(prof.phoneNumber);
      setBio(prof.bio);

      // 2. Tải Streak thật từ Azure API
      try {
        const streakData = await streakApi.getMyStreak();
        setStreakInfo(streakData);
      } catch {
        // Fallback streak
      }

      // 3. Tải danh sách khóa học thật và tiến độ học
      try {
        const courses = await catalogApi.getAllCourses();
        const courseDetails: CourseDetail[] = await Promise.all(
          courses.slice(0, 10).map(async (c) => {
            try {
              return await catalogApi.getCourseById(c.id);
            } catch {
              return { ...c, subjects: [] };
            }
          })
        );

        const completedIds = await progressRepository.getCompletedLessonIds();
        const { stats: calculatedStats, courseProgressList: calculatedList } =
          userProfileService.calculateStats(courseDetails, completedIds);

        setStats(calculatedStats);
        setCourseProgressList(calculatedList);
      } catch {
        // Fallback
      }
    } catch (err) {
      console.warn('[ProfileScreen] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isAdmin, isTeacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const updated: UserProfile = {
        ...profile,
        fullName: fullName.trim() || profile.fullName,
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || profile.phoneNumber,
        bio: bio.trim(),
      };
      await userProfileService.saveUserProfile(updated);
      setProfile(updated);
      Alert.alert('Thành công', 'Đã lưu thông tin cá nhân.');
    } catch {
      Alert.alert('Lỗi', 'Không thể lưu hồ sơ.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ các trường mật khẩu.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      Alert.alert('Thành công! 🔒', res.message || 'Đã cập nhật mật khẩu mới.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendForgotOtp = async () => {
    const targetPhone = phoneNumber || user?.phoneNumber;
    if (!targetPhone) {
      Alert.alert('Thông báo', 'Không tìm thấy số điện thoại tài khoản.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await authApi.forgotPassword({ phoneNumber: targetPhone });
      Alert.alert('Đã gửi mã OTP', `Mã OTP xác thực đã được gửi tới ${targetPhone}.`);
      setForgotStep('VERIFY_OTP');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi mã OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async () => {
    const targetPhone = phoneNumber || user?.phoneNumber;
    if (!forgotOtp.trim() || !targetPhone) return;
    setForgotLoading(true);
    try {
      const res = await authApi.verifyForgotPasswordOtp({
        phoneNumber: targetPhone,
        otp: forgotOtp.trim(),
      });
      setForgotResetToken(res.resetToken);
      setForgotStep('RESET_PASS');
      Alert.alert('Xác thực thành công', 'Vui lòng nhập mật khẩu mới.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Mã OTP không hợp lệ.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const targetPhone = phoneNumber || user?.phoneNumber;
    if (!newPassword || newPassword !== confirmNewPassword || !targetPhone || !forgotResetToken) {
      Alert.alert('Thông báo', 'Vui lòng kiểm tra lại mật khẩu xác nhận.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await authApi.resetPassword({
        phoneNumber: targetPhone,
        resetToken: forgotResetToken,
        newPassword,
        confirmNewPassword,
      });
      Alert.alert('Thành công 🎉', res.message || 'Mật khẩu của bạn đã được khôi phục thành công.');
      setIsForgotFlow(false);
      setForgotStep('SEND_OTP');
      setForgotOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể khôi phục mật khẩu.');
    } finally {
      setForgotLoading(false);
    }
  };

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

  const roleLabel = isAdmin ? 'Quản trị viên' : isTeacher ? 'Giáo viên' : 'Học viên';
  const roleColor = isAdmin ? '#EC4899' : isTeacher ? '#06B6D4' : '#6366F1';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Hồ sơ cá nhân"
        subtitle="Thông tin & Tiến độ học tập"
        onLogoutPress={handleLogout}
      />

      {/* Top Profile Summary Header Card */}
      <View style={styles.topSummaryCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>

        <View style={styles.summaryInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {fullName || user?.fullName || 'Học viên Microlearning'}
          </Text>
          <Text style={styles.userPhone}>{phoneNumber || user?.phoneNumber || '09xxxxxx'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: `${roleColor}25`, borderColor: `${roleColor}60` }]}>
            <ShieldCheck color={roleColor} size={12} />
            <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Real Streak Flame Badge */}
        <View style={styles.streakBadge}>
          <Flame color="#F59E0B" size={20} fill="#F59E0B" />
          <Text style={styles.streakCountText}>{streakInfo?.currentStreak ?? 0}</Text>
          <Text style={styles.streakLabelText}>Streak</Text>
        </View>
      </View>

      {/* Banner Studio Dành cho Giáo viên & Admin */}
      {(isTeacher || isAdmin) && (
        <View style={styles.profileStudioContainer}>
          <TouchableOpacity
            style={styles.profileStudioBtn}
            onPress={() => setIsStudioOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.profileStudioLeft}>
              <View style={styles.profileStudioIconBox}>
                <Layers color="#6366F1" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileStudioTitle}>Studio Quản Lý Khóa Học</Text>
                <Text style={styles.profileStudioSub}>Tạo, sửa bài giảng & quản lý nội dung</Text>
              </View>
            </View>
            <ChevronRight color="#818CF8" size={18} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.profileStudioBtn, styles.profileAdminBtn]}
              onPress={() => setIsAdminUsersOpen(true)}
              activeOpacity={0.8}
            >
              <View style={styles.profileStudioLeft}>
                <View style={[styles.profileStudioIconBox, styles.profileAdminIconBox]}>
                  <ShieldCheck color="#EF4444" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileStudioTitle}>Quản Trị Người Dùng (Admin)</Text>
                  <Text style={styles.profileStudioSub}>Phân quyền, khóa tài khoản & đổi mật khẩu</Text>
                </View>
              </View>
              <ChevronRight color="#EF4444" size={18} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Navigation 3 Tabs matching Web */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PROGRESS' && styles.tabItemActive]}
          onPress={() => setActiveTab('PROGRESS')}
          activeOpacity={0.7}
        >
          <TrendingUp color={activeTab === 'PROGRESS' ? '#6366F1' : '#64748B'} size={16} />
          <Text style={[styles.tabText, activeTab === 'PROGRESS' && styles.tabTextActive]}>
            Tiến độ học
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'INFO' && styles.tabItemActive]}
          onPress={() => setActiveTab('INFO')}
          activeOpacity={0.7}
        >
          <UserIcon color={activeTab === 'INFO' ? '#6366F1' : '#64748B'} size={16} />
          <Text style={[styles.tabText, activeTab === 'INFO' && styles.tabTextActive]}>
            Thông tin
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PASSWORD' && styles.tabItemActive]}
          onPress={() => setActiveTab('PASSWORD')}
          activeOpacity={0.7}
        >
          <KeyRound color={activeTab === 'PASSWORD' ? '#6366F1' : '#64748B'} size={16} />
          <Text style={[styles.tabText, activeTab === 'PASSWORD' && styles.tabTextActive]}>
            Bảo mật
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* ==================== TAB 1: TIẾN ĐỘ HỌC TẬP ==================== */}
        {activeTab === 'PROGRESS' && (
          <View style={styles.tabContent}>
            {/* Grid 4 Chỉ số */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <BookOpen color="#818CF8" size={20} />
                <Text style={styles.statNumber}>{stats?.totalEnrolledCourses || courseProgressList.length || 0}</Text>
                <Text style={styles.statLabel}>Khóa tham gia</Text>
              </View>

              <View style={styles.statCard}>
                <CheckCircle2 color="#10B981" size={20} />
                <Text style={styles.statNumber}>{stats?.completedLessonsCount || 0}</Text>
                <Text style={styles.statLabel}>Bài hoàn thành</Text>
              </View>

              <View style={styles.statCard}>
                <Clock color="#38BDF8" size={20} />
                <Text style={styles.statNumber}>{stats?.totalStudyTimeMinutes || 0}p</Text>
                <Text style={styles.statLabel}>Thời gian học</Text>
              </View>

              <View style={styles.statCard}>
                <Percent color="#F59E0B" size={20} />
                <Text style={styles.statNumber}>{stats?.averageProgressPercent || 0}%</Text>
                <Text style={styles.statLabel}>Tiến độ TB</Text>
              </View>
            </View>

            {/* Streak Motivation Banner */}
            <View style={styles.streakBanner}>
              <Flame color="#F59E0B" size={28} fill="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.streakBannerTitle}>
                  {streakInfo?.currentStreak && streakInfo.currentStreak > 0
                    ? `Chuỗi ${streakInfo.currentStreak} ngày học liên tục!`
                    : 'Bắt đầu chuỗi học tập ngay!'}
                </Text>
                <Text style={styles.streakBannerSub}>
                  {streakInfo?.message || 'Mỗi ngày hoàn thành 1 bài học để duy trì thói quen tiến bộ.'}
                </Text>
              </View>
            </View>

            {/* Hub Tiện Ích: Ôn Câu Sai • Mốc Đánh Dấu • Môn Yêu Thích */}
            <View style={styles.quickAccessRow}>
              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => setIsMistakesOpen(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <HelpCircle color="#F59E0B" size={18} />
                </View>
                <Text style={styles.quickCardTitle}>Ôn Câu Sai</Text>
                <Text style={styles.quickCardSub}>Sổ tay câu hỏi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => setIsBookmarksOpen(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Bookmark color="#818CF8" size={18} />
                </View>
                <Text style={styles.quickCardTitle}>Đánh Dấu</Text>
                <Text style={styles.quickCardSub}>Mốc video đã lưu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => setIsFavoritesOpen(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <Heart color="#EC4899" size={18} fill="#EC4899" />
                </View>
                <Text style={styles.quickCardTitle}>Yêu Thích</Text>
                <Text style={styles.quickCardSub}>Môn học đã thích</Text>
              </TouchableOpacity>
            </View>

            {/* Danh sách Khóa Học Đang Học */}
            <Text style={styles.sectionHeaderTitle}>Khóa học đang học</Text>

            {courseProgressList.length === 0 ? (
              <View style={styles.emptyCard}>
                <BookOpen color="#475569" size={32} />
                <Text style={styles.emptyText}>Chưa có tiến độ khóa học nào.</Text>
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => router.push('/(tabs)/catalog')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.exploreBtnText}>Khám phá bài giảng ngay</Text>
                </TouchableOpacity>
              </View>
            ) : (
              courseProgressList.map((cp) => (
                <TouchableOpacity
                  key={cp.courseId}
                  style={styles.courseProgressCard}
                  onPress={() => router.push(`/course/${cp.courseId}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.courseProgressTop}>
                    <Text style={styles.courseProgressTitle} numberOfLines={1}>
                      {cp.courseTitle}
                    </Text>
                    <Text style={styles.courseProgressPercent}>{cp.progressPercent}%</Text>
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${cp.progressPercent}%` }]} />
                  </View>

                  <View style={styles.courseProgressBottom}>
                    <Text style={styles.courseProgressCount}>
                      {cp.completedLessons}/{cp.totalLessons} bài học
                    </Text>
                    <View style={styles.continueRow}>
                      <Text style={styles.continueText}>Học tiếp</Text>
                      <ChevronRight color="#6366F1" size={14} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ==================== TAB 2: THÔNG TIN CÁ NHÂN ==================== */}
        {activeTab === 'INFO' && (
          <View style={styles.tabContent}>
            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>Cập nhật thông tin tài khoản</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập họ và tên..."
                  placeholderTextColor="#64748B"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputDisabled]}
                  value={phoneNumber}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tiểu sử / Giới thiệu</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Chia sẻ mục tiêu học tập của bạn..."
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={3}
                  value={bio}
                  onChangeText={setBio}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.8}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Save color="#FFFFFF" size={18} />
                    <Text style={styles.primaryActionText}>Lưu Thay Đổi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================== TAB 3: BẢO MẬT & ĐỔI MẬT KHẨU ==================== */}
        {activeTab === 'PASSWORD' && (
          <View style={styles.tabContent}>
            {!isForgotFlow ? (
              /* ĐỔI MẬT KHẨU THƯỜNG */
              <View style={styles.formCard}>
                <Text style={styles.formSectionTitle}>Đổi mật khẩu tài khoản</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập mật khẩu đang dùng..."
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mật khẩu mới (tối thiểu 6 ký tự)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Mật khẩu mới..."
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập lại mật khẩu mới..."
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                  activeOpacity={0.8}
                >
                  {changingPassword ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Lock color="#FFFFFF" size={18} />
                      <Text style={styles.primaryActionText}>Cập Nhật Mật Khẩu</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotPassLink}
                  onPress={() => {
                    setIsForgotFlow(true);
                    setForgotStep('SEND_OTP');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPassLinkText}>Quên mật khẩu? Lấy lại bằng OTP SĐT</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* LUỒNG QUÊN MẬT KHẨU QUA OTP */
              <View style={styles.formCard}>
                <View style={styles.forgotHeaderRow}>
                  <Text style={styles.formSectionTitle}>Khôi phục mật khẩu bằng OTP</Text>
                  <TouchableOpacity onPress={() => setIsForgotFlow(false)}>
                    <Text style={{ color: '#818CF8', fontSize: 13, fontWeight: '600' }}>Quay lại</Text>
                  </TouchableOpacity>
                </View>

                {forgotStep === 'SEND_OTP' && (
                  <>
                    <Text style={styles.forgotDesc}>
                      Hệ thống sẽ gửi mã OTP đến số điện thoại {phoneNumber || user?.phoneNumber} để xác nhận danh tính của bạn.
                    </Text>

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handleSendForgotOtp}
                      disabled={forgotLoading}
                      activeOpacity={0.8}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryActionText}>Gửi Mã OTP Xác Thực</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {forgotStep === 'VERIFY_OTP' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nhập mã OTP vừa nhận</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Mã 6 số..."
                        placeholderTextColor="#64748B"
                        value={forgotOtp}
                        onChangeText={setForgotOtp}
                        keyboardType="number-pad"
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handleVerifyForgotOtp}
                      disabled={forgotLoading}
                      activeOpacity={0.8}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryActionText}>Xác Nhận Mã OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {forgotStep === 'RESET_PASS' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Tối thiểu 6 ký tự..."
                        placeholderTextColor="#64748B"
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nhập lại mật khẩu mới</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Xác nhận lại..."
                        placeholderTextColor="#64748B"
                        secureTextEntry
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={handleResetPassword}
                      disabled={forgotLoading}
                      activeOpacity={0.8}
                    >
                      {forgotLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryActionText}>Đặt Lại Mật Khẩu</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Nút Đăng Xuất An Toàn Luôn Hiển Thị Cho Mọi Tab */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut color="#EF4444" size={18} />
          <Text style={styles.logoutBtnText}>Đăng Xuất Tài Khoản</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals Ôn Câu Sai • Đánh Dấu • Môn Yêu Thích */}
      <MistakeVaultModal
        visible={isMistakesOpen}
        onClose={() => setIsMistakesOpen(false)}
      />

      <BookmarkLibraryModal
        visible={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
      />

      <FavoriteSubjectsModal
        visible={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
      />

      {/* Studio & Admin Modals */}
      <CourseManagementModal
        visible={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
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
  topSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090D1A',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryInfo: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  userPhone: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  streakBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakCountText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  streakLabelText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#090D1A',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  tabText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#090D1A',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  streakBannerTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
  },
  streakBannerSub: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  sectionHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#090D1A',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  exploreBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  courseProgressCard: {
    backgroundColor: '#090D1A',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  courseProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseProgressTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  courseProgressPercent: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  courseProgressBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseProgressCount: {
    color: '#64748B',
    fontSize: 11,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  continueText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#090D1A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  formSectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    color: '#F8FAFC',
    fontSize: 14,
  },
  textInputDisabled: {
    opacity: 0.6,
    backgroundColor: '#05070F',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 48,
    gap: 8,
    marginTop: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  forgotPassLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  forgotPassLinkText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  forgotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  forgotDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    height: 48,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    alignItems: 'center',
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickCardTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickCardSub: {
    color: '#64748B',
    fontSize: 10,
  },
  profileStudioContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  profileStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    padding: 12,
  },
  profileAdminBtn: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  profileStudioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  profileStudioIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAdminIconBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  profileStudioTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  profileStudioSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
});
