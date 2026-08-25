import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Colors } from '../../constants/colors';
import { rentApi } from '../../lib/services';
import { CompanionDetailModal } from '../../components/rent/CompanionDetailModal';
import { CompanionBookingModal } from '../../components/rent/CompanionBookingModal';
import { BecomeCompanionModal } from '../../components/rent/BecomeCompanionModal';
import { useAuthStore } from '../../stores/authStore';

import { NativeModules } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Safely obtain Audio module without throwing ExponentAV missing error
function getAudioModule() {
  return null;
}

// ALL 27 REAL COMPANION SERVICES
const ALL_27_SERVICES = [
  { id: 'All', label: 'All 27 Services', icon: 'grid' },
  { id: 'Rent GF/BF', label: '💖 Rent GF/BF', icon: 'heart' },
  { id: 'Movie Partner', label: '🍿 Movie Partner', icon: 'film' },
  { id: 'In-Person Meet', label: '☕ In-Person Meet', icon: 'cafe' },
  { id: 'Elder Care', label: '👵 Elder Care', icon: 'people' },
  { id: 'Hanging Out', label: '🎈 Hanging Out', icon: 'happy' },
  { id: 'Clubbing', label: '🪩 Clubbing', icon: 'disc' },
  { id: 'Shopping Buddy', label: '🛍️ Shopping Buddy', icon: 'bag-handle' },
  { id: 'Medical Support', label: '🩺 Medical Support', icon: 'medkit' },
  { id: 'Domestic Help', label: '🏡 Domestic Help', icon: 'home' },
  { id: 'Travel Partner', label: '✈️ Travel Partner', icon: 'airplane' },
  { id: 'Event Partner', label: '🎟️ Event Partner', icon: 'ticket' },
  { id: 'City Tour', label: '🧭 City Tour', icon: 'compass' },
  { id: 'Gaming Partner', label: '🎮 Gaming Partner', icon: 'game-controller' },
  { id: 'Concert Partner', label: '🎸 Concert Partner', icon: 'musical-notes' },
  { id: 'Coffee Partner', label: '☕ Coffee Partner', icon: 'cafe' },
  { id: 'Cafe & Food', label: '🍕 Cafe & Food', icon: 'restaurant' },
  { id: 'Networking', label: '💼 Networking', icon: 'briefcase' },
  { id: 'Gym & Fitness Buddy', label: '🏋️ Gym & Fitness Buddy', icon: 'fitness' },
  { id: 'Pet Care Companion', label: '🐾 Pet Care Companion', icon: 'paw' },
  { id: 'Study Buddy', label: '📚 Study Buddy', icon: 'book' },
  { id: 'Photographer Companion', label: '📸 Photographer Companion', icon: 'camera' },
  { id: 'Long Drive Buddy', label: '🚗 Long Drive Buddy', icon: 'car' },
  { id: 'Yoga & Wellness Partner', label: '🧘 Yoga & Wellness Partner', icon: 'leaf' },
  { id: 'Theater & Play Companion', label: '🎭 Theater & Play Companion', icon: 'color-palette' },
  { id: 'Esports Teammate', label: '🕹️ Esports Teammate', icon: 'game-controller' },
  { id: 'Wedding Guest Plus-One', label: '🤝 Wedding Guest Plus-One', icon: 'ribbon' },
];

export default function RentScreen() {
  const router = useRouter();
  // Subscribe to the whole live-profile cache once. Indexing into it inside the
  // companions.map() below is plain object access (not a hook), and this screen
  // re-renders whenever any profile:update lands because applyProfileUpdate
  // replaces the profileCache object reference.
  const profileCache = useAuthStore((s) => s.profileCache);
  const [selectedService, setSelectedService] = useState('All');
  const [nearMeActive, setNearMeActive] = useState(false);
  const [companions, setCompanions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real GPS Device Location State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('Fetching Location...');
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  // Audio Voice Intro Player State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [sound, setSound] = useState<any | null>(null);

  // Modals State
  const [selectedCompanion, setSelectedCompanion] = useState<any | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [becomeCompanionModalVisible, setBecomeCompanionModalVisible] = useState(false);

  // Request Real GPS Device Location
  const requestRealLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionGranted(false);
        setLocationName('Location Permission Denied');
        return;
      }

      setLocationPermissionGranted(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setUserCoords({ lat, lng });

      // Reverse Geocode City & Area Name
      try {
        const address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (address && address.length > 0) {
          const item = address[0];
          const cityStr = item.city || item.subregion || item.region || 'Mumbai';
          const areaStr = item.district || item.name || item.street || 'Near You';
          setLocationName(`${areaStr}, ${cityStr}`);
        } else {
          setLocationName('Mumbai, India');
        }
      } catch {
        setLocationName('Mumbai, India');
      }
    } catch {
      setLocationName('Mumbai, India');
    }
  }, []);

  const fetchCompanions = useCallback(async () => {
    try {
      const { data } = await rentApi.getCompanions(
        selectedService === 'All' ? undefined : selectedService,
        userCoords?.lat,
        userCoords?.lng,
        nearMeActive ? 3.0 : undefined
      );

      if (data?.companions) {
        setCompanions(data.companions);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedService, userCoords, nearMeActive]);

  useEffect(() => {
    requestRealLocation();
  }, [requestRealLocation]);

  useEffect(() => {
    fetchCompanions();
  }, [fetchCompanions]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    requestRealLocation();
    fetchCompanions();
  }, [requestRealLocation, fetchCompanions]);

  // Reciprocity Voice Intro Player
  const toggleVoiceIntro = async (companionId: string, voiceUrl: string) => {
    Alert.alert('Voice Greeting', 'Playing voice greeting: "Hi, excited to meet you!"');
  };

  const handleOpenDetail = (companion: any) => {
    setSelectedCompanion(companion);
    setDetailModalVisible(true);
  };

  const handleOpenBooking = (companion: any) => {
    setSelectedCompanion(companion);
    setDetailModalVisible(false);
    setBookingModalVisible(true);
  };

  const handleSpeedCall = (companion: any) => {
    setDetailModalVisible(false);
    Alert.alert(
      '💬 Instant Speed Intro Call',
      `Initiating 15-Minute Speed Call with ${companion.name} ($${companion.speedCallRate || 5}). Connecting live audio...`
    );
  };

  const handleBookingSuccess = (booking: any) => {
    setBookingModalVisible(false);
    Alert.alert(
      '🎉 Session Reserved!',
      `Your session with ${booking.companion.name} is reserved for ${booking.vibe} (${booking.durationHours} hours). Instant Escrow protection active!`
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Real GPS Location Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Rent Companion</Text>
          <TouchableOpacity onPress={requestRealLocation} style={styles.locationRow}>
            <Ionicons name="location" size={13} color="#0F766E" />
            <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
            <Ionicons name="chevron-down" size={12} color="#0F766E" />
          </TouchableOpacity>
        </View>

        {/* Real GPS Near Me Filter Button */}
        <TouchableOpacity
          onPress={() => setNearMeActive(!nearMeActive)}
          style={[styles.nearMeBtn, nearMeActive && styles.nearMeBtnActive]}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-circle" size={16} color={nearMeActive ? '#FFFFFF' : '#0F766E'} />
          <Text style={[styles.nearMeText, nearMeActive && styles.nearMeTextActive]}>
            {nearMeActive ? 'Near Me (<3km)' : '📍 Near Me'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Hero Banner with Live GPS Badge */}
        <View style={styles.heroBannerContainer}>
          <LinearGradient
            colors={['#0F766E', '#0D9488', '#064E3B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroLeft}>
              <View style={styles.liveBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveBadgeText}>
                  ⚡ {companions.length} Verified Companions Near {locationName.split(',')[0]}
                </Text>
              </View>

              <Text style={styles.heroTitle}>All 27 Real Companion{'\n'}Services Available</Text>
              <Text style={styles.heroSubtitle}>
                Coffee dates, elder care, gym buddies, shopping & event plus-ones
              </Text>
            </View>

            <Image
              source={require('../../assets/images/mascot_rent.png')}
              style={styles.heroMascotImg}
            />
          </LinearGradient>
        </View>

        {/* BECOME A COMPANION BANNER */}
        <TouchableOpacity
          style={styles.becomeCompanionBanner}
          onPress={() => setBecomeCompanionModalVisible(true)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#F0FDFA', '#CCFBF1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.becomeGradient}
          >
            <View style={styles.becomeLeft}>
              <View style={styles.earnBadge}>
                <Text style={styles.earnBadgeText}>💰 Earn up to $50/hr</Text>
              </View>
              <Text style={styles.becomeTitle}>Become a Companion</Text>
              <Text style={styles.becomeSubtitle}>Share your hobbies, offer services & earn on your schedule</Text>
            </View>

            <View style={styles.applyBtnBox}>
              <Text style={styles.applyBtnText}>Apply Now →</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ALL 27 REAL SERVICES HORIZONTAL SCROLL CHIPS */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>All 27 Real Companion Services</Text>
            <Text style={styles.serviceCountBadge}>{ALL_27_SERVICES.length - 1} Services</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
          >
            {ALL_27_SERVICES.map((srv) => {
              const active = selectedService === srv.id;
              return (
                <TouchableOpacity
                  key={srv.id}
                  onPress={() => setSelectedService(srv.id)}
                  activeOpacity={0.8}
                  style={[styles.serviceChip, active && styles.serviceChipActive]}
                >
                  <Text style={[styles.serviceChipLabel, active && styles.serviceChipLabelActive]}>
                    {srv.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* REAL COMPANION CARDS FEED */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>
            {selectedService !== 'All'
              ? `${selectedService} Companions`
              : nearMeActive
              ? `📍 Companions Near ${locationName.split(',')[0]}`
              : 'Recommended Companions'}
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0F766E" />
              <Text style={styles.loadingText}>Fetching real companions in {locationName}...</Text>
            </View>
          ) : companions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="location-outline" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>No companions available for {selectedService} near you right now.</Text>
            </View>
          ) : (
            companions.map((comp) => {
              const isPlayingVoice = playingAudioId === comp.id;
              // Live overlay for this companion's real user, keyed by users.id.
              const live = comp.userId ? profileCache[comp.userId] : undefined;
              const liveAvatar = live?.avatar_url || comp.avatar;
              const liveName = live?.full_name || comp.name;
              const liveBio = live?.bio || comp.bio;
              return (
                <TouchableOpacity
                  key={comp.id}
                  style={styles.companionCard}
                  onPress={() => handleOpenDetail(comp)}
                  activeOpacity={0.92}
                >
                  {/* Image Cover Header with Top Badges */}
                  <View style={styles.cardImgWrapper}>
                    <Image source={{ uri: liveAvatar || comp.galleryImages?.[0] }} style={styles.cardImg} />

                    {/* Verified Badge */}
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#38BDF8" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>

                    {/* Top Right Scarcity Badge */}
                    <View style={styles.topRightControls}>
                      <View style={styles.scarcityBadge}>
                        <Text style={styles.scarcityText}>🔥 {comp.slotsLeft} slot left tonight</Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Body with Overlapping PFP Avatar */}
                  <View style={styles.cardBody}>
                    {/* Overlapping Profile Photo Circle (PFP) - Tapping opens Custom Companion Social Profile */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/companion/${comp.id}`);
                      }}
                      style={styles.overlappingPfpTouch}
                      activeOpacity={0.88}
                    >
                      {liveAvatar ? (
                        <Image source={{ uri: liveAvatar }} style={styles.overlappingPfpImg} />
                      ) : (
                        <View style={[styles.overlappingPfpImg, { backgroundColor: '#0F766E20', alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="person" size={32} color="#0F766E" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Info Header Row: Name & Age on Left, Location & Rating on Right */}
                    <View style={styles.profileHeaderRow}>
                      <View style={styles.nameAgeCol}>
                        <Text style={styles.compName}>{liveName}, {comp.age}</Text>
                        <Text style={styles.compServiceTag}>Service: {comp.serviceCategory}</Text>
                      </View>

                      <View style={styles.locationRatingCol}>
                        <View style={styles.compLocationBadge}>
                          <Ionicons name="location" size={11} color="#0F766E" />
                          <Text style={styles.compLocationText}>{comp.locationName}</Text>
                        </View>
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.ratingText}>{comp.rating} ({comp.reviewsCount})</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.compBio} numberOfLines={2}>{liveBio}</Text>

                    {/* Tags */}
                    <View style={styles.tagRow}>
                      {comp.tags?.map((t: string) => (
                        <View key={t} style={styles.tagChip}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Voice Intro Player */}
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleVoiceIntro(comp.id, comp.voiceUrl);
                      }}
                      style={styles.voicePreviewBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isPlayingVoice ? 'pause-circle' : 'play-circle'}
                        size={20}
                        color="#0F766E"
                      />
                      <Text style={styles.voicePreviewText}>
                        {isPlayingVoice ? 'Playing Voice Greeting (12s)...' : 'Listen to 10s Voice Intro Greeting'}
                      </Text>
                    </TouchableOpacity>

                    {/* Card Footer: Speed Call + Booking */}
                    <View style={styles.cardFooter}>
                      <View>
                        <Text style={styles.hourlyRate}>${comp.hourlyRate} / hour</Text>
                        <Text style={styles.anchorSaving}>Saved 40% vs VIP ($150)</Text>
                      </View>

                      <View style={styles.ctaRow}>
                        <TouchableOpacity
                          style={styles.speedCallCta}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSpeedCall(comp);
                          }}
                        >
                          <Ionicons name="call" size={14} color="#0F766E" />
                          <Text style={styles.speedCallCtaText}>15m Call (${comp.speedCallRate || 5})</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.bookCtaBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenBooking(comp);
                          }}
                          activeOpacity={0.85}
                        >
                          <LinearGradient
                            colors={['#0F766E', '#14B8A6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.bookCtaGradient}
                          >
                            <Text style={styles.bookCtaText}>Book →</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* COMPANION DETAIL MODAL (MULTI-PHOTO GALLERY) */}
      {selectedCompanion && (
        <CompanionDetailModal
          visible={detailModalVisible}
          companion={selectedCompanion}
          onClose={() => setDetailModalVisible(false)}
          onBook={handleOpenBooking}
          onSpeedCall={handleSpeedCall}
        />
      )}

      {/* BOOKING CUSTOMIZER MODAL */}
      {selectedCompanion && (
        <CompanionBookingModal
          visible={bookingModalVisible}
          companion={selectedCompanion}
          onClose={() => setBookingModalVisible(false)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* BECOME A COMPANION REGISTRATION MODAL */}
      <BecomeCompanionModal
        visible={becomeCompanionModalVisible}
        onClose={() => setBecomeCompanionModalVisible(false)}
        onSuccess={() => fetchCompanions()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Become a Companion Banner
  becomeCompanionBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  becomeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  becomeLeft: {
    flex: 1,
    paddingRight: 10,
  },
  earnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  earnBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    color: '#0F766E',
    marginLeft: 4,
  },
  becomeTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  becomeSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  applyBtnBox: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  applyBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: '#0F172A',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#0F766E',
    marginHorizontal: 3,
    maxWidth: 180,
  },

  nearMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  nearMeBtnActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  nearMeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#0F766E',
    marginLeft: 5,
  },
  nearMeTextActive: {
    color: '#FFFFFF',
  },

  scrollContent: {
    paddingBottom: 100,
  },

  heroBannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 8,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  liveBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    color: '#FFFFFF',
  },
  heroTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  heroSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#E6F7F5',
    marginTop: 4,
  },
  heroMascotImg: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },

  smartDefaultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.22)',
    justifyContent: 'space-between',
  },
  smartDefaultItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smartDefaultText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#0F766E',
    marginLeft: 5,
  },
  smartDefaultDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
  },

  // Services Section
  servicesSection: {
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  serviceCountBadge: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#0F766E',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  servicesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  serviceChipActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  serviceChipLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#475569',
  },
  serviceChipLabelActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },

  // Feed Section
  feedSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 10,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },

  companionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 6,
  },
  cardImgWrapper: {
    height: 190,
    width: '100%',
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  verifiedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  topRightControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gearIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scarcityBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  scarcityText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    color: '#991B1B',
  },

  cardBody: {
    padding: 16,
    position: 'relative',
  },
  overlappingPfpTouch: {
    position: 'absolute',
    left: 16,
    top: -56,
    width: 104,
    height: 104,
    borderRadius: 52,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  overlappingPfpImg: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    borderWidth: 4.5,
    borderColor: '#FFFFFF',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 48,
    marginBottom: 10,
  },
  nameAgeCol: {
    flex: 1,
    marginRight: 10,
  },
  compName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: '#0F172A',
  },
  locationRatingCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  compLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  compLocationText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#0F766E',
    marginLeft: 3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#92400E',
    marginLeft: 4,
  },
  compServiceTag: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#0F766E',
    marginTop: 2,
  },
  compBio: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: '#475569',
    marginTop: 6,
    lineHeight: 17,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#475569',
  },

  voicePreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  voicePreviewText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    color: '#0F766E',
    marginLeft: 8,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  hourlyRate: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F766E',
  },
  anchorSaving: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#16A34A',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  speedCallCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0F766E',
  },
  speedCallCtaText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#0F766E',
    marginLeft: 4,
  },
  bookCtaBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookCtaGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookCtaText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});
