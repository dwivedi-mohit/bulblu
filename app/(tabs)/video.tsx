import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOCK_PROFILES = [
  { id: '1', name: 'Aria', age: 23, city: 'Mumbai', avatar: null, interests: ['Music', 'Travel'] },
  { id: '2', name: 'Maya', age: 21, city: 'Delhi', avatar: null, interests: ['Gaming', 'Art'] },
  { id: '3', name: 'Elena', age: 25, city: 'Bangalore', avatar: null, interests: ['Coffee', 'Movies'] },
];

export default function VideoScreen() {
  const [currentProfile, setCurrentProfile] = useState(MOCK_PROFILES[0]);
  const [isConnected, setIsConnected] = useState(false);
  const [matchCount] = useState(28400);

  const handleNext = useCallback(() => {
    const currentIndex = MOCK_PROFILES.findIndex((p) => p.id === currentProfile.id);
    const nextIndex = (currentIndex + 1) % MOCK_PROFILES.length;
    setCurrentProfile(MOCK_PROFILES[nextIndex]);
  }, [currentProfile]);

  const handleStop = useCallback(() => {
    setIsConnected(false);
  }, []);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, isConnected && styles.statusDotLive]} />
          <Text style={styles.statusText}>
            {isConnected ? `${currentProfile.name}, ${currentProfile.age} (Connected)` : 'Tap to connect'}
          </Text>
        </View>
        <View style={styles.matchCounter}>
          <Ionicons name="videocam" size={12} color={Colors.primary} />
          <Text style={styles.matchText}>{(matchCount / 1000).toFixed(1)}k Live Match</Text>
        </View>
      </View>

      {/* Video Viewport */}
      <View style={styles.videoViewport}>
        {isConnected ? (
          <View style={styles.connectedView}>
            <View style={styles.companionFrame}>
              <Avatar uri={currentProfile.avatar} size="xl" />
              <Text style={styles.companionName}>{currentProfile.name}, {currentProfile.age}</Text>
              <Text style={styles.companionCity}>{currentProfile.city}</Text>
            </View>

            {/* User PiP */}
            <View style={styles.pipFrame}>
              <Avatar uri={null} size="md" />
            </View>
          </View>
        ) : (
          <View style={styles.waitingView}>
            <Avatar uri={currentProfile.avatar} size="xl" />
            <Text style={styles.waitingName}>{currentProfile.name}, {currentProfile.age}</Text>
            <Text style={styles.waitingCity}>{currentProfile.city}</Text>
            <View style={styles.interestsRow}>
              {currentProfile.interests.map((interest) => (
                <View key={interest} style={styles.interestPill}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Control Deck */}
      <View style={styles.controlDeck}>
        <Pressable style={styles.controlButton} onPress={handleStop}>
          <View style={[styles.controlIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <Ionicons name="stop" size={24} color={Colors.error} />
          </View>
          <Text style={styles.controlLabel}>Stop</Text>
        </Pressable>

        {!isConnected ? (
          <Pressable style={styles.connectButton} onPress={handleConnect}>
            <Ionicons name="videocam" size={24} color="#FFFFFF" />
            <Text style={styles.connectText}>Connect</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Ionicons name="play-forward" size={24} color="#FFFFFF" />
            <Text style={styles.nextText}>Next Match</Text>
          </Pressable>
        )}

        <Pressable style={styles.controlButton}>
          <View style={[styles.controlIcon, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
            <Ionicons name="filter" size={24} color={Colors.accentYellow} />
          </View>
          <Text style={styles.controlLabel}>Filter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  // Status Bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
  statusDotLive: {
    backgroundColor: Colors.error,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  matchCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  matchText: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Video Viewport
  videoViewport: {
    flex: 1,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bgTertiary,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  connectedView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionFrame: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  companionName: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    fontSize: 20,
  },
  companionCity: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  pipFrame: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 100,
    height: 130,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  waitingName: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    fontSize: 22,
  },
  waitingCity: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  interestsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  interestPill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  interestText: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Control Deck
  controlDeck: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  controlButton: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  controlIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    ...Typography.tabBar,
    color: Colors.textSecondary,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  connectText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
  },
  nextText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
});
