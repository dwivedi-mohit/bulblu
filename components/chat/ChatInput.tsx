import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Send, Image } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface ChatInputProps {
  onSend: (message: string) => void;
  onImagePick?: () => void;
  onTyping?: () => void;
}

export function ChatInput({ onSend, onImagePick, onTyping }: ChatInputProps) {
  const [text, setText] = useState('');

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

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.imageButton} onPress={onImagePick} activeOpacity={0.7}>
        <Image size={22} color={Colors.textSecondary} />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Type a message..."
        placeholderTextColor={Colors.textTertiary}
        value={text}
        onChangeText={handleChangeText}
        multiline
        maxLength={1000}
      />

      {text.trim().length > 0 && (
        <TouchableOpacity onPress={handleSend} activeOpacity={0.7} style={styles.sendButton}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendGradient}
          >
            <Send size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: Colors.bgSecondary,
  },
  imageButton: {
    padding: Spacing.sm,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.bgGlass,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: Spacing.sm,
  },
  sendButton: {
    marginBottom: 2,
  },
  sendGradient: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
