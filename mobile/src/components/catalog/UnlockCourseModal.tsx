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
import { X, Lock, KeyRound, CheckCircle2 } from 'lucide-react-native';
import { apiClient } from '../../services/apiClient';

interface UnlockCourseModalProps {
  visible: boolean;
  onClose: () => void;
  courseId: number;
  courseTitle: string;
  onUnlocked: () => void;
}

export const UnlockCourseModal: React.FC<UnlockCourseModalProps> = ({
  visible,
  onClose,
  courseId,
  courseTitle,
  onUnlocked,
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mật khẩu truy cập khóa học.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/course-access/${courseId}/unlock`, {
        accessPassword: password.trim(),
      });

      Alert.alert('Mở khóa thành công', `Bạn đã mở khóa thành công khóa học "${courseTitle}".`);
      onUnlocked();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Mật khẩu mở khóa không chính xác.';
      Alert.alert('Không thể mở khóa', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Lock color="#F59E0B" size={24} />
              <Text style={styles.modalTitle}>Khóa Học Riêng Tư</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.instruction}>
            Khóa học <Text style={styles.courseName}>"{courseTitle}"</Text> ở chế độ riêng tư. Vui lòng nhập mật khẩu truy cập do giảng viên cấp để mở khóa.
          </Text>

          <View style={styles.inputWrapper}>
            <KeyRound color="#94A3B8" size={20} />
            <TextInput
              style={styles.textInput}
              placeholder="Nhập mật khẩu truy cập..."
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlock} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.unlockBtnText}>Mở Khóa Ngay</Text>
            )}
          </TouchableOpacity>
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
    marginBottom: 16,
  },
  titleRow: {
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
  instruction: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  courseName: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    marginLeft: 12,
  },
  unlockBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
