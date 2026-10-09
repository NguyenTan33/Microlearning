import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SocialAuthButtonsProps {
  onGooglePress?: () => void;
  onFacebookPress?: () => void;
  loading?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onGooglePress,
  onFacebookPress,
  loading = false,
}) => {
  const handleGoogle = () => {
    if (onGooglePress) {
      onGooglePress();
    } else {
      Alert.alert(
        'Đăng nhập Google',
        'Tính năng Đăng nhập bằng Google (SSO) sẵn sàng kết nối với Google OAuth Client ID của bạn.'
      );
    }
  };

  const handleFacebook = () => {
    if (onFacebookPress) {
      onFacebookPress();
    } else {
      Alert.alert(
        'Đăng nhập Facebook',
        'Tính năng Đăng nhập bằng Facebook sẵn sàng kết nối với Facebook SDK App ID.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>HOẶC TIẾP TỤC VỚI</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogle}
          disabled={loading}
          activeOpacity={0.8}
        >
          {/* Google Icon SVG */}
          <Svg width={20} height={20} viewBox="0 0 24 24">
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
          <Text style={styles.buttonText}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleFacebook}
          disabled={loading}
          activeOpacity={0.8}
        >
          {/* Facebook Icon SVG */}
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              fill="#1877F2"
              d="M24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 6 4.4 11 10.1 11.9v-8.4H7.3V12h2.8V9.3c0-2.8 1.7-4.4 4.3-4.4 1.2 0 2.5.2 2.5.2v2.8h-1.4c-1.4 0-1.8.9-1.8 1.8V12h3.1l-.5 3.5h-2.6v8.4C19.6 23 24 18 24 12z"
            />
          </Svg>
          <Text style={styles.buttonText}>Facebook</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  buttonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
});
