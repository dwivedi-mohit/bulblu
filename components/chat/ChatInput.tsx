import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatInputProps {
  onSend: (message: string) => void;
  onSendVoiceNote?: (uri: string, durationSeconds: number) => void;
  onOpenAttachmentModal?: () => void;
  onTyping?: () => void;
}

export function ChatInput({
  onSend,
  onSendVoiceNote,
  onOpenAttachmentModal,
  onTyping,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onSend(trimmed);
    setText('');
  };

  const handleChangeText = (value: string) => {
    setText(value);
    if (value.trim().length > 0) onTyping?.();
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const stopAndSendVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (recordSeconds >= 1 && onSendVoiceNote) {
      onSendVoiceNote('voice_memo', recordSeconds);
    }
  };

  const cancelVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hasText = text.trim().length > 0;

  if (isRecording) {
    return (
      <View style={[styles.container, styles.recordingContainer]}>
        <TouchableOpacity
          onPress={cancelVoiceRecording}
          style={styles.cancelRecBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>

        <View style={styles.recordingIndicator}>
          <View style={styles.recDot} />
          <Text style={styles.recTimer}>{formatSeconds(recordSeconds)}</Text>
          <Text style={styles.recLabel}>Recording Voice Note...</Text>
        </View>

        <TouchableOpacity
          onPress={stopAndSendVoiceRecording}
          style={styles.sendRecBtn}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0F766E', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendGradient}
          >
            <Ionicons name="send" size={17} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.attachBtn}
        onPress={onOpenAttachmentModal}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={26} color="#0F766E" />
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={text}
          onChangeText={handleChangeText}
          multiline
          maxLength={2000}
        />
      </View>

      {hasText ? (
        <TouchableOpacity onPress={handleSend} activeOpacity={0.8} style={styles.sendBtn}>
          <LinearGradient
            colors={['#0F766E', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendGradient}
          >
            <Ionicons name="send" size={17} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.micBtn}
          onPress={startVoiceRecording}
          activeOpacity={0.7}
        >
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={20} color="#0F766E" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    maxHeight: 110,
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  micBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  micCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelRecBtn: {
    padding: 8,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recTimer: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#0F172A',
  },
  recLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: '#64748B',
  },
  sendRecBtn: {
    padding: 2,
  },
});
