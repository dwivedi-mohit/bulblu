import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SoundEffect {
  id: string;
  name: string;
  icon: string;
  color: [string, string];
}

const SOUND_EFFECTS: SoundEffect[] = [
  { id: 'applause', name: 'Applause 👏', icon: 'hand-left', color: ['#10B981', '#059669'] },
  { id: 'cheer', name: 'Cheering 🎉', icon: 'trophy', color: ['#F59E0B', '#D97706'] },
  { id: 'laughter', name: 'Laughter 😂', icon: 'happy', color: ['#EC4899', '#DB2777'] },
  { id: 'airhorn', name: 'Air Horn 📢', icon: 'megaphone', color: ['#EF4444', '#DC2626'] },
  { id: 'drumroll', name: 'Drum Roll 🥁', icon: 'radio', color: ['#8B5CF6', '#7C3AED'] },
  { id: 'heartbeat', name: 'Heartbeat 💓', icon: 'heart', color: ['#F43F5E', '#E11D48'] },
  { id: 'ding', name: 'Correct Ding 🔔', icon: 'notifications', color: ['#06B6D4', '#0891B2'] },
  { id: 'buzzer', name: 'Wrong Buzzer ❌', icon: 'close-circle', color: ['#64748B', '#475569'] },
];

const BGM_TRACKS = [
  { id: 'off', name: 'Turn Off BGM', icon: 'volume-mute', tag: 'Silent' },
  { id: 'lofi', name: 'Lofi Chill Vibes', icon: 'musical-notes', tag: 'Relax' },
  { id: 'coffee', name: 'Coffee Shop Acoustic', icon: 'cafe', tag: 'Acoustic' },
  { id: 'cyber', name: 'Cyberpunk Electronic', icon: 'flash', tag: 'High Energy' },
  { id: 'night', name: 'Midnight Lounge', icon: 'moon', tag: 'Smooth Jazz' },
];

interface SoundboardModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaySfx?: (sfxId: string, sfxName: string) => void;
  onSelectBgm?: (bgmId: string) => void;
  activeBgmId?: string;
}

export function SoundboardModal({
  visible,
  onClose,
  onPlaySfx,
  onSelectBgm,
  activeBgmId = 'off',
}: SoundboardModalProps) {
  const [selectedBgm, setSelectedBgm] = useState(activeBgmId);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="musical-notes" size={22} color="#0F766E" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Soundboard & BGM</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.contentContainer}>
            {/* SFX Section */}
            <Text style={styles.sectionHeader}>Instant Sound Effects</Text>
            <View style={styles.sfxGrid}>
              {SOUND_EFFECTS.map((sfx) => (
                <TouchableOpacity
                  key={sfx.id}
                  onPress={() => onPlaySfx?.(sfx.id, sfx.name)}
                  activeOpacity={0.8}
                  style={styles.sfxButtonWrapper}
                >
                  <LinearGradient colors={sfx.color} style={styles.sfxGradient}>
                    <Ionicons name={sfx.icon as any} size={22} color="#FFFFFF" />
                    <Text style={styles.sfxButtonText}>{sfx.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* BGM Section */}
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Background Ambience (BGM)</Text>
            <View style={styles.bgmList}>
              {BGM_TRACKS.map((track) => {
                const isActive = selectedBgm === track.id;
                return (
                  <TouchableOpacity
                    key={track.id}
                    onPress={() => {
                      setSelectedBgm(track.id);
                      onSelectBgm?.(track.id);
                    }}
                    style={[styles.bgmRow, isActive && styles.bgmRowActive]}
                  >
                    <View style={styles.bgmRowLeft}>
                      <View style={[styles.bgmIconCircle, isActive && styles.bgmIconCircleActive]}>
                        <Ionicons
                          name={track.icon as any}
                          size={18}
                          color={isActive ? '#0F766E' : '#64748B'}
                        />
                      </View>
                      <View>
                        <Text style={[styles.bgmTrackName, isActive && styles.bgmTrackNameActive]}>
                          {track.name}
                        </Text>
                        <Text style={styles.bgmTrackTag}>{track.tag}</Text>
                      </View>
                    </View>

                    {isActive && <Ionicons name="checkmark-circle" size={20} color="#0F766E" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#CCFBF1',
    maxHeight: '80%',
    paddingBottom: 28,
    shadowColor: '#0F766E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
  },
  sectionHeader: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F766E',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  sfxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sfxButtonWrapper: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sfxGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  sfxButtonText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  bgmList: {
    gap: 8,
  },
  bgmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bgmRowActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  bgmRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bgmIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bgmIconCircleActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  bgmTrackName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#1E293B',
  },
  bgmTrackNameActive: {
    color: '#0F766E',
  },
  bgmTrackTag: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    color: '#64748B',
  },
});
