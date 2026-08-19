import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { X, Send, Camera } from 'lucide-react-native';
import { storyApi } from '../../lib/services';
import { Story } from '../../types/database';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000;

interface StorySegment {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  text_overlay: string | null;
  created_at: string;
  expires_at: string;
}

interface StoryUser {
  id: string;
  name: string;
  avatarUri: string | null;
  segments: StorySegment[];
}

function groupStoriesByUser(stories: Story[]): Record<string, StoryUser> {
  const grouped: Record<string, StoryUser> = {};
  for (const story of stories) {
    const userId = story.user_id;
    if (!grouped[userId]) {
      grouped[userId] = {
        id: userId,
        name: story.user?.full_name ?? 'Unknown',
        avatarUri: story.user?.avatar_url ?? null,
        segments: [],
      };
    }
    grouped[userId].segments.push({
      id: story.id,
      media_url: story.media_url,
      media_type: story.media_type,
      text_overlay: story.text_overlay,
      created_at: story.created_at,
      expires_at: story.expires_at,
    });
  }
  return grouped;
}

function formatTimestamp(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  const [storyUsers, setStoryUsers] = useState<Record<string, StoryUser>>({});
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const progress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const remainingRef = useRef<number>(STORY_DURATION);

  useEffect(() => {
    (async () => {
      try {
        const { data: stories } = await storyApi.getStories();
        if (!stories) return;
        const grouped = groupStoriesByUser(stories);
        setStoryUsers(grouped);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const story = storyUsers[userId ?? ''] ?? Object.values(storyUsers)[0];
  const segments = story?.segments ?? [];

  const currentSegment = segments[currentIndex];

  useEffect(() => {
    if (currentSegment) {
      storyApi.viewStory(currentSegment.id).catch(() => {});
    }
  }, [currentSegment?.id]);

  const advanceStory = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex((i) => i + 1);
      progress.value = 0;
    } else {
      router.back();
    }
  }, [currentIndex, segments.length, router]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      progress.value = 0;
    }
  }, [currentIndex]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startTimeRef.current = Date.now();
    remainingRef.current = STORY_DURATION;

    const tick = () => {
      if (isPaused) return;
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min(elapsed / STORY_DURATION, 1);
      progress.value = p;

      if (p >= 1) {
        advanceStory();
      } else {
        timerRef.current = setTimeout(tick, 16);
      }
    };
    timerRef.current = setTimeout(tick, 16);
  }, [isPaused, advanceStory, progress]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isPaused, startTimer]);

  const handleTapLeft = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleTapRight = useCallback(() => {
    advanceStory();
  }, [advanceStory]);

  const handleTapLeftJS = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      return;
    }
    handleTapLeft();
  }, [isPaused, handleTapLeft]);

  const handleTapRightJS = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      return;
    }
    handleTapRight();
  }, [isPaused, handleTapRight]);

  const swipeDown = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateX.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 100) {
        runOnJS(router.back)();
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateX.value }],
    opacity: 1 - translateX.value / SCREEN_HEIGHT,
  }));

  const handleSendReply = () => {
    if (replyText.trim().length === 0) return;
    setReplyText('');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.storyPlaceholder}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!story || segments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.storyPlaceholder}>
          <Camera size={48} color={Colors.textTertiary} />
          <Text style={styles.placeholderText}>No stories available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <GestureDetector gesture={swipeDown}>
        <Animated.View style={[styles.fullScreen, animatedStyle]}>
          <View style={styles.storyContent}>
            <View style={styles.storyPlaceholder}>
              {currentSegment.media_type === 'video' ? (
                <Text style={styles.placeholderText}>Video</Text>
              ) : (
                <Camera size={48} color={Colors.textTertiary} />
              )}
              <Text style={styles.placeholderText}>
                {currentSegment.text_overlay ?? 'Story content'}
              </Text>
            </View>

            <View style={styles.tapArea}>
              <Pressable style={styles.tapLeft} onPress={handleTapLeftJS} />
              <Pressable style={styles.tapRight} onPress={handleTapRightJS} />
            </View>

            {currentSegment.text_overlay && (
              <View style={styles.textOverlayContainer}>
                <Text style={styles.textOverlay}>{currentSegment.text_overlay}</Text>
              </View>
            )}
          </View>

          <View style={styles.progressContainer}>
            {segments.map((_, index) => (
              <View key={index} style={styles.progressTrack}>
                <View style={styles.progressBackground} />
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        index < currentIndex
                          ? '100%'
                          : index === currentIndex
                            ? `${progress.value * 100}%`
                            : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.header}>
            <Pressable style={styles.closeButton} onPress={() => router.back()}>
              <X size={24} color={Colors.textPrimary} />
            </Pressable>

            <View style={styles.userInfo}>
              <Avatar uri={story.avatarUri} size="sm" showStory />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{story.name}</Text>
                <Text style={styles.timestamp}>
                  {formatTimestamp(currentSegment.created_at)}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.pauseButton}
              onPress={() => setIsPaused((v) => !v)}
            >
              <Text style={styles.pauseText}>{isPaused ? '▶' : '❙❙'}</Text>
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.replyBar}
          >
            <View style={styles.replyContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${story.name}...`}
                placeholderTextColor={Colors.textTertiary}
                value={replyText}
                onChangeText={setReplyText}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
              />
              <Pressable
                style={[
                  styles.sendButton,
                  replyText.trim().length === 0 && styles.sendButtonDisabled,
                ]}
                onPress={handleSendReply}
                disabled={replyText.trim().length === 0}
              >
                <LinearGradient
                  colors={
                    replyText.trim().length > 0
                      ? Colors.gradientPrimary
                      : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                  }
                  style={styles.sendButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Send
                    size={16}
                    color={
                      replyText.trim().length > 0
                        ? Colors.textPrimary
                        : Colors.textTertiary
                    }
                  />
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreen: {
    flex: 1,
  },
  storyContent: {
    flex: 1,
    position: 'relative',
  },
  storyPlaceholder: {
    flex: 1,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  placeholderText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  tapArea: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  textOverlayContainer: {
    position: 'absolute',
    bottom: '30%',
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  textOverlay: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
  },
  header: {
    position: 'absolute',
    top: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
    gap: Spacing.sm,
  },
  userDetails: {
    gap: 1,
  },
  userName: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  timestamp: {
    ...Typography.tabBar,
    color: Colors.textSecondary,
  },
  pauseButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  replyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  replyInput: {
    flex: 1,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.base,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
});
