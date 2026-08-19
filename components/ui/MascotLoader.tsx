import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MascotFace } from './MascotTabIcon';
import { Colors } from '../../constants/colors';

interface MascotLoaderProps {
  size?: number;
  text?: string;
}

export function MascotLoader({ size = 64, text }: MascotLoaderProps) {
  const bounce = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mascotWrapper, bounceStyle]}>
        <MascotFace size={size} />
      </Animated.View>
      <Animated.View style={[styles.glow, glowStyle]}>
        <View style={[styles.glowCircle, { width: size * 0.8, height: size * 0.3, borderRadius: size * 0.15 }]} />
      </Animated.View>
      {text && (
        <Animated.Text style={[styles.text, bounceStyle]}>
          {text}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mascotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    bottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    backgroundColor: Colors.primarySoft,
  },
  text: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
