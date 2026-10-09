import { apiClient } from './apiClient';

export interface FavoriteSubject {
  subjectId: number;
  title: string;
  description?: string | null;
  courseId: number;
  courseTitle: string;
  totalLessons: number;
  createdAt: string;
}

export interface ToggleFavoriteResult {
  subjectId: number;
  isFavorite: boolean;
  message: string;
}

export const favoriteSubjectApi = {
  /**
   * Thả tim hoặc bỏ yêu thích một môn học
   */
  async toggleFavorite(subjectId: number): Promise<ToggleFavoriteResult> {
    const res = await apiClient.post<ToggleFavoriteResult>(
      `/api/catalog/subjects/${subjectId}/favorite`
    );
    return res.data;
  },

  /**
   * Lấy danh sách đầy đủ các môn học đã thả tim yêu thích của học viên
   */
  async getMyFavorites(): Promise<FavoriteSubject[]> {
    try {
      const res = await apiClient.get<FavoriteSubject[]>('/api/catalog/subjects/favorites');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách các ID môn học đã yêu thích để hiển thị nhanh trạng thái trái tim trên UI
   */
  async getMyFavoriteIds(): Promise<number[]> {
    try {
      const res = await apiClient.get<number[]>('/api/catalog/subjects/favorites/ids');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },
};
