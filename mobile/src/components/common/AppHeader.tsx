import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame, Sparkles, User as UserIcon } from 'lucide-react-native';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  streakCount?: number;
  onProfilePress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  streakCount = 0,
  onProfilePress,
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
        <View style={styles.streakBadge}>
          <Flame color="#F59E0B" size={16} fill="#F59E0B" />
          <Text style={styles.streakText}>{streakCount}</Text>
        </View>

        <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.8}>
          <UserIcon color="#94A3B8" size={18} />
        </TouchableOpacity>
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
    fontSize: 17,
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
    gap: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 13,
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
});
