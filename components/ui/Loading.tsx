import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Radius, Layout } from '../../constants/spacing';

interface GradientButtonProps {
  colors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  children: React.ReactNode;
}

export function GradientButton({
  colors = Colors.gradientPrimary,
  style,
  children,
}: GradientButtonProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, style }: SkeletonProps) {
  return (
    <View
      style={[
        styles.skeleton,
        { width, height },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Layout.cardPadding,
  },
  skeleton: {
    backgroundColor: Colors.bgGlassLight,
    borderRadius: Radius.sm,
  },
});
