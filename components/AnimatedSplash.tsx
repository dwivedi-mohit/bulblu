import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import Svg, {
  Defs, RadialGradient, LinearGradient, Stop,
  Ellipse, Circle, Line, Rect, Path, Filter,
  FeGaussianBlur, FeDropShadow,
} from 'react-native-svg';
import { Colors } from '../constants/colors';

const ZOOM_START = 800;

function GlowCircle({ opacity }: { opacity: any }) {
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  return (
    <AnimatedGWrapper style={style}>
      <Circle cx="110" cy="30" r="28" fill="url(#bulbGlow)" filter="url(#bigGlow)" />
    </AnimatedGWrapper>
  );
}

function AnimatedGWrapper({ style, children }: { style: any; children: React.ReactNode }) {
  return (
    <AnimatedG style={style}>
      {children}
    </AnimatedG>
  );
}

function AnimatedG({ style, children }: { style?: any; children?: React.ReactNode }) {
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, style]}>
      <Svg width="220" height="260" viewBox="0 0 220 260">
        <Defs>
          <RadialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFD93D" stopOpacity="0.7" />
            <Stop offset="40%" stopColor="#FF8E53" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
          </RadialGradient>
          <Filter id="bigGlow" x="-100%" y="-100%" width="300%" height="300%">
            <FeGaussianBlur stdDeviation="14" />
          </Filter>
        </Defs>
        {children}
      </Svg>
    </Animated.View>
  );
}

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const mascotScale = useSharedValue(0.85);
  const mascotOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.6);
  const overlayOpacity = useSharedValue(1);
  const overlayScale = useSharedValue(1);
  const [visible, setVisible] = useState(true);
  const [blinkState, setBlinkState] = useState<'open' | 'closed'>('open');

  const hide = useCallback(() => {
    setVisible(false);
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();

    // Phase 0: Fade in mascot
    mascotOpacity.value = withTiming(1, { duration: 300 });
    mascotScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.back(1.2)),
    });

    // Phase 1: Blink
    setTimeout(() => {
      setBlinkState('closed');
      setTimeout(() => setBlinkState('open'), 150);
    }, 300);

    // Phase 2: Glow pulse
    glowOpacity.value = withDelay(500, withTiming(0.9, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    }));
    glowScale.value = withDelay(500, withTiming(1.2, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    }));

    // Phase 3: Zoom reveal
    overlayOpacity.value = withDelay(ZOOM_START, withTiming(0, {
      duration: 400,
      easing: Easing.in(Easing.ease),
    }, (finished) => {
      if (finished) runOnJS(hide)();
    }));
    overlayScale.value = withDelay(ZOOM_START, withTiming(1.15, {
      duration: 400,
      easing: Easing.in(Easing.ease),
    }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  const mascotContainerStyle = useAnimatedStyle(() => ({
    opacity: mascotOpacity.value,
    transform: [{ scale: mascotScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  if (!visible) return null;

  const isBlinking = blinkState === 'closed';

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.mascotWrapper, mascotContainerStyle]}>
        <Svg width="220" height="260" viewBox="0 0 220 260" fill="none">
          <Defs>
            <LinearGradient id="bodyGrad" x1="50" y1="50" x2="170" y2="230" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#115E59" />
              <Stop offset="30%" stopColor="#0F766E" />
              <Stop offset="65%" stopColor="#0D9488" />
              <Stop offset="100%" stopColor="#065F5B" />
            </LinearGradient>
            <RadialGradient id="bodyHighlight" cx="35%" cy="28%" r="45%">
              <Stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="bodyShadow" cx="50%" cy="88%" r="50%">
              <Stop offset="0%" stopColor="#042F2E" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#042F2E" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="neonGlow" cx="50%" cy="55%" r="60%">
              <Stop offset="0%" stopColor="#2DD4BF" stopOpacity="0" />
              <Stop offset="70%" stopColor="#2DD4BF" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFD93D" stopOpacity="0.7" />
              <Stop offset="40%" stopColor="#FF8E53" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="bulbCore" cx="40%" cy="35%" r="55%">
              <Stop offset="0%" stopColor="#FFFDE7" />
              <Stop offset="25%" stopColor="#FFD93D" />
              <Stop offset="60%" stopColor="#FF8E53" />
              <Stop offset="100%" stopColor="#FF6B35" />
            </RadialGradient>
            <RadialGradient id="eyeWhite" cx="45%" cy="40%" r="55%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F0FDFA" />
            </RadialGradient>
            <RadialGradient id="pupilGrad" cx="40%" cy="35%" r="60%">
              <Stop offset="0%" stopColor="#022C22" />
              <Stop offset="100%" stopColor="#000000" />
            </RadialGradient>
            <LinearGradient id="rimLight" x1="170" y1="80" x2="50" y2="200" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="rimLight2" x1="50" y1="120" x2="170" y2="200" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
            </LinearGradient>
            <Filter id="bigGlow" x="-100%" y="-100%" width="300%" height="300%">
              <FeGaussianBlur stdDeviation="14" />
            </Filter>
            <Filter id="shadow">
              <FeDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.25" />
            </Filter>
            <Filter id="neonShadow" x="-30%" y="-30%" width="160%" height="160%">
              <FeDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2DD4BF" floodOpacity="0.5" />
            </Filter>
          </Defs>

          {/* NEON GLOW (outer) */}
          <Ellipse cx="110" cy="155" rx="85" ry="92" fill="url(#neonGlow)" />

          {/* BODY (dark teal) */}
          <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#bodyGrad)" filter="url(#shadow)" />
          <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#bodyHighlight)" />
          <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#rimLight)" />
          <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#rimLight2)" />
          <Ellipse cx="110" cy="155" rx="72" ry="78" fill="url(#bodyShadow)" />
          <Ellipse cx="110" cy="155" rx="72" ry="78" fill="none" stroke="#2DD4BF" strokeWidth="1" opacity="0.3" />

          {/* LEGS (darker) */}
          <Ellipse cx="82" cy="228" rx="14" ry="12" fill="#065F5B" />
          <Ellipse cx="138" cy="228" rx="14" ry="12" fill="#042F2E" />

          {/* LEFT EYE (bright, large) */}
          <Ellipse cx="82" cy="145" rx="28" ry="30" fill="url(#eyeWhite)" />
          <Ellipse cx="84" cy="147" rx="15" ry="16" fill="url(#pupilGrad)" />
          <Circle cx="89" cy="141" r="5.5" fill="#fff" opacity="0.95" />
          <Circle cx="82" cy="148" r="2.5" fill="#fff" opacity="0.5" />
          <Path d="M54 132 Q82 124 110 132" stroke="#022C22" strokeWidth="2.5" fill="none" opacity="0.35" />

          {/* RIGHT EYE (bright, large) */}
          <Ellipse cx="138" cy="145" rx="28" ry="30" fill="url(#eyeWhite)" />
          <Ellipse cx="140" cy="147" rx="15" ry="16" fill="url(#pupilGrad)" />
          <Circle cx="145" cy="141" r="5.5" fill="#fff" opacity="0.95" />
          <Circle cx="138" cy="148" r="2.5" fill="#fff" opacity="0.5" />
          <Path d="M110 132 Q138 124 166 132" stroke="#022C22" strokeWidth="2.5" fill="none" opacity="0.35" />

          {/* EYELIDS (blink) */}
          {isBlinking && (
            <>
              <Path d="M54 130 Q82 118 110 130 Q82 142 54 130 Z" fill="#0F766E" />
              <Path d="M110 130 Q138 118 166 130 Q138 142 110 130 Z" fill="#0F766E" />
            </>
          )}

          {/* BLUSH (subtle warm) */}
          <Ellipse cx="62" cy="168" rx="12" ry="7" fill="#FCA5A5" opacity="0.15" />
          <Ellipse cx="158" cy="168" rx="12" ry="7" fill="#FCA5A5" opacity="0.15" />

          {/* MOUTH (white, cute smile) */}
          <Path d="M100 180 Q105 188 110 183 Q115 188 120 180" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />

          {/* BULB GLOW (large, pulsing - animated) */}
          <GlowCircle opacity={glowOpacity} />

          {/* BULB STEM (dark teal) */}
          <Rect x="107" y="42" width="6" height="18" rx="3" fill="#0D9488" />

          {/* BULB CORE (bright yellow-orange) */}
          <Circle cx="110" cy="30" r="14" fill="url(#bulbCore)" filter="url(#neonShadow)" />
          <Ellipse cx="106" cy="25" rx="5" ry="4" fill="#fff" opacity="0.5" />

          {/* SPARKLE RAYS (brighter) */}
          <Line x1="110" y1="6" x2="110" y2="0" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <Line x1="127" y1="13" x2="132" y2="8" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <Line x1="93" y1="13" x2="88" y2="8" stroke="#FFD93D" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <Line x1="132" y1="30" x2="138" y2="30" stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <Line x1="88" y1="30" x2="82" y2="30" stroke="#FFD93D" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <Line x1="125" y1="18" x2="129" y2="14" stroke="#FF8E53" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          <Line x1="95" y1="18" x2="91" y2="14" stroke="#FF8E53" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
        </Svg>
      </Animated.View>

      {/* WORDMARK */}
      <Animated.View style={[styles.wordmarkContainer, mascotContainerStyle]}>
        <Animated.Text style={styles.wordmark}>bulblu</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
    color: Colors.primary,
  },
});
