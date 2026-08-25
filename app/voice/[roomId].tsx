import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Dimensions, Share, Alert, FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Room, RoomEvent, Track, type Participant } from 'livekit-client';
import { registerGlobals } from '@livekit/react-native-webrtc';
import { useAuthStore } from '../../stores/authStore';
import { voiceRoomApi } from '../../lib/services';
import { getSocket } from '../../lib/socket';
import { VoiceSeatGrid, VoiceSeat } from '../../components/voice/VoiceSeatGrid';
import { RoomGamesDrawer } from '../../components/voice/RoomGamesDrawer';
import { SoundboardModal } from '../../components/voice/SoundboardModal';
import { WatchTogetherModal } from '../../components/voice/WatchTogetherModal';
import { RoomSettingsModal } from '../../components/voice/RoomSettingsModal';
import { SeatUserActionModal } from '../../components/voice/SeatUserActionModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
registerGlobals();

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  isSystem?: boolean;
  created_at?: string;
}

export default function VoiceRoomScreen() {
  const { roomId, roomTitle } = useLocalSearchParams<{ roomId: string; roomTitle?: string }>();
  const user = useAuthStore((s) => s.user);
  const selfId = user?.id || '';

  const [title, setTitle] = useState(roomTitle || 'Voice Room');
  const [announcement, setAnnouncement] = useState('');
  const [maxSeats, setMaxSeats] = useState(15);
  const [isPrivate, setIsPrivate] = useState(false);
  const [micOrderEnabled, setMicOrderEnabled] = useState(false);
  const [isFollowingRoom, setIsFollowingRoom] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [seats, setSeats] = useState<VoiceSeat[]>([]);
  const isHost = seats[0]?.userId === selfId;
  const mySeat = seats.find((s) => s.userId === selfId);
  const isSeated = !!mySeat;

  const lkRoomRef = useRef<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMyMicMuted, setIsMyMicMuted] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const chatFlatListRef = useRef<FlatList>(null);

  const [gamesDrawerVisible, setGamesDrawerVisible] = useState(false);
  const [soundboardVisible, setSoundboardVisible] = useState(false);
  const [watchTogetherVisible, setWatchTogetherVisible] = useState(false);
  const [roomSettingsVisible, setRoomSettingsVisible] = useState(false);
  const [selectedSeatAction, setSelectedSeatAction] = useState<VoiceSeat | null>(null);

  useEffect(() => {
    if (!roomId || !selfId) return;
    let mounted = true;
    let lkRoom: Room | null = null;

    const connect = async () => {
      try {
        const roomData = await voiceRoomApi.getRoom(roomId!);
        if (!mounted) return;

        setTitle(roomData.topic || 'Voice Room');
        setAnnouncement(roomData.announcement || '');
        setMaxSeats(roomData.max_participants || 50);
        setIsPrivate(!roomData.is_public);

        const dbSeats: VoiceSeat[] = (roomData.seats || []).map((s: any) => ({
          seatIndex: s.seat_index,
          userId: s.user_id,
          name: s.username,
          avatarUrl: s.avatar_url,
          role: s.user_id === roomData.host_id ? 'host' as const : 'speaker' as const,
          isMuted: s.is_muted || false,
          isSpeaking: false,
        }));

        if (!dbSeats.find((s) => s.seatIndex === 0)) {
          dbSeats.unshift({
            seatIndex: 0, userId: roomData.host_id, name: roomData.host_username,
            avatarUrl: roomData.host_avatar, role: 'host', isMuted: false, isSpeaking: false,
          });
        }

        setSeats(dbSeats);
        setParticipantCount(roomData.participants?.length || 0);
        await voiceRoomApi.join(roomId!);

        try {
          const { token, wsUrl } = await voiceRoomApi.getLivekitToken(roomId!);
          lkRoom = new Room();
          lkRoomRef.current = lkRoom;

          lkRoom.on(RoomEvent.Connected, () => {
            if (mounted) setIsConnected(true);
            lkRoom?.localParticipant?.setMicrophoneEnabled(true);
          });

          lkRoom.on(RoomEvent.ParticipantConnected, (p: Participant) => {
            if (!mounted) return;
            setParticipantCount((c) => c + 1);
            setSeats((prev) => {
              if (prev.find((s) => s.userId === p.identity)) return prev;
              return [...prev, {
                seatIndex: prev.length, userId: p.identity, name: p.identity,
                avatarUrl: null, role: 'speaker', isMuted: false, isSpeaking: false,
              }];
            });
          });

          lkRoom.on(RoomEvent.ParticipantDisconnected, (p: Participant) => {
            if (!mounted) return;
            setParticipantCount((c) => Math.max(0, c - 1));
            setSeats((prev) => prev.filter((s) => s.userId !== p.identity));
          });

          lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
            if (!mounted) return;
            const ids = new Set(speakers.map((s) => s.identity));
            setSeats((prev) => prev.map((s) => ({
              ...s, isSpeaking: s.userId ? ids.has(s.userId) : false,
            })));
          });

          await lkRoom.connect(wsUrl, token);
        } catch (audioErr) {
          console.warn('LiveKit unavailable, joining chat-only:', audioErr);
          if (mounted) setIsConnected(true);
        }

        const socket = getSocket();
        socket.emit('voice-room:join', { roomId, userId: selfId });

        try {
          const history = await voiceRoomApi.getChatHistory(roomId!);
          if (mounted) {
            setChatMessages(history.map((m: any) => ({
              id: m.id, senderName: m.username || 'User', text: m.content, created_at: m.created_at,
            })));
          }
        } catch {}
      } catch (e) {
        console.error('Failed to join room:', e);
        Alert.alert('Error', 'Failed to join room');
        router.back();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (lkRoom) {
        lkRoom.localParticipant?.setMicrophoneEnabled(false);
        lkRoom.disconnect();
      }
      getSocket().emit('voice-room:leave', { roomId, userId: selfId });
    };
  }, [roomId, selfId]);

  useEffect(() => {
    if (!roomId) return;
    const s = getSocket();
    const on = (ev: string, fn: (...a: any[]) => void) => { s.on(ev, fn); return () => s.off(ev, fn); };

    const unsubs = [
      on('voice-room:chat', (d: ChatMessage) => setChatMessages((p) => [...p, d])),
      on('voice-room:seat-update', (d: any[]) => {
        setSeats(d.map((s: any) => ({
          seatIndex: s.seat_index, userId: s.user_id, name: s.username, avatarUrl: s.avatar_url,
          role: s.user_id === seats[0]?.userId ? 'host' as const : 'speaker' as const,
          isMuted: s.is_muted || false, isSpeaking: false,
        })));
      }),
      on('voice-room:mute', (d: { userId: string; isMuted: boolean }) => {
        setSeats((p) => p.map((s) => s.userId === d.userId ? { ...s, isMuted: d.isMuted } : s));
      }),
      on('voice-room:role-change', (d: { userId: string; role: string }) => {
        setSeats((p) => p.map((s) => s.userId === d.userId ? { ...s, role: d.role as any } : s));
      }),
      on('voice-room:settings-update', (d: any) => {
        if (d.announcement !== undefined) setAnnouncement(d.announcement);
        if (d.max_participants !== undefined) setMaxSeats(d.max_participants);
        if (d.is_public !== undefined) setIsPrivate(!d.is_public);
      }),
      on('voice-room:game-event', (d: { gameType: string; payload: any }) => {
        setChatMessages((p) => [...p, {
          id: String(Date.now()), senderName: 'Game Master',
          text: `${d.gameType}: ${d.payload.result || ''}`, isSystem: true,
        }]);
      }),
      on('voice-room:soundboard', () => {}),
    ];

    return () => unsubs.forEach((u) => u());
  }, [roomId, seats[0]?.userId]);

  const handleSeatPress = useCallback((seat: VoiceSeat) => {
    if (seat.userId) {
      setSelectedSeatAction(seat);
    } else if (!isSeated) {
      getSocket().emit('voice-room:seat-update', {
        roomId, userId: selfId, seatIndex: seat.seatIndex, action: 'claim',
      });
      setSeats((prev) => [...prev, {
        seatIndex: seat.seatIndex, userId: selfId, name: user?.full_name || 'You',
        avatarUrl: user?.avatar_url || null, role: 'speaker', isMuted: false, isSpeaking: false,
      }]);
    }
  }, [roomId, selfId, isSeated, user]);

  const handleLeaveSeat = useCallback(() => {
    getSocket().emit('voice-room:seat-update', {
      roomId, userId: selfId, seatIndex: mySeat?.seatIndex ?? 0, action: 'release',
    });
    setSeats((prev) => prev.filter((s) => s.userId !== selfId));
  }, [roomId, selfId, mySeat]);

  const toggleMic = useCallback(() => {
    const lk = lkRoomRef.current;
    if (!lk) return;
    const next = !isMyMicMuted;
    lk.localParticipant?.setMicrophoneEnabled(!next);
    setIsMyMicMuted(next);
    getSocket().emit('voice-room:mute', { roomId, userId: selfId, isMuted: next });
    setSeats((p) => p.map((s) => s.userId === selfId ? { ...s, isMuted: next } : s));
  }, [isMyMicMuted, roomId, selfId]);

  const handleSendMessage = useCallback(() => {
    if (!chatInputText.trim()) return;
    getSocket().emit('voice-room:chat', { roomId, userId: selfId, content: chatInputText.trim() });
    setChatMessages((p) => [...p, {
      id: String(Date.now()), senderName: user?.full_name || 'You', text: chatInputText.trim(),
    }]);
    setChatInputText('');
  }, [chatInputText, roomId, selfId, user]);

  const handleLeaveRoom = () => {
    Alert.alert('Leave Room', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C084FC" />
          <Text style={styles.loadingText}>Joining room...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#2D1B4E', '#1A0E2E', '#10081C']} style={styles.gradientBg}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={handleLeaveRoom} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.roomHeaderMeta}>
            <View style={styles.roomTitleRow}>
              <Text style={styles.roomTitleText} numberOfLines={1}>{title}</Text>
              <TouchableOpacity
                onPress={() => setIsFollowingRoom(!isFollowingRoom)}
                style={[styles.heartFollowBtn, isFollowingRoom && styles.heartFollowBtnActive]}
              >
                <Ionicons name="heart" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.roomSubtitleText}>
              {participantCount} participant{participantCount !== 1 ? 's' : ''} · {isConnected ? 'Connected' : 'Connecting...'}
            </Text>
          </View>
          <View style={styles.audienceControlsRow}>
            <TouchableOpacity onPress={() => Share.share({ title, message: `Join "${title}" on Bulblu!` })} style={styles.moreOptionsBtn}>
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRoomSettingsVisible(true)} style={styles.moreOptionsBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {announcement ? (
          <View style={styles.marqueeRow}>
            <View style={styles.eventMarqueePill}>
              <Ionicons name="star" size={12} color="#FDE047" style={{ marginRight: 4 }} />
              <Text style={styles.eventMarqueeText} numberOfLines={1}>{announcement}</Text>
            </View>
          </View>
        ) : null}

        <ScrollView style={styles.stageScroll} contentContainerStyle={styles.stageContent}>
          <VoiceSeatGrid seats={seats} currentUserId={selfId} isHost={isHost} onSeatPress={handleSeatPress} />
        </ScrollView>

        <View style={styles.floatingWidgetsColumn}>
          <TouchableOpacity
            onPress={() => { if (isSeated) handleLeaveSeat(); else handleSeatPress({ seatIndex: 1, role: 'speaker', isMuted: false, isSpeaking: false }); }}
            style={styles.useMicFloatingBtn}
          >
            <LinearGradient colors={['#F43F5E', '#FB7185']} style={styles.useMicGradient}>
              <Ionicons name={isSeated ? 'log-out' : 'mic'} size={18} color="#FFFFFF" />
              <Text style={styles.useMicText}>{isSeated ? 'Leave' : 'Use Mic'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setGamesDrawerVisible(true)} style={styles.treasureBoxWidget}>
            <Text style={{ fontSize: 24 }}>🪙</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chatStreamContainer}>
          <FlatList
            ref={chatFlatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => chatFlatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              if (item.isSystem) {
                return (
                  <View style={styles.systemAlertBanner}>
                    <Text style={styles.systemAlertText}>🔔 {item.text}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.chatMessageRow}>
                  <Text style={styles.msgSenderText}>{item.senderName}:</Text>
                  <Text style={styles.msgBodyText}>{item.text}</Text>
                </View>
              );
            }}
          />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.bottomBar}>
            <TouchableOpacity onPress={toggleMic} style={styles.speakerToggleBtn}>
              <Ionicons name={isMyMicMuted ? 'mic-off' : 'mic'} size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.typeInputPill}>
              <TextInput
                value={chatInputText}
                onChangeText={setChatInputText}
                onSubmitEditing={handleSendMessage}
                placeholder="Type..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                style={styles.typeInput}
              />
            </View>
            <View style={styles.bottomRightIcons}>
              <TouchableOpacity onPress={() => setWatchTogetherVisible(true)} style={styles.iconCircleBtn}>
                <Ionicons name="tv-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGamesDrawerVisible(true)} style={styles.iconCircleBtn}>
                <Text style={{ fontSize: 22 }}>🧰</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSoundboardVisible(true)} style={styles.iconCircleBtn}>
                <Ionicons name="grid" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        <RoomGamesDrawer
          visible={gamesDrawerVisible}
          onClose={() => setGamesDrawerVisible(false)}
          seatedParticipants={seats.filter((s) => s.userId).map((s) => ({ name: s.name || 'User', seatIndex: s.seatIndex, avatarUrl: s.avatarUrl }))}
          onBroadcastGameEvent={(game, res) => {
            getSocket().emit('voice-room:game-event', { roomId, gameType: game, payload: { result: res } });
            setChatMessages((p) => [...p, { id: String(Date.now()), senderName: 'Game Master', text: `${game}: ${res}`, isSystem: true }]);
          }}
        />
        <SoundboardModal visible={soundboardVisible} onClose={() => setSoundboardVisible(false)}
          onPlaySfx={(id) => getSocket().emit('voice-room:soundboard', { roomId, sfxId: id, userId: selfId })} />
        <WatchTogetherModal visible={watchTogetherVisible} onClose={() => setWatchTogetherVisible(false)}
          onSelectVideo={(v) => Alert.alert('Playing', v.title)} isHost={isHost} />
        <RoomSettingsModal
          visible={roomSettingsVisible} onClose={() => setRoomSettingsVisible(false)}
          announcement={announcement} maxSeats={maxSeats} isPrivate={isPrivate} pinPassword="" micOrderEnabled={micOrderEnabled}
          onSaveSettings={(s) => {
            setAnnouncement(s.announcement); setMaxSeats(s.maxSeats); setIsPrivate(s.isPrivate); setMicOrderEnabled(s.micOrderEnabled);
            getSocket().emit('voice-room:settings-update', { roomId, settings: s, requesterId: selfId });
          }}
        />
        <SeatUserActionModal
          visible={!!selectedSeatAction} onClose={() => setSelectedSeatAction(null)}
          seat={selectedSeatAction} isHost={isHost} currentUserId={selfId}
          onViewProfile={(uid) => router.push(`/companion/${uid}`)}
          onSendGiftToUser={() => {}}
          onMuteUser={(seat) => {
            const newMuted = !seat.isMuted;
            getSocket().emit('voice-room:mute', { roomId, userId: seat.userId, isMuted: newMuted });
            setSeats((p) => p.map((s) => s.seatIndex === seat.seatIndex ? { ...s, isMuted: newMuted } : s));
          }}
          onKickFromSeat={(seat) => {
            getSocket().emit('voice-room:role-change', { roomId, userId: seat.userId, role: 'listener', requesterId: selfId });
            setSeats((p) => p.filter((s) => s.seatIndex !== seat.seatIndex));
          }}
          onLockSeat={(sIdx) => setSeats((p) => p.map((s) => s.seatIndex === sIdx ? { ...s, isLocked: !s.isLocked } : s))}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0E2E' },
  gradientBg: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: '#C084FC' },
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  backBtn: { padding: 4 },
  roomHeaderMeta: { flex: 1, paddingLeft: 6 },
  roomTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomTitleText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 14, color: '#FFFFFF', maxWidth: 160 },
  heartFollowBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#06B6D4', justifyContent: 'center', alignItems: 'center' },
  heartFollowBtnActive: { backgroundColor: '#EC4899' },
  roomSubtitleText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 10.5, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  audienceControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  moreOptionsBtn: { padding: 4 },
  marqueeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4 },
  eventMarqueePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  eventMarqueeText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 11, color: 'rgba(255,255,255,0.8)', flex: 1 },
  stageScroll: { flex: 1 },
  stageContent: { paddingBottom: 6 },
  floatingWidgetsColumn: { position: 'absolute', right: 14, top: '38%', alignItems: 'center', gap: 12, zIndex: 10 },
  useMicFloatingBtn: { borderRadius: 22, overflow: 'hidden', shadowColor: '#F43F5E', shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  useMicGradient: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  useMicText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 9.5, color: '#FFFFFF', marginTop: 2 },
  treasureBoxWidget: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  chatStreamContainer: { height: 160, paddingHorizontal: 14, marginBottom: 6 },
  systemAlertBanner: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  systemAlertText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  chatMessageRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4, gap: 4 },
  msgSenderText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 11.5, color: 'rgba(255,255,255,0.85)' },
  msgBodyText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, color: '#FFFFFF' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.65)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', gap: 10 },
  speakerToggleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  typeInputPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  typeInput: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12.5, color: '#FFFFFF', paddingVertical: 0 },
  bottomRightIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircleBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
});
