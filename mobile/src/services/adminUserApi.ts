import { apiClient } from './apiClient';

export interface UserListItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  roles: string[];
  isLockedOut: boolean;
  lockoutEnd: string | null;
  phoneNumberConfirmed: boolean;
}

export interface UserDetail extends UserListItem {
  accessFailedCount: number;
}

export interface CreateUserPayload {
  fullName: string;
  phoneNumber: string;
  password: string;
  role: string;
}

export const adminUserApi = {
  /**
   * Lấy danh sách toàn bộ tài khoản người dùng từ Azure SQL
   */
  async getUsers(search?: string, role?: string, page = 1, pageSize = 50): Promise<UserListItem[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const res = await apiClient.get<UserListItem[]>(`/api/admin/users?${params.toString()}`);
    return res.data;
  },

  /**
   * Lấy chi tiết tài khoản theo ID
   */
  async getUserById(id: string): Promise<UserDetail> {
    const res = await apiClient.get<UserDetail>(`/api/admin/users/${id}`);
    return res.data;
  },

  /**
   * Tạo tài khoản mới (Admin / Teacher / Student)
   */
  async createUser(payload: CreateUserPayload): Promise<UserDetail> {
    const res = await apiClient.post<UserDetail>('/api/admin/users', payload);
    return res.data;
  },

  /**
   * Đổi mật khẩu tài khoản người dùng
   */
  async changePassword(id: string, newPassword: string): Promise<{ message: string }> {
    const res = await apiClient.put<{ message: string }>(`/api/admin/users/${id}/password`, {
      newPassword,
    });
    return res.data;
  },

  /**
   * Khóa hoặc mở khóa tài khoản
   */
  async toggleLockout(id: string, lock: boolean, lockMinutes: number = 60): Promise<{ isLockedOut: boolean; message: string }> {
    const res = await apiClient.patch<{ isLockedOut: boolean; message: string }>(
      `/api/admin/users/${id}/toggle-lock`,
      { lock, lockMinutes }
    );
    return res.data;
  },

  /**
   * Cập nhật vai trò (Admin / Teacher / Student)
   */
  async updateRole(id: string, role: string): Promise<{ message: string }> {
    const res = await apiClient.put<{ message: string }>(`/api/admin/users/${id}/role`, { role });
    return res.data;
  },
};
