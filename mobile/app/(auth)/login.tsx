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
import { GraduationCap, Eye, EyeOff, Phone, Lock, ArrowRight } from 'lucide-react-native';
import { authApi } from '../../src/services/authApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getOrCreateDeviceId, getDeviceInfo } from '../../src/utils/deviceHelper';

export default function LoginScreen() {
  const router = useRouter();
  const loginSuccess = useAuthStore((state) => state.loginSuccess);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      // 1. Gọi API đăng nhập
      const response = await authApi.login({
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
      });

      // 2. Lưu token vào SecureStore & Store
      await loginSuccess(response.accessToken, response.refreshToken, {
        id: 'user-current',
        fullName: 'Học viên',
        phoneNumber: phoneNumber.trim(),
      });

      // 3. Đăng ký thiết bị tự động ngầm
      try {
        const deviceId = await getOrCreateDeviceId();
        const info = getDeviceInfo();
        await authApi.registerDevice({
          deviceIdentifier: deviceId,
          deviceModel: info.deviceModel,
          osVersion: info.osVersion,
          appVersion: info.appVersion,
        });
      } catch (devErr) {
        console.warn('[Login] Lỗi đăng ký thiết bị ngầm:', devErr);
      }

      // 4. Chuyển vào thẳng Tab chính
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        err.response?.data?.message || err.message || 'Số điện thoại hoặc mật khẩu không chính xác.';
      Alert.alert('Đăng nhập thất bại', msg);
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Thương hiệu tinh gọn */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <GraduationCap color="#38BDF8" size={32} />
              </View>
              <Text style={styles.appName}>MicroLearn</Text>
              <Text style={styles.appTagline}>Nền tảng học ngắn thông minh (Offline-First)</Text>
            </View>

            {/* Form Đăng nhập trực diện */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Đăng nhập</Text>
              <Text style={styles.cardSubtitle}>
                Nhập số điện thoại và mật khẩu để tiếp tục học tập
              </Text>

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
                    autoCapitalize="none"
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
                    placeholder="Nhập mật khẩu của bạn"
                    placeholderTextColor="#64748B"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
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

              {/* Nút Đăng nhập */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Vào học ngay</Text>
                    <ArrowRight color="#FFFFFF" size={18} />
                  </>
                )}
              </TouchableOpacity>

              {/* Chuyển sang Đăng ký */}
              <View style={styles.footerLinkContainer}>
                <Text style={styles.footerLinkText}>Chưa có tài khoản? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.registerLink}>Đăng ký mới</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
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
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 52,
    marginTop: 8,
    gap: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
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
  registerLink: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
});
