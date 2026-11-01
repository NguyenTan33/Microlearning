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

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
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

export const adminUserApi = {
  async getUsers(search?: string, role?: string, page = 1, pageSize = 50): Promise<UserListItem[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));

    const res = await fetch(`/api/admin/users?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<UserListItem[]>(res);
  },

  async getUserById(id: string): Promise<UserDetail> {
    const res = await fetch(`/api/admin/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return await handleResponse<UserDetail>(res);
  },

  async createUser(payload: CreateUserPayload): Promise<UserDetail> {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return await handleResponse<UserDetail>(res);
  },

  async changePassword(id: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`/api/admin/users/${id}/password`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return await handleResponse<{ message: string }>(res);
  },

  async toggleLockout(id: string, lock: boolean, lockMinutes?: number): Promise<{ isLockedOut: boolean; message: string }> {
    const res = await fetch(`/api/admin/users/${id}/toggle-lock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ lock, lockMinutes }),
    });
    return await handleResponse<{ isLockedOut: boolean; message: string }>(res);
  },

  async updateRole(id: string, role: string): Promise<{ message: string }> {
    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return await handleResponse<{ message: string }>(res);
  },
};
