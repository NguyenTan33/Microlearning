import { apiClient } from './apiClient';
import type { Course, CourseDetail, Lesson } from '../types/catalog.types';

export const catalogApi = {
  async getAllCourses(): Promise<Course[]> {
    const res = await apiClient.get<Course[]>('/api/courses');
    return res.data;
  },

  async getCourseById(courseId: number): Promise<CourseDetail> {
    const res = await apiClient.get<CourseDetail>(`/api/courses/${courseId}`);
    return res.data;
  },

  async unlockCourse(courseId: number, passkey: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.post<{ success: boolean; message?: string }>(`/api/courses/${courseId}/unlock`, { passkey });
    return res.data;
  },

  async getLessonById(lessonId: number): Promise<Lesson> {
    const res = await apiClient.get<Lesson>(`/api/lessons/${lessonId}`);
    return res.data;
  },
};
