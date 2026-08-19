import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';
import { postApi } from '../../lib/services';
import { Post } from '../../types/database';
import { Colors } from '../../constants/colors';
import { Spacing, Radius, Layout } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { GlassCard } from '../../components/ui/GlassCard';

type CommunityPost = Post;

const ANONYMOUS_GRADIENTS = [
  ['#14B8A6', '#2DD4BF'],
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

export default function CommunityScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const fetchPosts = useCallback(async (pageNum: number, refresh = false) => {
    try {
      const { data } = await postApi.getFeed(pageNum);
      if (!data) return;
      if (refresh) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setHasMore(data.length >= 20);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchPosts(0, true);
      setLoadingInitial(false);
    })();
  }, [fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await fetchPosts(0, true);
    setRefreshing(false);
  }, [fetchPosts]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPosts(nextPage);
    setLoadingMore(false);
  }, [page, loadingMore, hasMore, fetchPosts]);

  const handleCreatePost = useCallback(() => {
    router.push('/post/create');
  }, [router]);

  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router]
  );

  const renderPost = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <PostCard post={item} onPress={() => handlePostPress(item.id)} />
    ),
    [handlePostPress]
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
      </View>

      {loadingInitial ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to share something with the community!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}

      <Pressable style={styles.fab} onPress={handleCreatePost}>
        <AnimatedGradientFAB onPress={handleCreatePost} />
      </Pressable>
    </SafeAreaView>
  );
}

function AnimatedGradientFAB({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={styles.fabInner}>
          <Plus size={28} color="#FFFFFF" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PostCard({
  post,
  onPress,
}: {
  post: CommunityPost;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
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
            <Pressable style={styles.moreButton}>
              <MoreHorizontal size={18} color={Colors.textTertiary} />
            </Pressable>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.media_url && post.media_type === 'image' && (
            <Image source={{ uri: post.media_url }} style={styles.postImage} />
          )}

          <View style={styles.postFooter}>
            <View style={styles.reactions}>
              <Pressable style={styles.reactionButton}>
                <Heart size={18} color={Colors.textTertiary} />
                <Text style={styles.reactionCount}>{post.reaction_count}</Text>
              </Pressable>
              <Pressable style={styles.reactionButton}>
                <MessageCircle size={18} color={Colors.textTertiary} />
                <Text style={styles.reactionCount}>{post.comment_count}</Text>
              </Pressable>
              <Pressable style={styles.reactionButton}>
                <Share2 size={18} color={Colors.textTertiary} />
              </Pressable>
            </View>
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

function AnonymousAvatar({ id }: { id: string }) {
  const gradient = getAnonymousGradient(id);

  return (
    <View style={styles.anonymousRow}>
      <View
        style={[
          styles.anonymousAvatar,
          {
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
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
  },
  list: {
    paddingBottom: Spacing['3xl'],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  fabInner: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  postCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
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
    color: Colors.textPrimary,
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
    width: 40,
    height: 40,
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
  moreButton: {
    padding: Spacing.xs,
  },
  postContent: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reactionCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  timestamp: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
  },
  footerLoader: {
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
});
