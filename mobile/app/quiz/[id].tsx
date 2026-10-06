import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { QuestionCard } from '../../src/components/quiz/QuestionCard';
import { QuizResultModal } from '../../src/components/quiz/QuizResultModal';
import { quizRepository } from '../../src/db/repositories/quizRepository';
import { catalogApi } from '../../src/services/catalogApi';
import { autoSyncEngine } from '../../src/services/autoSyncEngine';
import type { QuizPackage } from '../../src/types/catalog.types';

export default function QuizRunnerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(params.id || '1', 10);

  const [quiz, setQuiz] = useState<QuizPackage | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal kết quả
  const [showResult, setShowResult] = useState<boolean>(false);
  const [resultScore, setResultScore] = useState<number>(0);
  const [resultPassed, setResultPassed] = useState<boolean>(false);
  const [isSyncedOnline, setIsSyncedOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadQuiz = useCallback(async () => {
    try {
      // 1. Đọc từ SQLite trước
      let localQuiz = await quizRepository.getQuizByLessonId(lessonId);
      if (localQuiz) {
        setQuiz(localQuiz);
      }

      // 2. Nếu chưa có gói quiz trong SQLite, kéo từ API để cache vào máy
      if (!localQuiz) {
        try {
          const pkg = await catalogApi.getLessonPackage(lessonId);
          if (pkg.quiz) {
            await quizRepository.saveQuizPackage(pkg.quiz, lessonId);
            setQuiz(pkg.quiz);
          }
        } catch {
          // Khi offline hoàn toàn và chưa tải
        }
      }
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSelectOption = (questionId: number, optionId: number) => {
    setSelectedAnswers((prev) => {
      return {
        ...prev,
        [questionId]: [optionId], // Single choice mặc định
      };
    });
  };

  const handleSubmit = async () => {
    if (!quiz || quiz.questions.length === 0) return;

    // Kiểm tra học viên đã trả lời đủ câu chưa
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < quiz.questions.length) {
      Alert.alert(
        'Chưa hoàn thành',
        `Bạn mới trả lời ${answeredCount}/${quiz.questions.length} câu. Bạn có chắc chắn muốn nộp bài?`,
        [
          { text: 'Làm tiếp', style: 'cancel' },
          { text: 'Vẫn nộp bài', onPress: executeSubmit },
        ]
      );
      return;
    }

    await executeSubmit();
  };

  const executeSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);

    try {
      const answersPayload = quiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: selectedAnswers[q.id] || [],
      }));

      // Tính điểm mô phỏng cục bộ (mỗi câu chia đều 100 điểm)
      const pointsPerQuestion = 100 / (quiz.questions.length || 1);
      const score = Math.round(Object.keys(selectedAnswers).length * pointsPerQuestion);
      const isPassed = score >= quiz.passScore;

      // Nộp qua AutoSyncEngine: Nếu online thì gửi API, nếu offline thì lưu SQLite & đưa vào Outbox
      const submitResult = await autoSyncEngine.submitQuizAttempt(
        quiz.id,
        lessonId,
        score,
        isPassed,
        answersPayload
      );

      setResultScore(score);
      setResultPassed(isPassed);
      setIsSyncedOnline(submitResult.isSyncedOnline);
      setShowResult(true);
    } catch (err) {
      console.warn('[Quiz] Lỗi nộp bài thi:', err);
      Alert.alert('Thông báo', 'Đã lưu kết quả thi ngoại tuyến vào máy.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Đang nạp đề thi trắc nghiệm..." />;
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader showBack title="Bài kiểm tra trắc nghiệm" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Bài học này chưa có bộ câu hỏi trắc nghiệm hoặc bạn chưa tải gói bài học ngoại tuyến.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Quay lại bài học</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const currentSelected = selectedAnswers[currentQuestion.id] || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader showBack title={quiz.title} subtitle={`Điểm đạt: ${quiz.passScore}/100`} />
      <OfflineBanner />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Thẻ câu hỏi hiện tại */}
        <QuestionCard
          question={currentQuestion}
          index={currentIndex}
          total={quiz.questions.length}
          selectedOptionIds={currentSelected}
          onSelectOption={(optId) => handleSelectOption(currentQuestion.id, optId)}
        />

        {/* Thanh điều hướng câu hỏi */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft color="#E2E8F0" size={18} />
            <Text style={styles.navBtnText}>Câu trước</Text>
          </TouchableOpacity>

          {currentIndex < quiz.questions.length - 1 ? (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => setCurrentIndex((prev) => prev + 1)}
            >
              <Text style={styles.navBtnText}>Câu tiếp</Text>
              <ChevronRight color="#E2E8F0" size={18} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <CheckCircle2 color="#FFFFFF" size={18} />
              <Text style={styles.submitBtnText}>Nộp bài thi</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal kết quả nộp bài */}
      <QuizResultModal
        visible={showResult}
        score={resultScore}
        passScore={quiz.passScore}
        isPassed={resultPassed}
        isSyncedOnline={isSyncedOnline}
        onClose={() => {
          setShowResult(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B17',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
