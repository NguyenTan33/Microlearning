import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Heart, BookOpen, Layers, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  favoriteSubjectApi,
  type FavoriteSubject,
} from '../../services/favoriteSubjectApi';

interface FavoriteSubjectsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FavoriteSubjectsModal: React.FC<FavoriteSubjectsModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteSubject[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await favoriteSubjectApi.getMyFavorites();
      setFavorites(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadFavorites();
    }
  }, [visible, loadFavorites]);

  const handleOpenSubject = (item: FavoriteSubject) => {
    onClose();
    router.push(`/course/${item.courseId}`);
  };

  const handleRemoveFavorite = async (subjectId: number) => {
    await favoriteSubjectApi.toggleFavorite(subjectId);
    setFavorites((prev) => prev.filter((f) => f.subjectId !== subjectId));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconBox}>
              <Heart color="#EC4899" size={20} fill="#EC4899" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Môn Học Yêu Thích</Text>
              <Text style={styles.headerSubtitle}>Danh sách các học phần bạn đã thả tim</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X color="#94A3B8" size={22} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#EC4899" />
            <Text style={styles.loadingText}>Đang nạp danh sách yêu thích...</Text>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.centerContainer}>
            <Heart color="#475569" size={54} />
            <Text style={styles.emptyTitle}>Chưa có môn học yêu thích</Text>
            <Text style={styles.emptyDesc}>
              Bấm biểu tượng Trái tim trong danh sách bài giảng hoặc học phần để ghim vào mục yêu thích.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.countText}>Đang lưu {favorites.length} môn học yêu thích</Text>

            {favorites.map((f) => (
              <TouchableOpacity
                key={f.subjectId}
                style={styles.card}
                onPress={() => handleOpenSubject(f)}
                activeOpacity={0.8}
              >
                <View style={styles.cardMain}>
                  <View style={styles.badgeBox}>
                    <Layers color="#EC4899" size={18} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.subjectTitle} numberOfLines={1}>
                      {f.title}
                    </Text>
                    <Text style={styles.courseTitle} numberOfLines={1}>
                      Khóa: {f.courseTitle}
                    </Text>
                    <Text style={styles.lessonCountText}>{f.totalLessons} bài giảng</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => handleRemoveFavorite(f.subjectId)}
                  activeOpacity={0.7}
                >
                  <Heart color="#EC4899" size={18} fill="#EC4899" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
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
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: '#94A3B8', fontSize: 11 },
  closeBtn: { padding: 4 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 13 },
  emptyTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: '#64748B', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  listContent: { padding: 16, gap: 12 },
  countText: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  badgeBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  subjectTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  courseTitle: { color: '#94A3B8', fontSize: 12, marginBottom: 2 },
  lessonCountText: { color: '#818CF8', fontSize: 11, fontWeight: '600' },
  heartBtn: { padding: 8 },
});
