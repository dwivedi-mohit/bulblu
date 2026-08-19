import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  Clock,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius, Layout } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { CompanionProfile } from '../../types/database';
import { GlassCard } from '../../components/ui/GlassCard';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOCK_COMPANION: CompanionProfile = {
  id: 'comp-1',
  user_id: 'u-1',
  hourly_rate: 45,
  activities: ['movies', 'shopping', 'gaming', 'travel', 'events', 'conversation'],
  availability: {},
  bio: 'Your go-to companion for fun outings and relaxed conversations. I love exploring new restaurants, catching the latest movies, and discovering hidden gems around the city. Let\'s make your day brighter!',
  is_available: true,
  rating: 4.9,
  total_bookings: 127,
  stripe_account_id: null,
  created_at: new Date().toISOString(),
  user: {
    id: 'u-1',
    email: 'sophie@example.com',
    full_name: 'Sophie Chen',
    username: 'sophie_c',
    bio: null,
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    date_of_birth: '1998-05-12',
    gender: 'female',
    city: 'New York',
    latitude: 40.7128,
    longitude: -74.006,
    interests: [],
    looking_for: ['companion'],
    is_companion: true,
    is_verified: true,
    is_online: true,
    last_active: new Date().toISOString(),
    settings: {
      notifications: { matches: true, messages: true, bookings: true, stories: true, events: true },
      privacy: { show_online: true, show_read_receipts: true, profile_visibility: 'everyone' },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

const ACTIVITY_LABELS: Record<string, string> = {
  movies: '🎬 Movies',
  shopping: '🛍️ Shopping',
  gaming: '🎮 Gaming',
  travel: '✈️ Travel',
  events: '🎪 Events',
  conversation: '💬 Conversation',
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getNext7Days() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      dayName: DAYS[d.getDay()],
      date: d.getDate(),
      month: d.getMonth(),
      full: d,
      isToday: i === 0,
    };
  });
}

export default function CompanionProfileScreen() {
  const { companionId } = useLocalSearchParams<{ companionId: string }>();
  const [selectedDay, setSelectedDay] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const companion = MOCK_COMPANION;
  const user = companion.user;
  const weekDays = getNext7Days();

  const handleBookNow = () => {
    router.push({
      pathname: '/companion/book',
      params: {
        companionId: companion.id,
        companionName: user?.full_name ?? 'Companion',
        hourlyRate: companion.hourly_rate,
        activities: companion.activities.join(','),
        selectedDay,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo placeholder */}
        <View style={styles.photoSection}>
          <View style={styles.photoPlaceholder}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.photoGradient}
            >
              <Avatar uri={user?.avatar_url ?? null} size="xl" showStory />
            </LinearGradient>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.full_name ?? 'Companion'}</Text>
            {user?.is_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.rate}>${companion.hourly_rate}/hr</Text>

          <View style={styles.ratingRow}>
            <Star size={16} color={Colors.accentYellow} fill={Colors.accentYellow} />
            <Text style={styles.ratingText}>{companion.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({companion.total_bookings} bookings)</Text>
          </View>

          {user?.city && (
            <View style={styles.locationRow}>
              <MapPin size={14} color={Colors.textTertiary} />
              <Text style={styles.locationText}>{user.city}</Text>
            </View>
          )}
        </View>

        {/* Bio */}
        <GlassCard style={styles.bioCard}>
          <Text style={styles.bio}>{companion.bio}</Text>
        </GlassCard>

        {/* Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Activities</Text>
          <View style={styles.activityGrid}>
            {companion.activities.map((activity) => (
              <View key={activity} style={styles.activityTag}>
                <Text style={styles.activityLabel}>{ACTIVITY_LABELS[activity] ?? activity}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <GlassCard style={styles.calendarCard}>
            <View style={styles.weekRow}>
              {weekDays.map((day, i) => (
                <Pressable
                  key={i}
                  onPress={() => setSelectedDay(i)}
                  style={[
                    styles.dayCell,
                    selectedDay === i && styles.dayCellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayName,
                      selectedDay === i && styles.dayNameActive,
                    ]}
                  >
                    {day.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayDate,
                      selectedDay === i && styles.dayDateActive,
                    ]}
                  >
                    {day.date}
                  </Text>
                  {day.isToday && <View style={styles.todayDot} />}
                </Pressable>
              ))}
            </View>
            <View style={styles.timeHint}>
              <Clock size={14} color={Colors.textTertiary} />
              <Text style={styles.timeHintText}>Available 9:00 AM — 9:00 PM</Text>
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* Book Now button */}
      <View style={styles.bottomBar}>
        <Button variant="primary" onPress={handleBookNow} style={styles.bookBtn}>
          Book Now
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  photoSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.base,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  photoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.heading,
    fontSize: 26,
  },
  verifiedBadge: {
    backgroundColor: Colors.accentBlue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  verifiedText: {
    ...Typography.tabBar,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rate: {
    ...Typography.subheading,
    color: Colors.primaryLight,
    fontSize: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodyMedium,
    color: Colors.accentYellow,
    fontWeight: '600',
  },
  reviewCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  locationText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  bioCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },
  bio: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  section: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.subheading,
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  activityTag: {
    backgroundColor: Colors.bgGlassLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activityLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  calendarCard: {
    padding: Spacing.base,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    minWidth: 36,
  },
  dayCellActive: {
    backgroundColor: Colors.primary,
  },
  dayName: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  dayNameActive: {
    color: '#FFFFFF',
  },
  dayDate: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  dayDateActive: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primaryLight,
    marginTop: Spacing.xs,
  },
  timeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  timeHintText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.base,
    backgroundColor: 'rgba(10,10,26,0.9)',
  },
  bookBtn: {
    width: '100%',
  },
});
