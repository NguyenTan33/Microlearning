import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, HelpCircle, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react-native';
import { mistakeVaultApi, QuizMistakeItem } from '../../services/mistakeVaultApi';

interface MistakeVaultModalProps {
  visible: boolean;
  onClose: () => void;
  onRetakeQuiz?: (lessonId: number) => void;
}

export const MistakeVaultModal: React.FC<MistakeVaultModalProps> = ({
  visible,
  onClose,
  onRetakeQuiz,
}) => {
  const [mistakes, setMistakes] = useState<QuizMistakeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMistakes = async () => {
    setLoading(true);
    try {
      const data = await mistakeVaultApi.getMistakes();
      setMistakes(data);
    } catch {
      setMistakes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadMistakes();
    }
  }, [visible]);

  const handleClearMistake = async (questionId: number) => {
    try {
      await mistakeVaultApi.removeMistake(questionId);
      setMistakes(mistakes.filter((m) => m.questionId !== questionId));
    } catch {
      Alert.alert('Lỗi', 'Không thể xóa câu hỏi.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <AlertTriangle color="#F59E0B" size={24} />
              <Text style={styles.modalTitle}>Kho Ôn Lại Câu Hỏi Sai</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
          ) : mistakes.length === 0 ? (
            <View style={styles.emptyBox}>
              <CheckCircle2 color="#10B981" size={48} />
              <Text style={styles.emptyTitle}>Tuyệt vời! Bạn không có câu sai nào</Text>
              <Text style={styles.emptySub}>
                Tất cả các câu trắc nghiệm bạn đã làm đều đạt kết quả tốt.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.mistakesList}>
              {mistakes.map((m) => (
                <View key={m.id || m.questionId} style={styles.mistakeCard}>
                  <Text style={styles.lessonTag}>Bài học: {m.lessonTitle}</Text>
                  <Text style={styles.questionText}>{m.questionText}</Text>

                  <View style={styles.answerBox}>
                    <Text style={styles.userAnswerText}>
                      ❌ Bạn đã chọn: {m.options[m.userAnswer] || `Đáp án ${m.userAnswer + 1}`}
                    </Text>
                    <Text style={styles.correctAnswerText}>
                      ✅ Đáp án đúng: {m.options[m.correctAnswer] || `Đáp án ${m.correctAnswer + 1}`}
                    </Text>
                    {m.explanation && <Text style={styles.explanationText}>💡 {m.explanation}</Text>}
                  </View>

                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={styles.clearBtn}
                      onPress={() => handleClearMistake(m.questionId)}
                    >
                      <Text style={styles.clearBtnText}>Đã hiểu (Xóa)</Text>
                    </TouchableOpacity>

                    {onRetakeQuiz && (
                      <TouchableOpacity
                        style={styles.retakeBtn}
                        onPress={() => {
                          onClose();
                          onRetakeQuiz(m.lessonId);
                        }}
                      >
                        <RotateCcw color="#FFFFFF" size={16} />
                        <Text style={styles.retakeBtnText}>Làm lại Quiz</Text>
                      </TouchableOpacity>
                    )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    maxHeight: '85%',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
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
    gap: 10,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  mistakesList: {
    maxHeight: 450,
  },
  mistakeCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  lessonTag: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  questionText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 10,
  },
  answerBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  userAnswerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  correctAnswerText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  explanationText: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#334155',
    borderRadius: 10,
  },
  clearBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#6366F1',
    borderRadius: 10,
  },
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
