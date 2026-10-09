import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { authApi } from '../../src/services/authApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { registerDeviceSilently } from '../../src/utils/deviceHelper';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone, password, testOtp } = useLocalSearchParams<{
    phone: string;
    password?: string;
    testOtp?: string;
  }>();
  const { setAuth } = useAuthStore();

  const [otpCode, setOtpCode] = useState(testOtp || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (testOtp) {
      setOtpCode(testOtp);
    }
  }, [testOtp]);

  const handleVerify = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authApi.verifyOtp({
        phoneNumber: phone || '',
        otp: otpCode.trim(),
      });

      if (res.success) {
        // Tự động đăng nhập ngay sau khi kích hoạt tài khoản thành công
        if (password) {
          try {
            const loginRes = await authApi.login({
              phoneNumber: phone || '',
              password,
            });
            if (loginRes?.accessToken) {
              await setAuth(loginRes.user, loginRes.accessToken, loginRes.refreshToken);
              registerDeviceSilently();
              router.replace('/(tabs)');
              return;
            }
          } catch {
            // Chuyển về màn hình đăng nhập nếu auto-login gặp lỗi
          }
        }
        router.replace('/(auth)/login');
      } else {
        setErrorMsg(res.message || 'Mã OTP không đúng hoặc đã hết hạn.');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.message
          ? String((err as any).response.data.message)
          : err instanceof Error
          ? err.message
          : 'Xác thực OTP thất bại. Vui lòng kiểm tra lại mã OTP.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color="#94A3B8" size={20} />
            <Text style={styles.backText}>Quay lại</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <View style={styles.iconBox}>
              <ShieldCheck color="#818CF8" size={32} />
            </View>

            <Text style={styles.cardTitle}>Xác thực OTP</Text>
            <Text style={styles.cardSubtitle}>
              Mã xác thực đã được gửi đến số điện thoại {phone || ''}
            </Text>

            {testOtp ? (
              <View style={styles.testOtpBadge}>
                <Text style={styles.testOtpText}>Mã xác thực gửi tới bạn: {testOtp}</Text>
              </View>
            ) : null}

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mã xác thực (OTP)</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="123456"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleVerify} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Xác nhận OTP</Text>
                  <ArrowRight color="#FFFFFF" size={18} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#070B17' },
  scrollContent: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  card: { backgroundColor: '#0F172A', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center' },
  iconBox: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(99, 102, 241, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  cardTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  cardSubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  errorBox: { backgroundColor: 'rgba(244, 63, 94, 0.15)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)', marginBottom: 14, width: '100%' },
  errorText: { color: '#F43F5E', fontSize: 12, textAlign: 'center' },
  inputGroup: { width: '100%', marginBottom: 20 },
  inputLabel: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  otpInput: { backgroundColor: '#070B17', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#F8FAFC', fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: 6, borderWidth: 1, borderColor: '#1E293B' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 14, gap: 8, width: '100%' },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  testOtpBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  testOtpText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '600',
  },
});
