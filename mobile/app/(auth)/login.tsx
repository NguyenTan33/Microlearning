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
import { GraduationCap, Eye, EyeOff, Phone, Lock, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { authApi } from '../../src/services/authApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getOrCreateDeviceId, getDeviceInfo } from '../../src/utils/deviceHelper';
import { SocialAuthButtons } from '../../src/components/auth/SocialAuthButtons';
import { ForgotPasswordModal } from '../../src/components/auth/ForgotPasswordModal';

export default function LoginScreen() {
  const router = useRouter();
  const loginSuccess = useAuthStore((state) => state.loginSuccess);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const fillQuickAccount = (phone: string, pass: string) => {
    setPhoneNumber(phone);
    setPassword(pass);
  };

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

      // 2. Lưu token & tự động giải mã Role từ JWT
      await loginSuccess(response.accessToken, response.refreshToken, {
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

            {/* Quick Demo Accounts Helper */}
            <View style={styles.quickAccountBox}>
              <View style={styles.quickTitleRow}>
                <ShieldCheck color="#38BDF8" size={16} />
                <Text style={styles.quickTitle}>Tài khoản Thử nghiệm Nhanh:</Text>
              </View>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={styles.chipButton}
                  onPress={() => fillQuickAccount('+84999999999', 'Admin@123456')}
                >
                  <Text style={styles.chipText}>👑 Admin (+84999999999)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chipButton}
                  onPress={() => fillQuickAccount('+84888888888', 'Teacher@123456')}
                >
                  <Text style={styles.chipText}>👨‍🏫 Teacher (+84888888888)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Đăng nhập trực diện */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Đăng Nhập</Text>
              <Text style={styles.cardSubtitle}>Chào mừng bạn quay trở lại với MicroLearn!</Text>

              {/* Ô số điện thoại */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số Điện Thoại</Text>
                <View style={styles.inputWrapper}>
                  <Phone color="#94A3B8" size={20} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="VD: 0999999999 hoặc +84..."
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Ô mật khẩu */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Mật Khẩu</Text>
                  <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                    <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <Lock color="#94A3B8" size={20} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập mật khẩu..."
                    placeholderTextColor="#64748B"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? (
                      <EyeOff color="#94A3B8" size={20} />
                    ) : (
                      <Eye color="#94A3B8" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nút Đăng nhập */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitText}>Đăng Nhập</Text>
                    <ArrowRight color="#FFFFFF" size={20} style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* Đăng nhập bằng Google / Facebook */}
              <SocialAuthButtons loading={loading} />

              {/* Nút chuyển sang Đăng ký */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Chưa có tài khoản?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.registerLink}> Đăng ký ngay</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Quên mật khẩu */}
            <ForgotPasswordModal
              visible={showForgotModal}
              onClose={() => setShowForgotModal(false)}
              initialPhoneNumber={phoneNumber}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  quickAccountBox: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  quickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quickTitle: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipButton: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    borderColor: '#334155',
    borderWidth: 1,
    padding: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  forgotText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    marginLeft: 12,
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  registerLink: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
});
