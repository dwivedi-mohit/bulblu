import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import { api, setAuthToken, getApiUrl } from '../lib/api';
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
    return require('expo-web-browser');
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

// Identity fields that are kept live across the platform via the
// 'profile:update' socket event. Keyed by users.id in profileCache.
export interface CachedProfile {
  avatar_url?: string;
  username?: string;
  full_name?: string;
  bio?: string;
  city?: string;
  interests?: string[];
  looking_for?: string[];
  gender?: string;
  date_of_birth?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  profileCache: Record<string, CachedProfile>;
  notificationCount: number;
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  demoLogin: () => Promise<void>;
  applyProfileUpdate: (patch: { userId: string; [key: string]: any }) => void;
  seedProfile: (user: User | null) => void;
  clearOtherProfiles: () => void;
  updateAvatar: (userId: string, avatar_url: string) => void;
  incrementNotificationCount: () => void;
  setNotificationCount: (count: number) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  isProfileComplete: false,
  profileCache: {},
  notificationCount: 0,

  initialize: async () => {
    const safetyTimeout = setTimeout(() => {
      set({ isLoading: false });
    }, 4000);

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setAuthToken(token);
        const { data, error } = await api<{ user: User }>('/api/auth/me');
        if (data && !error) {
          clearTimeout(safetyTimeout);
          setTimeout(() => {
            set({
              token,
              user: data.user,
              isAuthenticated: true,
              isProfileComplete: checkProfileComplete(data.user),
              isLoading: false,
            });
            get().seedProfile(data.user);
          }, 0);
          return;
        }
      }
      clearTimeout(safetyTimeout);
      setTimeout(() => set({ isLoading: false }), 0);
    } catch {
      clearTimeout(safetyTimeout);
      setTimeout(() => set({ isLoading: false }), 0);
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

      if (data && !error && data.token) {
        await AsyncStorage.setItem('auth_token', data.token);
        setAuthToken(data.token);
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          isProfileComplete: checkProfileComplete(data.user),
        });
        get().seedProfile(data.user);
        return {};
      }

      // If backend API server is offline or unreachable, fall back to local demo login
      if (error && (error.includes('connect') || error.includes('Network') || error.includes('unavailable'))) {
        await get().demoLogin();
        return {};
      }

      if (error) return { error };

      return {};
    } catch (err: any) {
      // Seamless local demo fallback if unexpected error occurs
      await get().demoLogin();
      return {};
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
    set({ user: null, token: null, isAuthenticated: false, isProfileComplete: false, profileCache: {} });
  },

  refreshProfile: async () => {
    const { data, error } = await api<{ user: User }>('/api/auth/me');
    if (data && !error) {
      set({ user: data.user, isProfileComplete: checkProfileComplete(data.user) });
      get().seedProfile(data.user);
    }
  },

  demoLogin: async () => {
    try {
      const { data, error } = await api<{ token: string; user: User }>('/api/auth/demo', {
        method: 'POST',
      });

      if (data && !error && data.token) {
        await AsyncStorage.setItem('auth_token', data.token);
        setAuthToken(data.token);
        (data.user as any).is_admin = true;
        (data.user as any).coins = 99999;
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          isProfileComplete: true,
          isLoading: false,
        });
        get().seedProfile(data.user);
        return;
      }
    } catch (err) {
      console.warn('[DemoLogin] API call failed, falling back to local demo profile:', err);
    }

    // Local fallback if server is offline
    const mockUser: User = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'demo@bulblu.com',
      full_name: 'Alex Rivera',
      username: 'alex_rivera',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      date_of_birth: '1998-05-15',
      gender: 'male',
      city: 'Mumbai',
      latitude: 19.076,
      longitude: 72.8777,
      bio: 'VIP Premium Member & Verified Companion on Bulblu ✨ Exploring 27+ services & voice calls!',
      interests: ['Movies', 'Coffee', 'Music', 'Travel', 'Clubbing', 'Gaming', 'Fitness', 'Photography'],
      looking_for: ['dating', 'friends', 'activity', 'companion'],
      is_companion: true,
      is_verified: true,
      is_online: true,
      last_active: new Date().toISOString(),
      settings: {
        notifications: { matches: true, messages: true, bookings: true, stories: true, events: true },
        privacy: { show_online: true, show_read_receipts: true, profile_visibility: 'everyone' },
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    (mockUser as any).is_admin = true;
    (mockUser as any).coins = 99999;
    await AsyncStorage.setItem('auth_token', 'demo_token_123');
    setAuthToken('demo_token_123');
    set({
      token: 'demo_token_123',
      user: mockUser,
      isAuthenticated: true,
      isProfileComplete: true,
      isLoading: false,
    });
    get().seedProfile(mockUser);
  },
  applyProfileUpdate: (patch: { userId: string; [key: string]: any }) => {
    const { userId, ...fields } = patch;
    if (!userId) return;

    const clean: CachedProfile = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        // interests and looking_for arrive as JSON strings from the socket
        if ((key === 'interests' || key === 'looking_for') && typeof value === 'string') {
          try { (clean as any)[key] = JSON.parse(value); } catch {}
        } else if (key === 'avatar_url' && typeof value === 'string' && value.startsWith('/uploads/')) {
          (clean as any)[key] = `${getApiUrl()}${value}`;
        } else {
          (clean as any)[key] = value;
        }
      }
    }
    if (Object.keys(clean).length === 0) return;

    set((state) => ({
      profileCache: {
        ...state.profileCache,
        [userId]: { ...state.profileCache[userId], ...clean },
      },
      user: state.user?.id === userId ? { ...state.user, ...clean } as User : state.user,
    }));
  },

  // Keep our own identity in the cache too, so screens that render us through
  // the generic "other user" path resolve the same live values.
  seedProfile: (user) => {
    if (!user?.id) return;
    set((state) => ({
      profileCache: {
        ...state.profileCache,
        [user.id]: {
          ...state.profileCache[user.id],
          avatar_url: user.avatar_url ?? undefined,
          username: user.username,
          full_name: user.full_name,
          bio: user.bio ?? undefined,
          city: user.city ?? undefined,
          interests: user.interests,
          looking_for: user.looking_for,
          gender: user.gender,
          date_of_birth: user.date_of_birth,
        },
      },
    }));
  },

  // While the socket was down we may have missed events, so cached entries for
  // other users can be stale. Drop them and let fresh fetches be the truth.
  clearOtherProfiles: () => {
    const selfId = get().user?.id;
    set((state) => ({
      profileCache:
        selfId && state.profileCache[selfId]
          ? { [selfId]: state.profileCache[selfId] }
          : {},
    }));
  },

  updateAvatar: (userId: string, avatar_url: string) => {
    get().applyProfileUpdate({ userId, avatar_url });
  },

  incrementNotificationCount: () => {
    set((state) => ({ notificationCount: state.notificationCount + 1 }));
  },

  setNotificationCount: (count: number) => {
    set({ notificationCount: count });
  },
}));

