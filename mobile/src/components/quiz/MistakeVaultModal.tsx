import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  X,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  ArrowLeft,
  ChevronRight,
  Flame,
} from 'lucide-react-native';
import {
  mistakeVaultApi,
  type QuizMistakeItem,
  type MistakeAnswerResult,
  type CourseMistakeGroup,
  type LessonMistakeGroup,
} from '../../services/mistakeVaultApi';

interface MistakeVaultModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MistakeVaultModal: React.FC<MistakeVaultModalProps> = ({ visible, onClose }) => {
  const [courseGroups, setCourseGroups] = useState<CourseMistakeGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Chế độ làm bài liên tục cho bài học được chọn (Feature 5)
  const [activeLessonGroup, setActiveLessonGroup] = useState<LessonMistakeGroup | null>(null);
  const [practiceMistakes, setPracticeMistakes] = useState<QuizMistakeItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<MistakeAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGroupedMistakes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mistakeVaultApi.getGroupedMistakes(false);
      setCourseGroups(data);
    } catch {
      setCourseGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setActiveLessonGroup(null);
      fetchGroupedMistakes();
    }
  }, [visible, fetchGroupedMistakes]);

  // Bắt đầu làm bài liên tục cho 1 bài học cụ thể
  const handleStartPracticeLesson = async (lessonGroup: LessonMistakeGroup) => {
    setActiveLessonGroup(lessonGroup);
    setLoading(true);
    try {
      const session = await mistakeVaultApi.generatePracticeSession(
        lessonGroup.lessonId,
        lessonGroup.courseId
      );
      setPracticeMistakes(session.mistakes || lessonGroup.mistakes || []);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setAnswerResult(null);
    } catch {
      setPracticeMistakes(lessonGroup.mistakes || []);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setAnswerResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExitPractice = () => {
    setActiveLessonGroup(null);
    fetchGroupedMistakes();
  };

  const handleSelectOption = (optionId: number) => {
    if (answerResult) return;
    setSelectedOptionId(optionId);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || !currentMistake) return;
    setSubmitting(true);
    try {
      const res = await mistakeVaultApi.answerMistakeQuestion(currentMistake.id, selectedOptionId);
      setAnswerResult(res);
    } catch (err: any) {
      Alert.alert('Thông báo', err?.message || 'Có lỗi khi kiểm tra đáp án.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < practiceMistakes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setAnswerResult(null);
    } else {
      Alert.alert('Tuyệt vời!', 'Bạn đã hoàn thành các câu hỏi làm sai của bài học này!', [
        { text: 'Quay lại sổ câu sai', onPress: handleExitPractice },
      ]);
    }
  };

  const currentMistake = practiceMistakes[currentIndex];
  const totalMistakesCount = courseGroups.reduce((acc, c) => acc + c.unresolvedMistakes, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            {activeLessonGroup ? (
              <TouchableOpacity style={styles.exitButton} onPress={handleExitPractice}>
                <ArrowLeft color="#38BDF8" size={18} />
                <Text style={styles.exitButtonText}>Thoát luyện tập</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.titleWithIcon}>
                <BookOpen color="#38BDF8" size={20} />
                <Text style={styles.modalTitle}>Sổ Câu Sai ({totalMistakesCount} câu)</Text>
              </View>
            )}

            <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color="#38BDF8" style={{ marginVertical: 40 }} />
          ) : !activeLessonGroup ? (
            /* VIEW 1: PHÂN CẤP THEO KHÓA HỌC -> BÀI HỌC (FEATURE 5) */
            <ScrollView style={styles.scrollView}>
              {courseGroups.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Sparkles color="#10B981" size={36} />
                  <Text style={styles.emptyTitle}>Sổ câu sai hoàn toàn trống!</Text>
                  <Text style={styles.emptyDesc}>
                    Bạn chưa có câu trả lời sai nào hoặc đã sửa đúng toàn bộ các câu hỏi.
                  </Text>
                </View>
              ) : (
                courseGroups.map((cg) => (
                  <View key={cg.courseId} style={styles.courseGroupCard}>
                    <View style={styles.courseGroupHeader}>
                      <Text style={styles.courseGroupTitle}>{cg.courseTitle}</Text>
                      <Text style={styles.courseMistakeBadge}>{cg.unresolvedMistakes} câu sai</Text>
                    </View>

                    <View style={styles.lessonListContainer}>
                      {cg.lessons.map((lg) => (
                        <View key={lg.lessonId} style={styles.lessonRow}>
                          <View style={styles.lessonInfo}>
                            <Text style={styles.lessonTitleText} numberOfLines={1}>
                              {lg.lessonTitle}
                            </Text>
                            <Text style={styles.lessonMistakeCountText}>
                              Chứa {lg.unresolvedMistakes} câu làm sai
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.practiceBtn}
                            onPress={() => handleStartPracticeLesson(lg)}
                          >
                            <Text style={styles.practiceBtnText}>Làm liên tục</Text>
                            <ChevronRight color="#FFFFFF" size={14} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          ) : (
            /* VIEW 2: LÀM BÀI LIÊN TỤC CHO BÀI HỌC CỤ THỂ */
            <ScrollView style={styles.scrollView}>
              <View style={styles.practiceHeaderInfo}>
                <Text style={styles.activeLessonTitle}>
                  Bài: {activeLessonGroup.lessonTitle}
                </Text>
                <Text style={styles.progressCounter}>
                  Câu {currentIndex + 1} / {practiceMistakes.length}
                </Text>
              </View>

              {currentMistake ? (
                <View style={styles.questionCard}>
                  <Text style={styles.questionText}>{currentMistake.questionText}</Text>

                  {/* Options */}
                  <View style={styles.optionsContainer}>
                    {currentMistake.options.map((opt) => {
                      const isSelected = selectedOptionId === opt.id;
                      let optionStyle = styles.optionNormal;
                      let textColor = '#F8FAFC';

                      if (isSelected) {
                        optionStyle = styles.optionSelected;
                        textColor = '#38BDF8';
                      }

                      if (answerResult) {
                        if (opt.id === answerResult.correctOptionId) {
                          optionStyle = styles.optionCorrect;
                          textColor = '#10B981';
                        } else if (isSelected && !answerResult.isCorrect) {
                          optionStyle = styles.optionWrong;
                          textColor = '#EF4444';
                        }
                      }

                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.optionBase, optionStyle]}
                          disabled={Boolean(answerResult)}
                          onPress={() => handleSelectOption(opt.id)}
                        >
                          <Text style={[styles.optionText, { color: textColor }]}>
                            {opt.optionText}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Feedback Explanation */}
                  {answerResult && (
                    <View
                      style={[
                        styles.feedbackBox,
                        answerResult.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
                      ]}
                    >
                      <Text
                        style={[
                          styles.feedbackTitle,
                          answerResult.isCorrect ? styles.feedbackTextCorrect : styles.feedbackTextWrong,
                        ]}
                      >
                        {answerResult.isCorrect ? '✅ Chính xác!' : '❌ Chưa chính xác!'}
                      </Text>
                      {answerResult.explanation ? (
                        <Text style={styles.explanationText}>
                          Giải thích: {answerResult.explanation}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    {!answerResult ? (
                      <TouchableOpacity
                        style={[
                          styles.submitBtn,
                          (!selectedOptionId || submitting) && styles.btnDisabled,
                        ]}
                        disabled={!selectedOptionId || submitting}
                        onPress={handleSubmitAnswer}
                      >
                        <Text style={styles.submitBtnText}>
                          {submitting ? 'Đang chấm...' : 'Kiểm tra đáp án'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.nextBtn} onPress={handleNextQuestion}>
                        <Text style={styles.nextBtnText}>
                          {currentIndex < practiceMistakes.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành bài'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginLeft: 8,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56,189,248,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  exitButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginLeft: 6,
  },
  closeIcon: {
    padding: 4,
  },
  scrollView: {
    flexGrow: 0,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginVertical: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  courseGroupCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  courseGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  courseGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1,
    marginRight: 8,
  },
  courseMistakeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F43F5E',
    backgroundColor: 'rgba(244,63,94,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lessonListContainer: {
    gap: 8,
  },
  lessonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
  },
  lessonInfo: {
    flex: 1,
    marginRight: 10,
  },
  lessonTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  lessonMistakeCountText: {
    fontSize: 11,
    color: '#F43F5E',
    marginTop: 2,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  practiceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  practiceHeaderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeLessonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    flex: 1,
    marginRight: 8,
  },
  progressCounter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  questionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 14,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  optionBase: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionNormal: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  optionSelected: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: '#38BDF8',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: '#10B981',
  },
  optionWrong: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#EF4444',
  },
  optionText: {
    fontSize: 13,
  },
  feedbackBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: '#10B981',
  },
  feedbackWrong: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: '#EF4444',
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackTextCorrect: {
    color: '#10B981',
  },
  feedbackTextWrong: {
    color: '#EF4444',
  },
  explanationText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  nextBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
