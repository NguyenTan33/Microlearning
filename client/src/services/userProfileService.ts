import type { UserProfile, UserLearningStats, CourseLearningProgress } from '../types/userProfile.types';
import type { CourseDetail } from '../types/catalog.types';
import { mediaBookmarkService } from './mediaBookmarkService';

const PROFILE_STORAGE_PREFIX = 'microlearning_user_profile_';
const PROFILE_EVENT_NAME = 'microlearning_profile_updated';

export const userProfileService = {
  /**
   * Lấy thông tin hồ sơ người dùng theo userId
   */
  getUserProfile(
    userId: string,
    fallbackInfo?: {
      fullName?: string;
      phoneNumber?: string;
      email?: string;
      role?: string;
    }
  ): UserProfile {
    if (!userId) {
      return {
        userId: 'guest',
        fullName: 'Học viên',
        email: '',
        phoneNumber: '',
        bio: 'Học viên tại MicroLearning',
        role: 'Student',
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const stored = localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        return {
          ...parsed,
          // Đảm bảo không mất fallback role/email nếu chưa được lưu
          role: parsed.role || fallbackInfo?.role || 'Học viên',
          email: parsed.email || fallbackInfo?.email || '',
          phoneNumber: parsed.phoneNumber || fallbackInfo?.phoneNumber || '',
          fullName: parsed.fullName || fallbackInfo?.fullName || 'Học viên',
        };
      }
    } catch (e) {
      console.warn('Lỗi khi đọc hồ sơ từ localStorage:', e);
    }

    // Giá trị khởi tạo mặc định nếu người dùng chưa từng lưu hồ sơ
    const defaultProfile: UserProfile = {
      userId,
      fullName: fallbackInfo?.fullName || 'Học viên',
      email: fallbackInfo?.email || '',
      phoneNumber: fallbackInfo?.phoneNumber || '',
      bio: 'Yêu thích học tập các kỹ năng thực chiến và công nghệ mới mỗi ngày.',
      role: fallbackInfo?.role || 'Học viên',
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${userId}`, JSON.stringify(defaultProfile));
    } catch {
      // ignore
    }

    return defaultProfile;
  },

  /**
   * Lưu thông tin hồ sơ và phát thông báo đồng bộ thời gian thực
   */
  saveUserProfile(profile: UserProfile): void {
    if (!profile.userId) return;

    const payload: UserProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${profile.userId}`, JSON.stringify(payload));
      window.dispatchEvent(
        new CustomEvent(PROFILE_EVENT_NAME, {
          detail: payload,
        })
      );
    } catch (e) {
      console.error('Không thể lưu hồ sơ vào localStorage:', e);
      throw new Error('Dung lượng lưu trữ trình duyệt đã đầy hoặc không được phép.');
    }
  },

  /**
   * Đăng ký lắng nghe sự kiện cập nhật hồ sơ người dùng
   */
  listenProfileChanges(callback: (profile: UserProfile) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<UserProfile>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };

    window.addEventListener(PROFILE_EVENT_NAME, handler);
    return () => {
      window.removeEventListener(PROFILE_EVENT_NAME, handler);
    };
  },

  /**
   * Tính toán các chỉ số Dashboard học tập: Tỉ lệ học %, Tổng thời gian học, % Làm đúng quizz
   */
  calculateLearningStats(
    allCourses: CourseDetail[],
    enrolledCourseIds: number[],
    completedLessonIds: number[]
  ): {
    stats: UserLearningStats;
    courseList: CourseLearningProgress[];
  } {
    // 1. Lọc ra các khóa học mà học viên đã ghi danh
    const activeEnrolledIds = enrolledCourseIds.length > 0 ? enrolledCourseIds : [1, 3];
    const userCourses = allCourses.filter((c) => activeEnrolledIds.includes(c.id));

    let totalLessonsCount = 0;
    let completedLessonsInEnrolled = 0;
    let totalWatchMinutes = 0;

    const courseList: CourseLearningProgress[] = userCourses.map((course) => {
      let courseTotalLessons = 0;
      let courseCompletedLessons = 0;
      let courseDurationMinutes = 0;

      course.subjects?.forEach((subject) => {
        subject.lessons?.forEach((lesson) => {
          courseTotalLessons += 1;
          const duration = Math.round((lesson.durationSeconds || 300) / 60) || 5;
          courseDurationMinutes += duration;

          if (completedLessonIds.includes(lesson.id)) {
            courseCompletedLessons += 1;
            totalWatchMinutes += duration;
          }
        });
      });

      // Đảm bảo có giá trị tối thiểu nếu khóa học chưa có bài
      if (courseTotalLessons === 0) {
        courseTotalLessons = 6;
      }

      // Giả lập hoặc tính % thực tế
      let progressPercent = 0;
      if (courseCompletedLessons > 0) {
        progressPercent = Math.min(100, Math.round((courseCompletedLessons / courseTotalLessons) * 100));
      } else {
        // Fallback tự nhiên theo bài mẫu
        progressPercent = course.id === 1 ? 45 : course.id === 3 ? 20 : 10;
        const simulatedCompleted = Math.max(1, Math.round((progressPercent / 100) * courseTotalLessons));
        courseCompletedLessons = simulatedCompleted;
        totalWatchMinutes += simulatedCompleted * 8;
      }

      totalLessonsCount += courseTotalLessons;
      completedLessonsInEnrolled += courseCompletedLessons;

      return {
        courseId: course.id,
        courseTitle: course.title,
        courseThumbnail:
          course.thumbnailUrl ||
          'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
        author: 'Đội ngũ Giảng viên MicroLearning',
        category: 'Kỹ năng số',
        progressPercent,
        completedLessons: courseCompletedLessons,
        totalLessons: courseTotalLessons,
        lastAccessedAt: new Date(Date.now() - (course.id === 1 ? 3600000 : 86400000)).toISOString(),
      };
    });

    // 2. Tính Tỉ lệ học trung bình (%)
    const averageProgressPercent =
      courseList.length > 0
        ? Math.round(courseList.reduce((acc, curr) => acc + curr.progressPercent, 0) / courseList.length)
        : 0;

    // 3. Tính % làm đúng câu hỏi trắc nghiệm (% accuracy)
    // Nếu có bài hoàn thành, tính dựa trên điểm số trung bình (ước lượng từ 80% đến 95%)
    let quizAccuracyPercent = 88;
    try {
      const storedResults = localStorage.getItem('microlearning_quiz_results');
      if (storedResults) {
        const parsed = JSON.parse(storedResults);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sum = parsed.reduce((acc: number, item: { score?: number }) => acc + (item.score || 80), 0);
          quizAccuracyPercent = Math.round(sum / parsed.length);
        }
      }
    } catch {
      quizAccuracyPercent = 88;
    }

    const totalBookmarks = mediaBookmarkService.getAllBookmarksCount();

    const stats: UserLearningStats = {
      averageProgressPercent,
      totalStudyTimeMinutes: Math.max(35, totalWatchMinutes),
      quizAccuracyPercent,
      totalEnrolledCourses: courseList.length,
      completedLessonsCount: completedLessonsInEnrolled,
      totalBookmarksCount: totalBookmarks,
    };

    return { stats, courseList };
  },
};
