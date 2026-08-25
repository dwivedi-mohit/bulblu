import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface RoomSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  announcement: string;
  maxSeats: number;
  isPrivate: boolean;
  pinPassword?: string;
  micOrderEnabled: boolean;
  onSaveSettings: (settings: {
    announcement: string;
    maxSeats: number;
    isPrivate: boolean;
    pinPassword?: string;
    micOrderEnabled: boolean;
  }) => void;
  onMuteAll?: () => void;
}

export function RoomSettingsModal({
  visible,
  onClose,
  announcement: initialAnnouncement,
  maxSeats: initialMaxSeats,
  isPrivate: initialIsPrivate,
  pinPassword: initialPin,
  micOrderEnabled: initialMicOrder,
  onSaveSettings,
  onMuteAll,
}: RoomSettingsModalProps) {
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [maxSeats, setMaxSeats] = useState(initialMaxSeats || 15);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate || false);
  const [pinPassword, setPinPassword] = useState(initialPin || '');
  const [micOrderEnabled, setMicOrderEnabled] = useState(initialMicOrder || false);

  if (!visible) return null;

  const handleSave = () => {
    if (isPrivate && pinPassword.trim().length < 4) {
      Alert.alert('Required PIN', 'Private rooms require a 4-digit PIN password.');
      return;
    }

    onSaveSettings({
      announcement: announcement.trim(),
      maxSeats,
      isPrivate,
      pinPassword: isPrivate ? pinPassword.trim() : undefined,
      micOrderEnabled,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings-outline" size={22} color="#0F766E" style={{ marginRight: 8 }} />
              <Text style={styles.sheetTitle}>Room Settings & Host Access</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.contentBox}>
            {/* Announcement Banner Editor */}
            <Text style={styles.inputLabel}>Room Announcement (Marquee)</Text>
            <View style={styles.inputBox}>
              <Ionicons name="megaphone-outline" size={18} color="#0F766E" style={{ marginRight: 8 }} />
              <TextInput
                value={announcement}
                onChangeText={setAnnouncement}
                placeholder="Welcome to our party lounge! Follow rules & enjoy ✨"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </View>

            {/* Seat Capacity Selector */}
            <Text style={[styles.inputLabel, { marginTop: 18 }]}>Seat Capacity</Text>
            <View style={styles.capacityRow}>
              {[8, 12, 15].map((cap) => (
                <TouchableOpacity
                  key={`cap-${cap}`}
                  onPress={() => setMaxSeats(cap)}
                  style={[styles.capacityCard, maxSeats === cap && styles.capacityCardActive]}
                >
                  <Ionicons
                    name="people"
                    size={20}
                    color={maxSeats === cap ? '#0F766E' : '#64748B'}
                  />
                  <Text style={[styles.capacityText, maxSeats === cap && styles.capacityTextActive]}>
                    {cap} Seats
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Private Room Lock Toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleTitle}>Private Room (Password Locked)</Text>
                <Text style={styles.toggleSubtitle}>Require 4-digit PIN to join the voice lounge</Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: '#E2E8F0', true: '#0F766E' }}
                thumbColor={isPrivate ? '#14B8A6' : '#94A3B8'}
              />
            </View>

            {/* PIN Input if Private */}
            {isPrivate && (
              <View style={[styles.inputBox, { marginTop: 10 }]}>
                <Ionicons name="lock-closed" size={18} color="#D97706" style={{ marginRight: 8 }} />
                <TextInput
                  value={pinPassword}
                  onChangeText={setPinPassword}
                  keyboardType="numeric"
                  maxLength={4}
                  placeholder="Enter 4-digit room PIN"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                />
              </View>
            )}

            {/* Mic Queue Order Toggle */}
            <View style={[styles.toggleRow, { marginTop: 16 }]}>
              <View>
                <Text style={styles.toggleTitle}>Mic Queue Order</Text>
                <Text style={styles.toggleSubtitle}>Enforce speaker turns based on seat numbers</Text>
              </View>
              <Switch
                value={micOrderEnabled}
                onValueChange={setMicOrderEnabled}
                trackColor={{ false: '#E2E8F0', true: '#0F766E' }}
                thumbColor={micOrderEnabled ? '#14B8A6' : '#94A3B8'}
              />
            </View>

            {/* Host Emergency Actions */}
            {onMuteAll && (
              <TouchableOpacity
                onPress={onMuteAll}
                style={styles.dangerActionBtn}
              >
                <Ionicons name="mic-off" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.dangerActionBtnText}>Mute All Speakers</Text>
              </TouchableOpacity>
            )}

            {/* Save Button */}
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.saveGradient}>
                <Text style={styles.saveBtnText}>Save Room Settings ✓</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#CCFBF1',
    maxHeight: '85%',
    paddingBottom: 28,
    shadowColor: '#0F766E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
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
  contentBox: {
    padding: 20,
  },
  inputLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 48,
  },
  textInput: {
    flex: 1,
    color: '#0F172A',
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13.5,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  capacityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  capacityCardActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  capacityText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  capacityTextActive: {
    color: '#0F766E',
    fontFamily: 'SpaceGrotesk-Bold',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  toggleTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F172A',
  },
  toggleSubtitle: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerActionBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#EF4444',
  },
  saveBtn: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  saveBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
