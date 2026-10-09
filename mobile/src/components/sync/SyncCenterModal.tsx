import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { X, RefreshCw, Smartphone, Wifi, WifiOff, CheckCircle2, Clock } from 'lucide-react-native';
import { useSyncStore } from '../../store/useSyncStore';
import { autoSyncEngine } from '../../services/autoSyncEngine';
import { getDeviceInfo, getOrCreateDeviceId } from '../../utils/deviceHelper';

interface SyncCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({ visible, onClose }) => {
  const { isOnline, outboxCount, lastSyncTime, isSyncing } = useSyncStore();
  const [deviceId, setDeviceId] = useState('');
  const [deviceModel, setDeviceModel] = useState('');

  useEffect(() => {
    if (visible) {
      getOrCreateDeviceId().then(setDeviceId);
      const info = getDeviceInfo();
      setDeviceModel(`${info.deviceModel} (${info.osVersion})`);
    }
  }, [visible]);

  const handleManualSync = () => {
    if (!isOnline) {
      Alert.alert('Chế độ Offline', 'Vui lòng kết nối Internet để đồng bộ với Server.');
      return;
    }

    autoSyncEngine.triggerSyncWithDebounce(0);
    Alert.alert('Thành công', 'Đã khởi động tiến trình đồng bộ ngầm!');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <RefreshCw color="#38BDF8" size={24} />
              <Text style={styles.modalTitle}>Cài Đặt & Trung Tâm Đồng Bộ</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                {isOnline ? (
                  <View style={styles.onlineBadge}>
                    <Wifi color="#10B981" size={16} />
                    <Text style={styles.onlineText}>Đang Có Mạng (Online)</Text>
                  </View>
                ) : (
                  <View style={styles.offlineBadge}>
                    <WifiOff color="#EF4444" size={16} />
                    <Text style={styles.offlineText}>Mất Mạng (Offline Mode)</Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Hàng đợi chờ đồng bộ (Outbox):</Text>
                  <Text style={styles.infoValue}>
                    {outboxCount > 0 ? `${outboxCount} mục` : 'Đã sạch 100%'}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Lần đồng bộ mới nhất:</Text>
                  <Text style={styles.infoValue}>
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('vi-VN') : 'Chưa đồng bộ'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.syncNowBtn}
                onPress={handleManualSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <RefreshCw color="#FFFFFF" size={18} />
                    <Text style={styles.syncNowText}>Đồng Bộ Ngay Bây Giờ</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Device Info Card */}
            <View style={styles.deviceCard}>
              <View style={styles.deviceTitleRow}>
                <Smartphone color="#38BDF8" size={20} />
                <Text style={styles.deviceTitle}>Thông Tin Thiết Bị Đã Đăng Ký</Text>
              </View>

              <View style={styles.deviceDetail}>
                <Text style={styles.deviceLabel}>Mã định danh (UUID):</Text>
                <Text style={styles.deviceCode}>{deviceId || 'Đang nạp...'}</Text>
              </View>

              <View style={styles.deviceDetail}>
                <Text style={styles.deviceLabel}>Mẫu thiết bị & Hệ điều hành:</Text>
                <Text style={styles.deviceValue}>{deviceModel || 'N/A'}</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '85%',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  bodyScroll: {
    maxHeight: 480,
  },
  statusCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  onlineText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  offlineText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  infoGrid: {
    gap: 10,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  infoValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  syncNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    height: 46,
    gap: 8,
  },
  syncNowText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  deviceCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  deviceTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  deviceDetail: {
    marginBottom: 8,
  },
  deviceLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  deviceCode: {
    color: '#38BDF8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  deviceValue: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
