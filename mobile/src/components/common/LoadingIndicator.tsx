import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingIndicatorProps {
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Đang tải...',
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B17',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
});
