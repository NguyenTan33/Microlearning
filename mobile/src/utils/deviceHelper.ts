import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { generateGuid } from './guidHelper';
import { authApi } from '../services/authApi';

const DEVICE_ID_KEY = 'MICROLEARN_DEVICE_ID';

/**
 * Lấy hoặc sinh mã định danh duy nhất của thiết bị (Device Identifier)
 * Lưu trữ trong SecureStore để giữ nguyên qua các lần mở app.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `${Platform.OS.toLowerCase()}-${generateGuid()}`;
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return `${Platform.OS.toLowerCase()}-${generateGuid()}`;
  }
}

/**
 * Lấy thông tin thiết bị và hệ điều hành
 */
export function getDeviceInfo(): {
  deviceModel: string;
  osVersion: string;
  appVersion: string;
} {
  return {
    deviceModel: Platform.select({
      ios: 'Apple iPhone',
      android: 'Android Mobile',
      default: 'Smart Device',
    }),
    osVersion: `${Platform.OS} ${Platform.Version}`,
    appVersion: '1.0.0',
  };
}

/**
 * Đăng ký thiết bị ngầm lên Azure mà không làm phiền người dùng
 */
export async function registerDeviceSilently(): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const info = getDeviceInfo();
    await authApi.registerDevice({
      deviceId,
      deviceModel: info.deviceModel,
      osVersion: info.osVersion,
      appVersion: info.appVersion,
    });
  } catch {
    // Hoàn toàn im lặng khi offline hoặc lỗi mạng
  }
}
