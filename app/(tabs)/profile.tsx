import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { api, uploadFile } from '../../lib/api';
import { Avatar } from '../../components/ui/Avatar';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

export default function ProfileScreen() {
  const { user, refreshProfile } = useAuthStore();

  const interests = user?.interests ?? [];

  const handleChangePhoto = async () => {
    try {
      let photoUri: string | null = null;

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const uri = URL.createObjectURL(file);
            await api('/api/auth/me', { method: 'PUT', body: { avatar_url: uri } });
            await refreshProfile();
          }
        };
        input.click();
        return;
      }

      try {
        const ImagePicker = require('expo-image-picker');
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission required', 'Photo library permission is needed.');
          return;
        }
        const mediaTypes = ImagePicker.MediaTypeOptions?.Images || ['images'];
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets[0]) {
          photoUri = result.assets[0].uri;
        }
      } catch {
        photoUri = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
      }

      if (photoUri) {
        let avatarUrl = photoUri;
        try {
          const uploadResult = await uploadFile('/api/upload/image', photoUri, 'file');
          if (uploadResult.data?.url) avatarUrl = uploadResult.data.url;
        } catch {}

        await api('/api/auth/me', { method: 'PUT', body: { avatar_url: avatarUrl } });
        await refreshProfile();
      }
    } catch (err) {
      console.warn('Failed to update profile picture:', err);
    }
  };

  // Goal gradient: calculate profile completion
  const completionItems = [
    !!user?.avatar_url,
    !!user?.bio,
    interests.length >= 3,
    !!user?.city,
    (user?.looking_for?.length ?? 0) >= 1,
  ];
  const completionPercent = Math.round(
    (completionItems.filter(Boolean).length / completionItems.length) * 100
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/profile/settings')}
          >
            <Settings size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <Avatar uri={user?.avatar_url ?? null} size="xl" showOnline />
          <TouchableOpacity style={styles.editAvatarButton} onPress={handleChangePhoto}>
            <Text style={styles.editAvatarText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameSection}>
          <Text style={styles.name}>{user?.full_name ?? 'Your Name'}</Text>
          <Text style={styles.bio}>{user?.bio ?? 'Tap to add a bio...'}</Text>
        </View>

        {/* Goal Gradient: Profile completion */}
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionTitle}>Profile Strength</Text>
            <Text style={styles.completionPercent}>{completionPercent}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
          </View>
          <Text style={styles.completionHint}>
            {completionPercent < 100
              ? 'Add a photo and bio to complete your profile'
              : 'Your profile is looking great!'}
          </Text>
        </View>

        <View style={styles.interestsSection}>
          <Text style={styles.sectionLabel}>Interests</Text>
          <View style={styles.interestsRow}>
            {interests.map((interest) => (
              <View key={interest} style={styles.interestPill}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
            {interests.length === 0 && (
              <Text style={styles.noInterests}>No interests added yet</Text>
            )}
          </View>
        </View>

        <GlassCard style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.interests?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Interests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.looking_for?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Looking For</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.city ?? '—'}</Text>
            <Text style={styles.statLabel}>City</Text>
          </View>
        </GlassCard>

        <View style={styles.ctaContainer}>
          <Button onPress={() => {}} variant="secondary">
            Become a Companion
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  scrollContent: {
    paddingBottom: Spacing['5xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.heading,
    fontSize: 24,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: Spacing.base,
    marginBottom: Spacing.lg,
  },
  editAvatarButton: {
    marginTop: Spacing.md,
  },
  editAvatarText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
  nameSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  name: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  bio: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  completionCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.bgSecondary,
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  completionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  completionPercent: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  completionHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  interestsSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.label,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  interestPill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryMedium,
  },
  interestText: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.primary,
  },
  noInterests: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  statsCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.subheading,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.borderLight,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing['2xl'],
  },
});
