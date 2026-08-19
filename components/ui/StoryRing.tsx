import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface StoryRingProps {
  viewed?: boolean;
  size?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function StoryRing({
  viewed = false,
  size = 64,
  children,
  style,
}: StoryRingProps) {
  const ringWidth = 3;
  const innerSize = size - ringWidth * 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {!viewed && (
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 9999 },
          ]}
        />
      )}
      {viewed && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.viewedRing,
            { borderRadius: 9999 },
          ]}
        />
      )}
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: 9999,
            top: ringWidth,
            left: ringWidth,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewedRing: {
    backgroundColor: Colors.borderLight,
  },
  inner: {
    overflow: 'hidden',
    backgroundColor: Colors.bgSecondary,
  },
});
