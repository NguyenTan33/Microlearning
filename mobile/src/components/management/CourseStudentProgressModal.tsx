import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, Users, Award, CheckCircle2, User } from 'lucide-react-native';
import { studentAnalyticsApi, StudentProgressDetail } from '../../services/studentAnalyticsApi';

interface CourseStudentProgressModalProps {
  visible: boolean;
  courseId: number;
  courseTitle: string;
  onClose: () => void;
}

export const CourseStudentProgressModal: React.FC<CourseStudentProgressModalProps> = ({
  visible,
  courseId,
  courseTitle,
  onClose,
}) => {
  const [students, setStudents] = useState<StudentProgressDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && courseId) {
      setLoading(true);
      studentAnalyticsApi
        .getStudentsProgress(courseId)
        .then((data) => setStudents(data))
        .catch(() => setStudents([]))
        .finally(() => setLoading(false));
    }
  }, [visible, courseId]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Users color="#06B6D4" size={20} />
              <Text style={styles.modalTitle} numberOfLines={1}>
                Tiến Độ Học Viên: {courseTitle}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#06B6D4" style={{ marginVertical: 32 }} />
          ) : !Array.isArray(students) || students.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Chưa có thông tin tiến độ học viên.</Text>
            </View>
          ) : (
            <ScrollView style={styles.studentList}>
              {(Array.isArray(students) ? students : []).map((st) => (
                <View key={st.accountId} style={styles.studentCard}>
                  <View style={styles.avatarCircle}>
                    <User color="#06B6D4" size={18} />
                  </View>

                  <View style={styles.studentInfoGroup}>
                    <View style={styles.nameRow}>
                      <Text style={styles.studentName}>{st.fullName}</Text>
                      {st.hasCompletedCourse ? (
                        <View style={styles.completedBadge}>
                          <CheckCircle2 color="#10B981" size={12} />
                          <Text style={styles.completedText}>Hoàn thành</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.subText}>{st.phoneNumber || st.email || 'Học viên'}</Text>

                    {/* Progress Bar */}
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, st.progressPercent)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPercentText}>{st.progressPercent}%</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
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
    borderColor: 'rgba(6, 182, 212, 0.3)',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#0E1428',
    borderRadius: 12,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  studentList: {
    maxHeight: 440,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B18',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfoGroup: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  studentName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  subText: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#0E1428',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 3,
  },
  progressPercentText: {
    color: '#06B6D4',
    fontSize: 11,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
});
