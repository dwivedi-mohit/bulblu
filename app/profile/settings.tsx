import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Shield,
  Bell,
  UserX,
  Download,
  Trash2,
  LogOut,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { userApi } from '../../lib/services';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface SettingToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function SettingToggle({ label, value, onValueChange }: SettingToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.bgGlassLight, true: `${Colors.primary}80` }}
        thumbColor={value ? Colors.primary : Colors.textTertiary}
      />
    </View>
  );
}

interface SettingRowProps {
  icon?: React.ReactNode;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingRow({ icon, label, onPress, destructive }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingRowLeft}>
        {icon && icon}
        <Text style={[styles.settingLabel, destructive && styles.destructiveText]}>
          {label}
        </Text>
      </View>
      <ChevronRight size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [notifications, setNotifications] = useState({
    matches: user?.settings?.notifications?.matches ?? true,
    messages: user?.settings?.notifications?.messages ?? true,
    bookings: user?.settings?.notifications?.bookings ?? true,
    stories: user?.settings?.notifications?.stories ?? false,
  });

  const [privacy, setPrivacy] = useState({
    showOnline: user?.settings?.privacy?.show_online ?? true,
    readReceipts: user?.settings?.privacy?.show_read_receipts ?? true,
  });

  const handleNotificationChange = async (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    try {
      await userApi.updateProfile({
        settings: {
          ...user?.settings,
          notifications: updated,
          privacy: {
            show_online: privacy.showOnline,
            show_read_receipts: privacy.readReceipts,
            profile_visibility: user?.settings?.privacy?.profile_visibility ?? 'everyone',
          },
        },
      });
    } catch {
      // revert on failure
      setNotifications(notifications);
    }
  };

  const handlePrivacyChange = async (key: keyof typeof privacy, value: boolean) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    try {
      await userApi.updateProfile({
        settings: {
          ...user?.settings,
          notifications,
          privacy: {
            show_online: updated.showOnline,
            show_read_receipts: updated.readReceipts,
            profile_visibility: user?.settings?.privacy?.profile_visibility ?? 'everyone',
          },
        },
      });
    } catch {
      setPrivacy(privacy);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to sign out');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <GlassCard>
          <SettingRow
            icon={<Shield size={18} color={Colors.primary} />}
            label="Email"
            onPress={() => {}}
          />
          <SettingRow
            icon={<Shield size={18} color={Colors.primary} />}
            label="Change Password"
            onPress={() => {}}
          />
        </GlassCard>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <GlassCard>
          <SettingToggle
            label="Matches"
            value={notifications.matches}
            onValueChange={(v) => handleNotificationChange('matches', v)}
          />
          <SettingToggle
            label="Messages"
            value={notifications.messages}
            onValueChange={(v) => handleNotificationChange('messages', v)}
          />
          <SettingToggle
            label="Bookings"
            value={notifications.bookings}
            onValueChange={(v) => handleNotificationChange('bookings', v)}
          />
          <SettingToggle
            label="Stories"
            value={notifications.stories}
            onValueChange={(v) => handleNotificationChange('stories', v)}
          />
        </GlassCard>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <GlassCard>
          <SettingToggle
            label="Show Online Status"
            value={privacy.showOnline}
            onValueChange={(v) => handlePrivacyChange('showOnline', v)}
          />
          <SettingToggle
            label="Read Receipts"
            value={privacy.readReceipts}
            onValueChange={(v) => handlePrivacyChange('readReceipts', v)}
          />
          <SettingRow
            icon={<UserX size={18} color={Colors.accentCoral} />}
            label="Blocked Users"
            onPress={() => {}}
          />
        </GlassCard>

        <Text style={styles.sectionTitle}>Data</Text>
        <GlassCard>
          <SettingRow
            icon={<Download size={18} color={Colors.accentBlue} />}
            label="Download Your Data"
            onPress={() => {}}
          />
          <SettingRow
            icon={<Trash2 size={18} color={Colors.error} />}
            label="Delete Account"
            destructive
            onPress={() => {}}
          />
        </GlassCard>

        <Text style={styles.sectionTitle}>About</Text>
        <GlassCard>
          <SettingRow label="Version" onPress={() => {}} />
          <SettingRow label="Terms of Service" onPress={() => {}} />
          <SettingRow label="Privacy Policy" onPress={() => {}} />
        </GlassCard>

        <View style={styles.logoutContainer}>
          <Button variant="ghost" onPress={handleSignOut}>
            Log Out
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    ...Typography.heading,
    fontSize: 24,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textTertiary,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  toggleLabel: {
    ...Typography.bodyMedium,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingLabel: {
    ...Typography.bodyMedium,
  },
  destructiveText: {
    color: Colors.error,
  },
  logoutContainer: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing['2xl'],
  },
});
