import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { notificationApi } from '../../lib/services';
import { Colors } from '../../constants/colors';
import { onNotificationNew } from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/ui/Avatar';

const NOTIF_ICONS: Record<string, { icon: string; color: string }> = {
  follow: { icon: 'person-add', color: '#14B8A6' },
  match: { icon: 'heart', color: '#FF6B9D' },
  message: { icon: 'chatbubble', color: '#3B82F6' },
  booking: { icon: 'calendar', color: '#F59E0B' },
  story: { icon: 'camera', color: '#8B5CF6' },
  system: { icon: 'notifications', color: '#64748B' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (p = 1, refresh = false) => {
    try {
      const { data } = await notificationApi.getNotifications(p);
      if (data?.success) {
        if (refresh) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }
        setHasMore(data.notifications.length === 20);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1, true);

    const unsub = onNotificationNew((newNotif) => {
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)]);
    });

    return () => {
      unsub();
    };
  }, [fetchNotifications]);

  const handleRefresh = () => { setRefreshing(true); setPage(1); fetchNotifications(1, true); };
  const handleEndReached = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchNotifications(next);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      useAuthStore.getState().setNotificationCount(0);
    } catch {}
  };

  const handlePressNotification = async (notif: any) => {
    if (!notif.is_read) {
      try { await notificationApi.markRead(notif.id); } catch {}
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    // Navigate based on type
    const data = notif.data ? (typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data) : {};
    if (notif.type === 'follow' && data.followerId) {
      router.push(`/companion/${data.followerId}`);
    } else if (notif.type === 'message') {
      router.push('/messages' as any);
    } else if (notif.type === 'booking') {
      router.push('/companion/history' as any);
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    const notifType = NOTIF_ICONS[item.type] || NOTIF_ICONS.system;
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
    const notifData = item.data ? (typeof item.data === 'string' ? JSON.parse(item.data) : item.data) : {};
    const senderUserId = notifData.senderId || notifData.followerId || notifData.fromUserId || notifData.sender_id || null;
    const senderAvatar =
      notifData.senderAvatar ||
      notifData.followerAvatar ||
      notifData.sender_avatar ||
      notifData.avatar_url ||
      notifData.avatar ||
      null;

    return (
      <TouchableOpacity
        style={[styles.notifRow, !item.is_read && styles.unread]}
        onPress={() => handlePressNotification(item)}
      >
        <View style={styles.avatarWrapper}>
          <Avatar uri={senderAvatar} userId={senderUserId || undefined} size="md" />
          <View style={[styles.miniTypeBadge, { backgroundColor: notifType.color }]}>
            <Ionicons name={notifType.icon as any} size={10} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{timeAgo}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={56} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>When someone follows you or interacts with your content, you'll see it here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: Colors.textPrimary },
  markAllBtn: { padding: 8 },
  markAllText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.primary },
  list: { paddingVertical: 4 },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  unread: { backgroundColor: Colors.primarySoft },
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
  notifContent: { flex: 1, marginLeft: 12 },
  notifTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: Colors.textPrimary },
  notifBody: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  notifTime: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textTertiary, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 8,
  },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: Colors.textPrimary, marginTop: 16 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textTertiary, textAlign: 'center', marginTop: 8 },
});
