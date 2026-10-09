import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Award, AlertCircle, CheckCircle2, CloudUpload } from 'lucide-react-native';

interface QuizResultModalProps {
  visible: boolean;
  score: number;
  passScore: number;
  isPassed: boolean;
  isSyncedOnline: boolean;
  onClose: () => void;
}

export const QuizResultModal: React.FC<QuizResultModalProps> = ({
  visible,
  score,
  passScore,
  isPassed,
  isSyncedOnline,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View
            style={[
              styles.iconWrapper,
              isPassed ? styles.iconWrapperPass : styles.iconWrapperFail,
            ]}
          >
            {isPassed ? (
              <Award color="#10B981" size={40} />
            ) : (
              <AlertCircle color="#EF4444" size={40} />
            )}
          </View>

          <Text style={styles.title}>
            {isPassed ? 'Chúc mừng! Bạn đã vượt qua' : 'Chưa đạt điểm yêu cầu'}
          </Text>

          <Text style={styles.scoreText}>
            {score} <Text style={styles.totalScore}>/ 100 điểm</Text>
          </Text>

          <Text style={styles.description}>
            {isPassed
              ? `Bạn đã đạt trên mức điểm tối thiểu (${passScore} điểm) để hoàn thành bài thi trắc nghiệm này.`
              : `Mức điểm tối thiểu là ${passScore} điểm. Bạn có thể xem lại video bài giảng và thi lại bất kỳ lúc nào.`}
          </Text>

          {/* Trạng thái lưu trữ & đồng bộ */}
          <View style={styles.syncStatusCard}>
            {isSyncedOnline ? (
              <>
                <CheckCircle2 color="#10B981" size={16} />
                <Text style={styles.syncStatusText}>
                  Điểm số đã được ghi nhận trực tuyến lên Server.
                </Text>
              </>
            ) : (
              <>
                <CloudUpload color="#38BDF8" size={16} />
                <Text style={styles.syncStatusText}>
                  Đã lưu kết quả Offline vào máy. Dữ liệu sẽ tự động đồng bộ khi có mạng lại.
                </Text>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.actionButtonText}>Hoàn tất</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapperPass: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  iconWrapperFail: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  scoreText: {
    color: '#6366F1',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  totalScore: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  description: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  syncStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1120',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  syncStatusText: {
    color: '#CBD5E1',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    width: '100%',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
