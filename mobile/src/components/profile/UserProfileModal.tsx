import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, User, Phone, ShieldCheck, Edit2, Save, Calendar, Crown } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ visible, onClose }) => {
  const { user, updateProfile, isAdmin, isTeacher } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Thông báo', 'Họ và tên không được để trống.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim() });
      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân.');
      setIsEditing(false);
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hồ Sơ Cá Nhân</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {/* Large Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.userRoleTag}>
              {isAdmin ? '👑 Quản Trị Viên' : isTeacher ? '👨‍🏫 Giáo Viên' : '🎓 Học Viên'}
            </Text>
          </View>

          {/* Profile Details Form */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <View style={styles.iconCircle}>
                <User color="#38BDF8" size={18} />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>Họ và Tên</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Nhập họ và tên..."
                    placeholderTextColor="#64748B"
                  />
                ) : (
                  <Text style={styles.detailValue}>{user.fullName}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#38BDF8" />
                ) : isEditing ? (
                  <Save color="#10B981" size={18} />
                ) : (
                  <Edit2 color="#38BDF8" size={18} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.iconCircle}>
                <Phone color="#38BDF8" size={18} />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>Số Điện Thoại</Text>
                <Text style={styles.detailValue}>{user.phoneNumber || 'Chưa cập nhật'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.iconCircle}>
                <ShieldCheck color="#38BDF8" size={18} />
              </View>
              <View style={styles.detailTextWrapper}>
                <Text style={styles.detailLabel}>Quyền Hạn Hệ Thống</Text>
                <Text style={styles.detailValue}>
                  {user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'Student'}
                </Text>
              </View>
            </View>
          </View>
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  userRoleTag: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailTextWrapper: {
    flex: 1,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  textInput: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#38BDF8',
    paddingVertical: 2,
  },
  editBtn: {
    padding: 8,
  },
});
