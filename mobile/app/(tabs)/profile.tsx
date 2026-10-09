import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User as UserIcon,
  LogOut,
  Wifi,
  Smartphone,
  RefreshCw,
  Flame,
  Trophy,
  ShieldCheck,
  ChevronRight,
  BookOpen,
} from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { useAuthStore } from '../../src/store/useAuthStore';
import { outboxRepository } from '../../src/db/repositories/outboxRepository';
import { autoSyncEngine } from '../../src/services/autoSyncEngine';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [wifiOnly, setWifiOnly] = useState(true);
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    outboxRepository.getPendingCount().then(setPendingOutboxCount);
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await autoSyncEngine.runSyncProcess();
    const count = await outboxRepository.getPendingCount();
    setPendingOutboxCount(count);
    setSyncing(false);
    Alert.alert('Đồng bộ thành công', 'Toàn bộ dữ liệu học tập đã được cập nhật với Server.');
  };

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
      <AppHeader title="Hồ sơ cá nhân" subtitle="Cài đặt & Trạng thái tài khoản" />
      <OfflineBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <UserIcon color="#818CF8" size={32} />
          </View>

          <Text style={styles.userName}>{user?.fullName || 'Học viên Microlearning'}</Text>
          <Text style={styles.userPhone}>{user?.phoneNumber || '09xxxxxx'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Flame color="#F59E0B" size={16} fill="#F59E0B" />
              <Text style={styles.statText}>5 Ngày Streak</Text>
            </View>

            <View style={styles.statBadge}>
              <Trophy color="#8B5CF6" size={16} />
              <Text style={styles.statText}>340 XP</Text>
            </View>
          </View>
        </View>

        {/* Sync Center Status Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Trạng thái Đồng bộ CSDL</Text>

          <View style={styles.syncRow}>
            <View style={styles.syncLeft}>
              <RefreshCw color="#6366F1" size={20} />
              <View>
                <Text style={styles.syncTitle}>Hàng đợi chờ đẩy (Outbox)</Text>
                <Text style={styles.syncSubText}>
                  {pendingOutboxCount === 0
                    ? 'Tất cả dữ liệu đã được đồng bộ an toàn'
                    : `Còn ${pendingOutboxCount} bản ghi chưa đẩy lên Server`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.syncButton}
              onPress={handleManualSync}
              disabled={syncing}
            >
              <Text style={styles.syncButtonText}>{syncing ? '...' : 'Ép đồng bộ'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cài đặt ứng dụng</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Wifi color="#818CF8" size={20} />
              <View>
                <Text style={styles.settingTitle}>Chỉ đồng bộ qua Wi-Fi</Text>
                <Text style={styles.settingSubText}>Tiết kiệm dung lượng mạng di động 4G/5G</Text>
              </View>
            </View>

            <Switch
              value={wifiOnly}
              onValueChange={setWifiOnly}
              trackColor={{ false: '#1E293B', true: '#6366F1' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Smartphone color="#818CF8" size={20} />
              <View>
                <Text style={styles.settingTitle}>Thiết bị đã đăng ký</Text>
                <Text style={styles.settingSubText}>Quản lý hardware device ID an toàn</Text>
              </View>
            </View>
            <ChevronRight color="#475569" size={18} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut color="#F43F5E" size={18} />
          <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  profileCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 12,
  },
  userName: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  userPhone: { color: '#94A3B8', fontSize: 13, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B17',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  sectionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  sectionTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginBottom: 14 },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  syncLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 10 },
  syncTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  syncSubText: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  syncButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  syncButtonText: { color: '#818CF8', fontSize: 12, fontWeight: '700' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  settingSubText: { color: '#64748B', fontSize: 11, marginTop: 2 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    marginTop: 8,
  },
  logoutText: { color: '#F43F5E', fontSize: 15, fontWeight: '700' },
});
