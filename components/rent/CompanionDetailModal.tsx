import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCachedProfile } from '../ui/UserText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CompanionDetailModalProps {
  visible: boolean;
  companion: any;
  onClose: () => void;
  onBook: (companion: any) => void;
  onSpeedCall: (companion: any) => void;
}

export function CompanionDetailModal({
  visible,
  companion,
  onClose,
  onBook,
  onSpeedCall,
}: CompanionDetailModalProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  // Hook must run before the early return below (rules of hooks); reading an
  // undefined userId is safe and simply yields no overlay.
  const live = useCachedProfile(companion?.userId);

  if (!companion) return null;

  const liveAvatar = live?.avatar_url || companion.avatar;
  const liveName = live?.full_name || companion.name;
  const liveBio = live?.bio || companion.bio;

  const gallery: string[] = companion.galleryImages && companion.galleryImages.length > 0
    ? companion.galleryImages
    : [liveAvatar];

  const handleScroll = (event: any) => {
    const slide = Math.round(
      event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
    );
    if (slide !== activePhotoIndex) {
      setActivePhotoIndex(slide);
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
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="chevron-down" size={26} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.topHeaderTitle}>{liveName}'s Profile</Text>
            <TouchableOpacity style={styles.shareBtn}>
              <Ionicons name="share-social-outline" size={20} color="#0F766E" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* 1. SWIPEABLE MULTI-PHOTO CAROUSEL */}
            <View style={styles.carouselWrapper}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.carouselScroll}
              >
                {gallery.map((imgUrl, index) => (
                  <View key={index} style={styles.slide}>
                    <Image source={{ uri: imgUrl }} style={styles.slideImg} />
                  </View>
                ))}
              </ScrollView>

              {/* Carousel Pagination Dots */}
              <View style={styles.paginationDots}>
                {gallery.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      activePhotoIndex === i && styles.dotActive,
                    ]}
                  />
                ))}
              </View>

              {/* 3-Sec Video Story Badge Indicator */}
              <View style={styles.videoBadgeTag}>
                <Ionicons name="videocam" size={14} color="#FFFFFF" />
                <Text style={styles.videoBadgeText}>3s Live Video Verified</Text>
              </View>

              {/* Distance Pill */}
              <View style={styles.distanceBadge}>
                <Ionicons name="location" size={12} color="#0F766E" />
                <Text style={styles.distanceText}>📍 {companion.distanceKm || 1.2} km away • {companion.locationName || 'Bandra'}</Text>
              </View>
            </View>

            {/* Profile Info Summary */}
            <View style={styles.infoSection}>
              <View style={styles.nameRow}>
                <View>
                  <View style={styles.verifiedRow}>
                    <Text style={styles.compName}>{liveName}, {companion.age}</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#38BDF8" style={{ marginLeft: 6 }} />
                  </View>
                  <Text style={styles.vibeCategoryText}>🌟 {companion.vibeCategory || 'Casual Chill'}</Text>
                </View>

                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{companion.rating} ({companion.reviewsCount} reviews)</Text>
                </View>
              </View>

              {/* Vibe Match Progress Radar Badge */}
              <View style={styles.vibeMatchBanner}>
                <LinearGradient
                  colors={['#F0FDFA', '#CCFBF1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.vibeGradient}
                >
                  <Ionicons name="sparkles" size={18} color="#0F766E" />
                  <Text style={styles.vibeMatchText}>
                    {companion.vibeMatchPercent || 96}% Vibe Match with your interests!
                  </Text>
                </LinearGradient>
              </View>

              {/* Bio Section */}
              <Text style={styles.sectionHeading}>About {liveName}</Text>
              <Text style={styles.bioText}>{liveBio}</Text>

              {/* Tags */}
              <Text style={styles.sectionHeading}>Favorite Activities & Vibe</Text>
              <View style={styles.tagGrid}>
                {companion.tags?.map((tag: string) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Loss Aversion Scarcity Box */}
              <View style={styles.scarcityBox}>
                <Ionicons name="time" size={16} color="#DC2626" />
                <Text style={styles.scarcityText}>
                  🔥 Only {companion.slotsLeft || 1} session slot remaining for tonight in {companion.city}!
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Dual Action CTAs */}
          <View style={styles.footer}>
            {/* 15-Min Speed Call ($5) */}
            <TouchableOpacity
              style={styles.speedCallBtn}
              onPress={() => onSpeedCall(companion)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={18} color="#0F766E" />
              <Text style={styles.speedCallText}>
                15-Min Speed Intro (${companion.speedCallRate || 5})
              </Text>
            </TouchableOpacity>

            {/* Full Date Package Session Booking */}
            <TouchableOpacity
              style={styles.fullBookBtn}
              onPress={() => onBook(companion)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0F766E', '#14B8A6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fullBookGradient}
              >
                <Text style={styles.fullBookText}>
                  Book Session (${companion.hourlyRate}/hr) →
                </Text>
              </LinearGradient>
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
    backgroundColor: 'rgba(15, 23, 42, 0.70)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
  },
  topHeaderTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: '#0F172A',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 20,
  },

  // Carousel
  carouselWrapper: {
    height: 280,
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  carouselScroll: {
    width: SCREEN_WIDTH,
    height: 280,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: 280,
  },
  slideImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  videoBadgeTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  videoBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  distanceText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#0F766E',
    marginLeft: 4,
  },

  // Info
  infoSection: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: '#0F172A',
  },
  vibeCategoryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  ratingText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#92400E',
    marginLeft: 4,
  },

  vibeMatchBanner: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  vibeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  vibeMatchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
    color: '#0F766E',
    marginLeft: 8,
  },

  sectionHeading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 6,
  },
  bioText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 20,
  },

  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#334155',
  },

  scarcityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  scarcityText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#991B1B',
    marginLeft: 8,
    flex: 1,
  },

  // Footer CTAs
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  speedCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0F766E',
  },
  speedCallText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11.5,
    color: '#0F766E',
    marginLeft: 4,
  },
  fullBookBtn: {
    flex: 1.2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  fullBookGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBookText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});
