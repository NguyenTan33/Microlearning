import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Smartphone,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  CloudCheck,
  Clock,
} from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSyncStore } from '../../src/store/useSyncStore';
import { getOrCreateDeviceId, getDeviceInfo } from '../../src/utils/deviceHelper';
import { formatTimeAgo } from '../../src/utils/formatters';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isSyncing, outboxCount, lastSyncTime, isOnline, triggerManualSync } = useSyncStore();

  const [deviceId, setDeviceId] = useState<string>('');
  const deviceInfo = getDeviceInfo();

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Tài khoản cá nhân" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card Thông tin học viên */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
            <User color="#FFFFFF" size={32} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user?.fullName || 'Học viên Microlearning'}</Text>
            <Text style={styles.userPhone}>{user?.phoneNumber || 'Chưa cập nhật SĐT'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Học viên tích cực</Text>
            </View>
          </View>
        </View>

        {/* Card Động cơ Đồng bộ Tự động (Zero-Manual Auto-Sync Engine) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Động cơ đồng bộ (Auto-Sync)</Text>
            {isOnline ? (
              <View style={styles.onlineBadge}>
                <Wifi color="#10B981" size={13} />
                <Text style={styles.onlineText}>Đã kết nối</Text>
              </View>
            ) : (
              <View style={styles.offlineBadge}>
                <WifiOff color="#F59E0B" size={13} />
                <Text style={styles.offlineText}>Ngoại tuyến</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardDesc}>
            Hệ thống tự động ghi nhận bài học khi mất mạng và tự động đồng bộ 2 chiều ngay khi có
            kết nối Wi-Fi/4G.
          </Text>

          <View style={styles.syncStatsRow}>
            <View style={styles.syncStatBox}>
              <Text style={styles.syncStatLabel}>Tác vụ chờ (Outbox)</Text>
              <Text
                style={[
                  styles.syncStatValue,
                  outboxCount > 0 && { color: '#F59E0B' },
                ]}
              >
                {outboxCount} mục
              </Text>
            </View>

            <View style={styles.syncStatBox}>
              <Text style={styles.syncStatLabel}>Đồng bộ gần nhất</Text>
              <Text style={styles.syncStatValue}>
                {lastSyncTime ? formatTimeAgo(lastSyncTime) : 'Vừa xong'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={triggerManualSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            <RefreshCw color="#C7D2FE" size={16} />
            <Text style={styles.syncButtonText}>
              {isSyncing ? 'Đang tự động đồng bộ...' : 'Thử đồng bộ ngay bây giờ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card Thông tin thiết bị */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Smartphone color="#94A3B8" size={18} />
              <Text style={styles.cardTitle}>Thiết bị học viên</Text>
            </View>
          </View>

          <View style={styles.deviceInfoList}>
            <View style={styles.deviceInfoRow}>
              <Text style={styles.deviceInfoLabel}>Mã định danh (ID):</Text>
              <Text style={styles.deviceInfoValue} numberOfLines={1}>
                {deviceId || 'Đang tạo...'}
              </Text>
            </View>
            <View style={styles.deviceInfoRow}>
              <Text style={styles.deviceInfoLabel}>Mẫu thiết bị:</Text>
              <Text style={styles.deviceInfoValue}>{deviceInfo.deviceModel}</Text>
            </View>
            <View style={styles.deviceInfoRow}>
              <Text style={styles.deviceInfoLabel}>Hệ điều hành:</Text>
              <Text style={styles.deviceInfoValue}>{deviceInfo.osVersion}</Text>
            </View>
          </View>
        </View>

        {/* Nút Đăng xuất */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut color="#EF4444" size={18} />
          <Text style={styles.logoutButtonText}>Đăng xuất khỏi tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B17',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  avatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  userPhone: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  onlineText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  offlineText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  syncStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  syncStatBox: {
    flex: 1,
    backgroundColor: '#070B17',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  syncStatLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
  },
  syncStatValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#C7D2FE',
    fontSize: 13,
    fontWeight: '600',
  },
  deviceInfoList: {
    gap: 8,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  deviceInfoLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  deviceInfoValue: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '60%',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
