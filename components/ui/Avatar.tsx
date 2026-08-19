import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Layout } from '../../constants/spacing';

interface AvatarProps {
  uri: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  showStory?: boolean;
  isVerified?: boolean;
  style?: ViewStyle;
}

const sizeMap = {
  sm: Layout.avatarSm,
  md: Layout.avatarMd,
  lg: Layout.avatarLg,
  xl: Layout.avatarXl,
};

export function Avatar({
  uri,
  size = 'md',
  showOnline = false,
  showStory = false,
  isVerified = false,
  style,
}: AvatarProps) {
  const dimension = sizeMap[size];
  const ringWidth = showStory ? 3 : 0;
  const totalSize = dimension + ringWidth * 2;
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 22 : size === 'lg' ? 30 : 38;

  return (
    <View style={[{ width: totalSize, height: totalSize }, style]}>
      {showStory && (
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: Radius.full },
          ]}
        />
      )}
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: Radius.full,
            marginTop: ringWidth,
            marginLeft: ringWidth,
          }}
        />
      ) : (
        <View
          style={{
            width: dimension,
            height: dimension,
            borderRadius: Radius.full,
            marginTop: ringWidth,
            marginLeft: ringWidth,
            backgroundColor: Colors.bgTertiary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person" size={iconSize} color={Colors.textTertiary} />
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size === 'sm' ? 10 : 14,
              height: size === 'sm' ? 10 : 14,
              borderRadius: Radius.full,
              right: ringWidth,
              bottom: ringWidth,
            },
          ]}
        />
      )}
      {isVerified && (
        <View
          style={[
            styles.verifiedBadge,
            {
              right: ringWidth,
              top: ringWidth,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={size === 'sm' ? 12 : 16} color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  onlineDot: {
    position: 'absolute',
    backgroundColor: Colors.accentGreen,
    borderWidth: 2,
    borderColor: Colors.bgSecondary,
  },
  verifiedBadge: {
    position: 'absolute',
  },
});
