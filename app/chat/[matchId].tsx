import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Video } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Avatar } from '../../components/ui/Avatar';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { messageApi } from '../../lib/services';
import {
  sendMessage as socketSendMessage,
  joinMatch,
  leaveMatch,
  onNewMessage,
  onTypingStart,
  onTypingStop,
  startTyping,
  stopTyping,
} from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';

interface ChatMessage {
  id: string;
  content: string;
  isOwn: boolean;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'image';
  imageUrl?: string;
  senderId: string;
}

const PAGE_SIZE = 30;

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!matchId) return;

    (async () => {
      try {
        const { data: raw } = await messageApi.getMessages(matchId, 0);
        if (!raw) return;
        const mapped: ChatMessage[] = raw.map((m: any) => ({
          id: m.id,
          content: m.content,
          isOwn: m.sender_id === userId,
          timestamp: new Date(m.created_at),
          isRead: m.is_read,
          messageType: m.message_type === 'image' ? 'image' : 'text',
          imageUrl: m.media_url ?? undefined,
          senderId: m.sender_id,
        }));
        setMessages(mapped);
        if (raw.length < PAGE_SIZE) setHasMore(false);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();

    joinMatch(matchId);
    return () => {
      leaveMatch(matchId);
    };
  }, [matchId, userId]);

  useEffect(() => {
    if (!matchId || !userId) return;

    const unsubMsg = onNewMessage((data: any) => {
      if (data.matchId !== matchId) return;
      const incoming: ChatMessage = {
        id: data.id ?? Date.now().toString(),
        content: data.content,
        isOwn: data.senderId === userId,
        timestamp: new Date(data.created_at ?? Date.now()),
        isRead: data.is_read ?? false,
        messageType: data.message_type === 'image' ? 'image' : 'text',
        imageUrl: data.media_url ?? undefined,
        senderId: data.senderId,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const unsubTypingStart = onTypingStart((data: any) => {
      if (data.matchId === matchId && data.userId !== userId) {
        setIsTyping(true);
      }
    });

    const unsubTypingStop = onTypingStop((data: any) => {
      if (data.matchId === matchId && data.userId !== userId) {
        setIsTyping(false);
      }
    });

    return () => {
      unsubMsg();
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [matchId, userId]);

  useEffect(() => {
    if (matchId && messages.length > 0) {
      messageApi.markRead(matchId).catch(() => {});
    }
  }, [matchId, messages.length]);

  const loadMore = useCallback(async () => {
    if (!matchId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data: raw } = await messageApi.getMessages(matchId, nextPage);
      if (!raw) return;
      const mapped: ChatMessage[] = raw.map((m: any) => ({
        id: m.id,
        content: m.content,
        isOwn: m.sender_id === userId,
        timestamp: new Date(m.created_at),
        isRead: m.is_read,
        messageType: m.message_type === 'image' ? 'image' : 'text',
        imageUrl: m.media_url ?? undefined,
        senderId: m.sender_id,
      }));
      setMessages((prev) => [...mapped, ...prev]);
      setPage(nextPage);
      if (raw.length < PAGE_SIZE) setHasMore(false);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [matchId, page, loadingMore, hasMore, userId]);

  const handleSend = useCallback(
    (text: string) => {
      if (!matchId || !userId) return;

      messageApi.sendMessage(matchId, text).then(({ data }) => {
        const newMessage: ChatMessage = {
          id: data?.id ?? Date.now().toString(),
          content: text,
          isOwn: true,
          timestamp: new Date(),
          isRead: false,
          messageType: 'text',
          senderId: userId,
        };
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }).catch(() => {});

      socketSendMessage(matchId, text, userId);

      stopTyping(matchId, userId);
    },
    [matchId, userId],
  );

  const handleTyping = useCallback(() => {
    if (!matchId || !userId) return;
    startTyping(matchId, userId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(matchId, userId);
    }, 2000);
  }, [matchId, userId]);

  const handleImagePick = useCallback(() => {
    // Placeholder for image picker
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <MessageBubble
      content={item.content}
      isOwn={item.isOwn}
      timestamp={formatTime(item.timestamp)}
      isRead={item.isRead}
      messageType={item.messageType}
      imageUrl={item.imageUrl}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Avatar uri={null} size="sm" showOnline />

          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>User</Text>
            <Text style={styles.headerStatus}>Offline</Text>
          </View>

          <TouchableOpacity style={styles.videoButton} activeOpacity={0.5}>
            <Video size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            inverted
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: Spacing.md }} />
              ) : null
            }
          />
        )}

        {isTyping && <TypingIndicator name="User" />}

        <ChatInput onSend={handleSend} onImagePick={handleImagePick} onTyping={handleTyping} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: Colors.bgSecondary,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerName: {
    ...Typography.bodyBold,
  },
  headerStatus: {
    ...Typography.tabBar,
    color: Colors.textTertiary,
  },
  videoButton: {
    padding: Spacing.sm,
    opacity: 0.5,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  messageList: {
    paddingVertical: Spacing.base,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
