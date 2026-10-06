import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, BookOpen, Layers, ChevronRight } from 'lucide-react-native';
import { AppHeader } from '../../src/components/common/AppHeader';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { LoadingIndicator } from '../../src/components/common/LoadingIndicator';
import { catalogRepository } from '../../src/db/repositories/catalogRepository';
import { catalogApi } from '../../src/services/catalogApi';
import type { Course } from '../../src/types/catalog.types';

export default function CatalogScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
              onPress={() => router.push(`/course/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <BookOpen color="#38BDF8" size={24} />
              </View>

              <View style={styles.courseDetails}>
                <Text style={styles.courseTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.courseDesc} numberOfLines={2}>
                  {item.description || 'Khóa học cung cấp kiến thức nền tảng và bài tập thực hành.'}
                </Text>

                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Layers color="#818CF8" size={12} />
                    <Text style={styles.badgeText}>{item.totalSubjects} môn học</Text>
                  </View>
                  <Text style={styles.versionText}>Phiên bản {item.version}.0</Text>
                </View>
              </View>

              <ChevronRight color="#475569" size={20} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không tìm thấy khóa học phù hợp.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B17',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
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
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  courseDetails: {
    flex: 1,
    marginRight: 8,
  },
  courseTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  courseDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '600',
  },
  versionText: {
    color: '#64748B',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
