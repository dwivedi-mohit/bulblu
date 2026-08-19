import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import { api, setAuthToken } from '../lib/api';
import { User } from '../types/database';

const extra = Constants.expoConfig?.extra;
const GOOGLE_WEB_CLIENT_ID = extra?.googleWebClientId || '';

// Safely check if a native module is registered before requiring it
function hasNativeModule(moduleName: string): boolean {
  try {
    if (NativeModules && NativeModules[moduleName]) return true;
    if (typeof globalThis !== 'undefined' && (globalThis as any).ExpoModules?.hasModule) {
      return (globalThis as any).ExpoModules.hasModule(moduleName);
    }
  } catch {}
  return false;
}

// Safely obtain WebBrowser without throwing at runtime
function getWebBrowser() {
  if (Platform.OS !== 'web' && !hasNativeModule('ExpoWebBrowser')) {
    return null;
  }
  try {
    const wb = require('expo-web-browser');
    try {
      wb?.maybeCompleteAuthSession?.();
    } catch {}
    return wb;
  } catch (e) {
    return null;
  }
}

// Safely obtain AuthSession without throwing at runtime
function getAuthSession() {
  if (Platform.OS !== 'web' && !hasNativeModule('ExpoWebBrowser')) {
    return null;
  }
  try {
    return require('expo-auth-session');
  } catch (e) {
    return null;
  }
}

// Safely configure GoogleSignin on native platforms
function getGoogleSignin() {
  if (Platform.OS === 'web') return null;
  if (!hasNativeModule('RNGoogleSignin')) return null;
  try {
    const gs = require('@react-native-google-signin/google-signin').GoogleSignin;
    if (gs && GOOGLE_WEB_CLIENT_ID) {
      try {
        gs.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
        });
      } catch {}
    }
    return gs;
  } catch (e) {
    return null;
  }
}

// Profile is complete if user has completed onboarding details
function checkProfileComplete(user: User): boolean {
  return (
    !!user &&
    user.date_of_birth !== '2000-01-01' &&
    user.gender !== 'prefer_not_to_say' &&
    !!user.city &&
    Array.isArray(user.interests) &&
    user.interests.length >= 3
  );
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  isProfileComplete: false,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setAuthToken(token);
        const { data, error } = await api<{ user: User }>('/api/auth/me');
        if (data && !error) {
          set({
            token,
            user: data.user,
            isAuthenticated: true,
            isProfileComplete: checkProfileComplete(data.user),
            isLoading: false,
          });
          return;
        }
      }
      set({ isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      if (!GOOGLE_WEB_CLIENT_ID) {
        return { error: 'Google Client ID not configured.' };
      }

      let idToken: string | null = null;
      let accessToken: string | null = null;

      const gs = getGoogleSignin();
      const wb = getWebBrowser();
      const authSession = getAuthSession();

      // 1. Try Native Google Sign In flow (RNGoogleSignin)
      if (gs) {
        try {
          await gs.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const response = await gs.signIn();

          if (response?.type === 'cancelled') {
            return { error: 'Sign in was cancelled' };
          }

          if (response?.type === 'success' && response.data) {
            idToken = response.data.idToken || null;
            accessToken = (response.data as any).accessToken || null;
            if (!idToken) {
              const tokens = await gs.getTokens();
              idToken = tokens.idToken || null;
              accessToken = tokens.accessToken || accessToken;
            }
          } else if (response?.idToken) {
            idToken = response.idToken;
          } else {
            const tokens = await gs.getTokens();
            idToken = tokens.idToken || null;
            accessToken = tokens.accessToken || null;
          }
        } catch (nativeErr: any) {
          console.error('Native Google Sign-In error:', nativeErr);
          const code = String(nativeErr?.code || '');
          const msg = String(nativeErr?.message || '');

          if (code === 'SIGN_IN_CANCELLED' || code === '-5' || msg.includes('CANCEL')) {
            return { error: 'Sign in was cancelled' };
          }
          console.warn('Native Google Sign-In failed or unconfigured, falling back to Web OAuth:', msg);
        }
      }

      // 2. Web or fallback OAuth flow via AuthSession / WebBrowser
      if (!idToken && !accessToken && wb) {
        let redirectUri = 'bulblu://';
        if (authSession?.makeRedirectUri) {
          try {
            redirectUri = authSession.makeRedirectUri({
              scheme: 'bulblu',
              preferLocalhost: true,
            });
          } catch {}
        }

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(GOOGLE_WEB_CLIENT_ID)}` +
          `&response_type=id_token%20token` +
          `&redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&scope=${encodeURIComponent('openid email profile')}` +
          `&nonce=${Math.random().toString(36).substring(2)}`;

        const result = await wb.openAuthSessionAsync(authUrl, redirectUri);

        if (result.type === 'success' && result.url) {
          const rawUrl = result.url;
          const hashPart = rawUrl.includes('#') ? rawUrl.split('#')[1] : (rawUrl.includes('?') ? rawUrl.split('?')[1] : '');
          const params = new URLSearchParams(hashPart);
          idToken = params.get('id_token');
          accessToken = params.get('access_token');
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          return { error: 'Sign in was cancelled' };
        }
      }

      if (!idToken && !accessToken) {
        return { error: 'Google sign-in failed. Please verify your native build configuration.' };
      }

      // 3. Send token to backend API
      const { data, error } = await api<{ token: string; user: User }>('/api/auth/google', {
        method: 'POST',
        body: { idToken, accessToken },
      });

      if (error) return { error };

      if (data) {
        await AsyncStorage.setItem('auth_token', data.token);
        setAuthToken(data.token);
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          isProfileComplete: checkProfileComplete(data.user),
        });
      }

      return {};
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      return { error: err.message || 'Google sign-in failed. Please try again.' };
    }
  },

  signOut: async () => {
    try {
      const gs = getGoogleSignin();
      if (gs) {
        await gs.signOut();
      }
    } catch {}
    await AsyncStorage.removeItem('auth_token');
    setAuthToken(null);
    set({ user: null, token: null, isAuthenticated: false, isProfileComplete: false });
  },

  refreshProfile: async () => {
    const { data, error } = await api<{ user: User }>('/api/auth/me');
    if (data && !error) {
      set({ user: data.user, isProfileComplete: checkProfileComplete(data.user) });
    }
  },
}));

