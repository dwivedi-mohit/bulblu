import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { User } from '../../types/database';
import { useCachedProfile } from '../ui/UserText';

interface MatchCelebrationProps {
  currentUser: User | User;
  matchedUser: User;
  onSendMessage: () => void;
  onKeepExploring: () => void;
}

export function MatchCelebration({
  currentUser,
  matchedUser,
  onSendMessage,
  onKeepExploring,
}: MatchCelebrationProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const titleOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const avatar1X = useSharedValue(-200);
  const avatar2X = useSharedValue(200);

  // Both avatars and the match line read through the live cache.
  const liveSelf = useCachedProfile(currentUser?.id);
  const liveMatch = useCachedProfile(matchedUser?.id);
  const selfAvatar = liveSelf?.avatar_url || currentUser.avatar_url || undefined;
  const matchAvatar = liveMatch?.avatar_url || matchedUser.avatar_url || undefined;
  const matchName = liveMatch?.full_name || matchedUser.full_name;

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withDelay(
      200,
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    avatar1X.value = withDelay(
      300,
      withSpring(0, { damping: 15, stiffness: 100 })
    );
    avatar2X.value = withDelay(
      400,
      withSpring(0, { damping: 15, stiffness: 100 })
    );
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    buttonsOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const avatar1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: avatar1X.value }],
  }));

  const avatar2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: avatar2X.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, containerStyle]}>
      <LinearGradient
        colors={[...Colors.gradientPrimary, Colors.primaryDark]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[styles.content, contentStyle]}>
        <Animated.View style={[styles.avatarsContainer, avatar1Style]}>
          <Image
            source={{ uri: selfAvatar }}
            style={styles.avatar}
          />
        </Animated.View>

        <Animated.View style={[styles.avatarsContainer, avatar2Style]}>
          <Image
            source={{ uri: matchAvatar }}
            style={[styles.avatar, styles.avatarRight]}
          />
        </Animated.View>

        <Animated.Text style={[styles.matchTitle, titleStyle]}>
          It's a Match!
        </Animated.Text>

        <Animated.Text style={[styles.matchSubtitle, titleStyle]}>
          You and {matchName} liked each other
        </Animated.Text>

        <Animated.View style={[styles.buttonContainer, buttonsStyle]}>
          <Pressable style={styles.sendMessageBtn} onPress={onSendMessage}>
            <Text style={styles.sendMessageText}>Send Message</Text>
          </Pressable>

          <Pressable style={styles.keepExploringBtn} onPress={onKeepExploring}>
            <Text style={styles.keepExploringText}>Keep Exploring</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatarsContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarRight: {
    position: 'absolute',
    left: 70,
  },
  matchTitle: {
    ...Typography.heading,
    fontSize: 36,
    color: '#FFFFFF',
    marginTop: Spacing.xl,
  },
  matchSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
    width: '100%',
    paddingHorizontal: Spacing.xl,
  },
  sendMessageBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  sendMessageText: {
    ...Typography.button,
    color: Colors.primary,
  },
  keepExploringBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  keepExploringText: {
    ...Typography.button,
    color: '#FFFFFF',
  },
});
