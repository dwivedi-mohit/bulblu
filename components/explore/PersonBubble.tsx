import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../ui/Avatar';

interface PersonBubbleProps {
  uri: string | null;
  name: string;
  isOnline?: boolean;
  onPress?: () => void;
  size?: number;
}

export function PersonBubble({
  uri,
  name,
  isOnline = false,
  onPress,
  size = 56,
}: PersonBubbleProps) {
  const floatY = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    floatY.value = withRepeat(
      withTiming(4, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);

  const animatedContainer = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const animatedPressable = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.1, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <Animated.View style={[styles.wrapper, animatedContainer]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={animatedPressable}>
          {isOnline && (
            <View
              style={[
                styles.glow,
                {
                  width: size + 16,
                  height: size + 16,
                  borderRadius: (size + 16) / 2,
                },
              ]}
            />
          )}
          <Avatar uri={uri} size="lg" showOnline={isOnline} />
          <Text
            style={[
              styles.name,
              { maxWidth: size + 16 },
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: Colors.accentGreen,
    opacity: 0.15,
    top: -8,
    left: -8,
  },
  name: {
    ...Typography.label,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
