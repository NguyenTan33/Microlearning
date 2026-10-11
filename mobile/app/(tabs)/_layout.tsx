import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Compass, Download, User, Sparkles } from 'lucide-react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Tự động tính toán chiều cao và khoảng đệm an toàn theo thanh điều hướng thiết bị (Android & iOS):
  // - Máy Android dùng 3 phím ảo (Back / Home / Recent): insets.bottom thường từ 40 - 56dp.
  // - Máy Android dùng cử chỉ vuốt (Gesture bar): insets.bottom ~16 - 24dp.
  // - Máy không có phím ảo trên màn hình: insets.bottom = 0.
  // - iOS tai thỏ / Dynamic Island: insets.bottom ~34dp.
  const bottomInset = insets.bottom;
  const tabHeight = 60 + bottomInset;
  const paddingBottom = bottomInset > 0 ? bottomInset + 4 : (Platform.OS === 'android' ? 8 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#818CF8',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#070B17',
          borderTopColor: '#1E293B',
          height: tabHeight,
          paddingBottom: paddingBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Học tập',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Ngoại tuyến',
          tabBarIcon: ({ color, size }) => <Download color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
