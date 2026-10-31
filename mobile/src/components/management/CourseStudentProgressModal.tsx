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
import { X, Users, Award, CheckCircle2, User, BookOpen, ChevronRight, Play, FileQuestion } from 'lucide-react-native';
import {
  studentAnalyticsApi,
  StudentProgressDetail,
  StudentCourseAnalyticsDetail,
} from '../../services/studentAnalyticsApi';

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

  // Sub-modal chi tiết từng bài học của sinh viên
  const [selectedStudent, setSelectedStudent] = useState<StudentProgressDetail | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentCourseAnalyticsDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const handleOpenStudentDetail = async (st: StudentProgressDetail) => {
    setSelectedStudent(st);
    setLoadingDetail(true);
    try {
      const res = await studentAnalyticsApi.getStudentCourseDetail(courseId, st.accountId);
      setStudentDetail(res);
    } catch {
      setStudentDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

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
                <TouchableOpacity
                  key={st.accountId}
                  style={styles.studentCard}
                  activeOpacity={0.7}
                  onPress={() => handleOpenStudentDetail(st)}
                >
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

                    {/* 1. Tiến độ Video */}
                    <View style={styles.metricBlock}>
                      <View style={styles.metricLabelRow}>
                        <Text style={styles.metricLabel}>🎬 Xem video:</Text>
                        <Text style={styles.metricVal}>
                          {st.completedLessons}/{st.totalLessons} bài ({st.progressPercent}%)
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFillVideo,
                            { width: `${Math.min(100, st.progressPercent)}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* 2. Tiến độ Bài tập Quiz */}
                    <View style={styles.metricBlock}>
                      <View style={styles.metricLabelRow}>
                        <Text style={styles.metricLabel}>📝 Làm bài tập:</Text>
                        <Text style={styles.metricValQuiz}>
                          {st.completedQuizzes || 0}/{st.totalQuizzesInCourse || 0} bài ({st.quizCompletionPercent || 0}%) • ĐTB: {st.averageQuizScore || 0}đ
                        </Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFillQuiz,
                            { width: `${Math.min(100, st.quizCompletionPercent || 0)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  <ChevronRight color="#64748B" size={18} style={{ alignSelf: 'center' }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Sub-modal: Xem chi tiết từng bài học & Quiz của sinh viên */}
          {selectedStudent && (
            <Modal visible={true} animationType="slide" transparent onRequestClose={() => setSelectedStudent(null)}>
              <View style={styles.subModalOverlay}>
                <View style={styles.subModalContent}>
                  <View style={styles.modalHeader}>
                    <View style={styles.titleRow}>
                      <BookOpen color="#A855F7" size={20} />
                      <Text style={styles.modalTitle} numberOfLines={1}>
                        Chi tiết: {selectedStudent.fullName}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedStudent(null)}>
                      <X color="#94A3B8" size={20} />
                    </TouchableOpacity>
                  </View>

                  {loadingDetail ? (
                    <ActivityIndicator color="#A855F7" style={{ marginVertical: 32 }} />
                  ) : !studentDetail || !studentDetail.lessons || studentDetail.lessons.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>Chưa có dữ liệu bài giảng của sinh viên.</Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.studentList}>
                      {studentDetail.lessons.map((les) => (
                        <View key={les.lessonId} style={styles.lessonDetailCard}>
                          <Text style={styles.lessonDetailTitle}>{les.lessonTitle}</Text>
                          
                          <View style={styles.lessonMetaRow}>
                            <Text style={styles.lessonMetaText}>
                              Video: {les.watchedPercent}% {les.isVideoCompleted ? '✅' : '⏳'}
                            </Text>
                            <Text style={styles.lessonMetaText}>
                              Quiz: {les.completedQuizzes}/{les.totalQuizzes} hoàn thành
                            </Text>
                          </View>

                          {les.quizzes && les.quizzes.length > 0 ? (
                            <View style={styles.quizListContainer}>
                              {les.quizzes.map((q) => (
                                <View key={q.quizId} style={styles.quizRow}>
                                  <Text style={styles.quizTitleText} numberOfLines={1}>• {q.quizTitle}</Text>
                                  <Text style={[styles.quizScoreText, q.isPassed ? styles.quizPassed : styles.quizFailed]}>
                                    {q.isPassed ? `Đạt: ${q.score}đ` : (q.score > 0 ? `Chưa đạt: ${q.score}đ` : 'Chưa nộp')}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.noQuizText}>Bài này không có quiz trắc nghiệm</Text>
                          )}
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  subModalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#0B1024',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  emptyBox: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  studentList: {
    flexGrow: 0,
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(6,182,212,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  studentInfoGroup: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginRight: 6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 4,
  },
  subText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    marginBottom: 6,
  },
  metricBlock: {
    marginTop: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '700',
  },
  metricValQuiz: {
    fontSize: 10,
    color: '#C084FC',
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFillVideo: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 3,
  },
  progressFillQuiz: {
    height: '100%',
    backgroundColor: '#9333EA',
    borderRadius: 3,
  },
  lessonDetailCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  lessonDetailTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lessonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  lessonMetaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  quizListContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 4,
  },
  quizRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  quizTitleText: {
    fontSize: 11,
    color: '#E2E8F0',
    flex: 1,
    marginRight: 6,
  },
  quizScoreText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quizPassed: {
    color: '#10B981',
  },
  quizFailed: {
    color: '#F43F5E',
  },
  noQuizText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
  },
});
