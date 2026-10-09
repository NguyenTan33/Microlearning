import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { X, Server, Globe, Cpu, Check, RefreshCw, Zap } from 'lucide-react-native';
import { AZURE_CLOUD_URL, LOCAL_DEV_URL } from '../../utils/constants';
import { getApiBaseUrl, setApiBaseUrl } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onDemoLogin?: (role: 'Admin' | 'Student' | 'Teacher') => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  visible,
  onClose,
  onDemoLogin,
}) => {
  const { setAuth } = useAuthStore();
  const [currentUrl, setCurrentUrl] = useState(getApiBaseUrl());
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    if (visible) {
      const active = getApiBaseUrl();
      setCurrentUrl(active);
      setCustomInput(active);
    }
  }, [visible]);

  const handleSelectPreset = async (url: string) => {
    await setApiBaseUrl(url);
    setCurrentUrl(url);
    setCustomInput(url);
    Alert.alert('Cấu hình Server', `Đã chuyển máy chủ sang: ${url}`);
  };

  const handleSaveCustom = async () => {
    if (!customInput.trim().startsWith('http')) {
      Alert.alert('Lỗi', 'Địa chỉ Server phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    const clean = customInput.trim();
    await setApiBaseUrl(clean);
    setCurrentUrl(clean);
    Alert.alert('Thành công', `Đã lưu địa chỉ máy chủ mới: ${clean}`);
    onClose();
  };

  const handleQuickDemoLogin = async (role: 'Admin' | 'Teacher' | 'Student') => {
    const demoUser = {
      id: `demo-${role.toLowerCase()}-1`,
      fullName: role === 'Admin' ? 'Quản Trị Viên (Demo)' : role === 'Teacher' ? 'Giáo Viên (Demo)' : 'Học Viên (Demo)',
      phoneNumber: role === 'Admin' ? '0999999999' : role === 'Teacher' ? '0888888888' : '0912345678',
      role,
      roles: [role, 'Student'],
    };

    const mockAccessToken = 'demo-access-token-jwt-mock';
    const mockRefreshToken = 'demo-refresh-token-jwt-mock';

    await setAuth(demoUser, mockAccessToken, mockRefreshToken);
    onClose();
    if (onDemoLogin) {
      onDemoLogin(role);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Server color="#06B6D4" size={22} />
              <Text style={styles.modalTitle}>Cấu Hình Máy Chủ & Server</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionSubtitle}>
              Chọn kết nối Server để đảm bảo ứng dụng chạy ổn định trên thiết bị của bạn.
            </Text>

            {/* Presets */}
            <View style={styles.presetsList}>
              {/* Option 1: Azure Cloud */}
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  currentUrl === AZURE_CLOUD_URL && styles.presetCardActive,
                ]}
                onPress={() => handleSelectPreset(AZURE_CLOUD_URL)}
                activeOpacity={0.8}
              >
                <View style={styles.presetHeader}>
                  <Globe color="#38BDF8" size={20} />
                  <View style={styles.presetTextGroup}>
                    <Text style={styles.presetTitle}>Cloud Server Azure (Trực Tuyến 24/7)</Text>
                    <Text style={styles.presetUrl}>{AZURE_CLOUD_URL}</Text>
                  </View>
                  {currentUrl === AZURE_CLOUD_URL && <Check color="#10B981" size={20} />}
                </View>
              </TouchableOpacity>

              {/* Option 2: Local PC */}
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  currentUrl === LOCAL_DEV_URL && styles.presetCardActive,
                ]}
                onPress={() => handleSelectPreset(LOCAL_DEV_URL)}
                activeOpacity={0.8}
              >
                <View style={styles.presetHeader}>
                  <Cpu color="#818CF8" size={20} />
                  <View style={styles.presetTextGroup}>
                    <Text style={styles.presetTitle}>Local Development (Máy tính cá nhân)</Text>
                    <Text style={styles.presetUrl}>{LOCAL_DEV_URL}</Text>
                  </View>
                  {currentUrl === LOCAL_DEV_URL && <Check color="#10B981" size={20} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Custom URL Input */}
            <View style={styles.customSection}>
              <Text style={styles.inputLabel}>Tùy chỉnh địa chỉ IP / Domain Server:</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  value={customInput}
                  onChangeText={setCustomInput}
                  placeholder="http://192.168.1.x:5124"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustom}>
                  <Text style={styles.saveBtnText}>Lưu IP</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Demo Offline Login Section */}
            <View style={styles.demoSection}>
              <View style={styles.demoTitleRow}>
                <Zap color="#F59E0B" size={18} fill="#F59E0B" />
                <Text style={styles.demoTitle}>Vào Nhanh Chế Độ Thử Nghiệm (Offline Demo)</Text>
              </View>
              <Text style={styles.demoDesc}>
                Nếu không có Internet hoặc máy chủ chưa bật, bạn vẫn có thể trải nghiệm toàn bộ giao diện và dữ liệu ngoại tuyến theo đúng phân quyền:
              </Text>

              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={[styles.demoRoleBtn, { backgroundColor: '#6366F1' }]}
                  onPress={() => handleQuickDemoLogin('Admin')}
                >
                  <Text style={styles.demoRoleText}>👑 Admin Demo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoRoleBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => handleQuickDemoLogin('Teacher')}
                >
                  <Text style={styles.demoRoleText}>👨‍🏫 Teacher Demo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoRoleBtn, { backgroundColor: '#06B6D4' }]}
                  onPress={() => handleQuickDemoLogin('Student')}
                >
                  <Text style={styles.demoRoleText}>🎓 Student Demo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 24, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#090D1A',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    maxHeight: '85%',
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
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#0E1428',
    borderRadius: 12,
  },
  scrollBody: {
    maxHeight: 520,
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  presetsList: {
    gap: 12,
    marginBottom: 20,
  },
  presetCard: {
    backgroundColor: '#070B18',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  presetCardActive: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  presetTextGroup: {
    flex: 1,
  },
  presetTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  presetUrl: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  customSection: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#070B18',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#F8FAFC',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  demoSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  demoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  demoTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
  },
  demoDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoRoleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoRoleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
