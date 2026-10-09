import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY_DEVICE_ID = 'ML_DEVICE_ID';

export function generateGuid(): string {
  if (Crypto.randomUUID) {
    return Crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(KEY_DEVICE_ID);
    if (!deviceId) {
      deviceId = generateGuid();
      await SecureStore.setItemAsync(KEY_DEVICE_ID, deviceId);
    }
    return deviceId;
  } catch {
    return generateGuid();
  }
}

export const guidHelper = {
  generateGuid,
  getOrCreateDeviceId,
};


