import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';

export default function AuthLayout() {
  const { isAuthenticated, isProfileComplete } = useAuthStore();

  if (isAuthenticated && isProfileComplete) {
    return <Redirect href="/(tabs)/explore" />;
  }

  if (isAuthenticated && !isProfileComplete) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bgPrimary },
        }}
      >
        <Stack.Screen name="onboarding" />
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bgPrimary },
      }}
    />
  );
}
