import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing, Radius, Layout } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useVideoStore, VideoMessage } from '../../stores/videoStore';
import { useAuthStore } from '../../stores/authStore';
import {
  onVideoMatched,
  onVideoSignal,
  onVideoPartnerLeft,
  onVideoWaiting,
  onVideoTextReceive,
} from '../../lib/socket';

let RTCView: any = null;
if (Platform.OS !== 'web' && NativeModules.WebRTCModule) {
  try {
    RTCView = require('@livekit/react-native-webrtc').RTCView;
  } catch {}
}

function getStreamUrl(stream: any): string {
  if (!stream) return '';
  if (typeof stream.toURL === 'function') return stream.toURL();
  if (stream.id) return String(stream.id);
  return String(stream);
}

export default function VideoScreen() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const {
    status, roomId, partner, localStream, remoteStream,
    isMuted, isVideoOff, textMessages,
    startSearching, stopSearching, skip, end,
    toggleMute, toggleVideo, sendText,
    handleMatched, handleSignal, handlePartnerLeft,
  } = useVideoStore();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatListRef = useRef<FlatList>(null);

  // Responsive dimensions
  const controlIconSize = Math.max(44, Math.min(52, screenW * 0.12));
  const controlGap = Math.max(12, Math.min(20, screenW * 0.05));
  const controlDeckBottom = Layout.tabBarHeight + insets.bottom;
  const placeholderIconSize = Math.max(36, Math.min(48, screenW * 0.12));
  const chatOverlayMaxH = screenH * 0.35;
  const chatOverlayBottom = 80 + controlDeckBottom + Spacing.base;
  const btnPadH = Math.max(20, screenW * 0.08);

  // Socket listeners
  useEffect(() => {
    const unsubs = [
      onVideoMatched((data) => handleMatched(data)),
      onVideoSignal((data) => handleSignal(data)),
      onVideoPartnerLeft(() => handlePartnerLeft()),
      onVideoWaiting(() => {}),
      onVideoTextReceive((msg) => {
        useVideoStore.setState((s) => ({
          textMessages: [...s.textMessages, msg],
        }));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (textMessages.length > 0) {
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [textMessages]);

  const handleSendText = () => {
    if (!chatInput.trim()) return;
    sendText(chatInput);
    setChatInput('');
  };

  const renderVideoStream = (stream: any, label: string, isLocal: boolean) => {
    const url = getStreamUrl(stream);
    if (!url || !RTCView) {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam-off" size={placeholderIconSize} color={Colors.textTertiary} />
          <Text style={styles.placeholderText} numberOfLines={1}>{label}</Text>
        </View>
      );
    }
    return (
      <RTCView
        streamURL={url}
        style={styles.videoFeed}
        objectFit="cover"
        mirror={isLocal}
        zOrder={isLocal ? 1 : 0}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, status === 'connected' && styles.statusDotLive]} />
          <Text style={styles.statusText} numberOfLines={1}>
            {status === 'idle' && 'Ready to connect'}
            {status === 'searching' && 'Looking for someone...'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'connected' && `Connected with ${partner?.name || 'stranger'}`}
            {status === 'ended' && 'Chat ended'}
          </Text>
        </View>
        {status === 'connected' && (
          <View style={styles.matchCounter}>
            <Ionicons name="videocam" size={12} color={Colors.primary} />
            <Text style={styles.matchText}>Live</Text>
          </View>
        )}
      </View>

      {/* Video Viewport — 50/50 split */}
      <View style={styles.videoViewport}>
        {/* Top half — Stranger's video */}
        <View style={styles.videoHalf}>
          {status === 'connected' || status === 'connecting' ? (
            renderVideoStream(remoteStream, 'Stranger', false)
          ) : (
            <View style={styles.videoPlaceholder}>
              {status === 'searching' ? (
                <>
                  <View style={styles.searchingDots}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                  </View>
                  <Text style={styles.placeholderText}>Looking for someone...</Text>
                </>
              ) : status === 'ended' ? (
                <>
                  <Ionicons name="person-remove" size={placeholderIconSize} color={Colors.textTertiary} />
                  <Text style={styles.placeholderText}>Stranger has left</Text>
                </>
              ) : (
                <>
                  <Ionicons name="videocam" size={placeholderIconSize} color={Colors.textTertiary} />
                  <Text style={styles.placeholderText}>Stranger's video</Text>
                </>
              )}
            </View>
          )}
          {/* Partner info overlay */}
          {status === 'connected' && partner && (
            <View style={styles.partnerOverlay}>
              <Text style={styles.partnerName} numberOfLines={1}>{partner.name}</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom half — Your video */}
        <View style={styles.videoHalf}>
          {localStream && !isVideoOff ? (
            renderVideoStream(localStream, 'You', true)
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={placeholderIconSize} color={Colors.textTertiary} />
              <Text style={styles.placeholderText}>
                {isVideoOff ? 'Camera off' : 'Your video'}
              </Text>
            </View>
          )}
          <View style={styles.selfOverlay}>
            <Text style={styles.selfName}>You</Text>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controlDeck, { paddingBottom: controlDeckBottom }]}>
        {status === 'idle' || status === 'ended' ? (
          <Pressable style={[styles.connectButton, { paddingHorizontal: btnPadH }]} onPress={startSearching}>
            <Ionicons name="videocam" size={24} color="#FFFFFF" />
            <Text style={styles.connectText}>
              {status === 'ended' ? 'Find New Match' : 'Start Video Chat'}
            </Text>
          </Pressable>
        ) : status === 'searching' ? (
          <Pressable style={[styles.stopButton, { paddingHorizontal: btnPadH }]} onPress={stopSearching}>
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
            <Text style={styles.stopText}>Cancel</Text>
          </Pressable>
        ) : (
          <View style={[styles.connectedControls, { gap: controlGap }]}>
            <Pressable style={styles.controlButton} onPress={toggleMute}>
              <View style={[styles.controlIcon, { width: controlIconSize, height: controlIconSize, borderRadius: controlIconSize / 2 }, isMuted && styles.controlIconActive]}>
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={controlIconSize * 0.42} color={isMuted ? Colors.error : Colors.textPrimary} />
              </View>
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </Pressable>

            <Pressable style={[styles.skipButton, { paddingHorizontal: btnPadH }]} onPress={skip}>
              <Ionicons name="play-forward" size={24} color="#FFFFFF" />
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            <Pressable style={styles.controlButton} onPress={toggleVideo}>
              <View style={[styles.controlIcon, { width: controlIconSize, height: controlIconSize, borderRadius: controlIconSize / 2 }, isVideoOff && styles.controlIconActive]}>
                <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={controlIconSize * 0.42} color={isVideoOff ? Colors.error : Colors.textPrimary} />
              </View>
              <Text style={styles.controlLabel}>{isVideoOff ? 'Cam On' : 'Cam Off'}</Text>
            </Pressable>

            <Pressable style={styles.controlButton} onPress={() => setChatOpen(!chatOpen)}>
              <View style={[styles.controlIcon, { width: controlIconSize, height: controlIconSize, borderRadius: controlIconSize / 2 }, chatOpen && styles.controlIconActive]}>
                <Ionicons name="chatbubble" size={controlIconSize * 0.42} color={chatOpen ? Colors.primary : Colors.textPrimary} />
                {textMessages.length > 0 && !chatOpen && (
                  <View style={styles.chatBadge}>
                    <Text style={styles.chatBadgeText}>{textMessages.length}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.controlLabel}>Chat</Text>
            </Pressable>

            <Pressable style={styles.controlButton} onPress={end}>
              <View style={[styles.controlIcon, { width: controlIconSize, height: controlIconSize, borderRadius: controlIconSize / 2, backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Ionicons name="call" size={controlIconSize * 0.42} color={Colors.error} />
              </View>
              <Text style={styles.controlLabel}>End</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Text Chat Overlay */}
      {chatOpen && (status === 'connected' || status === 'connecting') && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.chatOverlay, { bottom: chatOverlayBottom, maxHeight: chatOverlayMaxH }]}
          keyboardVerticalOffset={0}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Text Chat</Text>
            <TouchableOpacity onPress={() => setChatOpen(false)}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={chatListRef}
            data={textMessages}
            keyExtractor={(_, i) => String(i)}
            style={styles.chatList}
            renderItem={({ item }) => (
              <View style={[
                styles.chatBubble,
                item.senderId === user?.id ? styles.chatBubbleSelf : styles.chatBubblePartner,
              ]}>
                {item.senderId !== user?.id && (
                  <Text style={styles.chatSender}>{item.senderName}</Text>
                )}
                <Text style={[
                  styles.chatMessage,
                  item.senderId === user?.id && styles.chatMessageSelf,
                ]}>
                  {item.content}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.chatEmpty}>Say hello!</Text>
            }
          />

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textTertiary}
              onSubmitEditing={handleSendText}
              returnKeyType="send"
            />
            <Pressable style={styles.chatSendBtn} onPress={handleSendText}>
              <Ionicons name="send" size={18} color={Colors.primary} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },

  // Status
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textTertiary,
  },
  statusDotLive: {
    backgroundColor: '#22C55E',
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  matchCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  matchText: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Video Viewport
  videoViewport: {
    flex: 1,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  videoHalf: {
    flex: 1,
    backgroundColor: Colors.bgTertiary,
    position: 'relative',
  },
  divider: {
    height: 2,
    backgroundColor: Colors.borderLight,
  },
  videoFeed: {
    ...StyleSheet.absoluteFill,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgTertiary,
    gap: Spacing.md,
  },
  placeholderText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  partnerOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  partnerName: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selfOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  selfName: {
    ...Typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Searching animation
  searchingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },

  // Controls
  controlDeck: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#22C55E',
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  connectText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.error,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
  },
  stopText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  connectedControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  controlIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  controlIconActive: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: Colors.error,
  },
  controlLabel: {
    ...Typography.tabBar,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.base,
    borderRadius: Radius.full,
  },
  skipText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Chat Overlay
  chatOverlay: {
    position: 'absolute',
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  chatTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  chatList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chatBubble: {
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  chatBubbleSelf: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chatBubblePartner: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chatSender: {
    ...Typography.tabBar,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  chatMessage: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  chatMessageSelf: {
    color: Colors.primary,
  },
  chatEmpty: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  chatInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgTertiary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
});
