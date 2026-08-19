import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = ['All', 'Friend', 'Chat', 'Music', 'Truth & Dare', 'Dating', 'Gaming', 'VIP'];

const MOCK_ROOMS = [
  {
    id: '1',
    topic: 'Chill Vibes 🎵',
    host: { name: 'Aria', avatar: null },
    cp: { name: 'Maya', avatar: null },
    participants: 8,
    maxParticipants: 12,
    category: 'Music',
    isLive: true,
  },
  {
    id: '2',
    topic: 'Truth or Dare 🔥',
    host: { name: 'Kai', avatar: null },
    cp: { name: 'Elena', avatar: null },
    participants: 10,
    maxParticipants: 12,
    category: 'Truth & Dare',
    isLive: true,
  },
  {
    id: '3',
    topic: 'Gaming Night 🎮',
    host: { name: 'Leo', avatar: null },
    cp: null,
    participants: 5,
    maxParticipants: 12,
    category: 'Gaming',
    isLive: true,
  },
  {
    id: '4',
    topic: 'Coffee Chat ☕',
    host: { name: 'Sophie', avatar: null },
    cp: { name: 'Ryan', avatar: null },
    participants: 3,
    maxParticipants: 12,
    category: 'Chat',
    isLive: true,
  },
];

export default function VoiceScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredRooms = selectedCategory === 'All'
    ? MOCK_ROOMS
    : MOCK_ROOMS.filter((r) => r.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Lounge</Text>
        <Pressable style={styles.createButton}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create</Text>
        </Pressable>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        {/* Goal Gradient: Voice Journey */}
        <View style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <Ionicons name="mic" size={18} color={Colors.primary} />
            <Text style={styles.journeyTitle}>Your Voice Journey</Text>
          </View>
          <Text style={styles.journeyText}>Join 3 rooms to unlock VIP badge</Text>
          <View style={styles.journeyProgress}>
            <View style={styles.journeyProgressBar}>
              <View style={[styles.journeyProgressFill, { width: '33%' }]} />
            </View>
            <Text style={styles.journeyCount}>1/3 rooms</Text>
          </View>
        </View>

        {/* Rooms List */}
        <View style={styles.roomsSection}>
          <Text style={styles.roomsSectionTitle}>Live Rooms</Text>
          {filteredRooms.map((room) => (
            <Pressable key={room.id} style={styles.roomCard}>
              <LinearGradient
                colors={['#0F766E', '#14B8A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.roomGradient}
              >
                <View style={styles.roomHeader}>
                  <View style={styles.roomHosts}>
                    <View style={styles.hostSeat}>
                      <Avatar uri={room.host.avatar} size="sm" />
                      <Text style={styles.hostLabel}>👑 Host</Text>
                    </View>
                    {room.cp && (
                      <View style={styles.cpSeat}>
                        <Avatar uri={room.cp.avatar} size="sm" />
                        <Text style={styles.cpLabel}>🌟 CP</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>

                <Text style={styles.roomTopic}>{room.topic}</Text>

                <View style={styles.roomFooter}>
                  <View style={styles.roomParticipants}>
                    <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.participantsText}>
                      {room.participants}/{room.maxParticipants} seats
                    </Text>
                  </View>
                  <View style={styles.roomSpots}>
                    <Text style={styles.spotsText}>
                      {room.maxParticipants - room.participants} spots left
                    </Text>
                  </View>
                </View>

                <Pressable style={styles.joinRoomButton}>
                  <Text style={styles.joinRoomText}>Join Room</Text>
                </Pressable>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Simple gradient wrapper
function LinearGradient({ colors, start, end, style, children }: any) {
  const ReactNative = require('react-native');
  const { LinearGradient: ExpoGradient } = require('expo-linear-gradient');
  return <ExpoGradient colors={colors} start={start} end={end} style={style}>{children}</ExpoGradient>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  title: {
    ...Typography.heading,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  createButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  categoriesRow: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  categoryPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryPillText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },

  // Journey Card
  journeyCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  journeyTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  journeyText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  journeyProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  journeyProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  journeyProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  journeyCount: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Rooms
  roomsSection: {
    paddingHorizontal: Spacing.base,
  },
  roomsSectionTitle: {
    ...Typography.subheading,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  roomCard: {
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  roomGradient: {
    padding: Spacing.base,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  roomHosts: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  hostSeat: {
    alignItems: 'center',
    gap: 4,
  },
  hostLabel: {
    ...Typography.tabBar,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  cpSeat: {
    alignItems: 'center',
    gap: 4,
  },
  cpLabel: {
    ...Typography.tabBar,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    ...Typography.tabBar,
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 10,
  },
  roomTopic: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  roomParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  roomSpots: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  spotsText: {
    ...Typography.tabBar,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
  },
  joinRoomButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  joinRoomText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
