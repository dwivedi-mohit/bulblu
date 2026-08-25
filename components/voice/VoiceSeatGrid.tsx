import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { getApiUrl } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface VoiceSeat {
  seatIndex: number; // 0 to 14
  userId?: string | null;
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  role: 'host' | 'speaker' | 'listener';
  isMuted: boolean;
  isSpeaking: boolean;
  isLocked?: boolean;
  micOrder?: number | null;
}

interface VoiceSeatGridProps {
  seats: VoiceSeat[];
  currentUserId?: string | null;
  isHost?: boolean;
  onSeatPress: (seat: VoiceSeat) => void;
}

export function VoiceSeatGrid({
  seats,
  currentUserId,
  isHost = false,
  onSeatPress,
}: VoiceSeatGridProps) {
  // 15 seats arranged in the authentic staggered party layout:
  // Row 0: Top Stage (Seat 0: Host VIP, Seat 1: Co-Host / CP)
  // Row 1: 3 Seats (Seat 2, 3, 4)
  // Row 2: 3 Seats (Seat 5, 6, 7)
  // Row 3: 3 Seats (Seat 8, 9, 10)
  // Row 4: 4 Seats (Seat 11, 12, 13, 14)

  const getSeat = (idx: number): VoiceSeat => {
    const found = seats.find((s) => s.seatIndex === idx);
    return (
      found || {
        seatIndex: idx,
        userId: null,
        name: null,
        avatarUrl: null,
        role: (idx === 0 ? 'host' : 'speaker') as 'host' | 'speaker' | 'listener',
        isMuted: true,
        isSpeaking: false,
        isLocked: false,
        micOrder: null,
      }
    );
  };

  const renderSeatItem = (seatIdx: number, isVipHost: boolean = false) => {
    const seat = getSeat(seatIdx);
    const isOccupied = !!seat.userId;
    const isMe = seat.userId && seat.userId === currentUserId;

    let formattedAvatar = seat.avatarUrl;
    if (formattedAvatar && formattedAvatar.startsWith('/uploads/')) {
      formattedAvatar = `${getApiUrl()}${formattedAvatar}`;
    }

    return (
      <TouchableOpacity
        key={`seat-${seatIdx}`}
        activeOpacity={0.8}
        onPress={() => onSeatPress(seat)}
        style={styles.seatItemWrapper}
      >
        <View style={[styles.avatarCircleBox, isVipHost && styles.hostAvatarCircleBox]}>
          {/* Speaking Soundwave Pulse */}
          {isOccupied && seat.isSpeaking && (
            <View style={[styles.soundwaveRing, isVipHost && styles.hostSoundwaveRing]} />
          )}

          {isOccupied ? (
            <View
              style={[
                styles.avatarFrame,
                isVipHost && styles.hostAvatarFrame,
                isMe && styles.myAvatarFrame,
              ]}
            >
              {formattedAvatar ? (
                <Image source={{ uri: formattedAvatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <Ionicons name="person" size={isVipHost ? 28 : 22} color="#0F766E" />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.emptySeatRing, seat.isLocked && styles.lockedSeatRing]}>
              {seat.isLocked ? (
                <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.4)" />
              ) : (
                <Ionicons name="add" size={isVipHost ? 26 : 22} color="rgba(255, 255, 255, 0.75)" />
              )}
            </View>
          )}

          {/* Crown badge on Host */}
          {isVipHost && isOccupied && (
            <View style={styles.hostCrownTag}>
              <Ionicons name="sparkles" size={10} color="#FFFFFF" />
            </View>
          )}

          {/* Mic Status Badge */}
          {isOccupied && (
            <View
              style={[
                styles.micBadge,
                seat.isMuted ? styles.micMutedBadge : styles.micActiveBadge,
              ]}
            >
              <Ionicons name={seat.isMuted ? 'mic-off' : 'mic'} size={9} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Seat Username Text */}
        <Text
          style={[
            styles.seatNameLabel,
            isVipHost && styles.hostNameLabel,
            isMe && styles.myNameLabel,
          ]}
          numberOfLines={1}
        >
          {isOccupied ? (isMe ? 'You' : seat.name || 'User') : `Seat ${seatIdx + 1}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.stageContainer}>
      {/* Top Row: VIP Host (Center Left) + Co-Host (Right) */}
      <View style={styles.topStageRow}>
        <View style={styles.topStageCenter}>
          {renderSeatItem(0, true)}
          {/* Soundwave Bridge / Pulse Line */}
          <View style={styles.soundwaveBridge}>
            <View style={styles.pulseDot} />
            <View style={[styles.pulseLine, { height: 16 }]} />
            <View style={[styles.pulseLine, { height: 26 }]} />
            <View style={[styles.pulseLine, { height: 18 }]} />
            <View style={styles.pulseDot} />
          </View>
          {renderSeatItem(1, false)}
        </View>
      </View>

      {/* Row 1 (3 Seats) */}
      <View style={styles.staggeredRow}>
        {renderSeatItem(2)}
        {renderSeatItem(3)}
        {renderSeatItem(4)}
      </View>

      {/* Row 2 (3 Seats) */}
      <View style={styles.staggeredRow}>
        {renderSeatItem(5)}
        {renderSeatItem(6)}
        {renderSeatItem(7)}
      </View>

      {/* Row 3 (3 Seats) */}
      <View style={styles.staggeredRow}>
        {renderSeatItem(8)}
        {renderSeatItem(9)}
        {renderSeatItem(10)}
      </View>

      {/* Row 4 (4 Seats) */}
      <View style={[styles.staggeredRow, { justifyContent: 'space-around' }]}>
        {renderSeatItem(11)}
        {renderSeatItem(12)}
        {renderSeatItem(13)}
        {renderSeatItem(14)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stageContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topStageRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  topStageCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  soundwaveBridge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  pulseLine: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 1,
  },
  pulseDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  staggeredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  seatItemWrapper: {
    alignItems: 'center',
    width: 68,
  },
  avatarCircleBox: {
    position: 'relative',
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostAvatarCircleBox: {
    width: 68,
    height: 68,
  },
  soundwaveRing: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#2DD4BF',
    backgroundColor: 'rgba(45, 212, 191, 0.25)',
  },
  hostSoundwaveRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  avatarFrame: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  hostAvatarFrame: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#FDE047',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  myAvatarFrame: {
    borderColor: '#2DD4BF',
    borderWidth: 2.5,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  placeholderAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
  },
  emptySeatRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedSeatRing: {
    borderColor: 'rgba(148, 163, 184, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  hostCrownTag: {
    position: 'absolute',
    top: -4,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  micBadge: {
    position: 'absolute',
    bottom: -1,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  micMutedBadge: {
    backgroundColor: '#EF4444',
  },
  micActiveBadge: {
    backgroundColor: '#10B981',
  },
  seatNameLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hostNameLabel: {
    color: '#FEF08A',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11.5,
  },
  myNameLabel: {
    color: '#2DD4BF',
  },
});
