import React, { useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { User } from '../../types/database';
import { ProfileCard } from './ProfileCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 180;
const CARD_OFFSET = 10;
const SCALE_STEP = 0.04;

interface SwipeStackProps {
  profiles: User[];
  onLike: (user: User) => void;
  onPass: (user: User) => void;
  onSuperLike: (user: User) => void;
}

export function SwipeStack({
  profiles,
  onLike,
  onPass,
  onSuperLike,
}: SwipeStackProps) {
  const visibleCount = Math.min(profiles.length, 3);

  const handleSwipeRight = useCallback(() => {
    if (profiles.length > 0) {
      onLike(profiles[0]);
    }
  }, [profiles, onLike]);

  const handleSwipeLeft = useCallback(() => {
    if (profiles.length > 0) {
      onPass(profiles[0]);
    }
  }, [profiles, onPass]);

  const handleSuperLike = useCallback(() => {
    if (profiles.length > 0) {
      onSuperLike(profiles[0]);
    }
  }, [profiles, onSuperLike]);

  if (profiles.length === 0) return null;

  const cards = [];
  for (let i = visibleCount - 1; i >= 0; i--) {
    const user = profiles[i];
    const stackIndex = i;
    const scale = 1 - stackIndex * SCALE_STEP;
    const translateY = stackIndex * CARD_OFFSET;

    cards.push(
      <ProfileCard
        key={user.id}
        user={user}
        isFront={i === 0}
        scale={scale}
        translateY={translateY}
        onSwipeRight={i === 0 ? handleSwipeRight : undefined}
        onSwipeLeft={i === 0 ? handleSwipeLeft : undefined}
      />
    );
  }

  return (
    <View style={styles.container}>
      {cards}
    </View>
  );
}

export type { SwipeStackProps };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
