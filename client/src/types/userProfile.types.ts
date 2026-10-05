export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  bio: string;
  avatarUrl?: string;
  role: string;
  updatedAt: string;
}

export interface UserLearningStats {
  averageProgressPercent: number;
  totalStudyTimeMinutes: number;
  quizAccuracyPercent: number;
  totalEnrolledCourses: number;
  completedLessonsCount: number;
  totalBookmarksCount: number;
}

export interface CourseLearningProgress {
  courseId: number;
  courseTitle: string;
  courseThumbnail: string;
  author: string;
  category: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: string;
}
