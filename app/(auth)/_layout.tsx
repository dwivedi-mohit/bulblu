import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

export default function AuthLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isProfileComplete = useAuthStore((s) => s.isProfileComplete);
  const pathname = usePathname();

  const isOnboarding = pathname.includes('onboarding');

  useEffect(() => {
    if (isAuthenticated && isProfileComplete) {
      router.replace('/(tabs)/explore');
    } else if (isAuthenticated && !isProfileComplete && !isOnboarding) {
      router.replace('/(auth)/onboarding');
    }
  }, [isAuthenticated, isProfileComplete, isOnboarding]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgPrimary },
      }}
    />
  );
}
