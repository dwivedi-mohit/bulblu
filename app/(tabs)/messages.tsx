import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Badge';
import { matchApi } from '../../lib/services';
import { Match, User } from '../../types/database';
import { useAuthStore } from '../../stores/authStore';

interface Conversation {
  id: string;
  partner: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export default function MessagesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      const { data: matches } = await matchApi.getMatches();
      if (!matches || !user) return;

      const mapped: Conversation[] = matches
        .filter((m: any) => m.is_active)
        .map((m: any) => {
          const partner = m.user_a_id === user.id ? m.user_b : m.user_a;
          if (!partner) return null;

          const lastMsg = m.last_message;
          return {
            id: m.id,
            partner,
            lastMessage: lastMsg?.content ?? '',
            lastMessageTime: lastMsg?.created_at ?? m.matched_at,
            unreadCount: m.unread_count ?? 0,
            isOnline: partner.is_online,
          };
        })
        .filter(Boolean) as Conversation[];

      setConversations(mapped);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }, [fetchMatches]);

  const handleConversationPress = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const unmessagedCount = conversations.filter((c) => !c.lastMessage).length;

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => handleConversationPress(item.id)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.partner.avatar_url} size="md" showOnline={item.isOnline} />

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text
            style={[styles.name, item.unreadCount > 0 && styles.nameBold]}
            numberOfLines={1}
          >
            {item.partner.full_name}
          </Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(item.lastMessageTime), { addSuffix: false })}
          </Text>
        </View>

        <View style={styles.conversationFooter}>
          <Text
            style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessage || 'Start a conversation...'}
          </Text>
          {item.unreadCount > 0 && <Badge count={item.unreadCount} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Messages</Text>
          {unreadTotal > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadText}>{unreadTotal} unread</Text>
            </View>
          )}
        </View>
      </View>

      {unmessagedCount > 0 && (
        <View style={styles.goalBanner}>
          <Ionicons name="flame" size={16} color={Colors.accentYellow} />
          <Text style={styles.goalText}>
            {unmessagedCount} match{unmessagedCount > 1 ? 'es' : ''} waiting — send a message!
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : conversations.length === 0 ? (
        <EmptyState
          useMascot
          title="No conversations yet"
          description="Start swiping to match and chat with new friends!"
        />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.heading,
  },
  unreadPill: {
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  unreadText: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
  },
  goalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  goalText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingBottom: Spacing.xl,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.bgSecondary,
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  conversationContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...Typography.bodyMedium,
    flex: 1,
    marginRight: Spacing.sm,
    color: Colors.textPrimary,
  },
  nameBold: {
    fontWeight: '700',
  },
  timestamp: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    ...Typography.caption,
    color: Colors.textTertiary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  lastMessageUnread: {
    color: Colors.textSecondary,
  },
});
