import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal, X, Heart, Star } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { User } from '../../types/database';
import { SwipeStack } from '../../components/discover/SwipeStack';
import { FilterModal, FilterState } from '../../components/discover/FilterModal';
import { MatchCelebration } from '../../components/discover/MatchCelebration';
import { matchApi } from '../../lib/services';

export default function DiscoverScreen() {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [matchData, setMatchData] = useState<{ matched: boolean; user?: User } | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    distanceMin: 1,
    distanceMax: 50,
    ageMin: 18,
    ageMax: 35,
    genders: [],
    lookingFor: [],
  });

  const fetchProfiles = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const { data } = await matchApi.getDiscover();
      setProfiles(data || []);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleLike = useCallback(async (user: User) => {
    try {
      const { data } = await matchApi.like(user.id);
      setProfiles((prev) => prev.filter((p) => p.id !== user.id));
      setSwipeCount((c) => c + 1);

      if (data?.matched) {
        setMatchData({ matched: true, user });
      }
    } catch (error) {
      console.error('Failed to like user:', error);
    }
  }, []);

  const handlePass = useCallback(async (user: User) => {
    try {
      const { error } = await matchApi.pass(user.id);
      if (!error) {
        setProfiles((prev) => prev.filter((p) => p.id !== user.id));
        setSwipeCount((c) => c + 1);
      }
    } catch (error) {
      console.error('Failed to pass user:', error);
    }
  }, []);

  const handleSuperLike = useCallback((user: User) => {
    handleLike(user);
  }, [handleLike]);

  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchProfiles(true);
  }, [fetchProfiles]);

  const handleKeepExploring = useCallback(() => {
    setMatchData(null);
  }, []);

  const handleSendMessage = useCallback(() => {
    setMatchData(null);
  }, []);

  const isEmpty = !loading && profiles.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Discover</Text>
          {swipeCount > 0 && (
            <View style={styles.swipeCounter}>
              <Text style={styles.swipeText}>{swipeCount} explored</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => setFilterVisible(true)}
          style={styles.filterBtn}
        >
          <SlidersHorizontal size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding people near you...</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💫</Text>
          <Text style={styles.emptyTitle}>No more profiles</Text>
          <Text style={styles.emptySubtitle}>
            Expand your range or adjust filters to see more people
          </Text>
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={styles.emptyFilterBtn}
          >
            <Text style={styles.emptyFilterText}>Open Filters</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <SwipeStack
            profiles={profiles}
            onLike={handleLike}
            onPass={handlePass}
            onSuperLike={handleSuperLike}
          />

          <View style={styles.actions}>
            <ActionButton
              icon={<X size={28} color={Colors.error} />}
              color={Colors.error}
              onPress={() => profiles[0] && handlePass(profiles[0])}
            />
            <ActionButton
              icon={<Star size={24} color={Colors.accentYellow} />}
              color={Colors.accentYellow}
              size="md"
              onPress={() => profiles[0] && handleSuperLike(profiles[0])}
            />
            <ActionButton
              icon={<Heart size={28} color={Colors.accentPink} />}
              color={Colors.accentPink}
              onPress={() => profiles[0] && handleLike(profiles[0])}
            />
          </View>
        </>
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />

      {matchData?.matched && matchData.user && (
        <MatchCelebration
          currentUser={profiles[0] || {} as User}
          matchedUser={matchData.user}
          onSendMessage={handleSendMessage}
          onKeepExploring={handleKeepExploring}
        />
      )}
    </SafeAreaView>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  onPress: () => void;
}

function ActionButton({ icon, color, size = 'lg', onPress }: ActionButtonProps) {
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

  const sizeMap = {
    sm: 44,
    md: 52,
    lg: 60,
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          animatedStyle,
          {
            width: sizeMap[size],
            height: sizeMap[size],
            borderRadius: Radius.full,
            backgroundColor: Colors.bgSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: `${color}33`,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 3,
          },
        ]}
      >
        {icon}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
    fontSize: 26,
    color: Colors.textPrimary,
  },
  swipeCounter: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  swipeText: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
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
    marginBottom: Spacing.xl,
  },
  emptyFilterBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  emptyFilterText: {
    ...Typography.button,
    color: '#FFFFFF',
  },
});
