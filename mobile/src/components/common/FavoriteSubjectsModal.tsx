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
import { X, Heart, BookOpen, Trash2, ArrowRight } from 'lucide-react-native';
import { favoriteSubjectApi, FavoriteSubjectItem } from '../../services/favoriteSubjectApi';

interface FavoriteSubjectsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSubject?: (subjectId: number) => void;
}

export const FavoriteSubjectsModal: React.FC<FavoriteSubjectsModalProps> = ({
  visible,
  onClose,
  onSelectSubject,
}) => {
  const [favorites, setFavorites] = useState<FavoriteSubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const data = await favoriteSubjectApi.getFavoriteSubjects();
      setFavorites(data);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadFavorites();
    }
  }, [visible]);

  const handleRemove = async (subjectId: number) => {
    try {
      await favoriteSubjectApi.removeFavoriteSubject(subjectId);
      setFavorites(favorites.filter((f) => f.subjectId !== subjectId));
    } catch {
      Alert.alert('Lỗi', 'Không thể xóa khỏi yêu thích.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Heart color="#EF4444" size={24} fill="#EF4444" />
              <Text style={styles.modalTitle}>Môn Học Yêu Thích</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color="#94A3B8" size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 30 }} />
          ) : favorites.length === 0 ? (
            <View style={styles.emptyBox}>
              <BookOpen color="#64748B" size={48} />
              <Text style={styles.emptyTitle}>Chưa có môn học yêu thích nào</Text>
              <Text style={styles.emptySub}>
                Nhấp vào biểu tượng Trái tim ở các môn học để lưu vào đây xem nhanh.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.favoritesList}>
              {favorites.map((fav) => (
                <View key={fav.subjectId} style={styles.favCard}>
                  <View style={styles.favInfo}>
                    <Text style={styles.favTitle}>{fav.subjectTitle}</Text>
                    <Text style={styles.favCourse}>Khóa học: {fav.courseTitle}</Text>
                    <Text style={styles.favCount}>{fav.totalLessons} bài học</Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleRemove(fav.subjectId)}
                    >
                      <Trash2 color="#EF4444" size={18} />
                    </TouchableOpacity>

                    {onSelectSubject && (
                      <TouchableOpacity
                        style={styles.openBtn}
                        onPress={() => {
                          onClose();
                          onSelectSubject(fav.subjectId);
                        }}
                      >
                        <ArrowRight color="#FFFFFF" size={18} />
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
  favoritesList: {
    maxHeight: 400,
  },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  favInfo: {
    flex: 1,
    marginRight: 10,
  },
  favTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  favCourse: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 2,
  },
  favCount: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
  },
  openBtn: {
    padding: 8,
    backgroundColor: '#6366F1',
    borderRadius: 10,
  },
});
