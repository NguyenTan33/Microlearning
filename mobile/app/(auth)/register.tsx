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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User as UserIcon, Phone, Lock, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { authApi } from '../../src/services/authApi';
import { useAuthStore } from '../../src/store/useAuthStore';
import { registerDeviceSilently } from '../../src/utils/deviceHelper';
import { SocialAuthButtons } from '../../src/components/auth/SocialAuthButtons';
import { startGoogleOAuth, startFacebookOAuth } from '../../src/services/socialAuthService';
import type { AuthTokenResponse } from '../../src/types/auth.types';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSocial, setActiveSocial] = useState<'google' | 'facebook' | null>(null);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  const handleSocialSuccess = async (res: AuthTokenResponse) => {
    try {
      setIsSocialLoading(true);
      const user = res.user || {
        id: '',
        fullName: 'Người dùng',
        phoneNumber: '',
      };
      await setAuth(user, res.accessToken, res.refreshToken);
      registerDeviceSilently();
      router.replace('/(tabs)');
    } catch (err: unknown) {
      console.warn('[Social Register Store Error]', err);
      setErrorMsg('Lỗi lưu phiên đăng nhập mạng xã hội. Vui lòng thử lại.');
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleDirectGoogleLogin = async () => {
    setIsSocialLoading(true);
    setActiveSocial('google');
    setErrorMsg('');
    try {
      const res = await startGoogleOAuth();
      if (res.cancelled) return;
      if (res.success && res.data) {
        await handleSocialSuccess(res.data);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Đăng nhập Google thất bại');
    } finally {
      setIsSocialLoading(false);
      setActiveSocial(null);
    }
  };

  const handleDirectFacebookLogin = async () => {
    setIsSocialLoading(true);
    setActiveSocial('facebook');
    setErrorMsg('');
    try {
      const res = await startFacebookOAuth();
      if (res.cancelled) return;
      if (res.success && res.data) {
        await handleSocialSuccess(res.data);
      } else if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Đăng nhập Facebook thất bại');
    } finally {
      setIsSocialLoading(false);
      setActiveSocial(null);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !phoneNumber || !password) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authApi.register({
        fullName,
        phoneNumber,
        password,
      });

      await setAuth(res.user, res.accessToken, res.refreshToken);
      registerDeviceSilently();
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Đăng ký thất bại. Vui lòng thử lại.';
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
            <Text style={styles.cardTitle}>Tạo tài khoản mới</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Họ và tên</Text>
              <View style={styles.inputContainer}>
                <UserIcon color="#64748B" size={18} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor="#475569"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại</Text>
              <View style={styles.inputContainer}>
                <Phone color="#64748B" size={18} />
                <TextInput
                  style={styles.textInput}
                  placeholder="0912345678"
                  placeholderTextColor="#475569"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputContainer}>
                <Lock color="#64748B" size={18} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Mật khẩu tối thiểu 6 ký tự"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Tạo tài khoản</Text>
                  <ArrowRight color="#FFFFFF" size={18} />
                </>
              )}
            </TouchableOpacity>

            <SocialAuthButtons
              onGooglePress={handleDirectGoogleLogin}
              onFacebookPress={handleDirectFacebookLogin}
              loading={loading || isSocialLoading}
              isGoogleLoading={isSocialLoading && activeSocial === 'google'}
              isFacebookLoading={isSocialLoading && activeSocial === 'facebook'}
            />

            <TouchableOpacity style={styles.switchRow} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.switchText}>Đã có tài khoản? </Text>
              <Text style={styles.switchHighlight}>Đăng nhập</Text>
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
  card: { backgroundColor: '#0F172A', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#1E293B' },
  cardTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '700', marginBottom: 18 },
  errorBox: { backgroundColor: 'rgba(244, 63, 94, 0.15)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)', marginBottom: 14 },
  errorText: { color: '#F43F5E', fontSize: 12 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#070B17', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#1E293B', gap: 10 },
  textInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 14, gap: 8, marginTop: 8 },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: '#94A3B8', fontSize: 13 },
  switchHighlight: { color: '#818CF8', fontSize: 13, fontWeight: '700' },
});
