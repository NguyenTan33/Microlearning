import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDatabase } from '../src/db/sqliteClient';
import { autoSyncEngine } from '../src/services/autoSyncEngine';
import { useAuthStore } from '../src/store/useAuthStore';
import { useSyncStore } from '../src/store/useSyncStore';
import { useDownloadStore } from '../src/store/useDownloadStore';

export default function RootLayout() {
  const initAuth = useAuthStore((state) => state.initAuth);
  const initSyncStore = useSyncStore((state) => state.initSyncStore);
  const refreshStorage = useDownloadStore((state) => state.refreshStorageAndDownloads);

  useEffect(() => {
    // 1. Khởi tạo CSDL SQLite cục bộ (Tạo 9 bảng & indexes)
    getDatabase()
      .then(() => {
        // 2. Kích hoạt động cơ tự động đồng bộ (NetInfo & AppState listeners)
        autoSyncEngine.initAutoSyncListeners();
        // 3. Khởi tạo auth session
        initAuth();
        // 4. Lắng nghe trạng thái sync toàn cục
        initSyncStore();
        // 5. Nạp danh sách tải ngoại tuyến
        refreshStorage();
      })
      .catch((err) => {
        console.error('[RootLayout] Lỗi khởi tạo ứng dụng:', err);
      });
  }, [initAuth, initSyncStore, refreshStorage]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#070B17" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#070B17' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="course/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="quiz/[id]" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
