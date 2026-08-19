import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Image,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';
import { postApi } from '../../lib/services';
import { Post, Comment } from '../../types/database';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { GlassCard } from '../../components/ui/GlassCard';

type PostDetail = Post;
type CommentWithUser = Comment;

const REACTIONS = [
  { emoji: '❤️', label: 'heart' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '😂', label: 'laugh' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😮', label: 'wow' },
];

const ANONYMOUS_GRADIENTS = [
  ['#7B2FF7', '#3B82F6'],
  ['#FF6B9D', '#FF6B35'],
  ['#3B82F6', '#06B6D4'],
  ['#10B981', '#34D399'],
  ['#F59E0B', '#EF4444'],
];

function getAnonymousGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ANONYMOUS_GRADIENTS[Math.abs(hash) % ANONYMOUS_GRADIENTS.length];
}

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      try {
        const [feedRes, commentsRes] = await Promise.all([
          postApi.getFeed(0),
          postApi.getComments(postId),
        ]);
        const found = feedRes.data?.find((p: PostDetail) => p.id === postId);
        setPost(found ?? null);
        if (commentsRes.data) setComments(commentsRes.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleReaction = useCallback(async (emoji: string) => {
    if (!postId) return;
    try {
      await postApi.react(postId, emoji);
      setPost((prev) => prev ? { ...prev, reaction_count: prev.reaction_count + 1 } : prev);
    } catch {
      // ignore
    }
  }, [postId]);

  const handleSendComment = useCallback(async () => {
    if (newComment.trim().length === 0 || !postId) return;

    setSending(true);
    try {
      const { data: comment } = await postApi.comment(postId, newComment.trim());
      if (comment) setComments((prev) => [...prev, comment]);
      setNewComment('');
      setPost((prev) => prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to post comment');
    } finally {
      setSending(false);
    }
  }, [newComment, postId]);

  const timeAgo = post
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : '';

  const renderComment = ({ item }: { item: CommentWithUser }) => (
    <CommentItem comment={item} />
  );

  const ListHeader = () => {
    if (!post) return null;

    return (
      <View>
        <GlassCard style={styles.postCard}>
          <View style={styles.postHeader}>
            {post.is_anonymous ? (
              <AnonymousAvatar id={post.id} />
            ) : (
              <View style={styles.userRow}>
                {post.user?.avatar_url ? (
                  <Image
                    source={{ uri: post.user.avatar_url }}
                    style={styles.userAvatar}
                  />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Text style={styles.userAvatarInitial}>
                      {post.user?.full_name?.[0] || '?'}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.userName}>
                    {post.user?.full_name || 'Unknown'}
                  </Text>
                  <Text style={styles.userHandle}>@{post.user?.username}</Text>
                </View>
              </View>
            )}
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.media_url && post.media_type === 'image' && (
            <Image source={{ uri: post.media_url }} style={styles.postImage} />
          )}

          <View style={styles.reactionsBar}>
            {REACTIONS.map((reaction) => (
              <ReactionButton
                key={reaction.label}
                emoji={reaction.emoji}
                onPress={() => handleReaction(reaction.emoji)}
              />
            ))}
          </View>
        </GlassCard>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textTertiary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <Pressable
            onPress={handleSendComment}
            style={[
              styles.sendButton,
              (newComment.trim().length === 0 || sending) && styles.sendButtonDisabled,
            ]}
            disabled={newComment.trim().length === 0 || sending}
          >
            <Send size={18} color={newComment.trim().length === 0 ? Colors.textTertiary : '#FFFFFF'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReactionButton({
  emoji,
  onPress,
}: {
  emoji: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.2, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.reactionButton}
      >
        <Text style={styles.reactionEmoji}>{emoji}</Text>
      </Pressable>
    </Animated.View>
  );
}

function CommentItem({ comment }: { comment: CommentWithUser }) {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  return (
    <View style={styles.commentItem}>
      {comment.is_anonymous ? (
        <AnonymousAvatar id={comment.id} size="sm" />
      ) : (
        <View style={styles.commentUserRow}>
          {comment.user?.avatar_url ? (
            <Image
              source={{ uri: comment.user.avatar_url }}
              style={styles.commentAvatar}
            />
          ) : (
            <View style={styles.commentAvatarPlaceholder}>
              <Text style={styles.commentAvatarInitial}>
                {comment.user?.full_name?.[0] || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.commentUserName}>
            {comment.user?.full_name || 'Unknown'}
          </Text>
        </View>
      )}
      <Text style={styles.commentContent}>{comment.content}</Text>
      <Text style={styles.commentTimestamp}>{timeAgo}</Text>
    </View>
  );
}

function AnonymousAvatar({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' }) {
  const gradient = getAnonymousGradient(id);
  const dimensions = size === 'sm' ? 32 : 40;

  return (
    <View style={styles.anonymousRow}>
      <View
        style={[
          styles.anonymousAvatar,
          {
            width: dimensions,
            height: dimensions,
            backgroundColor: gradient[0],
          },
        ]}
      >
        <Text style={styles.anonymousIcon}>?</Text>
      </View>
      <Text style={styles.anonymousName}>Anonymous</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.bodyBold,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  list: {
    paddingBottom: Spacing.base,
  },
  postCard: {
    margin: Spacing.base,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  userName: {
    ...Typography.bodyBold,
  },
  userHandle: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  anonymousAvatar: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousIcon: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  anonymousName: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  timestamp: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
  },
  postContent: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    height: 240,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  reactionsBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reactionButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlassLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 20,
  },
  commentsSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  commentsTitle: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  commentItem: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
  },
  commentAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarInitial: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  commentUserName: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  commentContent: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  commentTimestamp: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgGlassLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.bgGlassLight,
  },
});
