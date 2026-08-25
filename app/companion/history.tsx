import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, DollarSign, ChevronRight } from 'lucide-react-native';
import { companionApi } from '../../lib/services';
import { Booking } from '../../types/database';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { GlassCard } from '../../components/ui/GlassCard';
import { Avatar } from '../../components/ui/Avatar';
import { DisplayName } from '../../components/ui/UserText';

type Tab = 'upcoming' | 'past';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(245,158,11,0.2)', text: Colors.warning },
  confirmed: { bg: 'rgba(16,185,129,0.2)', text: Colors.success },
  completed: { bg: 'rgba(59,130,246,0.2)', text: Colors.info },
  cancelled: { bg: 'rgba(239,68,68,0.2)', text: Colors.error },
};

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function BookingHistoryScreen() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const { data } = await companionApi.getBookings();
      if (data) setBookings(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => new Date(b.date) >= now && b.status !== 'cancelled' && b.status !== 'completed'
  );
  const past = bookings.filter(
    (b) => new Date(b.date) < now || b.status === 'completed' || b.status === 'cancelled'
  );

  const displayedBookings = tab === 'upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTab('upcoming')}
          style={[styles.tab, tab === 'upcoming' && styles.tabActive]}
        >
          <Text
            style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}
          >
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('past')}
          style={[styles.tab, tab === 'past' && styles.tabActive]}
        >
          <Text
            style={[styles.tabText, tab === 'past' && styles.tabTextActive]}
          >
            Past
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : displayedBookings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'upcoming'
                ? 'Book a companion to get started'
                : 'Your past bookings will appear here'}
            </Text>
          </View>
        ) : (
          displayedBookings.map((booking) => {
            const b = booking as any;
            // GET /api/companions/bookings returns flat rows (companion_user_id,
            // companion_full_name, ...), not a nested companion.user object, so
            // read the flat columns and fall back to the nested shape.
            const companionUserId = b.companion_user_id ?? b.companion?.user?.id;
            const companionName = b.companion_full_name ?? b.companion?.user?.full_name;
            const companionAvatar = b.companion_avatar ?? b.companion?.user?.avatar_url ?? null;
            const status = STATUS_COLORS[booking.status] ?? STATUS_COLORS.pending;

            return (
              <GlassCard key={booking.id} variant="elevated" style={styles.bookingCard}>
                <View style={styles.bookingRow}>
                   <Avatar uri={companionAvatar} userId={companionUserId} size="md" />
                  <View style={styles.bookingInfo}>
                    <DisplayName
                      userId={companionUserId}
                      fallback={companionName ?? 'Companion'}
                      style={styles.companionName}
                    />
                    <Text style={styles.activity}>{booking.activity}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.text }]}>
                      {booking.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Calendar size={14} color={Colors.textTertiary} />
                    <Text style={styles.detailText}>{formatDate(booking.date)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={Colors.textTertiary} />
                    <Text style={styles.detailText}>
                      {booking.start_time} · {booking.duration_hours}hr
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <DollarSign size={14} color={Colors.textTertiary} />
                    <Text style={styles.detailText}>{formatCurrency(booking.total_cents)}</Text>
                  </View>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  title: {
    ...Typography.heading,
    fontSize: 26,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlassLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  bookingCard: {
    marginBottom: Spacing.md,
    padding: Spacing.base,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bookingInfo: {
    flex: 1,
    gap: 2,
  },
  companionName: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  activity: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.tabBar,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.subheading,
    fontSize: 20,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
