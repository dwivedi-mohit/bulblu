import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Avatar } from '../../components/ui/Avatar';
import { DisplayName } from '../../components/ui/UserText';
import { StoryRing } from '../../components/ui/StoryRing';
import { WePlayGameCard } from '../../components/game/WePlayGameCard';
import { matchApi, storyApi, voiceRoomApi, notificationApi, postApi } from '../../lib/services';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/callStore';
import type { User, Story, VoiceRoom } from '../../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - 12) / 2;
const GRID_CARD_HEIGHT = GRID_CARD_WIDTH / 2.5;
const HERO_CARD_HEIGHT = (SCREEN_WIDTH - Spacing.lg * 2) / 2.49;

interface PostItem {
  id: string;
  user_id: string;
  user?: User;
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

export default function ExploreScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const startCall = useCallStore((s) => s.startCall);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [people, setPeople] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const storeNotificationCount = useAuthStore((s) => s.notificationCount);
  const [unreadCount, setUnreadCount] = useState(storeNotificationCount);

  const fetchData = useCallback(async () => {
    try {
      const [discoverRes, storiesRes, roomsRes, postsRes] = await Promise.allSettled([
        matchApi.getDiscover(),
        storyApi.getStories(),
        voiceRoomApi.getRooms(),
        postApi.getFeed(),
      ]);

      if (discoverRes.status === 'fulfilled' && (discoverRes.value as any)?.data) {
        const val = (discoverRes.value as any).data;
        setPeople(Array.isArray(val) ? val : []);
      }
      if (storiesRes.status === 'fulfilled' && (storiesRes.value as any)?.data) {
        const val = (storiesRes.value as any).data;
        if (Array.isArray(val)) setStories(val);
        else if (val && typeof val === 'object') setStories(Object.values(val).flat() as Story[]);
        else setStories([]);
      }
      if (roomsRes.status === 'fulfilled' && (roomsRes.value as any)?.data) {
        const val = (roomsRes.value as any).data;
        setRooms(Array.isArray(val) ? val : []);
      }
      if (postsRes.status === 'fulfilled' && (postsRes.value as any)?.data) {
        const val = (postsRes.value as any).data;
        setPosts(Array.isArray(val) ? val : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await notificationApi.getUnreadCount();
      if (data?.success) {
        setUnreadCount(data.count);
        useAuthStore.getState().setNotificationCount(data.count);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.is_liked;
          return {
            ...p,
            is_liked: isLiked,
            likes_count: (p.likes_count ?? 0) + (isLiked ? 1 : -1),
          };
        }
        return p;
      })
    );
    postApi.react(postId, '❤️').catch(() => {});
  };

  const handleQuickCall = (targetUser: User, type: 'voice' | 'video') => {
    startCall(
      {
        id: targetUser.id,
        name: targetUser.full_name || 'Companion',
        avatar: targetUser.avatar_url || undefined,
        matchId: `match_${targetUser.id}`,
      },
      type
    );
  };

  const myStory = user
    ? { id: 'me', user_id: user.id, media_url: '', media_type: 'image' as const, expires_at: '', created_at: '', user, viewed: false }
    : null;

  const safeStories = Array.isArray(stories) ? stories : [];
  const storyItems = [
    ...(myStory ? [{ ...myStory, _isMe: true }] : []),
    ...safeStories.map((s) => ({ ...s, _isMe: false })),
  ];

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Mohit';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. Header (Reference Design matching media_1787414786603.jpg) */}
      <View style={styles.header}>
        {searchOpen ? (
          <View style={styles.searchHeaderBox}>
            <Ionicons name="search" size={17} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchHeaderInput}
              placeholder="Search party rooms, games, friends..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchOpen(false); }}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* User Greeting Box */}
            <View style={styles.headerLeftRow}>
              <TouchableOpacity
                style={styles.userAvatarWrap}
                onPress={() => router.push(`/companion/${user?.id || 'demo_user_1'}`)}
              >
                <Avatar uri={user?.avatar_url ?? null} userId={user?.id} size="sm" showOnline={true} isOnline={true} />
              </TouchableOpacity>
              <View style={styles.headerGreetingBox}>
                <Text style={styles.greetingTitle}>Hey {firstName}! 👋</Text>
                <Text style={styles.greetingSub}>Let's play & make new friends</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.headerRightRow}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => setSearchOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={21} color="#0F172A" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.push('/notifications' as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={21} color="#0F172A" />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F766E"
            colors={['#0F766E']}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading Bulblu Party...</Text>
          </View>
        ) : (
          <>
            {/* 1. Stories / Reels Bar (Top Priority) */}
            <View style={styles.storiesBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
                {storyItems.map((story) => (
                  <TouchableOpacity
                    key={story.id}
                    style={styles.storyItem}
                    onPress={() => router.push(`/companion/${story.user_id || story.id || 'comp-1'}`)}
                    activeOpacity={0.85}
                  >
                    <StoryRing viewed={(story as any).viewed ?? false} size={58}>
                      <Avatar
                        uri={story.user?.avatar_url ?? null}
                        userId={story.user?.id}
                        size="md"
                        showOnline={true}
                        isOnline={story.user?.is_online}
                      />
                    </StoryRing>
                    {(story as any)._isMe ? (
                      <Text style={styles.storyName} numberOfLines={1}>Your Story</Text>
                    ) : (
                      <DisplayName
                        userId={story.user?.id}
                        fallback={story.user?.full_name}
                        style={styles.storyName}
                        numberOfLines={1}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 2. Party Games Section Header */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="game-controller" size={20} color="#0F766E" />
                <Text style={styles.sectionHeaderTitle}>Party Games</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/rent')}>
                <Text style={styles.seeAllText}>See all &gt;</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Hero Feature Card (1v1 Video - Exact Fit 3D Artwork) */}
            <View style={styles.heroSection}>
              <TouchableOpacity
                style={[
                  styles.heroCardTouch,
                  styles.weplayGoldFrame,
                  { borderColor: '#F59E0B', shadowColor: '#D97706' },
                ]}
                onPress={() => router.push('/(tabs)/video')}
                activeOpacity={0.9}
              >
                <Image
                  source={require('../../assets/images/ref_video.jpg')}
                  style={styles.heroCardImage}
                  resizeMode="stretch"
                />
              </TouchableOpacity>
            </View>

            {/* 4. WePlay 2-Column Games Grid (Exact Corner Fit Full 3D Graphics) */}
            <View style={styles.gridSection}>
              {/* Row 1: Ludo Party (Cyan) + Truth & Dare (Pink) */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  style={[
                    styles.gridCardTouch,
                    styles.weplayGoldFrame,
                    { borderColor: '#06B6D4', shadowColor: '#0891B2' },
                  ]}
                  onPress={() => router.push('/game/ludo_party_room_1' as any)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={require('../../assets/images/ref_ludo.jpg')}
                    style={styles.gridCardImage}
                    resizeMode="stretch"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridCardTouch,
                    styles.weplayGoldFrame,
                    { borderColor: '#EC4899', shadowColor: '#DB2777' },
                  ]}
                  onPress={() => router.push('/(tabs)/rent')}
                  activeOpacity={0.9}
                >
                  <Image
                    source={require('../../assets/images/ref_truth.jpg')}
                    style={styles.gridCardImage}
                    resizeMode="stretch"
                  />
                </TouchableOpacity>
              </View>

              {/* Row 2: Draw & Guess (Gold) + Jackaro (Crimson) */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  style={[
                    styles.gridCardTouch,
                    styles.weplayGoldFrame,
                    { borderColor: '#F59E0B', shadowColor: '#D97706' },
                  ]}
                  onPress={() => router.push('/(tabs)/rent')}
                  activeOpacity={0.9}
                >
                  <Image
                    source={require('../../assets/images/ref_draw.jpg')}
                    style={styles.gridCardImage}
                    resizeMode="stretch"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridCardTouch,
                    styles.weplayGoldFrame,
                    { borderColor: '#E11D48', shadowColor: '#BE123C' },
                  ]}
                  onPress={() => router.push('/(tabs)/rent')}
                  activeOpacity={0.9}
                >
                  <Image
                    source={require('../../assets/images/ref_jackaro.jpg')}
                    style={styles.gridCardImage}
                    resizeMode="stretch"
                  />
                </TouchableOpacity>
              </View>

              {/* Row 3: UNO (Lavender) + Singing & Karaoke (Peach Coral) */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  style={[
                    styles.gridCardTouch,
                    styles.weplayGoldFrame,
                    { borderColor: '#6366F1', shadowColor: '#4F46E5' },
                  ]}
                  onPress={() => router.push('/(tabs)/rent')}
                  activeOpacity={0.9}
                >
                  <Image
                    source={require('../../assets/images/ref_uno.jpg')}
                    style={styles.gridCardImage}
                    resizeMode="stretch"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridCardTouch,
                    styles.weplayGoldFrame,
                    { borderColor: '#F43F5E', shadowColor: '#E11D48' },
                  ]}
                  onPress={() => router.push('/(tabs)/voice')}
                  activeOpacity={0.9}
                >
                  <Image
                    source={require('../../assets/images/ref_singing.jpg')}
                    style={styles.gridCardImage}
                    resizeMode="stretch"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. Featured Bottom Hero Card (Voice Party 4K Banner - Exact Fit) */}
            <View style={[styles.heroSection, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[
                  styles.heroCardTouch,
                  styles.weplayGoldFrame,
                  { borderColor: '#14B8A6', shadowColor: '#0D9488' },
                ]}
                onPress={() => router.push('/(tabs)/voice')}
                activeOpacity={0.9}
              >
                <Image
                  source={require('../../assets/images/ref_voice.jpg')}
                  style={styles.heroCardImage}
                  resizeMode="stretch"
                />
              </TouchableOpacity>
            </View>

            {/* 5. Live Voice Rooms Section (Redesigned Modern Glassmorphism UI) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="radio" size={20} color="#0F766E" />
                  <Text style={styles.sectionHeaderTitle}>Live Voice Rooms</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/voice')}>
                  <Text style={styles.seeAllText}>See all &gt;</Text>
                </TouchableOpacity>
              </View>

              {rooms.length > 0 ? (
                rooms.slice(0, 3).map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.roomCardWrapper}
                    onPress={() => router.push('/(tabs)/voice')}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={['#F0FDFA', '#F8FAFC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.roomCardGradient}
                    >
                      {/* Top Meta Badge Row */}
                      <View style={styles.roomTopMetaRow}>
                        <View style={styles.livePillBadge}>
                          <View style={styles.livePulseDot} />
                          <Text style={styles.livePillText}>LIVE</Text>
                        </View>
                        <View style={styles.tagPillBadge}>
                          <Ionicons name="musical-notes" size={11} color="#0F766E" />
                          <Text style={styles.tagPillText}>Music & Chill</Text>
                        </View>
                        <Text style={styles.listenerCountText}>{room.participant_count ?? 38} listening</Text>
                      </View>

                      {/* Main Room Details */}
                      <View style={styles.roomMainRow}>
                        {/* Mic Icon Box */}
                        <View style={styles.roomMicAvatarBox}>
                          <LinearGradient
                            colors={['#0F766E', '#14B8A6']}
                            style={styles.roomMicGradientCircle}
                          >
                            <Ionicons name="mic" size={22} color="#FFFFFF" />
                          </LinearGradient>
                        </View>

                        {/* Text Details */}
                        <View style={styles.roomDetailsTextCol}>
                          <Text style={styles.roomTitleText} numberOfLines={1}>
                            {room.topic}
                          </Text>
                          <Text style={styles.roomHostSubText} numberOfLines={1}>
                            Host: @{room.host_id ? 'voice_host' : 'aria_music'} • Drop in to talk & sing
                          </Text>
                        </View>

                        {/* Join CTA Button */}
                        <TouchableOpacity
                          style={styles.joinCtaTouch}
                          onPress={() => router.push('/(tabs)/voice')}
                        >
                          <LinearGradient
                            colors={['#0F766E', '#0D9488']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.joinCtaGradient}
                          >
                            <Text style={styles.joinCtaText}>Join</Text>
                            <Ionicons name="play" size={10} color="#FFFFFF" />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity
                  style={styles.roomCardWrapper}
                  onPress={() => router.push('/(tabs)/voice')}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#F0FDFA', '#F8FAFC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.roomCardGradient}
                  >
                    {/* Top Meta Badge Row */}
                    <View style={styles.roomTopMetaRow}>
                      <View style={styles.livePillBadge}>
                        <View style={styles.livePulseDot} />
                        <Text style={styles.livePillText}>LIVE</Text>
                      </View>
                      <View style={styles.tagPillBadge}>
                        <Ionicons name="musical-notes" size={11} color="#0F766E" />
                        <Text style={styles.tagPillText}>Karaoke & Chill</Text>
                      </View>
                      <Text style={styles.listenerCountText}>{38} listening</Text>
                    </View>

                    {/* Main Room Details */}
                    <View style={styles.roomMainRow}>
                      {/* Mic Icon Box */}
                      <View style={styles.roomMicAvatarBox}>
                        <LinearGradient
                          colors={['#0F766E', '#14B8A6']}
                          style={styles.roomMicGradientCircle}
                        >
                          <Ionicons name="mic" size={22} color="#FFFFFF" />
                        </LinearGradient>
                      </View>

                      {/* Text Details */}
                      <View style={styles.roomDetailsTextCol}>
                        <Text style={styles.roomTitleText} numberOfLines={1}>
                          Late Night Music Lounge & Karaoke
                        </Text>
                        <Text style={styles.roomHostSubText} numberOfLines={1}>
                          Host: @aria_singer • Live Audio Party Room
                        </Text>
                      </View>

                      {/* Join CTA Button */}
                      <TouchableOpacity
                        style={styles.joinCtaTouch}
                        onPress={() => router.push('/(tabs)/voice')}
                      >
                        <LinearGradient
                          colors={['#0F766E', '#0D9488']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.joinCtaGradient}
                        >
                          <Text style={styles.joinCtaText}>Join</Text>
                          <Ionicons name="play" size={10} color="#FFFFFF" />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* 6. Online Companions Section (Redesigned Bento Cards with Dual Actions) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="sparkles" size={19} color="#0F766E" />
                  <Text style={styles.sectionHeaderTitle}>Online Companions</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/rent')}>
                  <Text style={styles.seeAllText}>See all &gt;</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.companionsBentoGrid}>
                {people.length > 0 ? (
                  people.slice(0, 4).map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      style={styles.companionBentoCard}
                      onPress={() => router.push(`/companion/${person.id || 'comp-1'}`)}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={['#F0FDFA', '#FFFFFF']}
                        style={styles.companionBentoHeaderBg}
                      >
                        <View style={styles.companionAvatarRingContainer}>
                          <StoryRing viewed={false} size={64}>
                            <Avatar
                              uri={person.avatar_url}
                              userId={person.id}
                              size="lg"
                              showOnline={true}
                              isOnline={person.is_online}
                            />
                          </StoryRing>
                        </View>
                      </LinearGradient>

                      <View style={styles.companionBentoInfoBody}>
                        <DisplayName
                          userId={person.id}
                          fallback={person.full_name}
                          style={styles.companionBentoNameText}
                          numberOfLines={1}
                        />

                        <View style={styles.companionStatusPill}>
                          <View style={[styles.statusDot, { backgroundColor: person.is_online ? '#10B981' : '#94A3B8' }]} />
                          <Text style={styles.companionStatusText}>
                            {person.is_online ? 'Available now' : 'Offline'}
                          </Text>
                        </View>

                        {/* Dual Action CTAs */}
                        <View style={styles.companionDualActionRow}>
                          <TouchableOpacity
                            style={styles.companionActionCallTouch}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleQuickCall(person, 'voice');
                            }}
                          >
                            <LinearGradient
                              colors={['#0F766E', '#0D9488']}
                              style={styles.companionActionCallGradient}
                            >
                              <Ionicons name="call" size={12} color="#FFFFFF" />
                              <Text style={styles.companionActionCallText}>Call</Text>
                            </LinearGradient>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.companionActionChatTouch}
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(`/(tabs)/messages`);
                            }}
                          >
                            <LinearGradient
                              colors={['#F59E0B', '#D97706']}
                              style={styles.companionActionChatGradient}
                            >
                              <Ionicons name="chatbubble" size={12} color="#FFFFFF" />
                              <Text style={styles.companionActionChatText}>Chat</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    {/* Fallback Demo Card 1 */}
                    <TouchableOpacity
                      style={styles.companionBentoCard}
                      onPress={() => router.push('/companion/comp-1')}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={['#F0FDFA', '#FFFFFF']}
                        style={styles.companionBentoHeaderBg}
                      >
                        <View style={styles.companionAvatarRingContainer}>
                          <StoryRing viewed={false} size={64}>
                            <Avatar uri="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300" size="lg" showOnline={true} isOnline={true} />
                          </StoryRing>
                        </View>
                      </LinearGradient>

                      <View style={styles.companionBentoInfoBody}>
                        <Text style={styles.companionBentoNameText} numberOfLines={1}>Aria Sharma</Text>
                        <View style={styles.companionStatusPill}>
                          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                          <Text style={styles.companionStatusText}>Available now</Text>
                        </View>

                        <View style={styles.companionDualActionRow}>
                          <TouchableOpacity
                            style={styles.companionActionCallTouch}
                            onPress={() => router.push('/companion/comp-1')}
                          >
                            <LinearGradient colors={['#0F766E', '#0D9488']} style={styles.companionActionCallGradient}>
                              <Ionicons name="call" size={12} color="#FFFFFF" />
                              <Text style={styles.companionActionCallText}>Call</Text>
                            </LinearGradient>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.companionActionChatTouch}
                            onPress={() => router.push('/(tabs)/messages')}
                          >
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.companionActionChatGradient}>
                              <Ionicons name="chatbubble" size={12} color="#FFFFFF" />
                              <Text style={styles.companionActionChatText}>Chat</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Fallback Demo Card 2 */}
                    <TouchableOpacity
                      style={styles.companionBentoCard}
                      onPress={() => router.push('/companion/comp-2')}
                      activeOpacity={0.88}
                    >
                      <LinearGradient
                        colors={['#FAF5FF', '#FFFFFF']}
                        style={styles.companionBentoHeaderBg}
                      >
                        <View style={styles.companionAvatarRingContainer}>
                          <StoryRing viewed={false} size={64}>
                            <Avatar uri="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300" size="lg" showOnline={true} isOnline={true} />
                          </StoryRing>
                        </View>
                      </LinearGradient>

                      <View style={styles.companionBentoInfoBody}>
                        <Text style={styles.companionBentoNameText} numberOfLines={1}>Rohan Verma</Text>
                        <View style={styles.companionStatusPill}>
                          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                          <Text style={styles.companionStatusText}>Available now</Text>
                        </View>

                        <View style={styles.companionDualActionRow}>
                          <TouchableOpacity
                            style={styles.companionActionCallTouch}
                            onPress={() => router.push('/companion/comp-2')}
                          >
                            <LinearGradient colors={['#0F766E', '#0D9488']} style={styles.companionActionCallGradient}>
                              <Ionicons name="call" size={12} color="#FFFFFF" />
                              <Text style={styles.companionActionCallText}>Call</Text>
                            </LinearGradient>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.companionActionChatTouch}
                            onPress={() => router.push('/(tabs)/messages')}
                          >
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.companionActionChatGradient}>
                              <Ionicons name="chatbubble" size={12} color="#FFFFFF" />
                              <Text style={styles.companionActionChatText}>Chat</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* 7. Community Moments */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="newspaper" size={19} color="#0F766E" />
                  <Text style={styles.sectionHeaderTitle}>Community Moments</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(tabs)/messages')}>
                  <Text style={styles.seeAllText}>See all &gt;</Text>
                </TouchableOpacity>
              </View>

              {posts.length > 0 ? (
                posts.slice(0, 3).map((post) => (
                  <View key={post.id} style={styles.feedCard}>
                    <View style={styles.feedCardHeader}>
                      <Avatar
                        uri={post.user?.avatar_url ?? null}
                        userId={post.user_id}
                        size="sm"
                        showOnline={true}
                        isOnline={post.user?.is_online}
                      />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <DisplayName
                          userId={post.user_id}
                          fallback={post.user?.full_name ?? 'User'}
                          style={styles.feedAuthorName}
                        />
                        <Text style={styles.feedTimeAgo}>
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.feedText}>{post.content}</Text>

                    {post.media_url ? (
                      <Image source={{ uri: post.media_url }} style={styles.feedMediaImg} resizeMode="cover" />
                    ) : null}

                    <View style={styles.feedActionBar}>
                      <TouchableOpacity style={styles.feedActionBtn} onPress={() => handleLikePost(post.id)}>
                        <Ionicons
                          name={post.is_liked ? 'heart' : 'heart-outline'}
                          size={18}
                          color={post.is_liked ? '#EF4444' : '#64748B'}
                        />
                        <Text style={[styles.feedActionCount, post.is_liked && { color: '#EF4444' }]}>
                          {post.likes_count ?? 0}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.feedActionBtn}>
                        <Ionicons name="chatbubble-outline" size={17} color="#64748B" />
                        <Text style={styles.feedActionCount}>{post.comments_count ?? 0}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.feedCard}>
                  <View style={styles.feedCardHeader}>
                    <Avatar
                      uri="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"
                      size="sm"
                      showOnline={true}
                      isOnline={true}
                    />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.feedAuthorName}>Aria Sharma</Text>
                      <Text style={styles.feedTimeAgo}>2 hours ago</Text>
                    </View>
                  </View>

                  <Text style={styles.feedText}>
                    Hosting a late-night Ludo & Voice party tonight at 9 PM! Come play with us!
                  </Text>

                  <View style={styles.feedActionBar}>
                    <View style={styles.feedActionBtn}>
                      <Ionicons name="heart" size={18} color="#EF4444" />
                      <Text style={[styles.feedActionCount, { color: '#EF4444' }]}>42</Text>
                    </View>

                    <View style={styles.feedActionBtn}>
                      <Ionicons name="chatbubble-outline" size={17} color="#64748B" />
                      <Text style={styles.feedActionCount}>12</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatarWrap: {
    position: 'relative',
  },
  headerGreetingBox: {
    justifyContent: 'center',
  },
  greetingTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  greetingSub: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 6,
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.full,
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  searchHeaderBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
  },
  searchHeaderInput: {
    flex: 1,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13.5,
    color: '#0F172A',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 115 : 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 180,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    color: '#64748B',
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  seeAllText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12.5,
    color: '#0F766E',
  },

  /* Hero Ludo Party Banner */
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: 4,
  },
  heroCardTouch: {
    width: '100%',
    height: HERO_CARD_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
  },
  heroCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },

  /* 2x2 Party Games Grid */
  gridSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: 10,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCardTouch: {
    width: GRID_CARD_WIDTH,
    height: GRID_CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  weplayGoldFrame: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  /* Stories Bar */
  storiesBar: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginTop: 14,
  },
  storiesScroll: {
    paddingHorizontal: Spacing.lg,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 70,
  },
  storyName: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },

  /* Live Voice Rooms Modern Redesign */
  section: {
    marginTop: 18,
  },
  roomCardWrapper: {
    marginHorizontal: Spacing.lg,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    shadowColor: '#0F766E',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roomCardGradient: {
    padding: 13,
  },
  roomTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  livePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  livePillText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9.5,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tagPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagPillText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 10.5,
    color: '#0369A1',
  },
  listenerCountText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#0F766E',
  },
  roomMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomMicAvatarBox: {
    marginRight: 10,
  },
  roomMicGradientCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  roomDetailsTextCol: {
    flex: 1,
    marginRight: 8,
  },
  roomTitleText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F172A',
    marginBottom: 2,
  },
  roomHostSubText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  joinCtaTouch: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  joinCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  joinCtaText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },

  /* Online Companions Bento Grid Redesign */
  companionsBentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: Spacing.lg,
    marginTop: 6,
  },
  companionBentoCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - 10) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  companionBentoHeaderBg: {
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: 'center',
  },
  companionAvatarRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionBentoInfoBody: {
    paddingHorizontal: 10,
    paddingBottom: 12,
    alignItems: 'center',
  },
  companionBentoNameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  companionStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  companionStatusText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 10.5,
    color: '#475569',
  },
  companionDualActionRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  companionActionCallTouch: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  companionActionCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
  },
  companionActionCallText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  companionActionChatTouch: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  companionActionChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
  },
  companionActionChatText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  /* Community Feed */
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: 14,
    marginHorizontal: Spacing.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedAuthorName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F172A',
  },
  feedTimeAgo: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#94A3B8',
  },
  feedText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: '#334155',
    marginBottom: 8,
  },
  feedMediaImg: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg,
    marginBottom: 8,
  },
  feedActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
  },
  feedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedActionCount: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12,
    color: '#64748B',
  },
});
