import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Layout } from '../../constants/spacing';

interface GlassCardProps {
  variant?: 'default' | 'elevated' | 'inset';
  blur?: number;
  opacity?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({
  variant = 'default',
  children,
  style,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'inset' && styles.inset,
        style,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgSecondary,
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inset: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.bgTertiary,
  },
  inner: {
    padding: Layout.cardPadding,
  },
});
