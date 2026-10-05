import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  User,
  BarChart3,
  KeyRound,
  Upload,
  Camera,
  Trash2,
  Clock,
  Award,
  BookOpen,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Phone,
  Mail,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { UserProfile, UserLearningStats, CourseLearningProgress } from '../../types/userProfile.types';
import type { CourseDetail } from '../../types/catalog.types';
import type { UserTokenPayload } from '../../utils/tokenHelper';
import { userProfileService } from '../../services/userProfileService';
import { authApi } from '../../services/authApi';
import { enrollmentApi } from '../../services/enrollmentApi';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserTokenPayload | null;
  allCourses: CourseDetail[];
  completedLessonIds: number[];
  onSelectCourse: (courseId: number) => void;
  onProfileUpdated?: (profile: UserProfile) => void;
}

type ActiveTab = 'PROGRESS' | 'INFO' | 'PASSWORD';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allCourses,
  completedLessonIds,
  onSelectCourse,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('PROGRESS');

  // Hồ sơ người dùng
  const [profile, setProfile] = useState<UserProfile>(() =>
    userProfileService.getUserProfile(currentUser?.userId || '', {
      fullName: currentUser?.displayName,
      phoneNumber: currentUser?.phoneNumber,
      email: currentUser?.email,
      role: currentUser?.isAdmin ? 'Quản trị viên' : currentUser?.isTeacher ? 'Giáo viên' : 'Học viên',
    })
  );

  // Thống kê tiến độ học tập
  const [stats, setStats] = useState<UserLearningStats | null>(null);
  const [userCourseList, setUserCourseList] = useState<CourseLearningProgress[]>([]);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Form Thông tin cá nhân
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formBio, setFormBio] = useState<string>('');
  const [infoSuccessMsg, setInfoSuccessMsg] = useState<string | null>(null);
  const [infoErrorMsg, setInfoErrorMsg] = useState<string | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState<boolean>(false);

  // Form Đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Sub-flow Quên mật khẩu qua OTP ngay trong modal
  const [isForgotFlow, setIsForgotFlow] = useState<boolean>(false);
  const [forgotPhone, setForgotPhone] = useState<string>('');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotResetToken, setForgotResetToken] = useState<string>('');
  const [forgotStep, setForgotStep] = useState<'SEND_OTP' | 'VERIFY_OTP' | 'RESET_PASS'>('SEND_OTP');
  const [isForgotLoading, setIsForgotLoading] = useState<boolean>(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Ref cho upload ảnh avatar
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Đồng bộ profile ban đầu khi mở modal
  useEffect(() => {
    if (isOpen && currentUser) {
      const current = userProfileService.getUserProfile(currentUser.userId, {
        fullName: currentUser.displayName,
        phoneNumber: currentUser.phoneNumber,
        email: currentUser.email,
        role: currentUser.isAdmin ? 'Quản trị viên' : currentUser.isTeacher ? 'Giáo viên' : 'Học viên',
      });
      setProfile(current);
      setFormName(current.fullName);
      setFormEmail(current.email);
      setFormPhone(current.phoneNumber);
      setFormBio(current.bio);
      setForgotPhone(current.phoneNumber || currentUser.phoneNumber || '');

      // Tải dữ liệu các khóa học đã ghi danh để tính chỉ số
      setLoadingStats(true);
      enrollmentApi
        .getMyEnrollments()
        .then((enrolled) => {
          const enrolledIds = enrolled.map((e) => e.courseId);
          const { stats: calculatedStats, courseList } = userProfileService.calculateLearningStats(
            allCourses,
            enrolledIds,
            completedLessonIds
          );
          setStats(calculatedStats);
          setUserCourseList(courseList);
        })
        .catch(() => {
          const { stats: fallbackStats, courseList } = userProfileService.calculateLearningStats(
            allCourses,
            [1, 3],
            completedLessonIds
          );
          setStats(fallbackStats);
          setUserCourseList(courseList);
        })
        .finally(() => {
          setLoadingStats(false);
        });
    }
  }, [isOpen, currentUser, allCourses, completedLessonIds]);

  // Xử lý tải ảnh đại diện lên
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setInfoErrorMsg('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WebP, SVG).');
      return;
    }

    // Giới hạn 2MB cho data URL
    if (file.size > 2.5 * 1024 * 1024) {
      setInfoErrorMsg('Kích thước ảnh không được vượt quá 2.5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const updated = { ...profile, avatarUrl: base64Data };
      setProfile(updated);
      userProfileService.saveUserProfile(updated);
      onProfileUpdated?.(updated);
      setInfoSuccessMsg('Đã cập nhật ảnh đại diện thành công!');
      setTimeout(() => setInfoSuccessMsg(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  // Xóa avatar
  const handleRemoveAvatar = () => {
    const updated = { ...profile, avatarUrl: undefined };
    setProfile(updated);
    userProfileService.saveUserProfile(updated);
    onProfileUpdated?.(updated);
    setInfoSuccessMsg('Đã xóa ảnh đại diện, trở về hình ảnh mặc định.');
    setTimeout(() => setInfoSuccessMsg(null), 3000);
  };

  // Lưu thông tin cá nhân
  const handleSaveProfileInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoErrorMsg(null);
    setInfoSuccessMsg(null);

    if (!formName.trim()) {
      setInfoErrorMsg('Họ và tên không được để trống.');
      return;
    }

    setIsSavingInfo(true);
    try {
      const updated: UserProfile = {
        ...profile,
        fullName: formName.trim(),
        email: formEmail.trim(),
        phoneNumber: formPhone.trim(),
        bio: formBio.trim(),
      };

      userProfileService.saveUserProfile(updated);
      setProfile(updated);
      onProfileUpdated?.(updated);
      setInfoSuccessMsg('Thông tin cá nhân đã được lưu thành công!');
      setTimeout(() => setInfoSuccessMsg(null), 3500);
    } catch (err) {
      setInfoErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu thông tin.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    if (!currentPassword) {
      setPasswordErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      setPasswordSuccessMsg(res.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
    } catch (err) {
      setPasswordErrorMsg(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Xử lý gửi OTP cho Quên mật khẩu
  const handleForgotSendOtp = async () => {
    if (!forgotPhone.trim()) {
      setForgotError('Vui lòng nhập số điện thoại để nhận mã xác thực OTP.');
      return;
    }
    setForgotError(null);
    setIsForgotLoading(true);
    try {
      const res = await authApi.forgotPassword({ phoneNumber: forgotPhone.trim() });
      setForgotMsg(`Mã OTP đã được gửi đến ${forgotPhone}. (Mã thử nghiệm: ${res.otp || '123456'})`);
      setForgotStep('VERIFY_OTP');
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Gửi mã OTP thất bại.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Xử lý xác thực OTP Quên mật khẩu
  const handleForgotVerifyOtp = async () => {
    if (!forgotOtp.trim()) {
      setForgotError('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }
    setForgotError(null);
    setIsForgotLoading(true);
    try {
      const res = await authApi.verifyForgotPasswordOtp({
        phoneNumber: forgotPhone.trim(),
        otp: forgotOtp.trim(),
      });
      setForgotResetToken(res.resetToken);
      setForgotStep('RESET_PASS');
      setForgotMsg('Xác thực mã OTP thành công. Hãy nhập mật khẩu mới.');
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Đặt lại mật khẩu mới qua Quên mật khẩu
  const handleForgotResetPassword = async () => {
    if (newPassword.length < 6) {
      setForgotError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setForgotError(null);
    setIsForgotLoading(true);
    try {
      await authApi.resetPassword({
        phoneNumber: forgotPhone.trim(),
        resetToken: forgotResetToken,
        newPassword,
        confirmNewPassword,
      });
      setPasswordSuccessMsg('Khôi phục và đặt mật khẩu mới thành công! Bạn có thể sử dụng mật khẩu này.');
      setIsForgotFlow(false);
      setForgotStep('SEND_OTP');
      setForgotOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Chữ cái đại diện khi không có avatar
  const avatarInitials = useMemo(() => {
    const name = profile.fullName || currentUser?.displayName || 'User';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [profile.fullName, currentUser?.displayName]);

  // Chuyển đổi định dạng thời gian học (giờ và phút)
  const formattedStudyTime = useMemo(() => {
    const mins = stats?.totalStudyTimeMinutes || 0;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours > 0) {
      return `${hours} giờ ${remainMins > 0 ? `${remainMins} phút` : ''}`;
    }
    return `${remainMins} phút`;
  }, [stats?.totalStudyTimeMinutes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] bg-[#090D1C] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* =========================================================================
            HEADER MODAL: THÔNG TIN TÓM TẮT & NÚT ĐÓNG
        ========================================================================= */}
        <div className="p-3.5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 via-[#0C1226] to-slate-900/60 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            {/* Avatar góc trái */}
            <div className="relative group shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-md shadow-indigo-500/20"
                />
              ) : (
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1.5px] shadow-md shadow-indigo-500/20">
                  <div className="w-full h-full bg-[#0E1528] rounded-[14px] flex items-center justify-center text-cyan-300 font-bold text-sm sm:text-lg">
                    {avatarInitials}
                  </div>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-[#090D1C]" title="Đang trực tuyến" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-xl font-bold text-white tracking-tight truncate">
                  {profile.fullName || 'Học viên MicroLearning'}
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  {profile.role || 'Học viên'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
                {profile.email || profile.phoneNumber || 'Tài khoản thành viên'}
              </p>
            </div>
          </div>

          {/* Nút đóng */}
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            NAVIGATION TABS (GRID 3 CỘT: KHÔNG BAO GIỜ BỊ TRÀN HAY MẤT TÍCH TRÊN MOBILE)
        ========================================================================= */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-white/5 bg-[#080D1A]/80 shrink-0">
          <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 rounded-2xl bg-slate-900/90 border border-white/5">
            {/* Tab 1: Tiến độ học tập */}
            <button
              onClick={() => {
                setActiveTab('PROGRESS');
                setIsForgotFlow(false);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'PROGRESS'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Tiến độ</span>
                <span className="hidden sm:inline">Tiến độ học tập</span>
              </span>
            </button>

            {/* Tab 2: Thông tin cá nhân & Avatar */}
            <button
              onClick={() => {
                setActiveTab('INFO');
                setIsForgotFlow(false);
              }}
              className={`flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'INFO'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Hồ sơ &amp; Ảnh</span>
                <span className="hidden sm:inline">Thông tin &amp; Avatar</span>
              </span>
            </button>

            {/* Tab 3: Đổi mật khẩu - BẢO ĐẢM HIỂN THỊ RÕ RÀNG TRÊN MỌI MÀN HÌNH */}
            <button
              onClick={() => setActiveTab('PASSWORD')}
              className={`flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'PASSWORD'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Đổi MK</span>
                <span className="hidden sm:inline">Đổi mật khẩu</span>
              </span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            NỘI DUNG TỪNG TAB
        ========================================================================= */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 sm:space-y-6">
          {/* =====================================================================
              TAB 1: DASHBOARD TIẾN ĐỘ HỌC TẬP
          ===================================================================== */}
          {activeTab === 'PROGRESS' && (
            <div className="space-y-4 sm:space-y-6 animate-fadeIn">
              {/* 3 Thẻ chỉ số tổng quan chính: Tối ưu 3 cột trên cả mobile và desktop */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* 1. Tỉ lệ học (%) */}
                <div className="relative overflow-hidden p-2.5 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-900/40 via-indigo-950/20 to-slate-900/60 border border-indigo-500/30 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-indigo-300 truncate">Hoàn thành</span>
                    <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                      <Percent className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="mt-1.5 sm:mt-3 flex items-baseline gap-1">
                    <span className="text-lg sm:text-3xl font-extrabold text-white">
                      {loadingStats ? '--' : `${stats?.averageProgressPercent ?? 0}%`}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 hidden sm:block">
                    Dựa trên {stats?.totalEnrolledCourses || 0} khóa học đã đăng ký.
                  </p>
                </div>

                {/* 2. Tổng thời gian học */}
                <div className="relative overflow-hidden p-2.5 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-900/40 via-cyan-950/20 to-slate-900/60 border border-cyan-500/30 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-cyan-300 truncate">Thời gian học</span>
                    <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="mt-1.5 sm:mt-3 flex items-baseline gap-1">
                    <span className="text-sm sm:text-3xl font-extrabold text-white truncate">
                      {loadingStats ? '--' : formattedStudyTime}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 hidden sm:block">
                    Thời lượng tích lũy video đã theo dõi.
                  </p>
                </div>

                {/* 3. % Làm đúng trắc nghiệm */}
                <div className="relative overflow-hidden p-2.5 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-900/40 via-purple-950/20 to-slate-900/60 border border-purple-500/30 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-semibold text-purple-300 truncate">Đúng Quizz</span>
                    <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
                      <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="mt-1.5 sm:mt-3 flex items-baseline gap-1">
                    <span className="text-lg sm:text-3xl font-extrabold text-white">
                      {loadingStats ? '--' : `${stats?.quizAccuracyPercent ?? 0}%`}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 hidden sm:block">
                    Độ chính xác bài trắc nghiệm mini.
                  </p>
                </div>
              </div>

              {/* Chi tiết từng khóa học tham gia */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-white">Khóa học đã tham gia</h3>
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-400">
                    {userCourseList.length} khóa học
                  </span>
                </div>

                {userCourseList.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-white/5 bg-slate-900/40 text-slate-400 text-xs">
                    Bạn chưa ghi danh khóa học nào. Hãy quay lại mục Khám phá Khóa học để bắt đầu học ngay!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                    {userCourseList.map((c) => (
                      <div
                        key={c.courseId}
                        className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/70 border border-white/10 hover:border-indigo-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group"
                      >
                        {/* Thông tin khóa học */}
                        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                          <img
                            src={c.courseThumbnail}
                            alt={c.courseTitle}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-white/10 shadow"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-white/5 text-slate-300 border border-white/5">
                              {c.category}
                            </span>
                            <h4 className="text-xs sm:text-base font-bold text-white truncate mt-0.5 group-hover:text-cyan-300 transition-colors">
                              {c.courseTitle}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                              Giảng viên: {c.author}
                            </p>
                          </div>
                        </div>

                        {/* Thanh tiến độ & nút Tiếp tục học */}
                        <div className="flex items-center gap-3 w-full sm:w-72 shrink-0">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 text-[10px] sm:text-[11px]">
                                {c.completedLessons}/{c.totalLessons} bài hoàn thành
                              </span>
                              <span className="font-bold text-cyan-300 text-xs">
                                {c.progressPercent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                                style={{ width: `${c.progressPercent}%` }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              onSelectCourse(c.courseId);
                              onClose();
                            }}
                            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30 shrink-0"
                            title="Vào phòng học ngay"
                          >
                            <span>Học ngay</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 2: THÔNG TIN CÁ NHÂN & TẢI AVATAR LÊN
          ===================================================================== */}
          {activeTab === 'INFO' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Thông báo trạng thái */}
              {infoSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{infoSuccessMsg}</span>
                </div>
              )}
              {infoErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{infoErrorMsg}</span>
                </div>
              )}

              {/* Khu vực Upload Avatar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500/40 shadow-xl shadow-indigo-500/20"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[3px] shadow-xl shadow-indigo-500/20">
                      <div className="w-full h-full bg-[#0E1528] rounded-full flex items-center justify-center text-cyan-300 font-extrabold text-2xl">
                        {avatarInitials}
                      </div>
                    </div>
                  )}

                  {/* Nút camera nhỏ trên avatar */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer border-2 border-[#090D1C] transition-transform active:scale-90"
                    title="Thay đổi ảnh đại diện"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h4 className="text-sm font-bold text-white">Ảnh đại diện tài khoản</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tải lên ảnh chân dung sắc nét để hiển thị trên hệ thống phòng học và bài thảo luận. Định dạng PNG, JPG, WebP tối đa 2.5 MB.
                  </p>

                  {/* Input tệp ẩn */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Chọn ảnh mới</span>
                    </button>

                    {profile.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 border border-white/10 text-slate-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa ảnh</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form thông tin cá nhân */}
              <form onSubmit={handleSaveProfileInfo} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Họ và tên hiển thị <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Nhập họ và tên đầy đủ..."
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Số điện thoại đăng nhập
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Vai trò trên hệ thống
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={profile.role || 'Học viên'}
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/5 text-xs text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mục tiêu &amp; Giới thiệu bản thân (Bio)
                  </label>
                  <textarea
                    rows={3}
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    placeholder="Chia sẻ về sở thích công nghệ, mục tiêu học tập của bạn..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingInfo}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isSavingInfo ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Lưu thay đổi hồ sơ</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =====================================================================
              TAB 3: ĐỔI MẬT KHẨU (KÈM NÚT QUÊN MẬT KHẨU NHỎ & SUB-FLOW OTP)
          ===================================================================== */}
          {activeTab === 'PASSWORD' && (
            <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
              {/* Thông báo trạng thái */}
              {passwordSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}
              {passwordErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              {/* TRƯỜNG HỢP 1: FORM ĐỔI MẬT KHẨU THƯỜNG */}
              {!isForgotFlow ? (
                <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 sm:space-y-4">
                  {/* Trường: Mật khẩu hiện tại */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Mật khẩu hiện tại <span className="text-rose-400">*</span>
                      </label>
                      {/* NÚT QUÊN MẬT KHẨU NHỎ ĐƯỢC TỐI ƯU CẢM ỨNG MOBILE */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotFlow(true);
                          setForgotStep('SEND_OTP');
                          setPasswordErrorMsg(null);
                          setForgotError(null);
                          setForgotMsg(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[11px] sm:text-xs font-semibold text-indigo-300 hover:text-white active:text-cyan-300 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                        title="Khôi phục mật khẩu qua số điện thoại"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>Quên mật khẩu?</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại..."
                        required
                        className="w-full pl-3.5 pr-10 py-2.5 sm:py-2.5 rounded-xl bg-slate-900/90 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm sm:text-xs text-white placeholder-slate-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Trường: Mật khẩu mới */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mật khẩu mới <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự..."
                        required
                        minLength={6}
                        className="w-full pl-3.5 pr-10 py-2.5 sm:py-2.5 rounded-xl bg-slate-900/90 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm sm:text-xs text-white placeholder-slate-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Trường: Xác nhận mật khẩu mới */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Xác nhận mật khẩu mới <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới..."
                        required
                        className="w-full pl-3.5 pr-10 py-2.5 sm:py-2.5 rounded-xl bg-slate-900/90 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm sm:text-xs text-white placeholder-slate-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="w-full py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm sm:text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isChangingPassword ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      <span>Cập nhật mật khẩu mới</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* TRƯỜNG HỢP 2: SUB-FLOW KHÔI PHỤC KHI QUÊN MẬT KHẨU BẰNG OTP */
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Khôi phục mật khẩu qua mã OTP
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsForgotFlow(false)}
                      className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Quay lại đổi mật khẩu
                    </button>
                  </div>

                  {forgotMsg && (
                    <div className="p-3 rounded-xl bg-indigo-950/90 border border-indigo-500/40 text-cyan-300 text-xs">
                      {forgotMsg}
                    </div>
                  )}
                  {forgotError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
                      {forgotError}
                    </div>
                  )}

                  {/* Bước 1: Gửi mã OTP */}
                  {forgotStep === 'SEND_OTP' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Nhập số điện thoại tài khoản của bạn để nhận mã OTP khôi phục mật khẩu.
                      </p>
                      <input
                        type="text"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        placeholder="Nhập số điện thoại đăng ký..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleForgotSendOtp}
                        disabled={isForgotLoading}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isForgotLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        <span>Gửi mã OTP xác thực</span>
                      </button>
                    </div>
                  )}

                  {/* Bước 2: Xác nhận mã OTP */}
                  {forgotStep === 'VERIFY_OTP' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300">
                        Nhập mã 6 chữ số đã được gửi đến số điện thoại <strong className="text-cyan-300">{forgotPhone}</strong>:
                      </p>
                      <input
                        type="text"
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full text-center tracking-widest text-base font-bold px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleForgotVerifyOtp}
                        disabled={isForgotLoading}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isForgotLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        <span>Xác nhận mã OTP</span>
                      </button>
                    </div>
                  )}

                  {/* Bước 3: Đặt lại mật khẩu mới */}
                  {forgotStep === 'RESET_PASS' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300">
                        Đặt mật khẩu mới cho tài khoản:
                      </p>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Xác nhận lại mật khẩu mới..."
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleForgotResetPassword}
                        disabled={isForgotLoading}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isForgotLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        <span>Hoàn tất đặt lại mật khẩu</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
