import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import { FluidGlassTabBar } from '../../components/ui/FluidGlassTabBar';
import { useVideoStore } from '../../stores/videoStore';

export default function TabsLayout() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isProfileComplete = useAuthStore((s) => s.isProfileComplete);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else if (!isProfileComplete) {
        router.replace('/(auth)/onboarding');
      }
    }
  }, [isLoading, isAuthenticated, isProfileComplete]);

  if (isLoading || !isAuthenticated || !isProfileComplete) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="explore"
      tabBar={(props) => <FluidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="explore" options={{ title: 'Home' }} />
      <Tabs.Screen name="rent" options={{ title: 'Rent' }} />
      <Tabs.Screen name="voice" options={{ title: 'Voice Room' }} />
      <Tabs.Screen name="messages" options={{ title: 'Chat' }} />
      <Tabs.Screen
        name="video"
        options={{ title: 'Video Call' }}
        listeners={{
          blur: () => { useVideoStore.getState().end(); },
        }}
      />

      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
