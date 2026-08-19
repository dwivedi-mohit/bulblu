import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { FluidGlassTabBar } from '../../components/ui/FluidGlassTabBar';

export default function TabsLayout() {
  const { isAuthenticated, isProfileComplete, isLoading } = useAuthStore();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!isProfileComplete) return <Redirect href="/(auth)/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <FluidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="rent" options={{ title: 'Rent' }} />
      <Tabs.Screen name="voice" options={{ title: 'Voice Room' }} />
      <Tabs.Screen name="explore" options={{ title: 'Home' }} />
      <Tabs.Screen name="messages" options={{ title: 'Chat' }} />
      <Tabs.Screen name="video" options={{ title: 'Video Call' }} />

      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
