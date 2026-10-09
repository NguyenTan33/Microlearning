import React, { useState } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, Phone, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Zap } from 'lucide-react-native';
import { authApi } from '../../src/services/authApi';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authApi.login({
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
      });

      // Handle backend response format: construct user object if needed
      const user = res.user || {
        id: 'user-1',
        fullName: phoneNumber.trim(),
        phoneNumber: phoneNumber.trim(),
      };

      await setAuth(user, res.accessToken, res.refreshToken);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      console.warn('[Login Error]', err);
      const msg =
        err && typeof err === 'object' && 'response' in err && (err as any).response?.data?.message
          ? (err as any).response.data.message
          : 'Không thể kết nối đến máy chủ Backend (Port 5124). Vui lòng kiểm tra Server!';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#070B18" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Hero Brand Header */}
          <View style={styles.logoContainer}>
            <View style={styles.logoGlowRing}>
              <View style={styles.logoBadge}>
                <Sparkles color="#06B6D4" size={32} />
              </View>
            </View>
            <Text style={styles.appTitle}>MicroLearning</Text>
            <Text style={styles.appSubtitle}>Hệ thống học tập Micro-lesson Năng lượng cao</Text>

            <View style={styles.cyberPill}>
              <Zap color="#F59E0B" size={12} fill="#F59E0B" />
              <Text style={styles.cyberPillText}>CYBER DARK MOBILE 2.0</Text>
            </View>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng nhập Tài khoản</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <View style={styles.inputContainer}>
                <Phone color="#06B6D4" size={18} />
                <TextInput
                  style={styles.textInput}
                  placeholder="0912345678"
                  placeholderTextColor="#475569"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <Lock color="#06B6D4" size={18} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff color="#64748B" size={18} />
                  ) : (
                    <Eye color="#64748B" size={18} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

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
                  <Text style={styles.submitButtonText}>Đăng nhập ngay</Text>
                  <ArrowRight color="#FFFFFF" size={18} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.switchText}>Chưa có tài khoản? </Text>
              <Text style={styles.switchHighlight}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070B18',
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoGlowRing: {
    padding: 4,
    borderRadius: 26,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    marginBottom: 14,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: '#090D1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  appTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  appSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  cyberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cyberPillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#090D1A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 18,
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: '#F43F5E',
    fontSize: 12,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B18',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  textInput: {
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
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  switchHighlight: {
    color: '#06B6D4',
    fontSize: 13,
    fontWeight: '700',
  },
});
