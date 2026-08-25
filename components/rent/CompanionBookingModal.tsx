import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { rentApi } from '../../lib/services';
import { useCachedProfile } from '../ui/UserText';

interface CompanionBookingModalProps {
  visible: boolean;
  companion: any;
  onClose: () => void;
  onSuccess: (booking: any) => void;
}

const VIBES = [
  { id: 'cafe', title: 'Cozy Cafe & Chat', icon: 'cafe-outline', desc: 'Relaxed coffee, matcha & warm conversation' },
  { id: 'movie', title: 'Movie & Cinema', icon: 'film-outline', desc: 'Watch latest blockbuster together' },
  { id: 'dining', title: 'Fine Dining Date', icon: 'restaurant-outline', desc: 'Delicious food & romantic ambiance' },
  { id: 'gaming', title: 'Arcade & Gaming', icon: 'game-controller-outline', desc: 'Ludo, multiplayer arcade & fun' },
];

const TALK_STYLES = [
  { id: 'deep', label: 'Deep Conversations' },
  { id: 'fun', label: 'Fun & Lighthearted' },
  { id: 'story', label: 'Storytelling & Travel' },
];

const PERKS = [
  { id: 'flowers', label: '💐 Fresh Flowers', cost: 10 },
  { id: 'note', label: '✉️ Handwritten Note', cost: 5 },
  { id: 'playlist', label: '🎵 Custom Music Playlist', cost: 5 },
];

export function CompanionBookingModal({
  visible,
  companion,
  onClose,
  onSuccess,
}: CompanionBookingModalProps) {
  const [selectedVibe, setSelectedVibe] = useState('cafe');
  const [selectedStyle, setSelectedStyle] = useState('deep');
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState(2);
  const [loading, setLoading] = useState(false);

  // Loss Aversion Countdown Timer (4m 59s)
  const [timeLeft, setTimeLeft] = useState(299);

  // Live overlay for the companion's real user (hook runs before early return).
  const live = useCachedProfile(companion?.userId);

  useEffect(() => {
    if (!visible) return;
    setTimeLeft(299);
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!companion) return null;

  const liveAvatar = live?.avatar_url || companion.avatar;
  const liveName = live?.full_name || companion.name;

  const togglePerk = (id: string) => {
    setSelectedPerks((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const perksCost = selectedPerks.reduce((sum, pId) => {
    const p = PERKS.find((item) => item.id === pId);
    return sum + (p?.cost || 0);
  }, 0);

  const totalAmount = companion.hourlyRate * durationHours + perksCost;
  const minutesStr = Math.floor(timeLeft / 60);
  const secondsStr = String(timeLeft % 60).padStart(2, '0');

  const handleBooking = async () => {
    setLoading(true);
    try {
      const { data, error } = await rentApi.book({
        companionId: companion.id,
        vibe: selectedVibe,
        style: selectedStyle,
        perks: selectedPerks,
        durationHours,
      });

      setLoading(false);
      if (data?.success) {
        onSuccess(data.booking);
      } else {
        Alert.alert('Booking Error', error || 'Could not complete booking.');
      }
    } catch {
      setLoading(false);
      Alert.alert('Booking Error', 'Network error. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header Bar */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Customize Date Package</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* 1. GOAL GRADIENT EFFECT: Head start progress meter (25% complete) */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressStepText}>Step 2 of 4 (25% Complete)</Text>
                <Text style={styles.progressPercent}>25%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '25%' }]} />
              </View>
              <View style={styles.headStartBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#0F766E" />
                <Text style={styles.headStartText}>
                  Location & Nearby Companion Availability Pre-Matched ✓
                </Text>
              </View>
            </View>

            {/* 2. LOSS AVERSION: Reservation Countdown Banner */}
            <View style={styles.scarcityBanner}>
              <Ionicons name="time-outline" size={16} color="#DC2626" />
              <Text style={styles.scarcityText}>
                Slot held for <Text style={styles.timerBold}>{minutesStr}:{secondsStr}</Text> • 94% Booked Tonight!
              </Text>
            </View>

            {/* Companion Bio Header */}
            <View style={styles.companionCardSummary}>
              <Image source={{ uri: liveAvatar }} style={styles.companionAvatar} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.companionName}>{liveName}, {companion.age}</Text>
                <Text style={styles.companionMeta}>⭐ {companion.rating} ({companion.reviewsCount} reviews) • {companion.city}</Text>
              </View>
            </View>

            {/* 3. IKEA EFFECT: Step 1 - Choose Date Vibe */}
            <Text style={styles.sectionHeading}>1. Choose Date Vibe & Mood</Text>
            <View style={styles.vibeGrid}>
              {VIBES.map((v) => {
                const active = selectedVibe === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setSelectedVibe(v.id)}
                    activeOpacity={0.8}
                    style={[styles.vibeCard, active && styles.vibeCardActive]}
                  >
                    <Ionicons name={v.icon as any} size={22} color={active ? '#0F766E' : '#64748B'} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={[styles.vibeTitle, active && styles.vibeTitleActive]}>{v.title}</Text>
                      <Text style={styles.vibeDesc}>{v.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Step 2 - Duration Selector */}
            <Text style={styles.sectionHeading}>2. Session Duration</Text>
            <View style={styles.durationRow}>
              {[1, 2, 3, 4].map((hrs) => (
                <TouchableOpacity
                  key={hrs}
                  onPress={() => setDurationHours(hrs)}
                  style={[styles.durationChip, durationHours === hrs && styles.durationChipActive]}
                >
                  <Text style={[styles.durationChipText, durationHours === hrs && styles.durationChipTextActive]}>
                    {hrs} Hour{hrs > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Step 3 - Conversation Style */}
            <Text style={styles.sectionHeading}>3. Preferred Conversation Vibe</Text>
            <View style={styles.styleRow}>
              {TALK_STYLES.map((st) => {
                const active = selectedStyle === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    onPress={() => setSelectedStyle(st.id)}
                    style={[styles.styleChip, active && styles.styleChipActive]}
                  >
                    <Text style={[styles.styleChipText, active && styles.styleChipTextActive]}>{st.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Step 4 - Optional Gift Perks */}
            <Text style={styles.sectionHeading}>4. Special Custom Add-Ons (Optional)</Text>
            <View style={styles.perksList}>
              {PERKS.map((pk) => {
                const active = selectedPerks.includes(pk.id);
                return (
                  <TouchableOpacity
                    key={pk.id}
                    onPress={() => togglePerk(pk.id)}
                    style={[styles.perkItem, active && styles.perkItemActive]}
                  >
                    <Text style={styles.perkLabel}>{pk.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Safety Verification Badge */}
            <View style={styles.safetyBadgeRow}>
              <Ionicons name="shield-checkmark" size={16} color="#0F766E" />
              <Text style={styles.safetyText}>
                100% Verified Companion Request • Instant Confirmation
              </Text>
            </View>
          </ScrollView>

          {/* Footer Action Bar */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.bookActionBtn}
              onPress={handleBooking}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0F766E', '#14B8A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.bookBtnText}>
                    Confirm Connection Request →
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
              <Text style={styles.dismissText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    padding: 20,
  },

  // Progress Meter (Goal Gradient)
  progressContainer: {
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressStepText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#0F766E',
  },
  progressPercent: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#0F766E',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#CCFBF1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0F766E',
  },
  headStartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headStartText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#0F766E',
    marginLeft: 4,
  },

  // Loss Aversion Scarcity Banner
  scarcityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  scarcityText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#991B1B',
    marginLeft: 6,
  },
  timerBold: {
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#DC2626',
  },

  companionCardSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  companionAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  companionName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  companionMeta: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  sectionHeading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 10,
  },

  // Vibe Grid
  vibeGrid: {
    gap: 8,
    marginBottom: 16,
  },
  vibeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  vibeCardActive: {
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA',
  },
  vibeTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#1E293B',
  },
  vibeTitleActive: {
    color: '#0F766E',
  },
  vibeDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  durationChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
  },
  durationChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#475569',
  },
  durationChipTextActive: {
    color: '#FFFFFF',
  },

  // Style
  styleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  styleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  styleChipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA',
  },
  styleChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#475569',
  },
  styleChipTextActive: {
    color: '#0F766E',
    fontFamily: 'Inter-SemiBold',
  },

  // Perks
  perksList: {
    gap: 8,
    marginBottom: 16,
  },
  perkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  perkItemActive: {
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA',
  },
  perkLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#1E293B',
  },
  perkCost: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#0F766E',
  },

  // Price & Anchoring
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  priceTotalLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#64748B',
  },
  priceTotalValue: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: '#0F766E',
  },
  anchorBox: {
    alignItems: 'flex-end',
  },
  anchorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#64748B',
  },
  anchorBadge: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    color: '#16A34A',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },

  safetyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  safetyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#0F766E',
    marginLeft: 6,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  bookActionBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bookGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  dismissBtn: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  dismissText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#94A3B8',
  },
});
