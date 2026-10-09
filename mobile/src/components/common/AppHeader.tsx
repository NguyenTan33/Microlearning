import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, WifiOff, RefreshCw } from 'lucide-react-native';
import { useSyncStore } from '../../store/useSyncStore';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'MicroLearn',
  subtitle,
  showBack = false,
  rightAction,
}) => {
  const router = useRouter();
  const { isSyncing, outboxCount, isOnline } = useSyncStore();

  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft color="#E2E8F0" size={22} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {!isOnline && (
          <View style={styles.offlinePill}>
            <WifiOff color="#F59E0B" size={13} />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}

        {isSyncing && (
          <View style={styles.syncingPill}>
            <RefreshCw color="#38BDF8" size={13} />
            <Text style={styles.syncingText}>Đồng bộ...</Text>
          </View>
        )}

        {outboxCount > 0 && !isSyncing && (
          <View style={styles.pendingPill}>
            <Text style={styles.pendingText}>{outboxCount} chờ</Text>
          </View>
        )}

        {rightAction}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#070B17',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  syncingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  syncingText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  pendingPill: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pendingText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
  },
});
