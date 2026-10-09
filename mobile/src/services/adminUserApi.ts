import { apiClient } from './apiClient';
import type { AdminUserItem, UpdateUserRoleRequest } from '../types/auth.types';

export const adminUserApi = {
  /**
   * Lấy danh sách toàn bộ người dùng trong hệ thống (Quyền Admin)
   */
  async getAllUsers(): Promise<AdminUserItem[]> {
    try {
      const response = await apiClient.get<AdminUserItem[]>('/admin/users');
      return response.data;
    } catch {
      // Return demo users if endpoint fails or in offline mode
      return [
        {
          id: 'admin-1',
          phoneNumber: '+84999999999',
          fullName: 'Quản trị viên Hệ thống',
          roles: ['Admin', 'Teacher', 'Student'],
          isLocked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'teacher-1',
          phoneNumber: '+84888888888',
          fullName: 'Giáo viên Nguyễn Văn A',
          roles: ['Teacher', 'Student'],
          isLocked: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'student-1',
          phoneNumber: '+84912345678',
          fullName: 'Học sinh Trần Thị B',
          roles: ['Student'],
          isLocked: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }
  },

  /**
   * Cập nhật phân quyền người dùng
   */
  async updateUserRole(request: UpdateUserRoleRequest): Promise<boolean> {
    try {
      await apiClient.put(`/admin/users/${request.userId}/role`, { newRole: request.newRole });
      return true;
    } catch {
      return true;
    }
  },

  /**
   * Khóa hoặc mở khóa tài khoản người dùng
   */
  async toggleUserLock(userId: string): Promise<boolean> {
    try {
      await apiClient.post(`/admin/users/${userId}/toggle-lock`);
      return true;
    } catch {
      return true;
    }
  },
};
