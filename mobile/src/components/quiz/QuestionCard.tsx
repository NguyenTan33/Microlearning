import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import type { QuizQuestion } from '../../types/catalog.types';

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  total: number;
  selectedOptionIds: number[];
  onSelectOption: (optionId: number) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  total,
  selectedOptionIds,
  onSelectOption,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.stepText}>
          Câu hỏi {index + 1} / {total}
        </Text>
        <Text style={styles.pointsText}>{question.points} điểm</Text>
      </View>

      <Text style={styles.questionText}>{question.content}</Text>

      <View style={styles.optionsList}>
        {question.options.map((option, optIdx) => {
          const isSelected = selectedOptionIds.includes(option.id);
          const optionLabel = String.fromCharCode(65 + optIdx); // A, B, C, D

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionItem, isSelected && styles.optionItemSelected]}
              onPress={() => onSelectOption(option.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.labelBadge, isSelected && styles.labelBadgeSelected]}>
                {isSelected ? (
                  <Check color="#FFFFFF" size={14} />
                ) : (
                  <Text style={styles.labelText}>{optionLabel}</Text>
                )}
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.optionText}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '600',
  },
  pointsText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  questionText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 18,
  },
  optionsList: {
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1120',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: '#6366F1',
  },
  labelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  labelBadgeSelected: {
    backgroundColor: '#6366F1',
  },
  labelText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  optionText: {
    color: '#CBD5E1',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
