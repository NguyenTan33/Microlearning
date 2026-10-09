import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, BookOpen, Layers, ChevronRight, Lock, Unlock } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { UnlockCourseModal } from '../../src/components/catalog/UnlockCourseModal';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { catalogApi } from '../../src/services/catalogApi';
import type { Course } from '../../src/types/catalog.types';

const FALLBACK_THUMBNAIL = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80';

export default function CatalogScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Private Course Unlock State
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [selectedPrivateCourse, setSelectedPrivateCourse] = useState<Course | null>(null);

  const loadCourses = useCallback(async () => {
    try {
      // 1. Cache-first từ SQLite
      const local = await catalogRepository.getAllCourses();
      if (local.length > 0) {
        setCourses(local);
      }

      // 2. Cập nhật từ API nếu có mạng
      try {
        const remote = await catalogApi.getAllCourses();
        if (remote.length > 0) {
          await catalogRepository.saveCourses(remote);
          setCourses(remote);
        }
      } catch {
        // Giữ local khi offline
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
  };

  const handleCoursePress = (course: Course) => {
    if (course.isPrivate) {
      setSelectedPrivateCourse(course);
      setUnlockModalVisible(true);
    } else {
      router.push(`/course/${course.id}` as any);
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingIndicator message="Đang nạp danh mục khóa học..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Khám phá khóa học" />
      <OfflineBanner />

      <View style={styles.container}>
        {/* Thanh tìm kiếm */}
        <View style={styles.searchWrapper}>
          <Search color="#94A3B8" size={18} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm khóa học..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Danh sách Khóa học */}
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.courseCard}
              onPress={() => handleCoursePress(item)}
              activeOpacity={0.8}
            >
              {/* Thumbnail Image */}
              <View style={styles.thumbnailContainer}>
                <Image
                  source={{ uri: item.thumbnailUrl || FALLBACK_THUMBNAIL }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
                {item.isPrivate && (
                  <View style={styles.privateBadge}>
                    <Lock color="#FFFFFF" size={12} />
                    <Text style={styles.privateText}>Riêng tư</Text>
                  </View>
                )}
              </View>

              {/* Course Info */}
              <View style={styles.courseBody}>
                <Text style={styles.courseTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.courseDescription} numberOfLines={2}>
                  {item.description || 'Chưa có mô tả chi tiết cho khóa học này.'}
                </Text>

                <View style={styles.courseFooter}>
                  <View style={styles.metaChip}>
                    <Layers color="#38BDF8" size={14} />
                    <Text style={styles.metaText}>{item.totalSubjects || 0} môn học</Text>
                  </View>

                  <ChevronRight color="#64748B" size={18} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen color="#475569" size={48} />
              <Text style={styles.emptyText}>Không tìm thấy khóa học nào phù hợp</Text>
            </View>
          }
        />
      </View>

      {/* Unlock Private Course Modal */}
      {selectedPrivateCourse && (
        <UnlockCourseModal
          visible={unlockModalVisible}
          onClose={() => setUnlockModalVisible(false)}
          courseId={selectedPrivateCourse.id}
          courseTitle={selectedPrivateCourse.title}
          onUnlocked={() => {
            router.push(`/course/${selectedPrivateCourse.id}` as any);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 24,
  },
  courseCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  thumbnailContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  privateBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  privateText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  courseBody: {
    padding: 16,
  },
  courseTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  courseDescription: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },
  courseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 12,
  },
});
