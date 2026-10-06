import type { UserProfile, UserLearningStats, CourseLearningProgress } from '../types/userProfile.types';
import type { Course, CourseDetail, Enrollment } from '../types/catalog.types';
import { SAMPLE_COURSES } from './sampleCatalogData';
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
   * Hỗ trợ nhận trực tiếp danh sách Enrollment thực tế từ API để đồng bộ 100% dữ liệu khóa học.
   */
  calculateLearningStats(
    enrolledOrCourses: CourseDetail[] | Enrollment[],
    enrolledIdsOrAllCourses: number[] | Array<Course | CourseDetail>,
    completedLessonIds: number[]
  ): {
    stats: UserLearningStats;
    courseList: CourseLearningProgress[];
  } {
    const isEnrollmentList =
      Array.isArray(enrolledOrCourses) &&
      enrolledOrCourses.length > 0 &&
      'overallProgressPercent' in enrolledOrCourses[0];

    let courseList: CourseLearningProgress[] = [];
    let totalWatchMinutes = 0;
    let completedLessonsInEnrolled = 0;

    if (isEnrollmentList) {
      const enrollments = enrolledOrCourses as Enrollment[];
      const catalogCourses = (enrolledIdsOrAllCourses as Array<Course | CourseDetail>) || [];

      courseList = enrollments.map((enr) => {
        const foundCourse =
          catalogCourses.find((c) => c.id === enr.courseId) ||
          SAMPLE_COURSES.find((c) => c.id === enr.courseId);

        let courseTotalLessons = 0;
        let courseCompletedLessons = 0;

        const subjects = (foundCourse as CourseDetail)?.subjects;
        if (subjects && subjects.length > 0) {
          subjects.forEach((subj) => {
            subj.lessons?.forEach((lesson) => {
              courseTotalLessons += 1;
              const lessonDuration = Math.round((lesson.durationSeconds || 300) / 60) || 5;
              if (completedLessonIds.includes(lesson.id)) {
                courseCompletedLessons += 1;
                totalWatchMinutes += lessonDuration;
              }
            });
          });
        }

        const serverPercent = Number(enr.overallProgressPercent) || 0;

        // Nếu không có môn học chi tiết, suy diễn từ số bài và % của server
        if (courseTotalLessons === 0) {
          courseTotalLessons = Math.max(1, (foundCourse?.totalSubjects || 1) * 3);
        }

        // Tiến độ % ưu tiên giá trị thực tế max giữa server và client
        let progressPercent = serverPercent;
        if (courseCompletedLessons > 0 && courseTotalLessons > 0) {
          const clientPercent = Math.min(100, Math.round((courseCompletedLessons / courseTotalLessons) * 100));
          progressPercent = Math.max(serverPercent, clientPercent);
        } else if (serverPercent > 0 && courseTotalLessons > 0) {
          courseCompletedLessons = Math.min(
            courseTotalLessons,
            Math.max(1, Math.round((serverPercent / 100) * courseTotalLessons))
          );
          totalWatchMinutes += courseCompletedLessons * 5;
        }

        completedLessonsInEnrolled += courseCompletedLessons;

        return {
          courseId: enr.courseId,
          courseTitle: enr.courseTitle || foundCourse?.title || `Khóa học #${enr.courseId}`,
          courseThumbnail:
            enr.courseThumbnail ||
            foundCourse?.thumbnailUrl ||
            'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
          author: 'Đội ngũ Giảng viên MicroLearning',
          category: 'Kỹ năng số',
          progressPercent,
          completedLessons: courseCompletedLessons,
          totalLessons: courseTotalLessons,
          lastAccessedAt: enr.enrolledAt || new Date().toISOString(),
        };
      });
    } else {
      // Nhánh dự phòng theo mảng CourseDetail[]
      const allCourses = (enrolledOrCourses as CourseDetail[]) || [];
      const enrolledCourseIds = (enrolledIdsOrAllCourses as number[]) || [];
      const userCourses = allCourses.filter((c) => enrolledCourseIds.includes(c.id));

      courseList = userCourses.map((course) => {
        let courseTotalLessons = 0;
        let courseCompletedLessons = 0;

        course.subjects?.forEach((subject) => {
          subject.lessons?.forEach((lesson) => {
            courseTotalLessons += 1;
            const duration = Math.round((lesson.durationSeconds || 300) / 60) || 5;

            if (completedLessonIds.includes(lesson.id)) {
              courseCompletedLessons += 1;
              totalWatchMinutes += duration;
            }
          });
        });

        if (courseTotalLessons === 0) courseTotalLessons = 1;

        const progressPercent =
          courseCompletedLessons > 0
            ? Math.min(100, Math.round((courseCompletedLessons / courseTotalLessons) * 100))
            : 0;

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
          lastAccessedAt: new Date().toISOString(),
        };
      });
    }

    // 2. Tính Tỉ lệ học trung bình (%)
    const averageProgressPercent =
      courseList.length > 0
        ? Math.round(courseList.reduce((acc, curr) => acc + curr.progressPercent, 0) / courseList.length)
        : 0;

    // 3. Tính % làm đúng câu hỏi trắc nghiệm (% accuracy) thực tế
    let quizAccuracyPercent = 0;
    try {
      const storedResults = localStorage.getItem('microlearning_quiz_results');
      if (storedResults) {
        const parsed = JSON.parse(storedResults);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sum = parsed.reduce((acc: number, item: { score?: number }) => acc + (item.score || 0), 0);
          quizAccuracyPercent = Math.round(sum / parsed.length);
        }
      }
    } catch {
      quizAccuracyPercent = 0;
    }

    const totalBookmarks = mediaBookmarkService.getAllBookmarksCount();

    const stats: UserLearningStats = {
      averageProgressPercent,
      totalStudyTimeMinutes: totalWatchMinutes,
      quizAccuracyPercent,
      totalEnrolledCourses: courseList.length,
      completedLessonsCount: completedLessonsInEnrolled,
      totalBookmarksCount: totalBookmarks,
    };

    return { stats, courseList };
  },
};
