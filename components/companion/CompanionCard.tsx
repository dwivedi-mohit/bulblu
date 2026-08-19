import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { CompanionProfile } from '../../types/database';
import { GlassCard } from '../ui/GlassCard';
import { Avatar } from '../ui/Avatar';

interface CompanionCardProps {
  companion: CompanionProfile;
  onPress: () => void;
}

const ACTIVITY_ICONS: Record<string, string> = {
  movies: '🎬',
  shopping: '🛍️',
  gaming: '🎮',
  travel: '✈️',
  events: '🎪',
  conversation: '💬',
};

export function CompanionCard({ companion, onPress }: CompanionCardProps) {
  const user = companion.user;
  const ratingDisplay = companion.rating.toFixed(1);

  return (
    <Pressable onPress={onPress} style={styles.wrapper}>
      <GlassCard variant="elevated" style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.avatarArea}>
            <Avatar uri={user?.avatar_url ?? null} size="lg" showOnline={user?.is_online} />
            {companion.is_available && (
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineText}>Available</Text>
              </View>
            )}
          </View>

          <View style={styles.infoArea}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.full_name ?? 'Companion'}
            </Text>
            <Text style={styles.rate}>${companion.hourly_rate}/hr</Text>
            <View style={styles.ratingRow}>
              <Star size={14} color={Colors.accentYellow} fill={Colors.accentYellow} />
              <Text style={styles.ratingText}>{ratingDisplay}</Text>
              <Text style={styles.bookingCount}>({companion.total_bookings} bookings)</Text>
            </View>
          </View>
        </View>

        <Text style={styles.bio} numberOfLines={2}>
          {companion.bio}
        </Text>

        <View style={styles.activityRow}>
          {companion.activities.map((activity) => (
            <View key={activity} style={styles.activityTag}>
              <Text style={styles.activityEmoji}>
                {ACTIVITY_ICONS[activity] ?? '📌'}
              </Text>
              <Text style={styles.activityLabel}>{activity}</Text>
            </View>
          ))}
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  card: {
    padding: Spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  avatarArea: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  onlineBadge: {
    backgroundColor: Colors.accentGreen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  onlineText: {
    ...Typography.tabBar,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoArea: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    ...Typography.bodyBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  rate: {
    ...Typography.bodyMedium,
    color: Colors.primaryLight,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.accentYellow,
    fontWeight: '600',
  },
  bookingCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  bio: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  activityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.bgGlassLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activityEmoji: {
    fontSize: 14,
  },
  activityLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
});
