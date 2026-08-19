import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Mic, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface RoomBubbleProps {
  topic: string;
  participantCount: number;
  onPress?: () => void;
}

export function RoomBubble({
  topic,
  participantCount,
  onPress,
}: RoomBubbleProps) {
  const pulse = useSharedValue(1);
  const floatY = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.04, {
        duration: 2000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    floatY.value = withRepeat(
      withTiming(3, {
        duration: 3500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);

  const animatedPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const animatedFloat = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const animatedPressable = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.08, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <Animated.View style={[styles.wrapper, animatedFloat]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={animatedPressable}>
          <Animated.View style={[styles.pulseRing, animatedPulse]} />
          <LinearGradient
            colors={[Colors.primary, Colors.accentBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
          >
            <View style={styles.iconContainer}>
              <Mic size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.topic} numberOfLines={1}>
              {topic}
            </Text>
            <View style={styles.participants}>
              <Users size={12} color={Colors.textSecondary} />
              <Text style={styles.participantCount}>{participantCount}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: Radius.xl + 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 0.3,
  },
  container: {
    width: 100,
    height: 100,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topic: {
    ...Typography.label,
    color: Colors.textPrimary,
    maxWidth: 88,
    textAlign: 'center',
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
