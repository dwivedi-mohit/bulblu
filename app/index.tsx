import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const { isAuthenticated, isProfileComplete } = useAuthStore();
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!isProfileComplete) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)/explore" />;
}
