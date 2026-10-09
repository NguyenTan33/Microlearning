import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Users, Search, Shield, Lock, Unlock, UserCheck, Crown } from 'lucide-react-native';
import { adminUserApi } from '../../services/adminUserApi';
import type { AdminUserItem } from '../../types/auth.types';

interface AdminUserManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({
  visible,
  onClose,
}) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminUserApi.getAllUsers();
      setUsers(data);
    } catch {
      Alert.alert('Lỗi', 'Không thể nạp danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible]);

  const handleChangeRole = (userId: string, currentRole: string) => {
    const rolesList = ['Admin', 'Teacher', 'Student'];
    const options = rolesList.map((role) => ({
      text: `Chuyển sang ${role}`,
      onPress: async () => {
        try {
          await adminUserApi.updateUserRole({ userId, newRole: role });
          Alert.alert('Thành công', `Đã phân quyền thành ${role}.`);
          await loadUsers();
        } catch {
          Alert.alert('Lỗi', 'Không thể đổi phân quyền.');
        }
      },
    }));

    Alert.alert('Phân Quyền Người Dùng', 'Chọn quyền hạn mới:', [
      ...options,
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleToggleLock = async (userId: string, isLocked: boolean) => {
    try {
      await adminUserApi.toggleUserLock(userId);
      Alert.alert('Thành công', isLocked ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
      await loadUsers();
    } catch {
      Alert.alert('Lỗi', 'Thao tác thất bại.');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneNumber.includes(searchQuery)
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Users color="#38BDF8" size={24} />
              <Text style={styles.modalTitle}>Quản Lý Người Dùng</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchWrapper}>
            <Search color="#94A3B8" size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm theo Tên hoặc Số điện thoại..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView style={styles.userList}>
              {filteredUsers.map((u) => {
                const isAdmin = u.roles.includes('Admin');
                const isTeacher = u.roles.includes('Teacher');

                return (
                  <View key={u.id} style={styles.userCard}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarChar}>{u.fullName.charAt(0).toUpperCase()}</Text>
                    </View>

                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.fullName}</Text>
                      <Text style={styles.userPhone}>{u.phoneNumber}</Text>

                      <View style={styles.roleBadgesRow}>
                        {isAdmin && (
                          <View style={[styles.badge, styles.adminBadge]}>
                            <Crown color="#F59E0B" size={12} />
                            <Text style={styles.adminBadgeText}>Admin</Text>
                          </View>
                        )}
                        {isTeacher && !isAdmin && (
                          <View style={[styles.badge, styles.teacherBadge]}>
                            <Shield color="#38BDF8" size={12} />
                            <Text style={styles.teacherBadgeText}>Teacher</Text>
                          </View>
                        )}
                        {!isAdmin && !isTeacher && (
                          <View style={[styles.badge, styles.studentBadge]}>
                            <UserCheck color="#10B981" size={12} />
                            <Text style={styles.studentBadgeText}>Student</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleChangeRole(u.id, u.roles[0])}
                      >
                        <Shield color="#38BDF8" size={18} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleToggleLock(u.id, u.isLocked)}
                      >
                        {u.isLocked ? (
                          <Lock color="#EF4444" size={18} />
                        ) : (
                          <Unlock color="#10B981" size={18} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '90%',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    marginLeft: 10,
  },
  userList: {
    maxHeight: 450,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarChar: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  userPhone: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  roleBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
  },
  adminBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  teacherBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
  },
  teacherBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  studentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
  },
  studentBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
});
