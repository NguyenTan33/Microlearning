import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Globe, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import type { AuthTokenResponse } from '../../types/auth.types';
import {
  startGoogleOAuth,
  loginGoogleByEmail,
  startFacebookOAuth,
  loginFacebookByIdentifier,
} from '../../services/socialAuthService';

interface SocialAuthModalProps {
  visible: boolean;
  provider: 'google' | 'facebook' | null;
  onClose: () => void;
  onSuccess: (data: AuthTokenResponse) => void;
}

export const SocialAuthModal: React.FC<SocialAuthModalProps> = ({
  visible,
  provider,
  onClose,
  onSuccess,
}) => {
  const [customIdentifier, setCustomIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!provider) return null;

  const isGoogle = provider === 'google';

  const quickChips = isGoogle
    ? ['student.google@gmail.com', 'tan.microlearning@gmail.com', 'developer.gg@gmail.com']
    : ['student.facebook@gmail.com', 'facebook.user@gmail.com', 'nguyentan.fb'];

  const handleBrowserOAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = isGoogle ? await startGoogleOAuth() : await startFacebookOAuth();

      if (res.cancelled) {
        setLoading(false);
        return;
      }

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
        return;
      }

      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Xác thực trình duyệt thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async () => {
    const val = customIdentifier.trim();
    if (!val) {
      setErrorMsg(isGoogle ? 'Vui lòng nhập địa chỉ Gmail của bạn.' : 'Vui lòng nhập Email hoặc ID Facebook.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = isGoogle
        ? await loginGoogleByEmail(val)
        : await loginFacebookByIdentifier(val);

      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Đăng nhập tài khoản thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChip = (chip: string) => {
    setCustomIdentifier(chip);
    setErrorMsg('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isGoogle ? 'rgba(234, 67, 53, 0.15)' : 'rgba(24, 119, 242, 0.15)' }]}>
                  {isGoogle ? (
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                      <Path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"
                      />
                      <Path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <Path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                      />
                      <Path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                      />
                    </Svg>
                  ) : (
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                      <Path
                        fill="#1877F2"
                        d="M24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 6 4.4 11 10.1 11.9v-8.4H7.3V12h2.8V9.3c0-2.8 1.7-4.4 4.3-4.4 1.2 0 2.5.2 2.5.2v2.8h-1.4c-1.4 0-1.8.9-1.8 1.8V12h3.1l-.5 3.5h-2.6v8.4C19.6 23 24 18 24 12z"
                      />
                    </Svg>
                  )}
                </View>
                <View>
                  <Text style={styles.titleText}>
                    {isGoogle ? 'Đăng nhập Google' : 'Đăng nhập Facebook'}
                  </Text>
                  <Text style={styles.subtitleText}>
                    Kết nối an toàn tới máy chủ Azure Cloud
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X color="#94A3B8" size={20} />
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Option 1: Browser OAuth */}
            <TouchableOpacity
              style={styles.browserOAuthBtn}
              onPress={handleBrowserOAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              <View style={styles.browserOAuthIcon}>
                <Globe color={isGoogle ? '#4285F4' : '#1877F2'} size={20} />
              </View>
              <View style={styles.browserOAuthTextCol}>
                <Text style={styles.browserOAuthTitle}>
                  {isGoogle ? 'Mở Trình Duyệt Google (OAuth)' : 'Mở Trình Duyệt Facebook (OAuth)'}
                </Text>
                <Text style={styles.browserOAuthSub}>
                  Đăng nhập qua trang xác thực chính thức
                </Text>
              </View>
              <ArrowRight color="#64748B" size={18} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>HOẶC ĐĂNG NHẬP NHANH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Quick Identifier Form */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>
                {isGoogle ? 'Địa chỉ Gmail của bạn' : 'Email hoặc ID tài khoản Facebook'}
              </Text>
              <View style={styles.inputBox}>
                <Mail color="#64748B" size={18} />
                <TextInput
                  style={styles.textInput}
                  placeholder={isGoogle ? 'minhtan.edu@gmail.com' : 'minhtan@facebook.com'}
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customIdentifier}
                  onChangeText={setCustomIdentifier}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Quick Chips */}
            <Text style={styles.chipsLabel}>Tài khoản thử nghiệm sẵn có:</Text>
            <View style={styles.chipsRow}>
              {quickChips.map((chip) => {
                const isSelected = customIdentifier === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => handleSelectChip(chip)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {chip}
                    </Text>
                    {isSelected && <CheckCircle2 color="#38BDF8" size={12} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Submit Quick Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: isGoogle ? '#EA4335' : '#1877F2' },
              ]}
              onPress={handleQuickSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <ShieldCheck color="#FFFFFF" size={18} />
                  <Text style={styles.submitBtnText}>
                    Xác nhận kết nối & Đăng nhập
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '85%',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitleText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#F43F5E',
    fontSize: 13,
  },
  browserOAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  browserOAuthIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  browserOAuthTextCol: {
    flex: 1,
  },
  browserOAuthTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  browserOAuthSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 12,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070B18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  chipsLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  chipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
