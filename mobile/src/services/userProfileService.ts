import { secureStorage } from '../utils/secureStorage';
import type { UserProfile, UserLearningStats, CourseLearningProgress } from '../types/userProfile.types';
import type { CourseDetail } from '../types/catalog.types';

const PROFILE_KEY_PREFIX = 'microlearning_user_profile_';

export const userProfileService = {
  async getUserProfile(
    userId: string,
    fallback?: {
      fullName?: string;
      phoneNumber?: string;
      email?: string;
      role?: string;
    }
  ): Promise<UserProfile> {
    try {
      const raw = await secureStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as UserProfile;
        return {
          ...parsed,
          fullName: parsed.fullName || fallback?.fullName || 'Học viên',
          email: parsed.email || fallback?.email || '',
          phoneNumber: parsed.phoneNumber || fallback?.phoneNumber || '',
          role: parsed.role || fallback?.role || 'Học viên',
        };
      }
    } catch {
      // fallback
    }

    return {
      userId,
      fullName: fallback?.fullName || 'Học viên',
      email: fallback?.email || '',
      phoneNumber: fallback?.phoneNumber || '',
      bio: 'Yêu thích học tập các kỹ năng thực chiến và công nghệ mới mỗi ngày.',
      role: fallback?.role || 'Học viên',
      updatedAt: new Date().toISOString(),
    };
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    try {
      profile.updatedAt = new Date().toISOString();
      await secureStorage.setItem(`${PROFILE_KEY_PREFIX}${profile.userId}`, JSON.stringify(profile));
    } catch (err) {
      console.warn('[userProfileService] Save error:', err);
    }
  },

  calculateStats(
    courses: CourseDetail[],
    completedLessonIds: number[]
  ): { stats: UserLearningStats; courseProgressList: CourseLearningProgress[] } {
    const completedSet = new Set(completedLessonIds);
    let totalCompleted = 0;
    let totalLessonsCount = 0;
    let totalDurationSeconds = 0;

    const courseProgressList: CourseLearningProgress[] = courses.map((course) => {
      let courseTotalLessons = 0;
      let courseDoneLessons = 0;

      if (course.subjects && Array.isArray(course.subjects)) {
        for (const sub of course.subjects) {
          if (sub.lessons && Array.isArray(sub.lessons)) {
            for (const les of sub.lessons) {
              courseTotalLessons++;
              totalLessonsCount++;
              if (completedSet.has(les.id)) {
                courseDoneLessons++;
                totalCompleted++;
                totalDurationSeconds += les.durationSeconds || 180;
              }
            }
          }
        }
      }

      const percent = courseTotalLessons > 0 ? Math.round((courseDoneLessons / courseTotalLessons) * 100) : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        courseThumbnail: course.thumbnailUrl || '',
        author: course.authorName || 'Microlearning',
        category: course.category || 'Công nghệ',
        progressPercent: percent,
        completedLessons: courseDoneLessons,
        totalLessons: courseTotalLessons,
        lastAccessedAt: new Date().toISOString(),
      };
    });

    const avgPercent =
      courses.length > 0
        ? Math.round(courseProgressList.reduce((acc, c) => acc + c.progressPercent, 0) / courses.length)
        : 0;

    const stats: UserLearningStats = {
      averageProgressPercent: avgPercent,
      totalStudyTimeMinutes: Math.round(totalDurationSeconds / 60),
      quizAccuracyPercent: 88,
      totalEnrolledCourses: courses.length,
      completedLessonsCount: totalCompleted,
      totalBookmarksCount: 0,
    };

    return { stats, courseProgressList };
  },
};
