import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Globe } from 'lucide-react-native';
import { router } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GlassCard } from '../../components/ui/GlassCard';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { voiceRoomApi } from '../../lib/services';

const PARTICIPANT_OPTIONS = [10, 25, 50];
const CATEGORY_OPTIONS = ['Party', 'Friends', 'Game', 'Music', 'Dating', 'VIP'];

export default function CreateVoiceRoomScreen() {
  const [topic, setTopic] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(25);
  const [category, setCategory] = useState('Party');
  const [creating, setCreating] = useState(false);

  const handleStartRoom = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a room topic');
      return;
    }

    setCreating(true);
    try {
      const room = await voiceRoomApi.create(topic.trim(), !isPrivate, maxParticipants, category);
      router.replace({
        pathname: `/voice/${room.id}` as any,
        params: { roomTitle: room.topic, hostName: 'You', hostAvatar: '' },
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create a Room</Text>
        <Text style={styles.subtitle}>Start a voice conversation</Text>

        <Input
          label="Room Topic"
          placeholder="What's this room about?"
          value={topic}
          onChangeText={setTopic}
          maxLength={50}
        />

        <GlassCard style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.optionsRow}>
            {CATEGORY_OPTIONS.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.optionButton, category === cat && styles.optionActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.optionText, category === cat && styles.optionTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionLabel}>Privacy</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleOption, !isPrivate && styles.toggleActive]}
              onPress={() => setIsPrivate(false)}
            >
              <Globe size={18} color={!isPrivate ? Colors.primary : Colors.textTertiary} />
              <Text style={[styles.toggleText, !isPrivate && styles.toggleTextActive]}>
                Public
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleOption, isPrivate && styles.toggleActive]}
              onPress={() => setIsPrivate(true)}
            >
              <Lock size={18} color={isPrivate ? Colors.primary : Colors.textTertiary} />
              <Text style={[styles.toggleText, isPrivate && styles.toggleTextActive]}>
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <Text style={styles.sectionLabel}>Max Participants</Text>
          <View style={styles.optionsRow}>
            {PARTICIPANT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, maxParticipants === option && styles.optionActive]}
                onPress={() => setMaxParticipants(option)}
              >
                <Text style={[styles.optionText, maxParticipants === option && styles.optionTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <View style={styles.startButtonContainer}>
          <Button onPress={handleStartRoom} disabled={creating}>
            {creating ? 'Creating...' : 'Start Room'}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  scrollContent: { padding: Spacing.base, paddingTop: Spacing.lg },
  title: { ...Typography.heading, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing['2xl'] },
  section: { marginBottom: Spacing.base },
  sectionLabel: { ...Typography.label, marginBottom: Spacing.md },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 48, borderRadius: Radius.md, backgroundColor: Colors.bgGlass,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
  toggleText: { ...Typography.bodyMedium, fontSize: 14, color: Colors.textTertiary },
  toggleTextActive: { color: Colors.primary },
  optionsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  optionButton: {
    flex: 1, minWidth: 60, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.bgGlass, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  optionActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
  optionText: { ...Typography.bodyBold, fontSize: 15, color: Colors.textTertiary },
  optionTextActive: { color: Colors.primary },
  startButtonContainer: { marginTop: Spacing['2xl'] },
});
