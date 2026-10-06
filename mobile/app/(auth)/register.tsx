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
import { useRouter } from 'expo-router';
import { User, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { authApi } from '../../src/services/authApi';

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ họ tên, số điện thoại và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Thông báo', 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
      });

      Alert.alert(
        'Đăng ký thành công',
        'Vui lòng nhập mã OTP để kích hoạt tài khoản học viên.',
        [
          {
            text: 'Tiếp tục',
            onPress: () => {
              router.push({
                pathname: '/(auth)/verify-otp',
                params: { phone: phoneNumber.trim() },
              });
            },
          },
        ]
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || 'Đăng ký tài khoản không thành công.';
      Alert.alert('Đăng ký thất bại', msg);
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
              <Text style={styles.cardTitle}>Tạo tài khoản mới</Text>
              <Text style={styles.cardSubtitle}>
                Bắt đầu hành trình học tập ngắn và thông minh ngay hôm nay
              </Text>

              {/* Input Họ tên */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ và tên</Text>
                <View style={styles.inputWrapper}>
                  <User color="#94A3B8" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    placeholderTextColor="#64748B"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>

              {/* Input Số điện thoại */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <View style={styles.inputWrapper}>
                  <Phone color="#94A3B8" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 0912345678"
                    placeholderTextColor="#64748B"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Input Mật khẩu */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View style={styles.inputWrapper}>
                  <Lock color="#94A3B8" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff color="#94A3B8" size={18} />
                    ) : (
                      <Eye color="#94A3B8" size={18} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nút Đăng ký */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Đăng ký tài khoản</Text>
                    <ArrowRight color="#FFFFFF" size={18} />
                  </>
                )}
              </TouchableOpacity>

              {/* Trở lại Đăng nhập */}
              <View style={styles.footerLinkContainer}>
                <Text style={styles.footerLinkText}>Đã có tài khoản? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.loginLink}>Đăng nhập ngay</Text>
                </TouchableOpacity>
              </View>
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
    borderWidth: 1,
    borderColor: '#1E293B',
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
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B17',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 52,
    marginTop: 8,
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
  footerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerLinkText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  loginLink: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
});
