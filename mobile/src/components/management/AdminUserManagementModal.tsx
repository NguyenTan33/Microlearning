import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  Users,
  Search,
  Lock,
  Unlock,
  Shield,
  KeyRound,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  Phone,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react-native';
import {
  adminUserApi,
  type UserListItem,
  type CreateUserPayload,
} from '../../services/adminUserApi';

interface AdminUserManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    fullName: '',
    phoneNumber: '',
    password: '',
    role: 'Student',
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Password reset dialog
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserListItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Role update dialog
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserListItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminUserApi.getUsers(
        searchTerm.trim() || undefined,
        roleFilter || undefined
      );
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[AdminUserManagement] Fetch users error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách tài khoản từ máy chủ.';
      Alert.alert('Thông báo', msg);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter]);

  useEffect(() => {
    if (visible) {
      fetchUsers();
    }
  }, [visible, fetchUsers]);

  const handleCreateUser = async () => {
    if (!createForm.fullName.trim() || !createForm.phoneNumber.trim() || !createForm.password.trim()) {
      Alert.alert('Chú ý', 'Vui lòng điền đầy đủ Họ tên, Số điện thoại và Mật khẩu.');
      return;
    }

    setActionLoading(true);
    try {
      await adminUserApi.createUser(createForm);
      Alert.alert('Thành công', `Đã tạo tài khoản cho ${createForm.fullName}`);
      setIsCreateOpen(false);
      setCreateForm({ fullName: '', phoneNumber: '', password: '', role: 'Student' });
      fetchUsers();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.message
        ? (err as any).response.data.message
        : 'Không thể tạo tài khoản.';
      Alert.alert('Lỗi', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = (user: UserListItem) => {
    const willLock = !user.isLockedOut;
    Alert.alert(
      willLock ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      `Bạn có chắc muốn ${willLock ? 'khóa' : 'mở khóa'} tài khoản của "${user.fullName}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: willLock ? 'Khóa ngay' : 'Mở khóa',
          style: willLock ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await adminUserApi.toggleLockout(user.id, willLock, 120);
              fetchUsers();
            } catch {
              Alert.alert('Lỗi', 'Thao tác khóa/mở khóa thất bại.');
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!selectedUserForPassword || !newPasswordInput.trim()) {
      Alert.alert('Chú ý', 'Vui lòng nhập mật khẩu mới.');
      return;
    }

    setActionLoading(true);
    try {
      await adminUserApi.changePassword(selectedUserForPassword.id, newPasswordInput.trim());
      Alert.alert('Thành công', `Đã đổi mật khẩu cho ${selectedUserForPassword.fullName}`);
      setSelectedUserForPassword(null);
      setNewPasswordInput('');
    } catch {
      Alert.alert('Lỗi', 'Không thể đổi mật khẩu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!selectedUserForRole) return;
    setActionLoading(true);
    try {
      await adminUserApi.updateRole(selectedUserForRole.id, newRole);
      Alert.alert('Thành công', `Đã cập nhật vai trò ${newRole} cho ${selectedUserForRole.fullName}`);
      setSelectedUserForRole(null);
      fetchUsers();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật vai trò.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBox}>
              <ShieldCheck color="#6366F1" size={20} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Quản Trị Người Dùng (Admin)</Text>
              <Text style={styles.headerSubtitle}>Quản lý tài khoản, phân quyền và khóa truy cập</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X color="#94A3B8" size={22} />
          </TouchableOpacity>
        </View>

        {/* Search & Actions Bar */}
        <View style={styles.controlsBar}>
          <View style={styles.searchBox}>
            <Search color="#64748B" size={16} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên hoặc SĐT..."
              placeholderTextColor="#475569"
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={fetchUsers}
            />
          </View>

          <TouchableOpacity
            style={styles.addUserBtn}
            onPress={() => setIsCreateOpen(true)}
            activeOpacity={0.8}
          >
            <UserPlus color="#FFFFFF" size={16} />
            <Text style={styles.addUserBtnText}>Tạo User</Text>
          </TouchableOpacity>
        </View>

        {/* Role Filter Chips */}
        <View style={styles.filterRow}>
          {['', 'Admin', 'Teacher', 'Student'].map((role) => {
            const isSelected = roleFilter === role;
            const label = role === '' ? 'Tất cả' : role === 'Admin' ? 'Admin' : role === 'Teacher' ? 'Giáo viên' : 'Học viên';
            return (
              <TouchableOpacity
                key={role}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setRoleFilter(role)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* User List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Đang tải danh sách tài khoản Azure...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.countText}>Tìm thấy {users.length} tài khoản</Text>

            {users.map((u) => {
              const isAdmin = u.roles?.some((r) => r.toLowerCase() === 'admin');
              const isTeacher = u.roles?.some((r) => r.toLowerCase() === 'teacher');
              const roleDisplay = isAdmin ? 'Admin' : isTeacher ? 'Giáo viên' : 'Học viên';

              return (
                <View key={u.id} style={[styles.userCard, u.isLockedOut && styles.userCardLocked]}>
                  <View style={styles.userCardTop}>
                    <View style={styles.avatarBox}>
                      <UserIcon color="#818CF8" size={18} />
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {u.fullName || 'Người dùng'}
                        </Text>
                        <View
                          style={[
                            styles.roleBadge,
                            isAdmin ? styles.roleBadgeAdmin : isTeacher ? styles.roleBadgeTeacher : styles.roleBadgeStudent,
                          ]}
                        >
                          <Text style={styles.roleBadgeText}>{roleDisplay}</Text>
                        </View>
                      </View>
                      <Text style={styles.userPhone}>{u.phoneNumber}</Text>
                      {u.email ? <Text style={styles.userEmail}>{u.email}</Text> : null}
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => setSelectedUserForRole(u)}
                      activeOpacity={0.7}
                    >
                      <Shield color="#818CF8" size={14} />
                      <Text style={styles.actionBtnText}>Đổi vai trò</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => setSelectedUserForPassword(u)}
                      activeOpacity={0.7}
                    >
                      <KeyRound color="#F59E0B" size={14} />
                      <Text style={styles.actionBtnText}>Đổi MK</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, u.isLockedOut ? styles.unlockBtn : styles.lockBtn]}
                      onPress={() => handleToggleLock(u)}
                      activeOpacity={0.7}
                    >
                      {u.isLockedOut ? (
                        <>
                          <Unlock color="#10B981" size={14} />
                          <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Mở khóa</Text>
                        </>
                      ) : (
                        <>
                          <Lock color="#EF4444" size={14} />
                          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Khóa</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Modal Tạo Tài Khoản Mới */}
        <Modal visible={isCreateOpen} animationType="slide" transparent onRequestClose={() => setIsCreateOpen(false)}>
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Tạo tài khoản mới</Text>
                <TouchableOpacity onPress={() => setIsCreateOpen(false)}>
                  <X color="#94A3B8" size={20} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Họ và tên *</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#475569"
                value={createForm.fullName}
                onChangeText={(v) => setCreateForm({ ...createForm, fullName: v })}
              />

              <Text style={styles.inputLabel}>Số điện thoại *</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="0912345678"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                value={createForm.phoneNumber}
                onChangeText={(v) => setCreateForm({ ...createForm, phoneNumber: v })}
              />

              <Text style={styles.inputLabel}>Mật khẩu *</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor="#475569"
                secureTextEntry
                value={createForm.password}
                onChangeText={(v) => setCreateForm({ ...createForm, password: v })}
              />

              <Text style={styles.inputLabel}>Vai trò</Text>
              <View style={styles.rolePickerRow}>
                {['Student', 'Teacher', 'Admin'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rolePickerChip, createForm.role === r && styles.rolePickerChipActive]}
                    onPress={() => setCreateForm({ ...createForm, role: r })}
                  >
                    <Text style={[styles.rolePickerChipText, createForm.role === r && styles.rolePickerChipTextActive]}>
                      {r === 'Student' ? 'Học viên' : r === 'Teacher' ? 'Giáo viên' : 'Admin'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.dialogSubmitBtn}
                onPress={handleCreateUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.dialogSubmitText}>Tạo tài khoản</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Đổi Mật Khẩu */}
        <Modal
          visible={Boolean(selectedUserForPassword)}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedUserForPassword(null)}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Đổi mật khẩu người dùng</Text>
                <TouchableOpacity onPress={() => setSelectedUserForPassword(null)}>
                  <X color="#94A3B8" size={20} />
                </TouchableOpacity>
              </View>
              <Text style={styles.dialogSubInfo}>Tài khoản: {selectedUserForPassword?.fullName}</Text>

              <Text style={styles.inputLabel}>Mật khẩu mới *</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="Nhập mật khẩu mới..."
                placeholderTextColor="#475569"
                secureTextEntry
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
              />

              <TouchableOpacity
                style={styles.dialogSubmitBtn}
                onPress={handleChangePassword}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.dialogSubmitText}>Lưu mật khẩu mới</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Cập Nhật Vai Trò */}
        <Modal
          visible={Boolean(selectedUserForRole)}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedUserForRole(null)}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>Phân quyền vai trò</Text>
                <TouchableOpacity onPress={() => setSelectedUserForRole(null)}>
                  <X color="#94A3B8" size={20} />
                </TouchableOpacity>
              </View>
              <Text style={styles.dialogSubInfo}>Tài khoản: {selectedUserForRole?.fullName}</Text>

              <View style={{ gap: 10, marginVertical: 14 }}>
                {[
                  { id: 'Student', label: 'Học viên (Học tập & thi trắc nghiệm)' },
                  { id: 'Teacher', label: 'Giáo viên (Studio tạo/sửa khóa học)' },
                  { id: 'Admin', label: 'Quản trị viên (Toàn quyền hệ thống)' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.roleSelectOption}
                    onPress={() => handleUpdateRole(item.id)}
                  >
                    <Shield color="#6366F1" size={16} />
                    <Text style={styles.roleSelectOptionText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B17' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#94A3B8', fontSize: 11 },
  closeBtn: { padding: 4 },
  controlsBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 13 },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    gap: 6,
  },
  addUserBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterChipActive: { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366F1' },
  filterChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  filterChipTextActive: { color: '#818CF8', fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  listContent: { padding: 16, gap: 12 },
  countText: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  userCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
  },
  userCardLocked: { borderColor: 'rgba(239, 68, 68, 0.4)', opacity: 0.8 },
  userCardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  userName: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', flex: 1 },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleBadgeAdmin: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  roleBadgeTeacher: { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  roleBadgeStudent: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  roleBadgeText: { color: '#E2E8F0', fontSize: 10, fontWeight: '700' },
  userPhone: { color: '#94A3B8', fontSize: 12 },
  userEmail: { color: '#64748B', fontSize: 11 },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  actionBtnText: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  lockBtn: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  unlockBtn: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dialogTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  dialogSubInfo: { color: '#94A3B8', fontSize: 12, marginBottom: 12 },
  inputLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  dialogInput: {
    backgroundColor: '#070B17',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  rolePickerRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rolePickerChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#070B17',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rolePickerChipActive: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.2)' },
  rolePickerChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  rolePickerChipTextActive: { color: '#818CF8' },
  dialogSubmitBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  dialogSubmitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  roleSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#070B17',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  roleSelectOptionText: { color: '#E2E8F0', fontSize: 13, fontWeight: '500' },
});
