import { useState, useEffect, useCallback } from 'react';
import { checkServerHealth } from '../services/syncService';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isServerHealthy, setIsServerHealthy] = useState<boolean>(true);

  const verifyHealth = useCallback(async () => {
    if (!navigator.onLine) {
      setIsServerHealthy(false);
      return;
    }
    const health = await checkServerHealth();
    setIsServerHealthy(health !== null && health.status === 'Healthy');
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      verifyHealth();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerHealthy(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Kiểm tra sức khỏe server khi khởi tạo
    verifyHealth();

    // Định kỳ ping health mỗi 30s
    const interval = setInterval(verifyHealth, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [verifyHealth]);

  return {
    isOnline,
    isServerHealthy,
    verifyHealth,
  };
}
