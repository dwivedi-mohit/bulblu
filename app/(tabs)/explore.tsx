import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, RefreshControl, ActivityIndicator, Dimensions,
  Modal, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, Mic, Video, Dice5, Target, ChevronRight, Wifi } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';
import { StoryRing } from '../../components/ui/StoryRing';
import { matchApi, storyApi, voiceRoomApi } from '../../lib/services';
import { useAuthStore } from '../../stores/authStore';
import type { User, Story, VoiceRoom } from '../../types/database';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PARTY_GAMES = [
  { icon: 'mic', label: 'Voice Party', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { icon: 'videocam', label: 'Video Match', color: '#F43F5E', bg: 'rgba(244,63,94,0.1)' },
  { icon: 'dice', label: 'Ludo Party', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  { icon: 'target', label: 'Truth & Dare', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
];

function getGameIcon(icon: string) {
  switch (icon) {
    case 'mic': return <Mic size={24} />;
    case 'videocam': return <Video size={24} />;
    case 'dice': return <Dice5 size={24} />;
    case 'target': return <Target size={24} />;
    default: return <Mic size={24} />;
  }
}

export default function ExploreScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [discoverRes, storiesRes, roomsRes] = await Promise.allSettled([
        matchApi.getDiscover(),
        storyApi.getStories(),
        voiceRoomApi.getRooms(),
      ]);

      if (discoverRes.status === 'fulfilled' && discoverRes.value.data) {
        const val = discoverRes.value.data;
        setPeople(Array.isArray(val) ? val : []);
      }
      if (storiesRes.status === 'fulfilled' && storiesRes.value.data) {
        const val = storiesRes.value.data;
        if (Array.isArray(val)) setStories(val);
        else if (val && typeof val === 'object') setStories(Object.values(val).flat() as Story[]);
        else setStories([]);
      }
      if (roomsRes.status === 'fulfilled' && roomsRes.value.data) {
        const val = roomsRes.value.data;
        setRooms(Array.isArray(val) ? val : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const myStory = user
    ? { id: 'me', user_id: user.id, media_url: '', media_type: 'image' as const, expires_at: '', created_at: '', user, viewed: false }
    : null;

  const safeStories = Array.isArray(stories) ? stories : [];
  const storyItems = [
    ...(myStory ? [{ ...myStory, _isMe: true }] : []),
    ...safeStories.map((s) => ({ ...s, _isMe: false })),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>bulblu</Text>
        </View>
        <TouchableOpacity
          style={styles.headerAvatar}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.7}
        >
          <Avatar uri={user?.avatar_url ?? null} size="sm" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Exploring...</Text>
          </View>
        ) : (
          <>
            {/* Hero Banner */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={Colors.gradientHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroBanner}
              >
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>Welcome to Bulblu Hub</Text>
                </View>
                <Text style={styles.heroTitle}>Discover{'\n'}New Friends</Text>
                <Text style={styles.heroSubtitle}>
                  Connect, play games, and join live voice rooms
                </Text>
                <Pressable style={styles.heroButton}>
                  <Text style={styles.heroButtonText}>Explore Now</Text>
                  <ChevronRight size={16} color="#FFFFFF" />
                </Pressable>
              </LinearGradient>
            </View>

            {/* Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <Search size={18} color={Colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search people, rooms, posts..."
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <Pressable style={styles.filterButton}>
                <SlidersHorizontal size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>

            {/* Stories / Live Companion Reel */}
            {storyItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Live Companions</Text>
                  <Pressable>
                    <Text style={styles.seeAll}>See all</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesRow}>
                  {storyItems.map((story) => (
                    <Pressable key={story.id} style={styles.storyItem}>
                      <StoryRing viewed={(story as any).viewed ?? false} size={68}>
                        <Avatar uri={story.user?.avatar_url ?? null} size="sm" />
                      </StoryRing>
                      <Text style={styles.storyName} numberOfLines={1}>
                        {(story as any)._isMe ? 'You' : story.user?.full_name ?? 'Unknown'}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Party Games Grid */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Party Games</Text>
              </View>
              <View style={styles.gamesGrid}>
                {PARTY_GAMES.map((game) => (
                  <Pressable key={game.label} style={styles.gameCard}>
                    <View style={[styles.gameIcon, { backgroundColor: game.bg }]}>
                      {getGameIcon(game.icon)}
                    </View>
                    <Text style={styles.gameLabel}>{game.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Online People */}
            {people.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Online Now</Text>
                  <Text style={styles.count}>{people.length} people</Text>
                </View>
                <View style={styles.peopleGrid}>
                  {people.slice(0, 6).map((person) => (
                    <Pressable key={person.id} style={styles.personCard}>
                      <Avatar uri={person.avatar_url} size="lg" showOnline={person.is_online} />
                      <Text style={styles.personName} numberOfLines={1}>
                        {person.full_name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Active Rooms */}
            {rooms.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Live Voice Rooms</Text>
                  <Pressable>
                    <Text style={styles.seeAll}>See all</Text>
                  </Pressable>
                </View>
                {rooms.slice(0, 3).map((room) => (
                  <Pressable key={room.id} style={styles.roomCard}>
                    <View style={styles.roomIcon}>
                      <Mic size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.roomInfo}>
                      <Text style={styles.roomTopic}>{room.topic}</Text>
                      <View style={styles.roomMeta}>
                        <Wifi size={12} color={Colors.accentGreen} />
                        <Text style={styles.roomParticipants}>
                          {room.participant_count ?? 0} participants
                        </Text>
                      </View>
                    </View>
                    <Pressable style={styles.joinButton}>
                      <Text style={styles.joinText}>Join</Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalUserSection}>
              <Avatar uri={user?.avatar_url ?? null} size="lg" />
              <Text style={styles.modalName}>{user?.full_name ?? 'Your Name'}</Text>
              <Text style={styles.modalEmail}>{user?.email ?? ''}</Text>
            </View>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => { setShowProfileModal(false); router.push('/(tabs)/profile'); }}
            >
              <Ionicons name="person-outline" size={20} color={Colors.textPrimary} />
              <Text style={styles.modalOptionText}>Edit Profile</Text>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => { setShowProfileModal(false); router.push('/profile/settings'); }}
            >
              <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
              <Text style={styles.modalOptionText}>Settings</Text>
              <ChevronRight size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={[styles.modalOption, styles.modalLogout]}
              onPress={() => { setShowProfileModal(false); signOut(); }}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={[styles.modalOptionText, { color: Colors.error }]}>Logout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: Colors.primary,
    letterSpacing: -0.03,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bgTertiary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentGreen,
  },
  onlineText: {
    ...Typography.tabBar,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerAvatar: {
    padding: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 200,
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },

  // Hero Banner
  heroSection: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  heroBanner: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    minHeight: 180,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  heroBadgeText: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    lineHeight: 32,
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.base,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  heroButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Search
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    gap: Spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    padding: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.subheading,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  seeAll: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontSize: 14,
  },
  count: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },

  // Stories
  storiesRow: {
    gap: Spacing.md,
  },
  storyItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  storyName: {
    ...Typography.tabBar,
    color: Colors.textSecondary,
    maxWidth: 68,
    textAlign: 'center',
  },

  // Party Games Grid
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gameCard: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gameIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 14,
  },

  // People Grid
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  personCard: {
    alignItems: 'center',
    width: 72,
    gap: Spacing.xs,
  },
  personName: {
    ...Typography.tabBar,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Rooms
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  roomTopic: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roomParticipants: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  joinText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 13,
  },

  // Profile Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderMedium,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  modalUserSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalName: {
    ...Typography.subheading,
    marginTop: Spacing.md,
    color: Colors.textPrimary,
  },
  modalEmail: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  modalOptionText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  modalLogout: {
    marginTop: Spacing.xs,
  },
});
