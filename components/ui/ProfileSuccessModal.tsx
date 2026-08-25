import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { getApiUrl } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProfileSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onViewProfile?: () => void;
  avatarUrl?: string | null;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
}

export function ProfileSuccessModal({
  visible,
  onClose,
  onViewProfile,
  avatarUrl,
  title = 'Profile photo updated',
  subtitle = 'Successfully!',
  description = 'Your new profile photo is now visible to others across Bulblu.',
  buttonText = 'Looks Great',
}: ProfileSuccessModalProps) {
  if (!visible) return null;

  let resolvedAvatar = avatarUrl;
  if (resolvedAvatar && resolvedAvatar.startsWith('/uploads/')) {
    resolvedAvatar = `${getApiUrl()}${resolvedAvatar}`;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Modal Card with Deep Dark Teal Luxury Gradient */}
        <Animated.View
          entering={FadeInDown.springify().damping(16).mass(0.9)}
          style={styles.cardContainer}
        >
          <LinearGradient
            colors={['#04202C', '#0A313D', '#041B24']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.gradientCard}
          >
            {/* Top Close Icon */}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>

            {/* Ambient Background Glow Circles & Particles */}
            <View style={styles.glowAuraContainer}>
              <View style={styles.outerAuraRing} />
              <View style={styles.middleAuraRing} />
              <View style={[styles.particle, { top: 20, left: 40 }]} />
              <View style={[styles.particle, { top: 45, right: 35 }]} />
              <View style={[styles.particle, { bottom: 30, left: 60 }]} />
              <View style={[styles.particle, { bottom: 50, right: 50 }]} />
            </View>

            {/* Avatar Header with Glowing Ring & Verified Check Badge */}
            <Animated.View entering={ZoomIn.duration(400).delay(100)} style={styles.avatarWrapper}>
              <View style={styles.avatarGlowCircle}>
                {resolvedAvatar ? (
                  <Image source={{ uri: resolvedAvatar }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={48} color="#2DD4BF" />
                  </View>
                )}
              </View>

              {/* Checkmark Badge on Avatar */}
              <View style={styles.avatarCheckBadge}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            </Animated.View>

            {/* Center Status Glow Checkmark Icon */}
            <Animated.View entering={FadeInUp.duration(300).delay(200)} style={styles.statusIconWrapper}>
              <View style={styles.statusGlowRing}>
                <Ionicons name="checkmark" size={20} color="#2DD4BF" />
              </View>
            </Animated.View>

            {/* Content Text */}
            <Animated.View entering={FadeInUp.duration(350).delay(250)} style={styles.textBlock}>
              <Text style={styles.titleText}>{title}</Text>
              <Text style={styles.subtitleText}>{subtitle}</Text>
            </Animated.View>

            {/* Primary Action Button */}
            <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.88}
                style={styles.primaryBtnWrapper}
              >
                <LinearGradient
                  colors={['#14B8A6', '#0D9488']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>{buttonText}</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary View Profile Action */}
              {onViewProfile && (
                <TouchableOpacity
                  onPress={onViewProfile}
                  activeOpacity={0.7}
                  style={styles.secondaryBtn}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={18} color="#2DD4BF" style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryBtnText}>View Profile</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
  },
  gradientCard: {
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  glowAuraContainer: {
    position: 'absolute',
    top: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 240,
  },
  outerAuraRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.1)',
  },
  middleAuraRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(45, 212, 191, 0.6)',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlowCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 4,
    borderWidth: 2.5,
    borderColor: '#2DD4BF',
    backgroundColor: '#04202C',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    backgroundColor: '#0F766E30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D9488',
    borderWidth: 3,
    borderColor: '#04202C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  statusIconWrapper: {
    marginBottom: 14,
  },
  statusGlowRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2DD4BF',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  titleText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 19,
    color: '#2DD4BF',
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 8,
  },
  descriptionText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    color: '#2DD4BF',
  },
});
