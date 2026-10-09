import { apiClient } from './apiClient';

export interface FavoriteSubjectItem {
  id: number;
  subjectId: number;
  subjectTitle: string;
  courseTitle: string;
  totalLessons: number;
  addedAt: string;
}

export const favoriteSubjectApi = {
  /**
   * Lấy danh sách môn học yêu thích của học viên
   */
  async getFavoriteSubjects(): Promise<FavoriteSubjectItem[]> {
    try {
      const response = await apiClient.get<FavoriteSubjectItem[]>('/favorites/subjects');
      return response.data;
    } catch {
      return [];
    }
  },

  /**
   * Thêm môn học vào danh sách yêu thích
   */
  async addFavoriteSubject(subjectId: number): Promise<boolean> {
    try {
      await apiClient.post(`/favorites/subjects/${subjectId}`);
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Xóa môn học khỏi danh sách yêu thích
   */
  async removeFavoriteSubject(subjectId: number): Promise<boolean> {
    try {
      await apiClient.delete(`/favorites/subjects/${subjectId}`);
      return true;
    } catch {
      return true;
    }
  },
};
