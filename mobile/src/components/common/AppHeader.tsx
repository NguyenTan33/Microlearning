import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame, Sparkles, User as UserIcon, LogOut } from 'lucide-react-native';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  streakCount?: number;
  showStreak?: boolean;
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  streakCount = 0,
  showStreak = false,
  onProfilePress,
  onLogoutPress,
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftSection}>
        <View style={styles.logoBadge}>
          <Sparkles color="#6366F1" size={16} />
        </View>
        <View>
          <Text style={styles.titleText}>{title}</Text>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Chỉ hiện ngọn lửa Streak khi được chỉ định rõ (Màn hình Học tập) */}
        {showStreak && streakCount > 0 && (
          <View style={styles.streakBadge}>
            <Flame color="#F59E0B" size={15} fill="#F59E0B" />
            <Text style={styles.streakText}>{streakCount}</Text>
          </View>
        )}

        {onProfilePress && (
          <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.8}>
            <UserIcon color="#94A3B8" size={17} />
          </TouchableOpacity>
        )}

        {onLogoutPress && (
          <TouchableOpacity style={styles.logoutButton} onPress={onLogoutPress} activeOpacity={0.8}>
            <LogOut color="#EF4444" size={16} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#070B17',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  logoutButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
});
