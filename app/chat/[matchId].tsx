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
  Keyboard,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, Phone } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Avatar } from '../../components/ui/Avatar';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { MediaAttachmentModal, AttachmentResult } from '../../components/chat/MediaAttachmentModal';
import { CallType } from '../../components/call/CallModal';
import { useCallStore } from '../../stores/callStore';
import { messageApi, matchApi } from '../../lib/services';
import { api, uploadFile } from '../../lib/api';
import {
  sendMessage as socketSendMessage,
  joinMatch,
  leaveMatch,
  onNewMessage,
  onTypingStart,
  onTypingStop,
  startTyping,
  stopTyping,
  onPresenceOnline,
  onPresenceOffline,
  checkPresence,
  identifyUser,
  joinPersonalRoom,
  onSocketConnect,
} from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';
import { DisplayName, useCachedProfile } from '../../components/ui/UserText';

interface ChatMessage {
  id: string;
  content: string;
  isOwn: boolean;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  senderId: string;
}

const PAGE_SIZE = 30;

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [partner, setPartner] = useState<any | null>(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

  // Keyboard height listener for seamless Android & iOS elevation
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const live = useCachedProfile(partner?.id);
  const partnerName = live?.full_name || partner?.full_name || 'User';

  // 1. Initial Messages Fetch & Socket Connection
  useEffect(() => {
    if (!matchId) return;

    (async () => {
      try {
        const res: any = await messageApi.getMessages(matchId, 0);
        const rawList: any[] = Array.isArray(res?.data?.messages)
          ? res.data.messages
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.messages)
          ? res.messages
          : [];

        const mapped: ChatMessage[] = rawList.map((m: any) => ({
          id: m.id,
          content: m.content || '',
          isOwn: m.sender_id === userId,
          timestamp: new Date(m.created_at),
          isRead: m.is_read,
          messageType: m.message_type || (m.media_url ? 'image' : 'text'),
          mediaUrl: m.media_url ?? undefined,
          fileName: m.file_name ?? undefined,
          fileSize: m.file_size ?? undefined,
          duration: m.duration ?? undefined,
          senderId: m.sender_id,
        }));
        setMessages(mapped);
        if (rawList.length < PAGE_SIZE) setHasMore(false);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();

    joinMatch(matchId);
    if (userId) {
      identifyUser(userId);
      joinPersonalRoom(userId);
    }

    const unsubConnect = onSocketConnect(() => {
      joinMatch(matchId);
      if (userId) {
        identifyUser(userId);
        joinPersonalRoom(userId);
      }
    });

    return () => {
      leaveMatch(matchId);
      unsubConnect();
    };
  }, [matchId, userId]);

  // 2. Fetch Partner Profile
  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await matchApi.getMatches();
        const list: any[] = (data as any)?.matches ?? (Array.isArray(data) ? data : []);
        const found = list.find((m) => String(m.match_id ?? m.id) === String(matchId));
        if (!cancelled && found?.partner) setPartner(found.partner);
      } catch {
        // fallback to defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // 3. Online Presence
  useEffect(() => {
    const partnerId = partner?.id;
    if (!partnerId) return;

    const unsubOnline = onPresenceOnline((uid) => {
      if (uid === partnerId) setIsPartnerOnline(true);
    });
    const unsubOffline = onPresenceOffline((uid) => {
      if (uid === partnerId) setIsPartnerOnline(false);
    });
    checkPresence(partnerId);

    return () => {
      unsubOnline();
      unsubOffline();
    };
  }, [partner?.id]);

  // 4. Real-time Messages & Typing Stream
  useEffect(() => {
    if (!matchId || !userId) return;

    joinMatch(String(matchId));

    const unsubConnect = onSocketConnect(() => {
      identifyUser(userId);
      joinPersonalRoom(userId);
      joinMatch(String(matchId));
    });

    const unsubMsg = onNewMessage((data: any) => {
      const incomingMatchId = data.matchId || data.match_id;
      if (incomingMatchId && String(incomingMatchId) !== String(matchId)) return;

      const isMine = data.senderId === userId || data.sender_id === userId;
      const incoming: ChatMessage = {
        id: data.id ?? `msg-${Date.now()}-${Math.random()}`,
        content: data.content || '',
        isOwn: isMine,
        timestamp: new Date(data.created_at ?? Date.now()),
        isRead: data.is_read ?? false,
        messageType: data.message_type || (data.media_url ? 'image' : 'text'),
        mediaUrl: data.media_url ?? undefined,
        fileName: data.file_name ?? undefined,
        fileSize: data.file_size ?? undefined,
        duration: data.duration ?? undefined,
        senderId: data.senderId ?? data.sender_id ?? (isMine ? userId : ''),
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        if (
          isMine &&
          prev.some(
            (m) =>
              m.isOwn &&
              m.content === incoming.content &&
              Math.abs(m.timestamp.getTime() - incoming.timestamp.getTime()) < 5000
          )
        ) {
          return prev;
        }
        return [incoming, ...prev];
      });
    });

    const unsubTypingStart = onTypingStart((data: any) => {
      const incomingMatchId = data.matchId || data.match_id;
      if (incomingMatchId && String(incomingMatchId) === String(matchId) && data.userId !== userId) {
        setIsTyping(true);
      }
    });

    const unsubTypingStop = onTypingStop((data: any) => {
      const incomingMatchId = data.matchId || data.match_id;
      if (incomingMatchId && String(incomingMatchId) === String(matchId) && data.userId !== userId) {
        setIsTyping(false);
      }
    });

    return () => {
      leaveMatch(String(matchId));
      unsubConnect();
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
      const rawList: any[] = Array.isArray((raw as any)?.messages)
        ? (raw as any).messages
        : Array.isArray(raw)
        ? raw
        : [];
      if (rawList.length === 0) {
        setHasMore(false);
        return;
      }
      const mapped: ChatMessage[] = rawList.map((m: any) => ({
        id: m.id,
        content: m.content || '',
        isOwn: m.sender_id === userId,
        timestamp: new Date(m.created_at),
        isRead: m.is_read,
        messageType: m.message_type || (m.media_url ? 'image' : 'text'),
        mediaUrl: m.media_url ?? undefined,
        fileName: m.file_name ?? undefined,
        fileSize: m.file_size ?? undefined,
        duration: m.duration ?? undefined,
        senderId: m.sender_id,
      }));
      setMessages((prev) => [...prev, ...mapped]);
      setPage(nextPage);
      if (rawList.length < PAGE_SIZE) setHasMore(false);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [matchId, page, loadingMore, hasMore, userId]);

  // 1. Send Text Message
  const handleSend = useCallback(
    (text: string) => {
      if (!matchId || !userId || !text.trim()) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        content: text.trim(),
        isOwn: true,
        timestamp: new Date(),
        isRead: false,
        messageType: 'text',
        senderId: userId,
      };

      setMessages((prev) => [optimisticMsg, ...prev]);
      socketSendMessage(matchId, text.trim(), userId);
      stopTyping(matchId, userId);

      messageApi
        .sendMessage(matchId, text.trim())
        .then(({ data }) => {
          if (data?.message?.id || data?.id) {
            const savedId = data?.message?.id || data?.id;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...m, id: savedId, timestamp: new Date(data.created_at || m.timestamp) }
                  : m
              )
            );
          }
        })
        .catch((err) => {
          if (err?.response?.status === 429) {
            Alert.alert('Slow Down', 'You are sending messages too fast. Please wait a moment.');
          }
        });
    },
    [matchId, userId],
  );

  // 2. Send Attachment (Image, Video, Document)
  const handleSelectAttachment = async (attachment: AttachmentResult) => {
    if (!matchId || !userId) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      content: '',
      isOwn: true,
      timestamp: new Date(),
      isRead: false,
      messageType: attachment.type,
      mediaUrl: attachment.uri,
      fileName: attachment.name,
      fileSize: attachment.size,
      senderId: userId,
    };

    setMessages((prev) => [optimisticMsg, ...prev]);

    try {
      const { data: uploadData, error: uploadErr } = await uploadFile('/api/upload', attachment.uri);

      const serverUrl = uploadData?.url;
      if (serverUrl) {
        socketSendMessage(matchId, '', userId, serverUrl, attachment.type);
        const { data: dbMsg } = await api<any>(`/api/messages/${matchId}`, {
          method: 'POST',
          body: {
            content: '',
            media_url: serverUrl,
            message_type: attachment.type,
            file_name: attachment.name,
            file_size: attachment.size,
          },
        });

        const savedId = dbMsg?.message?.id || dbMsg?.id;
        if (savedId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, id: savedId, mediaUrl: serverUrl } : m
            )
          );
        }
      } else if (uploadErr) {
        Alert.alert('Upload Error', uploadErr);
      }
    } catch (err: any) {
      console.warn('Attachment upload failed:', err);
    }
  };

  // 3. Send Voice Note
  const handleSendVoiceNote = async (uri: string, durationSeconds: number) => {
    if (!matchId || !userId) return;

    const tempId = `temp-voice-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      content: '',
      isOwn: true,
      timestamp: new Date(),
      isRead: false,
      messageType: 'audio',
      mediaUrl: uri,
      duration: durationSeconds,
      senderId: userId,
    };

    setMessages((prev) => [optimisticMsg, ...prev]);

    try {
      const { data: uploadData } = await uploadFile('/api/upload', uri);
      const serverUrl = uploadData?.url;
      if (serverUrl) {
        socketSendMessage(matchId, '', userId, serverUrl, 'audio');
        const { data: dbMsg } = await api<any>(`/api/messages/${matchId}`, {
          method: 'POST',
          body: {
            content: '',
            media_url: serverUrl,
            message_type: 'audio',
            duration: durationSeconds,
          },
        });

        const savedId = dbMsg?.message?.id || dbMsg?.id;
        if (savedId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, id: savedId, mediaUrl: serverUrl } : m
            )
          );
        }
      }
    } catch (err: any) {
      console.warn('Voice upload failed:', err);
    }
  };

  // 4. Start Call (Voice or Video)
  const handleStartCall = (type: CallType) => {
    if (!matchId || !partner?.id || !userId) return;
    useCallStore.getState().startCall(
      {
        id: partner.id,
        name: partnerName,
        avatar: partner.avatar_url,
        matchId: String(matchId),
      },
      type
    );
  };

  const handleTyping = useCallback(() => {
    if (!matchId || !userId) return;
    startTyping(matchId, userId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(matchId, userId);
    }, 2000);
  }, [matchId, userId]);

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
      mediaUrl={item.mediaUrl}
      fileName={item.fileName}
      fileSize={item.fileSize}
      duration={item.duration}
    />
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#F8FAFC',
          paddingTop: insets.top,
          paddingBottom: Platform.OS === 'ios' ? 0 : keyboardHeight > 0 ? keyboardHeight : insets.bottom,
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {/* Chat Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerUserPress}
            onPress={() => {
              if (partner?.id) router.push(`/companion/${partner.id}`);
            }}
            activeOpacity={0.8}
          >
            <Avatar
              userId={partner?.id}
              uri={partner?.avatar_url ?? null}
              size="sm"
              showOnline={isPartnerOnline}
              isOnline={isPartnerOnline}
            />

            <View style={styles.headerInfo}>
              <DisplayName
                userId={partner?.id}
                fallback={partner?.full_name ?? 'User'}
                style={styles.headerName}
                numberOfLines={1}
              />
              <Text style={[styles.headerStatus, isTyping && styles.headerStatusTyping]}>
                {isTyping ? 'typing...' : isPartnerOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Header Buttons: Voice Call & Video Call */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => handleStartCall('voice')}
              activeOpacity={0.7}
            >
              <Phone size={20} color="#0F766E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => handleStartCall('video')}
              activeOpacity={0.7}
            >
              <Video size={21} color="#0F766E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Stream */}
        {loading ? (
          <ActivityIndicator size="large" color="#0F766E" style={styles.loader} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            inverted
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color="#0F766E" style={{ paddingVertical: Spacing.md }} />
              ) : null
            }
          />
        )}

        {/* Chat Input Dock with Voice Memo & Attachment Trigger */}
        <ChatInput
          onSend={handleSend}
          onSendVoiceNote={handleSendVoiceNote}
          onOpenAttachmentModal={() => setShowAttachmentModal(true)}
          onTyping={handleTyping}
        />

        {/* Media & Documents Attachment Modal */}
        <MediaAttachmentModal
          visible={showAttachmentModal}
          onClose={() => setShowAttachmentModal(false)}
          onSelectAttachment={handleSelectAttachment}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    position: 'relative',
  },
  wallpaperBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  wallpaperOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.55,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerUserPress: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  headerName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  headerStatus: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headerStatusTyping: {
    color: '#0F766E',
    fontFamily: 'SpaceGrotesk-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
  },
  themeBtn: {
    backgroundColor: '#FEFCE8',
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
