import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/useAuthStore';
import { useDownloadStore } from '../src/store/useDownloadStore';
import { autoSyncEngine } from '../src/services/autoSyncEngine';
import { getSQLiteDatabase } from '../src/db/sqliteClient';
import { registerDeviceSilently } from '../src/utils/deviceHelper';
import { onSessionExpired } from '../src/services/apiClient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30, // 30s (Nâng cấp từ 5 phút - Tận dụng Azure SQL 24/7 phản hồi tức thì)
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const { initAuth } = useAuthStore();
  const { refreshStorageAndDownloads } = useDownloadStore();

  // Lắng nghe sự kiện hết hạn phiên làm việc từ apiClient để tự động đăng xuất và điều hướng về trang đăng nhập
  useEffect(() => {
    const unsubscribe = onSessionExpired(async () => {
      await useAuthStore.getState().logout();
      router.replace('/(auth)/login');
      Alert.alert(
        'Phiên đăng nhập hết hạn',
        'Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng ứng dụng.',
        [{ text: 'Đồng ý' }]
      );
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    // 1. Khởi tạo SQLite database & nạp dữ liệu offline
    getSQLiteDatabase().then(async () => {
      await initAuth();
      refreshStorageAndDownloads();
      autoSyncEngine.initListeners();
      autoSyncEngine.triggerSyncWithDebounce(1000);
      registerDeviceSilently();
    });
  }, [initAuth, refreshStorageAndDownloads]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F172A' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="course/[id]" />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="quiz/[id]" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
