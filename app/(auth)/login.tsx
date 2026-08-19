import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, {
  Defs, RadialGradient, LinearGradient, Stop,
  Ellipse, Circle, Line, Rect, Path, Filter,
  FeGaussianBlur, FeDropShadow,
} from 'react-native-svg';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

function AnimatedMascotSvg() {
  const glowOpacity = useSharedValue(0.5);
  const glowScale = useSharedValue(0.95);
  const [blinkState, setBlinkState] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.95, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowScale.value = withRepeat(
      withTiming(1.08, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    const blinkInterval = setInterval(() => {
      setBlinkState('closed');
      setTimeout(() => setBlinkState('open'), 150);
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={{ width: 140, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      {/* Animated soft aura */}
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: 140, height: 160 }, glowStyle]}>
        <Svg width="140" height="160" viewBox="0 0 220 260" fill="none">
          <Defs>
            <RadialGradient id="ambientAura" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#14B8A6" stopOpacity="0.25" />
              <Stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#F0FDFA" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="bulbSoftGlow" cx="50%" cy="15%" r="45%">
              <Stop offset="0%" stopColor="#FFD93D" stopOpacity="0.5" />
              <Stop offset="40%" stopColor="#FF8E53" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#F0FDFA" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="110" cy="155" rx="95" ry="95" fill="url(#ambientAura)" />
          <Ellipse cx="110" cy="40" rx="60" ry="40" fill="url(#bulbSoftGlow)" />
        </Svg>
      </Animated.View>

      {/* Main mascot vector */}
      <Svg width="140" height="160" viewBox="0 0 220 260" fill="none">
        <Defs>
          <LinearGradient id="bodyGrad" x1="50" y1="50" x2="170" y2="230" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#115E59" />
            <Stop offset="30%" stopColor="#0F766E" />
            <Stop offset="65%" stopColor="#0D9488" />
            <Stop offset="100%" stopColor="#065F5B" />
          </LinearGradient>

          <RadialGradient id="bodyHighlight" cx="35%" cy="28%" r="45%">
            <Stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
          </RadialGradient>

          <RadialGradient id="bulbCoreGrad" cx="40%" cy="35%" r="55%">
            <Stop offset="0%" stopColor="#FFFDE7" />
            <Stop offset="30%" stopColor="#FFD93D" />
            <Stop offset="70%" stopColor="#FF8E53" />
            <Stop offset="100%" stopColor="#FF6B35" />
          </RadialGradient>

          <RadialGradient id="eyeWhiteGrad" cx="45%" cy="40%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#F0FDFA" />
          </RadialGradient>

          <RadialGradient id="pupilGrad" cx="40%" cy="35%" r="60%">
            <Stop offset="0%" stopColor="#022C22" />
            <Stop offset="100%" stopColor="#000000" />
          </RadialGradient>

          <LinearGradient id="rimLightGrad" x1="170" y1="80" x2="50" y2="200" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Mascot Body */}
        <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#bodyGrad)" />
        <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#bodyHighlight)" />
        <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#rimLightGrad)" />
        <Ellipse cx="110" cy="155" rx="72" ry="78" fill="none" stroke="#2DD4BF" strokeWidth="1.5" opacity="0.35" />

        {/* Feet */}
        <Ellipse cx="82" cy="228" rx="14" ry="12" fill="#065F5B" />
        <Ellipse cx="138" cy="228" rx="14" ry="12" fill="#042F2E" />

        {/* Left Eye */}
        <Ellipse cx="82" cy="145" rx="28" ry="30" fill="url(#eyeWhiteGrad)" />
        <Ellipse cx="84" cy="147" rx="15" ry="16" fill="url(#pupilGrad)" />
        <Circle cx="89" cy="141" r="5.5" fill="#fff" opacity="0.95" />
        <Circle cx="82" cy="148" r="2.5" fill="#fff" opacity="0.5" />
        <Path d="M54 132 Q82 124 110 132" stroke="#022C22" strokeWidth="2.5" fill="none" opacity="0.3" />

        {/* Right Eye */}
        <Ellipse cx="138" cy="145" rx="28" ry="30" fill="url(#eyeWhiteGrad)" />
        <Ellipse cx="140" cy="147" rx="15" ry="16" fill="url(#pupilGrad)" />
        <Circle cx="145" cy="141" r="5.5" fill="#fff" opacity="0.95" />
        <Circle cx="138" cy="148" r="2.5" fill="#fff" opacity="0.5" />
        <Path d="M110 132 Q138 124 166 132" stroke="#022C22" strokeWidth="2.5" fill="none" opacity="0.3" />

        {/* Eyelids during blink */}
        {blinkState === 'closed' && (
          <>
            <Path d="M54 130 Q82 118 110 130 Q82 142 54 130 Z" fill="#0F766E" />
            <Path d="M110 130 Q138 118 166 130 Q138 142 110 130 Z" fill="#0F766E" />
          </>
        )}

        {/* Cheeks */}
        <Ellipse cx="62" cy="168" rx="12" ry="7" fill="#FCA5A5" opacity="0.25" />
        <Ellipse cx="158" cy="168" rx="12" ry="7" fill="#FCA5A5" opacity="0.25" />

        {/* Cute Smile */}
        <Path d="M100 180 Q105 188 110 183 Q115 188 120 180" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.95" />

        {/* Antenna Stem */}
        <Rect x="107" y="40" width="6" height="20" rx="3" fill="#0D9488" />

        {/* Antenna Bulb Core */}
        <Circle cx="110" cy="30" r="15" fill="url(#bulbCoreGrad)" />
        <Ellipse cx="106" cy="25" rx="5" ry="4" fill="#fff" opacity="0.6" />

        {/* Light Rays */}
        <Line x1="110" y1="6" x2="110" y2="0" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <Line x1="127" y1="13" x2="132" y2="8" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <Line x1="93" y1="13" x2="88" y2="8" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <Line x1="132" y1="30" x2="138" y2="30" stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        <Line x1="88" y1="30" x2="82" y2="30" stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </Svg>
    </View>
  );
}

function GoogleIcon() {
  return (
    <Svg width="22" height="22" viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <Path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <Path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <Path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </Svg>
  );
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const { signInWithGoogle } = useAuthStore();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    if (!agreed) return;
    setLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <AnimatedMascotSvg />
            <Text style={styles.logo}>bulblu</Text>
            <Text style={styles.tagline}>Your social universe</Text>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.googleButton, (!agreed || loading) && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={!agreed || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />
                ) : (
                  <View style={styles.googleIconContainer}>
                    <GoogleIcon />
                  </View>
                )}
                <Text style={styles.googleButtonText}>
                  {loading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              {error && <Text style={styles.error}>{error}</Text>}
            </View>

            <TouchableOpacity
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
              style={styles.termsRow}
            >
              <Ionicons
                name={agreed ? 'checkbox' : 'square-outline'}
                size={22}
                color={agreed ? Colors.primary : Colors.textTertiary}
                style={styles.checkboxIcon}
              />
              <Text style={styles.termsText}>
                I agree to{' '}
                <Text style={styles.termsLink} onPress={() => router.push('/(auth)/terms')}>
                  Terms of Service
                </Text>
                {' & '}
                <Text style={styles.termsLink} onPress={() => router.push('/(auth)/privacy')}>
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: Spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
  },
  logo: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 32,
    color: Colors.primary,
    letterSpacing: -0.03,
    marginTop: Spacing.lg,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  bottomSection: {
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleButtonText: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  error: {
    ...Typography.caption,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.base,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  checkboxIcon: {
    marginRight: 10,
  },
  termsText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
