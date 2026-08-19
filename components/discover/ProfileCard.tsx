import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import { User } from '../../types/database';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface ProfileCardProps {
  user: User;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  isFront?: boolean;
  scale?: number;
  translateY?: number;
}

export function ProfileCard({
  user,
  onSwipeRight,
  onSwipeLeft,
  isFront = false,
  scale = 1,
  translateY = 0,
}: ProfileCardProps) {
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const age = user.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(user.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const gesture = isFront
    ? Gesture.Pan()
        .onUpdate((e) => {
          translateX.value = e.translationX;
          rotate.value = interpolate(
            e.translationX,
            [-SCREEN_WIDTH, SCREEN_WIDTH],
            [-15, 15],
            Extrapolation.CLAMP
          );
        })
        .onEnd((e) => {
          if (e.translationX > SWIPE_THRESHOLD) {
            translateX.value = withSpring(SCREEN_WIDTH * 1.5, {
              damping: 15,
              stiffness: 150,
            });
            cardOpacity.value = withSpring(0, { damping: 15, stiffness: 150 });
            onSwipeRight?.();
          } else if (e.translationX < -SWIPE_THRESHOLD) {
            translateX.value = withSpring(-SCREEN_WIDTH * 1.5, {
              damping: 15,
              stiffness: 150,
            });
            cardOpacity.value = withSpring(0, { damping: 15, stiffness: 150 });
            onSwipeLeft?.();
          } else {
            translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
            rotate.value = withSpring(0, { damping: 15, stiffness: 150 });
          }
        })
    : Gesture.Tap();

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale },
    ],
    opacity: cardOpacity.value,
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ translateY }] },
        isFront && animatedCardStyle,
        !isFront && { transform: [{ scale }, { translateY }] },
      ]}
    >
      <GestureDetector gesture={gesture}>
        <View style={styles.cardInner}>
          <Image
            source={{ uri: user.avatar_url ?? undefined }}
            style={styles.photo}
            resizeMode="cover"
          />

          <LinearGradient
            colors={['transparent', 'rgba(10,10,26,0.95)']}
            style={styles.gradient}
          />

          {isFront && (
            <>
              <Animated.View style={[styles.likeStamp, likeOpacity]}>
                <Text style={styles.likeStampText}>LIKE</Text>
              </Animated.View>
              <Animated.View style={[styles.passStamp, passOpacity]}>
                <Text style={styles.passStampText}>PASS</Text>
              </Animated.View>
            </>
          )}

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>
                {user.full_name}
                {age !== null ? `, ${age}` : ''}
              </Text>
              {user.is_online && <View style={styles.onlineDot} />}
            </View>

            {user.city && (
              <View style={styles.locationRow}>
                <MapPin size={14} color={Colors.textSecondary} />
                <Text style={styles.location}>{user.city}</Text>
              </View>
            )}

            {user.bio ? (
              <Text style={styles.bio} numberOfLines={2}>
                {user.bio}
              </Text>
            ) : null}

            {user.interests.length > 0 && (
              <View style={styles.tags}>
                {user.interests.slice(0, 5).map((interest) => (
                  <View key={interest} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - Spacing.base * 2,
    height: SCREEN_HEIGHT - 180,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.bgSecondary,
  },
  cardInner: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '70%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.heading,
    fontSize: 24,
    lineHeight: 30,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentGreen,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  location: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  bio: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  tag: {
    backgroundColor: Colors.bgGlassLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  likeStamp: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    borderWidth: 3,
    borderColor: Colors.accentGreen,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    transform: [{ rotate: '-15deg' }],
  },
  likeStampText: {
    ...Typography.heading,
    fontSize: 28,
    color: Colors.accentGreen,
    fontWeight: '800',
  },
  passStamp: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    borderWidth: 3,
    borderColor: Colors.error,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    transform: [{ rotate: '15deg' }],
  },
  passStampText: {
    ...Typography.heading,
    fontSize: 28,
    color: Colors.error,
    fontWeight: '800',
  },
});
