import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Lock,
  Unlock,
  Shield,
  Search,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  adminUserApi,
  type UserListItem,
  type UserDetail,
  type CreateUserPayload,
} from '../../services/adminUserApi';

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sub-dialogs state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<UserListItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<UserDetail | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<UserListItem | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    fullName: '',
    phoneNumber: '',
    password: '',
    role: 'Student',
  });
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [selectedRoleInput, setSelectedRoleInput] = useState<string>('Student');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Tải danh sách người dùng
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminUserApi.getUsers(
        searchTerm.trim() || undefined,
        roleFilter || undefined
      );
      setUsers(data);
    } catch (err: unknown) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Không thể tải danh sách tài khoản.',
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Xử lý tạo mới tài khoản
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.phoneNumber.trim() || !createForm.password.trim()) {
      showToast('error', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    setActionLoading(true);
    try {
      await adminUserApi.createUser(createForm);
      showToast('success', `Đã tạo tài khoản cho ${createForm.fullName} thành công.`);
      setShowCreateModal(false);
      setCreateForm({ fullName: '', phoneNumber: '', password: '', role: 'Student' });
      fetchUsers();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi tạo tài khoản.');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal || !newPasswordInput.trim() || newPasswordInput.length < 6) {
      showToast('error', 'Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    setActionLoading(true);
    try {
      await adminUserApi.changePassword(showPasswordModal.id, newPasswordInput.trim());
      showToast('success', `Đã đổi mật khẩu cho ${showPasswordModal.fullName} thành công.`);
      setShowPasswordModal(null);
      setNewPasswordInput('');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi khi đổi mật khẩu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý tạm khóa hoặc mở khóa
  const handleToggleLock = async (user: UserListItem) => {
    const isCurrentlyLocked = user.isLockedOut;
    const confirmMessage = isCurrentlyLocked
      ? `Bạn có chắc muốn mở khóa cho tài khoản ${user.fullName}?`
      : `Bạn có muốn khóa tài khoản ${user.fullName} trong 30 phút?`;

    if (!confirm(confirmMessage)) return;

    try {
      const res = await adminUserApi.toggleLockout(user.id, !isCurrentlyLocked, isCurrentlyLocked ? 0 : 30);
      showToast('success', res.message);
      fetchUsers();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi thao tác khóa tài khoản.');
    }
  };

  // Xử lý cập nhật phân quyền
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRoleModal) return;
    setActionLoading(true);
    try {
      await adminUserApi.updateRole(showRoleModal.id, selectedRoleInput);
      showToast('success', `Đã cập nhật vai trò ${selectedRoleInput} cho ${showRoleModal.fullName}.`);
      setShowRoleModal(null);
      fetchUsers();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Lỗi phân quyền.');
    } finally {
      setActionLoading(false);
    }
  };

  // Xem chi tiết tài khoản
  const handleViewDetail = async (id: string) => {
    try {
      const detail = await adminUserApi.getUserById(id);
      setShowDetailModal(detail);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Không thể lấy thông tin chi tiết.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0A0F1F] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Modal */}
        <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0D1429]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Trung Tâm Quản Trị Tài Khoản
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/30 text-purple-300">
                  ADMIN ONLY
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Quản lý người dùng, phân quyền Giáo viên/Học viên, tạm khóa và thiết lập mật khẩu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm tài khoản</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thanh công cụ tìm kiếm và lọc */}
        <div className="p-4 border-b border-white/5 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm theo họ tên hoặc SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="">Tất cả vai trò</option>
              <option value="Admin">Admin (Quản trị viên)</option>
              <option value="Teacher">Teacher (Giáo viên)</option>
              <option value="Student">Student (Học viên)</option>
            </select>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Toast thông báo */}
        {notification && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border flex items-center gap-3 text-xs ${
              notification.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Bảng Danh sách Người dùng */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Đang tải danh sách tài khoản hệ thống...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Không tìm thấy tài khoản người dùng nào phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Họ tên & SĐT</th>
                    <th className="py-3 px-3">Vai trò</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => {
                    const isAdm = u.roles.includes('Admin');
                    const isTeach = u.roles.includes('Teacher');

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{u.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.phoneNumber}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  r === 'Admin'
                                    ? 'bg-purple-950/70 border-purple-500/40 text-purple-300'
                                    : r === 'Teacher'
                                    ? 'bg-blue-950/70 border-blue-500/40 text-blue-300'
                                    : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {u.isLockedOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                              <Lock className="w-3 h-3 text-rose-400" />
                              Tạm khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                              <Unlock className="w-3 h-3 text-emerald-400" />
                              Bình thường
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Xem chi tiết */}
                            <button
                              onClick={() => handleViewDetail(u.id)}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Xem chi tiết tài khoản"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Đổi mật khẩu */}
                            <button
                              onClick={() => {
                                setShowPasswordModal(u);
                                setNewPasswordInput('');
                              }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-amber-400 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Cập nhật vai trò */}
                            <button
                              onClick={() => {
                                setShowRoleModal(u);
                                setSelectedRoleInput(isAdm ? 'Admin' : isTeach ? 'Teacher' : 'Student');
                              }}
                              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-purple-400 text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
                              title="Phân quyền tài khoản"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>

                            {/* Tạm khóa / Mở khóa */}
                            <button
                              onClick={() => handleToggleLock(u)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                u.isLockedOut
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900'
                              }`}
                              title={u.isLockedOut ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản'}
                            >
                              {u.isLockedOut ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG 1: TẠO TÀI KHOẢN MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                <span>Thêm tài khoản mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Số điện thoại *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: +84988776655"
                  value={createForm.phoneNumber}
                  onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Mật khẩu khởi tạo *</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Vai trò hệ thống *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                >
                  <option value="Student">Học viên (Student) - Chỉ xem & làm trắc nghiệm</option>
                  <option value="Teacher">Giáo viên (Teacher) - Thêm/sửa/xóa bài giảng</option>
                  <option value="Admin">Quản trị viên (Admin) - Toàn quyền hệ thống</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: ĐỔI MẬT KHẨU */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Đặt lại mật khẩu</span>
              </h3>
              <button
                onClick={() => setShowPasswordModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <p className="text-slate-400">
                Đổi mật khẩu cho tài khoản: <strong className="text-white">{showPasswordModal.fullName}</strong> ({showPasswordModal.phoneNumber})
              </p>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Cập nhật mật khẩu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 3: PHÂN QUYỀN (UPDATE ROLE) */}
      {showRoleModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Phân quyền tài khoản</span>
              </h3>
              <button
                onClick={() => setShowRoleModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-3.5 text-xs">
              <p className="text-slate-400">
                Thiết lập quyền hạn cho: <strong className="text-white">{showRoleModal.fullName}</strong>
              </p>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Chọn vai trò chính *</label>
                <select
                  value={selectedRoleInput}
                  onChange={(e) => setSelectedRoleInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                >
                  <option value="Student">Học viên (Student)</option>
                  <option value="Teacher">Giáo viên (Teacher)</option>
                  <option value="Admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu phân quyền</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 4: XEM CHI TIẾT */}
      {showDetailModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D1429] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>Chi tiết người dùng</span>
              </h3>
              <button
                onClick={() => setShowDetailModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">ID tài khoản:</span>
                <span className="font-mono text-slate-300 select-all">{showDetailModal.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Họ và tên:</span>
                <span className="font-semibold text-white">{showDetailModal.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Số điện thoại:</span>
                <span className="font-mono text-cyan-300">{showDetailModal.phoneNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Đã xác thực SĐT:</span>
                <span className={showDetailModal.phoneNumberConfirmed ? 'text-emerald-400' : 'text-amber-400'}>
                  {showDetailModal.phoneNumberConfirmed ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Vai trò:</span>
                <span className="font-semibold text-purple-300">{showDetailModal.roles.join(', ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Số lần đăng nhập hỏng:</span>
                <span className="text-slate-300">{showDetailModal.accessFailedCount} lần</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Khóa đến:</span>
                <span className="text-slate-300">
                  {showDetailModal.lockoutEnd
                    ? new Date(showDetailModal.lockoutEnd).toLocaleString('vi-VN')
                    : 'Không bị khóa'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
