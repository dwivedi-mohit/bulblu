import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MessageCircle, Heart } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { GlassCard } from '../ui/GlassCard';
import { DisplayName } from '../ui/UserText';
import { Post } from '../../types/database';

interface PostBubbleProps {
  post: Post;
  onPress?: () => void;
}

export function PostBubble({ post, onPress }: PostBubbleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.05, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const truncatedContent =
    post.content.length > 80
      ? post.content.substring(0, 80) + '...'
      : post.content;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <GlassCard style={styles.container} variant="elevated">
          {post.is_anonymous ? (
            <View style={styles.anonymousRow}>
              <View style={styles.anonymousAvatar}>
                <Text style={styles.anonymousIcon}>?</Text>
              </View>
              <Text style={styles.anonymousName}>Anonymous</Text>
            </View>
          ) : post.user ? (
            <View style={styles.userRow}>
              <DisplayName
                userId={post.user_id}
                fallback={post.user.full_name}
                style={styles.userName}
              />
            </View>
          ) : null}

          <Text style={styles.content} numberOfLines={3}>
            {truncatedContent}
          </Text>

          <View style={styles.footer}>
            <View style={styles.reactions}>
              <View style={styles.reactionItem}>
                <Heart size={14} color={Colors.accentPink} />
                <Text style={styles.reactionCount}>{post.reaction_count}</Text>
              </View>
              <View style={styles.reactionItem}>
                <MessageCircle size={14} color={Colors.accentBlue} />
                <Text style={styles.reactionCount}>{post.comment_count}</Text>
              </View>
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    maxWidth: 180,
  },
  userRow: {
    marginBottom: Spacing.xs,
  },
  userName: {
    ...Typography.label,
    color: Colors.primary,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  anonymousAvatar: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousIcon: {
    ...Typography.tabBar,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  anonymousName: {
    ...Typography.label,
    color: Colors.textTertiary,
  },
  content: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reactionCount: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
  },
});
