import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { authApi } from '../../src/services/authApi';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = params.phone || '';

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!otpCode.trim() || otpCode.length < 4) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ mã OTP.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.verifyOtp({
        phoneNumber: phone,
        otpCode: otpCode.trim(),
      });

      if (response.isSuccess) {
        Alert.alert(
          'Xác thực thành công',
          'Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập để bắt đầu học tập.',
          [
            {
              text: 'Đăng nhập ngay',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        Alert.alert('Xác thực thất bại', response.message || 'Mã OTP không hợp lệ.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Xác thực OTP thất bại.';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.iconBadge}>
                <ShieldCheck color="#38BDF8" size={32} />
              </View>

              <Text style={styles.cardTitle}>Xác thực mã OTP</Text>
              <Text style={styles.cardSubtitle}>
                Nhập mã xác thực đã gửi tới số điện thoại {phone ? `(${phone})` : ''}
              </Text>

              {/* Input OTP */}
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Nhập 6 chữ số OTP"
                  placeholderTextColor="#64748B"
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <CheckCircle2 color="#FFFFFF" size={18} />
                    <Text style={styles.submitButtonText}>Xác nhận kích hoạt</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.backButtonText}>Quay lại đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B17',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#070B17',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    height: 56,
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 4,
  },
  submitButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 52,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 20,
    padding: 6,
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
});
