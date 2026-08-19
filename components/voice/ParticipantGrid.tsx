import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MicOff, Crown } from 'lucide-react-native';
import { Avatar } from '../ui/Avatar';
import { Colors } from '../../constants/colors';
import { Spacing, Radius, Layout } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

export interface Participant {
  id: string;
  name: string;
  avatarUri: string | null;
  role: 'host' | 'speaker' | 'listener';
  isMuted: boolean;
  isHandRaised: boolean;
}

interface ParticipantGridProps {
  participants: Participant[];
}

function getColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}

export function ParticipantGrid({ participants }: ParticipantGridProps) {
  const columns = getColumns(participants.length);
  const avatarSize = columns <= 2 ? Layout.avatarXl : columns === 3 ? Layout.avatarLg : Layout.avatarMd;

  return (
    <View style={styles.grid}>
      {participants.map((participant, index) => (
        <Animated.View
          key={participant.id}
          entering={FadeInDown.delay(index * 50).springify()}
          style={[
            styles.cell,
            { width: `${100 / columns}%` },
          ]}
        >
          <View style={styles.avatarWrapper}>
            <Avatar
              uri={participant.avatarUri}
              size={columns <= 2 ? 'xl' : columns === 3 ? 'lg' : 'md'}
              showOnline={false}
            />

            {participant.role === 'host' && (
              <View style={[styles.badge, styles.hostBadge]}>
                <Crown size={12} color={Colors.accentYellow} />
              </View>
            )}

            {participant.isMuted && (
              <View style={[styles.badge, styles.mutedBadge]}>
                <MicOff size={10} color="#FFFFFF" />
              </View>
            )}
          </View>

          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {participant.name}
          </Text>

          {participant.role === 'host' && (
            <Text style={styles.role}>Host</Text>
          )}
          {participant.role === 'speaker' && (
            <Text style={styles.role}>Speaker</Text>
          )}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
  },
  cell: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bgPrimary,
  },
  hostBadge: {
    backgroundColor: Colors.bgTertiary,
    bottom: 'auto',
    top: -2,
    right: -2,
  },
  mutedBadge: {
    backgroundColor: Colors.error,
  },
  name: {
    ...Typography.bodyMedium,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 80,
  },
  role: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
});
