import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/useAuthStore';
import { useDownloadStore } from '../src/store/useDownloadStore';
import { autoSyncEngine } from '../src/services/autoSyncEngine';
import { getSQLiteDatabase } from '../src/db/sqliteClient';
import { registerDeviceSilently } from '../src/utils/deviceHelper';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 mins
    },
  },
});

export default function RootLayout() {
  const { initAuth } = useAuthStore();
  const { refreshStorageAndDownloads } = useDownloadStore();

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
