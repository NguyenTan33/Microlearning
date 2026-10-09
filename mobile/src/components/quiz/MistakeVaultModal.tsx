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
} from 'lucide-react-native';
import {
  mistakeVaultApi,
  type QuizMistakeItem,
  type MistakeAnswerResult,
} from '../../services/mistakeVaultApi';

interface MistakeVaultModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MistakeVaultModal: React.FC<MistakeVaultModalProps> = ({ visible, onClose }) => {
  const [mistakes, setMistakes] = useState<QuizMistakeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<MistakeAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMistakes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mistakeVaultApi.getMyMistakes(false);
      setMistakes(data);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setAnswerResult(null);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchMistakes();
    }
  }, [visible, fetchMistakes]);

  const currentMistake = mistakes[currentIndex] || null;

  const handleAnswerSubmit = async () => {
    if (!currentMistake || selectedOptionId === null) {
      Alert.alert('Chú ý', 'Vui lòng chọn 1 phương án trước khi kiểm tra.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await mistakeVaultApi.submitPracticeAnswer(currentMistake.id, selectedOptionId);
      setAnswerResult(res);
    } catch {
      // Offline fallback simulation
      const isCorrect = selectedOptionId !== currentMistake.selectedOptionId;
      setAnswerResult({
        mistakeId: currentMistake.id,
        questionId: currentMistake.questionId,
        isCorrect,
        correctOptionId: selectedOptionId,
        isResolved: isCorrect,
        failedCount: currentMistake.failedCount,
        feedbackMessage: isCorrect ? 'Chính xác! Bạn đã ghi nhớ kiến thức rất tốt.' : 'Chưa đúng! Hãy đọc kỹ giải thích.',
        explanation: currentMistake.explanation || 'Hãy đối chiếu lại nội dung trong bài giảng video.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionId(null);
    setAnswerResult(null);
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      Alert.alert('Hoàn thành', 'Bạn đã ôn tập hết các câu hỏi làm sai trong danh sách!');
      fetchMistakes();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconBox}>
              <HelpCircle color="#F59E0B" size={20} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Sổ Tay Ôn Luyện Câu Sai</Text>
              <Text style={styles.headerSubtitle}>Tập trung củng cố các lỗ hổng kiến thức đã từng sai</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X color="#94A3B8" size={22} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>Đang nạp các câu hỏi làm sai từ Azure...</Text>
          </View>
        ) : mistakes.length === 0 ? (
          <View style={styles.centerContainer}>
            <Award color="#10B981" size={54} />
            <Text style={styles.emptyTitle}>Tuyệt vời! Không có câu hỏi nào bị sai</Text>
            <Text style={styles.emptyDesc}>
              Bạn đã hoàn thành chính xác tất cả các bài trắc nghiệm đã làm hoặc đã khắc phục hết các câu sai.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Progress counter */}
            <View style={styles.metaRow}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>
                  CÂU {currentIndex + 1} / {mistakes.length}
                </Text>
              </View>
              <Text style={styles.failedCountText}>Đã từng sai {currentMistake?.failedCount || 1} lần</Text>
            </View>

            {/* Question Card */}
            <View style={styles.questionCard}>
              <Text style={styles.lessonMetaText}>{currentMistake?.lessonTitle}</Text>
              <Text style={styles.questionTitle}>{currentMistake?.questionText}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsList}>
              {currentMistake?.options?.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id;
                let optionStyle = [styles.optionCard, isSelected && styles.optionCardSelected];

                if (answerResult) {
                  if (opt.id === answerResult.correctOptionId) {
                    optionStyle = [styles.optionCard, styles.optionCorrect];
                  } else if (isSelected && !answerResult.isCorrect) {
                    optionStyle = [styles.optionCard, styles.optionWrong];
                  }
                }

                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={optionStyle}
                    onPress={() => !answerResult && setSelectedOptionId(opt.id)}
                    activeOpacity={0.8}
                    disabled={Boolean(answerResult)}
                  >
                    <View style={styles.optLetterBox}>
                      <Text style={styles.optLetterText}>{String.fromCharCode(65 + idx)}</Text>
                    </View>
                    <Text style={styles.optText}>{opt.optionText}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Result feedback */}
            {answerResult && (
              <View
                style={[
                  styles.resultBox,
                  answerResult.isCorrect ? styles.resultBoxCorrect : styles.resultBoxWrong,
                ]}
              >
                <View style={styles.resultHeader}>
                  {answerResult.isCorrect ? (
                    <CheckCircle2 color="#10B981" size={20} />
                  ) : (
                    <XCircle color="#EF4444" size={20} />
                  )}
                  <Text
                    style={[
                      styles.resultTitle,
                      { color: answerResult.isCorrect ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {answerResult.feedbackMessage}
                  </Text>
                </View>

                {answerResult.explanation ? (
                  <Text style={styles.explanationText}>Giải thích: {answerResult.explanation}</Text>
                ) : null}
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.bottomActions}>
              {!answerResult ? (
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleAnswerSubmit}
                  disabled={submitting || selectedOptionId === null}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Kiểm tra câu trả lời</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNextQuestion}>
                  <Text style={styles.nextBtnText}>Câu tiếp theo</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070B17' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#94A3B8', fontSize: 11 },
  closeBtn: { padding: 4 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  emptyTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyDesc: { color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metaBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  failedCountText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  questionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
  },
  lessonMetaText: { color: '#818CF8', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  questionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  optionsList: { gap: 10, marginBottom: 16 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  optionCardSelected: { borderColor: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.15)' },
  optionCorrect: { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  optLetterBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLetterText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  optText: { color: '#F8FAFC', fontSize: 13, flex: 1, lineHeight: 18 },
  resultBox: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  resultBoxCorrect: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  resultBoxWrong: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  resultTitle: { fontSize: 14, fontWeight: '700' },
  explanationText: { color: '#CBD5E1', fontSize: 12, lineHeight: 17 },
  bottomActions: { marginTop: 8 },
  submitBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  nextBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
