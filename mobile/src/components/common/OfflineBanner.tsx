import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <WifiOff color="#F59E0B" size={14} />
      <Text style={styles.bannerText}>
        Bạn đang học ở chế độ Offline. Tiến độ sẽ tự động lưu và đồng bộ khi có mạng.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.25)',
  },
  bannerText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
