import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, Home } from 'lucide-react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <AlertTriangle color="#F59E0B" size={48} />
        </View>

        <Text style={styles.title}>404 - Trang Không Tồn Tại</Text>
        <Text style={styles.description}>
          Đường dẫn bạn yêu cầu không tìm thấy hoặc đã được di chuyển.
        </Text>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.8}
        >
          <Home color="#FFFFFF" size={18} />
          <Text style={styles.homeBtnText}>Về Trang chủ Học tập</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  title: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  description: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  homeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
