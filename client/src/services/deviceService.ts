import type { DeviceResponse, RegisterDeviceRequest } from '../types/offline.types';

const DEVICE_ID_KEY = 'microlearn_device_id';

/**
 * Lấy hoặc sinh mới UUID thiết bị duy nhất, lưu bền vững trong LocalStorage.
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Đăng ký thiết bị lên hệ thống Backend (POST /api/devices/register).
 */
export async function registerCurrentDevice(): Promise<DeviceResponse> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('Chưa đăng nhập, không thể đăng ký thiết bị.');
  }

  const deviceId = getOrCreateDeviceId();
  const userAgent = navigator.userAgent;

  // Nhận diện trình duyệt và hệ điều hành cơ bản
  let browserName = 'Web Browser';
  if (userAgent.includes('Firefox')) browserName = 'Firefox Web';
  else if (userAgent.includes('Chrome')) browserName = 'Chrome Web';
  else if (userAgent.includes('Safari')) browserName = 'Safari Web';
  else if (userAgent.includes('Edg')) browserName = 'Edge Web';

  let osVersion = 'Windows / Desktop';
  if (userAgent.includes('Macintosh')) osVersion = 'macOS';
  else if (userAgent.includes('Linux')) osVersion = 'Linux';
  else if (userAgent.includes('Android')) osVersion = 'Android Web';
  else if (userAgent.includes('iPhone')) osVersion = 'iOS Web';

  const payload: RegisterDeviceRequest = {
    deviceId,
    platform: 1, // Theo hướng dẫn trong Report, tạm gửi 1 (Android/Web)
    deviceModel: browserName,
    osVersion,
  };

  const response = await fetch('/api/devices/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Đăng ký thiết bị thất bại (${response.status}): ${errorText}`);
  }

  const result: DeviceResponse = await response.json();
  return result;
}
