import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/useAuthStore';
import { useDownloadStore } from '../src/store/useDownloadStore';
import { getSQLiteDatabase } from '../src/db/sqliteClient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 mins
    },
  },
});

export default function RootLayout() {
  const { checkAuth } = useAuthStore();
  const { refreshDownloads } = useDownloadStore();

  useEffect(() => {
    // Init SQLite database and load initial states
    getSQLiteDatabase().then(() => {
      checkAuth();
      refreshDownloads();
    });
  }, [checkAuth, refreshDownloads]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#070B17" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#070B17' } }}>
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
