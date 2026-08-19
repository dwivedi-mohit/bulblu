import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface WorldViewProps {
  children: React.ReactNode;
}

export function WorldView({ children }: WorldViewProps) {
  const gradientProgress = useSharedValue(0);

  React.useEffect(() => {
    gradientProgress.value = withRepeat(
      withTiming(1, {
        duration: 8000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);

  const animatedBg = useAnimatedStyle(() => ({
    opacity: interpolate(
      gradientProgress.value,
      [0, 0.5, 1],
      [0.3, 0.5, 0.3]
    ),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.backgroundBase} />
      <Animated.View style={[styles.gradientOverlay, animatedBg]}>
        <LinearGradient
          colors={[
            'rgba(123,47,247,0.15)',
            'rgba(59,130,246,0.08)',
            'rgba(6,182,212,0.12)',
            'rgba(123,47,247,0.1)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.gradientOverlay2, animatedBg]}>
        <LinearGradient
          colors={[
            'rgba(255,107,157,0.06)',
            'transparent',
            'rgba(123,47,247,0.08)',
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const absoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundBase: {
    ...absoluteFill,
    backgroundColor: Colors.bgPrimary,
  },
  gradientOverlay: {
    ...absoluteFill,
  },
  gradientOverlay2: {
    ...absoluteFill,
  },
  content: {
    flex: 1,
  },
});
