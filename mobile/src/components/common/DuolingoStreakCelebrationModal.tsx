import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Flame, Sparkles, Zap, ArrowRight } from 'lucide-react-native';

interface DuolingoStreakCelebrationModalProps {
  visible: boolean;
  streakCount: number;
  message?: string;
  onClose: () => void;
}

export const DuolingoStreakCelebrationModal: React.FC<DuolingoStreakCelebrationModalProps> = ({
  visible,
  streakCount,
  message,
  onClose,
}) => {
  const [scaleAnim] = useState(new Animated.Value(0.3));
  const [bounceAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.3);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, scaleAnim, bounceAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.contentCard, { transform: [{ scale: scaleAnim }] }]}>
          {/* Flame Badge */}
          <Animated.View style={[styles.flameContainer, { transform: [{ scale: bounceAnim }] }]}>
            <View style={styles.flameGlow} />
            <View style={styles.flameCircle}>
              <Flame color="#F59E0B" size={48} fill="#F59E0B" />
              <Sparkles color="#FDE047" size={20} style={styles.sparkleIcon} />
            </View>
            <View style={styles.plusBadge}>
              <Text style={styles.plusBadgeText}>+1 🔥</Text>
            </View>
          </Animated.View>

          {/* Number & Title */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>{streakCount}</Text>
            <Text style={styles.daysUnitText}>NGÀY STREAK</Text>
          </View>

          <Text style={styles.celebrationTitle}>CHUỖI HỌC TẬP BÙNG CHÁY!</Text>
          <Text style={styles.celebrationDesc}>
            {message || 'Tuyệt vời! Bạn đã duy trì thói quen học tập Micro-lesson hôm nay.'}
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Tiếp Tục Học Tập</Text>
            <ArrowRight color="#FFFFFF" size={18} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 24, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentCard: {
    width: '100%',
    backgroundColor: '#090D1A',
    borderColor: '#F59E0B',
    borderWidth: 2,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  flameContainer: {
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  flameCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1E1B4B',
    borderColor: '#F59E0B',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  plusBadge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  plusBadgeText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  countText: {
    color: '#F59E0B',
    fontSize: 48,
    fontWeight: '900',
  },
  daysUnitText: {
    color: '#FDE047',
    fontSize: 18,
    fontWeight: '800',
  },
  celebrationTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    gap: 8,
  },
  continueBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
});
