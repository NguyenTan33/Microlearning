import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame, Crown, Shield } from 'lucide-react-native';

interface StreakCrownBadgeProps {
  streakCount: number;
  isCrownActive?: boolean;
  onPress?: () => void;
}

export const StreakCrownBadge: React.FC<StreakCrownBadgeProps> = ({
  streakCount,
  isCrownActive = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.badgeContainer}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.flameBox}>
        <Flame color="#F59E0B" size={16} fill="#F59E0B" />
        <Text style={styles.streakText}>{streakCount}</Text>
      </View>

      {isCrownActive ? (
        <View style={styles.crownBox}>
          <Crown color="#EAB308" size={14} fill="#EAB308" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  flameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
  },
  crownBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderRadius: 10,
    padding: 3,
  },
});
