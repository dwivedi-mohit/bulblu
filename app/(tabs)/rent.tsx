import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';
import { GlassCard } from '../../components/ui/GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { icon: 'heart', label: 'Rent GF/BF', color: '#FF6B9D' },
  { icon: 'film', label: 'Movie Partner', color: '#8B5CF6' },
  { icon: 'star', label: 'In-Person Meet', color: '#F59E0B' },
  { icon: 'people', label: 'Elder Care', color: '#10B981' },
  { icon: 'balloon', label: 'Hangingout', color: '#F43F5E' },
  { icon: 'disc', label: 'Clubbing', color: '#06B6D4' },
  { icon: 'bag', label: 'Shopping Buddy', color: '#EC4899' },
  { icon: 'medkit', label: 'Medical Support', color: '#EF4444' },
  { icon: 'home', label: 'Domestic Help', color: '#84CC16' },
  { icon: 'airplane', label: 'Travel Partner', color: '#3B82F6' },
  { icon: 'ticket', label: 'Event Partner', color: '#F59E0B' },
  { icon: 'compass', label: 'City Tour', color: '#14B8A6' },
  { icon: 'game-controller', label: 'Gaming Partner', color: '#8B5CF6' },
  { icon: 'musical-notes', label: 'Concert Partner', color: '#F43F5E' },
  { icon: 'cafe', label: 'Coffee Partner', color: '#92400E' },
  { icon: 'restaurant', label: 'Cafe & Food', color: '#DC2626' },
  { icon: 'briefcase', label: 'Networking', color: '#1E293B' },
];

const FEATURED_COMPANION = {
  name: 'Aria Vance',
  age: 23,
  rating: 4.9,
  reviews: 128,
  city: 'Mumbai',
  bio: 'Your perfect date companion for coffee, movies, and long walks',
  avatar: null,
};

export default function RentScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rent Companion</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      >
        {/* Featured Companion Spotlight */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCard}
          >
            <View style={styles.featuredHeader}>
              <View>
                <Text style={styles.featuredName}>{FEATURED_COMPANION.name}, {FEATURED_COMPANION.age}</Text>
                <View style={styles.featuredMeta}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                  <Text style={styles.featuredCity}>Verified • {FEATURED_COMPANION.city}</Text>
                </View>
              </View>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{FEATURED_COMPANION.rating}</Text>
              </View>
            </View>
            <Text style={styles.featuredBio}>{FEATURED_COMPANION.bio}</Text>
            <View style={styles.featuredFooter}>
              <Text style={styles.featuredReviews}>{FEATURED_COMPANION.reviews} reviews</Text>
              <Pressable style={styles.bookButton}>
                <Text style={styles.bookButtonText}>Book Session →</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* Categories Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse Categories</Text>
            <Text style={styles.categoryCount}>17 services</Text>
          </View>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable key={cat.label} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}15` }]}>
                  <Ionicons name={cat.icon as any} size={28} color={cat.color} />
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Goal Gradient: Active Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Bookings</Text>
          </View>
          <GlassCard style={styles.bookingCard}>
            <View style={styles.bookingRow}>
              <Avatar uri={null} size="md" />
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingName}>Aria Vance</Text>
                <Text style={styles.bookingDetails}>Sat, Aug 24 • 7:00 PM • 2 hours</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Confirmed</Text>
              </View>
            </View>
          </GlassCard>
          <Pressable style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View all bookings</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  title: {
    ...Typography.heading,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl,
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
  categoryCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },

  // Featured
  featuredCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  featuredName: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  featuredCity: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  ratingText: {
    ...Typography.tabBar,
    color: '#F59E0B',
    fontWeight: '700',
  },
  featuredBio: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.base,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredReviews: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.6)',
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  bookButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
  },

  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.sm) / 2,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
  },

  // Bookings
  bookingCard: {
    marginBottom: Spacing.sm,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bookingName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  bookingDetails: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  viewAllText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontSize: 14,
  },
});
