import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WePlayGameCardProps {
  title: string;
  subtitle?: string;
  image: ImageSourcePropType;
  gradientColors: [string, string, ...string[]];
  borderColor: string;
  accentGold?: boolean;
  isFullWidth?: boolean;
  badgeText?: string;
  onPress: () => void;
}

export function WePlayGameCard({
  title,
  subtitle,
  image,
  gradientColors,
  borderColor,
  accentGold = true,
  isFullWidth = false,
  badgeText,
  onPress,
}: WePlayGameCardProps) {
  const cardWidth = isFullWidth ? SCREEN_WIDTH - 32 : (SCREEN_WIDTH - 42) / 2;
  const cardHeight = isFullWidth ? 96 : 84;

  return (
    <TouchableOpacity
      style={[
        styles.outerContainer,
        { width: cardWidth, height: cardHeight, borderColor: borderColor },
        accentGold && styles.goldBorderShadow,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientInner}
      >
        {/* Inner Hairline Metallic Border */}
        <View style={[styles.innerFrameBorder, { borderColor: accentGold ? 'rgba(255, 215, 0, 0.45)' : 'rgba(255, 255, 255, 0.4)' }]} />

        {/* Notched Metallic Bracket Accents (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
        <View style={[styles.cornerBracket, styles.bracketTL, { borderColor }]} />
        <View style={[styles.cornerBracket, styles.bracketTR, { borderColor }]} />
        <View style={[styles.cornerBracket, styles.bracketBL, { borderColor }]} />
        <View style={[styles.cornerBracket, styles.bracketBR, { borderColor }]} />

        {/* Optional Top-Left Badge */}
        {badgeText ? (
          <View style={styles.badgePill}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.badgeGradient}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </LinearGradient>
          </View>
        ) : null}

        {/* Left Column Text */}
        <View style={[styles.textCol, isFullWidth ? { width: '60%' } : { width: '58%' }]}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>

          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          {/* WePlay "Play Now" CTA Pill */}
          <View style={styles.playBtnPill}>
            <Text style={styles.playBtnText}>Play Now ▶</Text>
          </View>
        </View>

        {/* Right Column 3D Graphic Asset */}
        <View style={styles.imageCol}>
          <Image source={image} style={styles.artImage} resizeMode="contain" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'visible',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginVertical: 4,
  },
  goldBorderShadow: {
    shadowColor: '#D97706',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  gradientInner: {
    flex: 1,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  innerFrameBorder: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 15,
    borderWidth: 1,
    pointerEvents: 'none',
  },
  cornerBracket: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderWidth: 2,
  },
  bracketTL: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0 },
  bracketTR: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0 },
  bracketBL: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0 },
  bracketBR: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0 },

  badgePill: {
    position: 'absolute',
    top: 4,
    left: 8,
    zIndex: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  badgeGradient: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },

  textCol: {
    justifyContent: 'center',
    zIndex: 2,
  },
  titleText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitleText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 1,
  },
  playBtnPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  playBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9.5,
    color: '#FFFFFF',
  },

  imageCol: {
    width: '40%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  artImage: {
    width: '120%',
    height: '120%',
    marginRight: -10,
  },
});
