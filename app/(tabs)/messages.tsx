import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { DisplayName } from '../../components/ui/UserText';
import { matchApi } from '../../lib/services';
import { Match, User } from '../../types/database';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/callStore';
import {
  onNewMessage,
  onNotificationNew,
  joinPersonalRoom,
  identifyUser,
  onSocketConnect,
  onTypingStart,
  onTypingStop,
} from '../../lib/socket';

interface Conversation {
  id: string;
  partner: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  isFavorite?: boolean;
  hasCallHistory?: boolean;
  isTyping?: boolean;
  lastMessageIsMine?: boolean;
  lastMessageIsRead?: boolean;
}

type FilterType = 'all' | 'unread' | 'favorites' | 'calls';

function formatCleanTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  } catch {
    return '';
  }
}

export default function MessagesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const startCall = useCallStore((s) => s.startCall);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    AsyncStorage.getItem('pinned_conversations').then((val) => {
      if (val) {
        try {
          setPinnedIds(JSON.parse(val));
        } catch {}
      }
    });
    AsyncStorage.getItem('muted_conversations').then((val) => {
      if (val) {
        try {
          setMutedIds(JSON.parse(val));
        } catch {}
      }
    });
  }, []);

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const isPinned = prev.includes(id);
      const updated = isPinned ? prev.filter((p) => p !== id) : [...prev, id];
      AsyncStorage.setItem('pinned_conversations', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const toggleMute = (id: string) => {
    setMutedIds((prev) => {
      const isMuted = prev.includes(id);
      const updated = isMuted ? prev.filter((m) => m !== id) : [...prev, id];
      AsyncStorage.setItem('muted_conversations', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const handleOpenContextMenu = (c: Conversation) => {
    setSelectedConversation(c);
    setShowContextModal(true);
  };

  const fetchMatches = useCallback(async () => {
    try {
      const res: any = await matchApi.getMatches();
      const rawMatches: any[] = Array.isArray(res?.data?.matches)
        ? res.data.matches
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.matches)
        ? res.matches
        : [];

      if (!user) return;

      const mapped: Conversation[] = rawMatches
        .filter((m: any) => m.is_active !== false)
        .map((m: any) => {
          const partner = m.partner || (m.user_a_id === user.id ? m.user_b : m.user_a);
          if (!partner) return null;

          const matchIdStr = String(m.id || m.match_id);
          const lastMsg = m.last_message;
          const content = typeof lastMsg === 'string' ? lastMsg : (lastMsg?.content ?? '');
          const msgType = typeof lastMsg === 'object' ? lastMsg?.message_type ?? 'text' : 'text';
          const senderId = typeof lastMsg === 'object' ? lastMsg?.sender_id : undefined;
          const isRead = typeof lastMsg === 'object' ? !!lastMsg?.is_read : true;
          const isPinned = pinnedIds.includes(matchIdStr) || !!(partner.is_verified || partner.is_companion || m.is_favorite);

          return {
            id: matchIdStr,
            partner,
            lastMessage: content,
            lastMessageTime: lastMsg?.created_at ?? m.matched_at ?? new Date().toISOString(),
            unreadCount: m.unread_count ?? 0,
            isOnline: !!partner.is_online,
            messageType: msgType,
            isFavorite: isPinned,
            hasCallHistory: true,
            isTyping: false,
            lastMessageIsMine: senderId === user.id,
            lastMessageIsRead: isRead,
          };
        })
        .filter(Boolean) as Conversation[];

      setConversations(mapped);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user, pinnedIds]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id);
      joinPersonalRoom(user.id);
    }

    const unsubConnect = onSocketConnect(() => {
      if (user?.id) {
        identifyUser(user.id);
        joinPersonalRoom(user.id);
      }
      fetchMatches();
    });

    const handleIncomingMsg = (msg: any) => {
      if (!user) return;
      const matchId = msg.matchId || msg.match_id;
      if (!matchId) return;

      const senderId = msg.senderId || msg.sender_id;
      const content = msg.content || '';
      const createdAt = msg.created_at || new Date().toISOString();
      const msgType = msg.message_type || msg.messageType || 'text';

      setConversations((prev) => {
        const idx = prev.findIndex((c) => String(c.id) === String(matchId));
        if (idx === -1) {
          fetchMatches();
          return prev;
        }
        const updated = [...prev];
        const current = updated[idx];
        updated[idx] = {
          ...current,
          lastMessage: content,
          lastMessageTime: createdAt,
          unreadCount: senderId !== user.id ? current.unreadCount + 1 : current.unreadCount,
          messageType: msgType,
          isTyping: false,
          lastMessageIsMine: senderId === user.id,
          lastMessageIsRead: senderId === user.id ? false : true,
        };
        const [moved] = updated.splice(idx, 1);
        return [moved, ...updated];
      });
    };

    const unsubMsg = onNewMessage(handleIncomingMsg);

    const unsubTypingStart = onTypingStart((data: any) => {
      const incomingMatchId = data.matchId || data.match_id;
      if (incomingMatchId && data.userId !== user?.id) {
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(incomingMatchId) ? { ...c, isTyping: true } : c
          )
        );
      }
    });

    const unsubTypingStop = onTypingStop((data: any) => {
      const incomingMatchId = data.matchId || data.match_id;
      if (incomingMatchId && data.userId !== user?.id) {
        setConversations((prev) =>
          prev.map((c) =>
            String(c.id) === String(incomingMatchId) ? { ...c, isTyping: false } : c
          )
        );
      }
    });

    const unsubNotif = onNotificationNew((notif) => {
      if (notif.type === 'message' && notif.data) {
        const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
        if (data.matchId) {
          handleIncomingMsg({
            matchId: data.matchId,
            senderId: data.senderId,
            content: notif.body?.split(': ')[1] || notif.body || '',
            created_at: notif.created_at || new Date().toISOString(),
          });
        }
      }
    });

    return () => {
      unsubConnect();
      unsubMsg();
      unsubTypingStart();
      unsubTypingStop();
      unsubNotif();
    };
  }, [user, fetchMatches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }, [fetchMatches]);

  const handleConversationPress = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  const handleQuickCall = (conversation: Conversation, type: 'voice' | 'video') => {
    startCall(
      {
        id: conversation.partner.id,
        name: conversation.partner.full_name || 'Companion',
        avatar: conversation.partner.avatar_url || undefined,
        matchId: conversation.id,
      },
      type
    );
  };

  // Filter, Search & Favorite Sorting Logic
  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter((c) => {
      const partnerName = c.partner.full_name?.toLowerCase() || '';
      const lastMsgText = c.lastMessage.toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || partnerName.includes(q) || lastMsgText.includes(q);
      if (!matchesSearch) return false;

      if (activeFilter === 'unread') return c.unreadCount > 0;
      if (activeFilter === 'favorites') return !!c.isFavorite;
      if (activeFilter === 'calls') return !!c.hasCallHistory;

      return true;
    });

    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });
  }, [conversations, searchQuery, activeFilter]);

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const onlineTotal = conversations.filter((c) => c.isOnline).length;
  const favoritesTotal = conversations.filter((c) => c.isFavorite).length;
  const callsTotal = conversations.filter((c) => c.hasCallHistory).length;

  const renderReadReceiptIcon = (item: Conversation) => {
    if (!item.lastMessageIsMine) return null;
    if (item.lastMessageIsRead) {
      return (
        <Ionicons
          name="checkmark-done"
          size={15}
          color="#0D9488"
          style={{ marginRight: 4 }}
        />
      );
    }
    return (
      <Ionicons
        name="checkmark"
        size={15}
        color="#94A3B8"
        style={{ marginRight: 4 }}
      />
    );
  };

  const renderLastMessageContent = (item: Conversation) => {
    if (item.isTyping) {
      return (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>typing</Text>
          <View style={styles.typingDotsWrap}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
          </View>
        </View>
      );
    }

    if (item.messageType === 'image') {
      return (
        <View style={styles.mediaLabelRow}>
          {renderReadReceiptIcon(item)}
          <Ionicons name="camera" size={14} color="#0F766E" />
          <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}>
            Photo message
          </Text>
        </View>
      );
    }
    if (item.messageType === 'video') {
      return (
        <View style={styles.mediaLabelRow}>
          {renderReadReceiptIcon(item)}
          <Ionicons name="videocam" size={14} color="#D97706" />
          <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}>
            Video message
          </Text>
        </View>
      );
    }
    if (item.messageType === 'audio') {
      return (
        <View style={styles.mediaLabelRow}>
          {renderReadReceiptIcon(item)}
          <Ionicons name="mic" size={14} color="#EC4899" />
          <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}>
            Voice note
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.mediaLabelRow}>
        {renderReadReceiptIcon(item)}
        <Text
          style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]}
          numberOfLines={1}
        >
          {item.lastMessage || 'Start a conversation...'}
        </Text>
      </View>
    );
  };

  const renderConversationCard = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationCard,
        item.unreadCount > 0 && styles.conversationCardUnread,
        item.isFavorite && styles.conversationCardFavorite,
      ]}
      onPress={() => handleConversationPress(item.id)}
      onLongPress={() => handleOpenContextMenu(item)}
      activeOpacity={0.8}
    >
      {/* Left Avatar with Ring & Pinned Star Badge */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          router.push(`/companion/${item.partner.id || 'comp-1'}`);
        }}
        activeOpacity={0.8}
        style={styles.avatarWrap}
      >
        <Avatar uri={item.partner.avatar_url} userId={item.partner.id} size="md" showOnline={true} isOnline={item.isOnline} />

        {item.isFavorite && (
          <View style={styles.favoriteStarBadge}>
            <Ionicons name="star" size={9} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Main Info */}
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <DisplayName
            userId={item.partner.id}
            fallback={item.partner.full_name}
            style={[styles.name, item.unreadCount > 0 && styles.nameBold]}
            numberOfLines={1}
          />
          <Text style={styles.timestamp}>
            {formatCleanTimestamp(item.lastMessageTime)}
          </Text>
        </View>

        <View style={styles.conversationFooter}>
          {renderLastMessageContent(item)}

          {item.unreadCount > 0 && (
            <LinearGradient
              colors={['#0F766E', '#0D9488']}
              style={styles.unreadBadgeGradient}
            >
              <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Background Soft Pastel Ambient Glow Orbs */}
      <View style={styles.ambientOrb1} />
      <View style={styles.ambientOrb2} />

      {/* Header Banner */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Messages</Text>
          {unreadTotal > 0 && (
            <LinearGradient
              colors={['#0F766E', '#0D9488']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.unreadPill}
            >
              <Text style={styles.unreadText}>{unreadTotal} Unread</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.headerRight}>
          {onlineTotal > 0 && (
            <View style={styles.onlineBadgePill}>
              <View style={styles.onlineDotPulse} />
              <Text style={styles.onlineBadgeText}>{onlineTotal} Online</Text>
            </View>
          )}
        </View>
      </View>

      {/* Top "Active Match & Companions" Story Carousel */}
      <View style={styles.storySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storyScrollContent}
        >
          {/* Add Match Circle */}
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#0F766E', '#14B8A6']}
              style={styles.addStoryRing}
            >
              <View style={styles.addStoryInner}>
                <Ionicons name="add" size={22} color="#0F766E" />
              </View>
            </LinearGradient>
            <Text style={styles.storyName} numberOfLines={1}>
              Find Match
            </Text>
          </TouchableOpacity>

          {/* Matches & Active Story Items */}
          {conversations.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.storyItem}
              onPress={() => handleConversationPress(c.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  c.isOnline
                    ? ['#10B981', '#0F766E', '#34D399']
                    : c.unreadCount > 0
                    ? ['#F43F5E', '#EC4899', '#FB7185']
                    : ['#CBD5E1', '#E2E8F0', '#94A3B8']
                }
                style={styles.storyRing}
              >
                <View style={styles.storyAvatarWrap}>
                  <Avatar uri={c.partner.avatar_url} userId={c.partner.id} size="md" />
                </View>
              </LinearGradient>

              {c.isOnline && <View style={styles.storyOnlineBadge} />}

              <Text style={styles.storyName} numberOfLines={1}>
                {c.partner.full_name?.split(' ')[0] || 'User'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar & Quick Filters */}
      <View style={styles.filterSection}>
        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages or companions..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Quick Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.chipText, activeFilter === 'all' && styles.chipTextActive]}>
              All ({conversations.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'unread' && styles.filterChipActive]}
            onPress={() => setActiveFilter('unread')}
          >
            <Text style={[styles.chipText, activeFilter === 'unread' && styles.chipTextActive]}>
              Unread ({unreadTotal})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'favorites' && styles.filterChipActive]}
            onPress={() => setActiveFilter('favorites')}
          >
            <Text style={[styles.chipText, activeFilter === 'favorites' && styles.chipTextActive]}>
              Favorites ({favoritesTotal})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'calls' && styles.filterChipActive]}
            onPress={() => setActiveFilter('calls')}
          >
            <Text style={[styles.chipText, activeFilter === 'calls' && styles.chipTextActive]}>
              Call History ({callsTotal})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Conversation List / Luxury 3D Mascot Empty State */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require('../../assets/images/3d_messages_mascot.jpg')}
            style={styles.mascotImage}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching conversations' : 'No Messages Yet'}
          </Text>
          <Text style={styles.emptyDesc}>
            {searchQuery
              ? 'Try typing a different name or keyword search.'
              : 'Match with companions to start instant voice, video, and text chats!'}
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.push('/(tabs)/explore')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#0F766E', '#14B8A6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.exploreBtnGradient}
            >
              <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.exploreBtnText}>Discover Companions</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationCard}
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

      {/* Apple iOS 18 Luxury Bottom Sheet Action Modal */}
      <Modal
        visible={showContextModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContextModal(false)}
      >
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowContextModal(false)}
        >
          <TouchableOpacity style={styles.bottomSheetCard} activeOpacity={1}>
            {/* Top Grab Handle */}
            <View style={styles.sheetHandle} />

            {/* Selected Companion Profile Header */}
            {selectedConversation && (
              <View style={styles.sheetHeader}>
                <Avatar
                  uri={selectedConversation.partner.avatar_url}
                  userId={selectedConversation.partner.id}
                  size="md"
                  showOnline={selectedConversation.isOnline}
                />
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <DisplayName
                    userId={selectedConversation.partner.id}
                    fallback={selectedConversation.partner.full_name}
                    style={styles.sheetName}
                  />
                  <Text style={styles.sheetSub}>
                    {selectedConversation.isOnline ? 'Active & Online Now' : 'Offline'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.sheetDivider} />

            {/* Action Row 1: Pin / Favorite */}
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => {
                if (selectedConversation) togglePin(selectedConversation.id);
                setShowContextModal(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={selectedConversation?.isFavorite ? 'star' : 'pin-outline'}
                size={20}
                color="#0F766E"
                style={styles.sheetIcon}
              />
              <Text style={styles.sheetActionText}>
                {selectedConversation?.isFavorite ? 'Unpin Conversation' : 'Pin Conversation'}
              </Text>
            </TouchableOpacity>

            {/* Action Row 2: Mute / Unmute */}
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => {
                if (selectedConversation) toggleMute(selectedConversation.id);
                setShowContextModal(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  selectedConversation && mutedIds.includes(selectedConversation.id)
                    ? 'notifications-outline'
                    : 'notifications-off-outline'
                }
                size={20}
                color="#475569"
                style={styles.sheetIcon}
              />
              <Text style={styles.sheetActionText}>
                {selectedConversation && mutedIds.includes(selectedConversation.id)
                  ? 'Unmute Notifications'
                  : 'Mute Notifications'}
              </Text>
            </TouchableOpacity>

            {/* Action Row 3: Start Voice Call */}
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => {
                if (selectedConversation) {
                  setShowContextModal(false);
                  handleQuickCall(selectedConversation, 'voice');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={20} color="#475569" style={styles.sheetIcon} />
              <Text style={styles.sheetActionText}>Voice Call</Text>
            </TouchableOpacity>

            {/* Action Row 4: Start Video Call */}
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => {
                if (selectedConversation) {
                  setShowContextModal(false);
                  handleQuickCall(selectedConversation, 'video');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="videocam-outline" size={20} color="#475569" style={styles.sheetIcon} />
              <Text style={styles.sheetActionText}>Video Call</Text>
            </TouchableOpacity>

            {/* Action Row 5: View Profile */}
            <TouchableOpacity
              style={styles.sheetActionRow}
              onPress={() => {
                if (selectedConversation?.partner?.id) {
                  setShowContextModal(false);
                  router.push(`/companion/${selectedConversation.partner.id}`);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={20} color="#475569" style={styles.sheetIcon} />
              <Text style={styles.sheetActionText}>View Profile</Text>
            </TouchableOpacity>

            {/* Action Row 6: Delete Conversation */}
            <TouchableOpacity
              style={[styles.sheetActionRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                if (selectedConversation) {
                  setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
                  setShowContextModal(false);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" style={styles.sheetIcon} />
              <Text style={[styles.sheetActionText, { color: '#EF4444' }]}>Delete Chat</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  ambientOrb1: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(204, 251, 241, 0.45)',
  },
  ambientOrb2: {
    position: 'absolute',
    top: 180,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(254, 243, 199, 0.35)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    color: '#0F172A',
  },
  unreadPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginLeft: 6,
  },
  unreadText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  onlineDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  onlineBadgeText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 11,
    color: '#047857',
  },

  /* Story Carousel */
  storySection: {
    paddingVertical: 10,
  },
  storyScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
    position: 'relative',
  },
  addStoryRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.5,
  },
  addStoryInner: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.5,
  },
  storyAvatarWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyOnlineBadge: {
    position: 'absolute',
    top: 42,
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storyName: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
  },

  /* Search & Filters */
  filterSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.6)',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13.5,
    color: '#0F172A',
  },
  chipsScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6.5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.8)',
  },
  filterChipActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  chipText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12,
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Chat Cards */
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl + 40,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 13,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#0F766E',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  conversationCardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(15, 118, 110, 0.35)',
    borderLeftWidth: 4,
    borderLeftColor: '#0F766E',
  },
  conversationCardFavorite: {
    borderColor: 'rgba(217, 119, 6, 0.35)',
  },
  avatarWrap: {
    marginRight: 12,
    position: 'relative',
  },
  favoriteStarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D97706',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 15,
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  nameBold: {
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#0F766E',
  },
  timestamp: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#94A3B8',
  },
  conversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  lastMessage: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  lastMessageUnread: {
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#0F172A',
  },

  /* Real-time Typing Dots */
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  typingText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12.5,
    color: '#0F766E',
    fontStyle: 'italic',
  },
  typingDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0F766E',
  },

  unreadBadgeGradient: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  unreadBadgeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  /* Empty State Mascot Container */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  mascotImage: {
    width: 140,
    height: 140,
    marginBottom: Spacing.md,
    borderRadius: 24,
  },
  emptyTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 19,
  },
  exploreBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    shadowColor: '#0F766E',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  exploreBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  exploreBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },

  /* Apple iOS 18 Bottom Sheet Modal */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: '#0F172A',
  },
  sheetSub: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sheetIcon: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  sheetActionText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 15,
    color: '#1E293B',
  },
});
