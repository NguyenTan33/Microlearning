import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useSyncStore } from '../../store/useSyncStore';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useSyncStore();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <WifiOff color="#F59E0B" size={15} />
      <Text style={styles.text}>
        Đang ở chế độ ngoại tuyến. Bài học và tiến độ sẽ tự động đồng bộ khi có mạng lại.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#78350F',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#B45309',
  },
  text: {
    color: '#FEF3C7',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
