import Constants from 'expo-constants';

// Auto-detect host machine IP address from Expo Metro packager
const getHostIp = (): string => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.linkingUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return '192.168.1.43'; // Default LAN IP fallback
};

const hostIp = getHostIp();

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || `http://${hostIp}:5124`;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'microlearning_access_token',
  REFRESH_TOKEN: 'microlearning_refresh_token',
  USER_INFO: 'microlearning_user_info',
  DEVICE_ID: 'microlearning_device_id',
  WIFI_ONLY_SYNC: 'microlearning_wifi_only_sync',
};

export const THEME_COLORS = {
  background: '#070B18',
  card: '#090D1A',
  cardLight: '#0E1428',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366F1', // Electric Indigo
  primaryGlow: 'rgba(99, 102, 241, 0.25)',
  cyan: '#06B6D4', // Neon Cyan
  cyanGlow: 'rgba(6, 182, 212, 0.25)',
  amber: '#F59E0B', // Streak Flame
  amberGlow: 'rgba(245, 158, 11, 0.2)',
  emerald: '#10B981', // Success Green
  rose: '#F43F5E', // Favorite Accent
  violet: '#8B5CF6',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
};
