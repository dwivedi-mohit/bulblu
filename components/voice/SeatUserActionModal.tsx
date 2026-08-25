import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceSeat } from './VoiceSeatGrid';
import { getApiUrl } from '../../lib/api';

interface SeatUserActionModalProps {
  visible: boolean;
  onClose: () => void;
  seat: VoiceSeat | null;
  isHost: boolean;
  currentUserId?: string | null;
  onViewProfile: (userId: string) => void;
  onSendGiftToUser: (seat: VoiceSeat) => void;
  onMuteUser: (seat: VoiceSeat) => void;
  onKickFromSeat: (seat: VoiceSeat) => void;
  onLockSeat: (seatIndex: number) => void;
}

export function SeatUserActionModal({
  visible,
  onClose,
  seat,
  isHost,
  currentUserId,
  onViewProfile,
  onSendGiftToUser,
  onMuteUser,
  onKickFromSeat,
  onLockSeat,
}: SeatUserActionModalProps) {
  if (!visible || !seat) return null;

  const isMe = seat.userId && seat.userId === currentUserId;
  let formattedAvatar = seat.avatarUrl;
  if (formattedAvatar && formattedAvatar.startsWith('/uploads/')) {
    formattedAvatar = `${getApiUrl()}${formattedAvatar}`;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalBackdrop}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          {/* User Info Header */}
          <View style={styles.header}>
            <View style={styles.avatarBox}>
              {formattedAvatar ? (
                <Image source={{ uri: formattedAvatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={32} color="#0F766E" />
                </View>
              )}
              {seat.seatIndex === 0 && (
                <View style={styles.crownTag}>
                  <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.metaBox}>
              <View style={styles.nameRow}>
                <Text style={styles.userNameText}>{seat.name || 'User'}</Text>
                <View style={styles.seatPill}>
                  <Text style={styles.seatPillText}>Seat #{seat.seatIndex + 1}</Text>
                </View>
              </View>
              <Text style={styles.userRoleText}>{seat.seatIndex === 0 ? '👑 Room Host' : '🎙️ Speaker'}</Text>
            </View>
          </View>

          {/* User Actions */}
          <View style={styles.actionsList}>
            {seat.userId && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onViewProfile(seat.userId!);
                }}
                style={styles.actionRow}
              >
                <Ionicons name="person-circle-outline" size={22} color="#0F766E" />
                <Text style={styles.actionRowText}>View Profile</Text>
              </TouchableOpacity>
            )}

            {!isMe && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onSendGiftToUser(seat);
                }}
                style={styles.actionRow}
              >
                <Ionicons name="gift-outline" size={22} color="#D97706" />
                <Text style={styles.actionRowText}>Send Gift 🎁</Text>
              </TouchableOpacity>
            )}

            {/* Host Administration Controls */}
            {isHost && !isMe && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onMuteUser(seat);
                  }}
                  style={styles.actionRow}
                >
                  <Ionicons
                    name={seat.isMuted ? 'mic' : 'mic-off'}
                    size={22}
                    color={seat.isMuted ? '#10B981' : '#EF4444'}
                  />
                  <Text style={[styles.actionRowText, { color: seat.isMuted ? '#10B981' : '#EF4444' }]}>
                    {seat.isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onKickFromSeat(seat);
                  }}
                  style={styles.actionRow}
                >
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                  <Text style={[styles.actionRowText, { color: '#EF4444' }]}>Remove from Seat</Text>
                </TouchableOpacity>
              </>
            )}

            {isHost && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onLockSeat(seat.seatIndex);
                }}
                style={styles.actionRow}
              >
                <Ionicons
                  name={seat.isLocked ? 'lock-open-outline' : 'lock-closed-outline'}
                  size={22}
                  color="#64748B"
                />
                <Text style={styles.actionRowText}>
                  {seat.isLocked ? 'Unlock Seat' : 'Lock Seat'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 20,
    shadowColor: '#0F766E',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#0F766E',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#CCFBF1',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crownTag: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  metaBox: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userNameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: '#0F172A',
  },
  seatPill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  seatPillText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#0F766E',
  },
  userRoleText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  actionsList: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionRowText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
});
