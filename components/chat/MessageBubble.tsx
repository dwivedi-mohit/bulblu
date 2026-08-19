import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, CheckCheck } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp: string;
  isRead?: boolean;
  messageType?: 'text' | 'image';
  imageUrl?: string;
}

export function MessageBubble({
  content,
  isOwn,
  timestamp,
  isRead = false,
  messageType = 'text',
  imageUrl,
}: MessageBubbleProps) {
  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      <View style={styles.wrapper}>
        {messageType === 'image' && imageUrl ? (
          <Image source={{ uri: imageUrl }} style={[styles.image, isOwn && styles.imageOwn]} />
        ) : isOwn ? (
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bubbleOwn}
          >
            <Text style={styles.textOwn}>{content}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.bubbleOther}>
            <Text style={styles.textOther}>{content}</Text>
          </View>
        )}
        <View style={[styles.meta, isOwn && styles.metaOwn]}>
          <Text style={styles.timestamp}>{timestamp}</Text>
          {isOwn && (
            isRead ? (
              <CheckCheck size={14} color={Colors.accentBlue} />
            ) : (
              <Check size={14} color={Colors.textTertiary} />
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  wrapper: {
    maxWidth: '75%',
  },
  bubbleOwn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderBottomRightRadius: Radius.sm,
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: Radius.sm,
  },
  textOwn: {
    ...Typography.body,
    color: '#FFFFFF',
  },
  textOther: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  imageOwn: {
    borderBottomLeftRadius: Radius.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  metaOwn: {
    justifyContent: 'flex-end',
  },
  timestamp: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
  },
});
