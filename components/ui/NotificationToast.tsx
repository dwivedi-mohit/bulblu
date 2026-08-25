import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { NotificationPayload, onNotificationNew } from '../../lib/socket';
import { Avatar } from './Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NOTIF_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  follow: { icon: 'person-add', color: '#0F766E', bg: '#CCFBF1' },
  message: { icon: 'chatbubble-ellipses', color: '#0284C7', bg: '#E0F2FE' },
  match: { icon: 'heart', color: '#E11D48', bg: '#FFE4E6' },
  booking: { icon: 'calendar', color: '#D97706', bg: '#FEF3C7' },
  system: { icon: 'notifications', color: '#7C3AED', bg: '#F3E8FF' },
};

export function NotificationToast() {
  const [activeNotif, setActiveNotif] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const unsub = onNotificationNew((data) => {
      setActiveNotif(data);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setActiveNotif(null);
      }, 4500);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!activeNotif) return null;

  const styleConfig = NOTIF_STYLES[activeNotif.type] || NOTIF_STYLES.system;
  const data = (activeNotif.data || {}) as Record<string, any>;
  const senderUserId = data.senderId || data.followerId || data.fromUserId || data.sender_id || null;
  const senderAvatar = data.senderAvatar || data.followerAvatar || data.sender_avatar || data.avatar_url || data.avatar || null;

  const handlePress = () => {
    const notif = activeNotif;
    setActiveNotif(null);

    if (notif.type === 'follow' && (data.followerId || data.followingId || data.senderId)) {
      router.push(`/companion/${data.followerId || data.followingId || data.senderId}`);
    } else if (notif.type === 'message' && data.matchId) {
      router.push(`/chat/${data.matchId}`);
    } else if (notif.type === 'booking') {
      router.push('/companion/history' as any);
    } else {
      router.push('/notifications' as any);
    }
  };

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(16)}
      exiting={SlideOutUp.duration(250)}
      style={styles.toastContainer}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.toastCard}
      >
        {/* Left Real Sender Avatar with Type Badge */}
        <View style={styles.avatarWrapper}>
          <Avatar uri={senderAvatar} userId={senderUserId || undefined} size="md" />
          <View style={[styles.miniTypeBadge, { backgroundColor: styleConfig.color }]}>
            <Ionicons name={styleConfig.icon as any} size={10} color="#FFFFFF" />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.contentBox}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {activeNotif.title || 'New Notification'}
            </Text>
            <Text style={styles.nowText}>Just now</Text>
          </View>
          <Text style={styles.bodyText} numberOfLines={2}>
            {activeNotif.body}
          </Text>
        </View>

        {/* Close button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setActiveNotif(null);
          }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 14,
    right: 14,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    shadowColor: '#0F766E',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  miniTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  contentBox: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  titleText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  nowText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 10.5,
    color: '#0F766E',
  },
  bodyText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
