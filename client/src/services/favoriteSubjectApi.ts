function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.message || `Yêu cầu thất bại với mã trạng thái ${res.status}.`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

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
    const res = await fetch(`/api/catalog/subjects/${subjectId}/favorite`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return await handleResponse<ToggleFavoriteResult>(res);
  },

  /**
   * Lấy danh sách đầy đủ các môn học đã thả tim yêu thích của học viên
   */
  async getMyFavorites(): Promise<FavoriteSubject[]> {
    try {
      const res = await fetch('/api/catalog/subjects/favorites', {
        headers: getAuthHeaders(),
      });
      return await handleResponse<FavoriteSubject[]>(res);
    } catch {
      return [];
    }
  },

  /**
   * Lấy danh sách các ID môn học đã yêu thích để hiển thị nhanh trạng thái trái tim trên UI
   */
  async getMyFavoriteIds(): Promise<number[]> {
    try {
      const res = await fetch('/api/catalog/subjects/favorites/ids', {
        headers: getAuthHeaders(),
      });
      return await handleResponse<number[]>(res);
    } catch {
      return [];
    }
  },
};
