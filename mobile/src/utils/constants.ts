import Constants from 'expo-constants';

export const API_BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:5000';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'microlearning_access_token',
  REFRESH_TOKEN: 'microlearning_refresh_token',
  USER_INFO: 'microlearning_user_info',
  DEVICE_ID: 'microlearning_device_id',
  WIFI_ONLY_SYNC: 'microlearning_wifi_only_sync',
};

export const THEME_COLORS = {
  background: '#070B17',
  card: '#0F172A',
  cardBorder: '#1E293B',
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  secondary: '#8B5CF6', // Violet
  accentAmber: '#F59E0B', // Streak flame
  accentEmerald: '#10B981', // Success green
  accentRose: '#F43F5E', // Favorite red
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
};
