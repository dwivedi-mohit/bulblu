import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  SlideInDown,
} from 'react-native-reanimated';
import { X, Send } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ParticipantGrid, Participant } from '../../components/voice/ParticipantGrid';
import { RoomControls } from '../../components/voice/RoomControls';
import { GlassCard } from '../../components/ui/GlassCard';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const MOCK_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'You', avatarUri: null, role: 'host', isMuted: false, isHandRaised: false },
  { id: '2', name: 'Alex', avatarUri: null, role: 'speaker', isMuted: true, isHandRaised: false },
  { id: '3', name: 'Jordan', avatarUri: null, role: 'listener', isMuted: false, isHandRaised: true },
  { id: '4', name: 'Sam', avatarUri: null, role: 'listener', isMuted: false, isHandRaised: false },
];

const MOCK_MESSAGES = [
  { id: '1', user: 'Alex', text: 'Hey everyone!', time: '2:30 PM' },
  { id: '2', user: 'Jordan', text: 'Great topic today', time: '2:31 PM' },
];

export default function VoiceRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [isMuted, setIsMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const chatTranslateY = useSharedValue(300);

  const chatAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: chatTranslateY.value }],
  }));

  const toggleChat = useCallback(() => {
    setShowChat((prev) => {
      const next = !prev;
      chatTranslateY.value = withSpring(next ? 0 : 300, {
        damping: 20,
        stiffness: 200,
      });
      return next;
    });
  }, []);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        user: 'You',
        text: chatMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatMessage('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.roomTopic} numberOfLines={1}>
            General Chat
          </Text>
          <Text style={styles.participantCount}>
            {MOCK_PARTICIPANTS.length} participants
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.participantsArea}>
        <ParticipantGrid participants={MOCK_PARTICIPANTS} />
      </View>

      <RoomControls
        isMuted={isMuted}
        isHandRaised={isHandRaised}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onToggleHand={() => setIsHandRaised((prev) => !prev)}
        onLeaveRoom={() => router.back()}
        onToggleChat={toggleChat}
      />

      {showChat && (
        <Animated.View style={[styles.chatOverlay, chatAnimatedStyle]}>
          <GlassCard variant="elevated" style={styles.chatCard}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Room Chat</Text>
              <TouchableOpacity onPress={toggleChat}>
                <X size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chatMessages}>
              {messages.map((msg) => (
                <View key={msg.id} style={styles.chatBubble}>
                  <Text style={styles.chatUser}>{msg.user}</Text>
                  <Text style={styles.chatText}>{msg.text}</Text>
                  <Text style={styles.chatTime}>{msg.time}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatInput}>
              <TextInput
                style={styles.chatInputField}
                value={chatMessage}
                onChangeText={setChatMessage}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textTertiary}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  roomTopic: {
    ...Typography.subheading,
    fontSize: 18,
  },
  participantCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlassLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantsArea: {
    flex: 1,
    justifyContent: 'center',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  chatCard: {
    flex: 1,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chatTitle: {
    ...Typography.bodyBold,
  },
  chatMessages: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  chatBubble: {
    backgroundColor: Colors.bgGlassLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chatUser: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.primaryLight,
  },
  chatText: {
    ...Typography.body,
    fontSize: 14,
    marginTop: 2,
  },
  chatTime: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chatInputField: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.bgGlass,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
