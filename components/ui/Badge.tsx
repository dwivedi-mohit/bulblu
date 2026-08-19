import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { MascotFace } from './MascotTabIcon';

interface BadgeProps {
  count: number;
  variant?: 'default' | 'danger';
  style?: ViewStyle;
}

export function Badge({ count, variant = 'danger', style }: BadgeProps) {
  if (count <= 0) return null;

  return (
    <View
      style={[
        styles.badge,
        variant === 'danger' ? styles.danger : styles.default,
        style,
      ]}
    >
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  useMascot?: boolean;
  mascotSize?: number;
}

export function EmptyState({ icon, title, description, action, useMascot = false, mascotSize = 64 }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      {useMascot ? (
        <MascotFace size={mascotSize} />
      ) : icon ? (
        <Ionicons name={icon} size={48} color={Colors.textTertiary} />
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDescription}>{description}</Text>}
      {action && (
        <Text style={styles.emptyAction} onPress={action.onPress}>
          {action.label}
        </Text>
      )}
    </View>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.emptyTitle}>{message}</Text>
      {onRetry && (
        <Text style={styles.emptyAction} onPress={onRetry}>
          Try Again
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  danger: {
    backgroundColor: Colors.error,
  },
  default: {
    backgroundColor: Colors.accentCoral,
  },
  text: {
    ...Typography.tabBar,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['5xl'],
  },
  emptyTitle: {
    ...Typography.subheading,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emptyAction: {
    ...Typography.bodyBold,
    color: Colors.primary,
    marginTop: Spacing.base,
  },
});
