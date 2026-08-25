import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Shield,
  Bell,
  UserX,
  Download,
  Trash2,
  LogOut,
  User,
  KeyRound,
  Camera,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, FadeOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { userApi } from '../../lib/services';
import { api, uploadFile, getApiUrl } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { ProfileSuccessModal } from '../../components/ui/ProfileSuccessModal';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const INTERESTS = [
  'Gaming', 'Music', 'Movies', 'Travel', 'Food', 'Fitness',
  'Art', 'Tech', 'Books', 'Nature', 'Photography', 'Fashion',
  'Sports', 'Cooking', 'Dancing', 'Pets', 'Anime', 'Coding',
  'Yoga', 'Meditation', 'Coffee', 'Nightlife', 'Volunteering', 'DIY',
];

const LOOKING_FOR_OPTIONS = [
  { key: 'dating', label: 'Dating', icon: 'heart' as const },
  { key: 'friends', label: 'Friends', icon: 'people' as const },
  { key: 'activity', label: 'Activity buddy', icon: 'football' as const },
  { key: 'companion', label: 'Companion', icon: 'hand-left' as const },
];

const GENDERS = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'non_binary', label: 'Non-binary' },
  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 80 }, (_, i) => 2010 - i);

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
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);

  // Modals state
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [photoSuccessModalVisible, setPhotoSuccessModalVisible] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  // Edit profile form state
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editCity, setEditCity] = useState(user?.city || '');
  const [editGender, setEditGender] = useState(user?.gender || 'male');
  const [editDob, setEditDob] = useState(user?.date_of_birth || '2000-01-01');
  const [editInterests, setEditInterests] = useState<string[]>(user?.interests ?? []);
  const [editLookingFor, setEditLookingFor] = useState<string[]>(user?.looking_for ?? []);

  // DOB picker decomposition
  const parsedDob = editDob.split('-');
  const [dobYear, setDobYear] = useState(() => {
    const y = parseInt(parsedDob[0] || '2000', 10);
    return YEARS.indexOf(y) >= 0 ? YEARS.indexOf(y) : 30;
  });
  const [dobMonth, setDobMonth] = useState(() => {
    const m = parseInt(parsedDob[1] || '1', 10) - 1;
    return m >= 0 && m < 12 ? m : 0;
  });
  const [dobDay, setDobDay] = useState(() => {
    const d = parseInt(parsedDob[2] || '1', 10) - 1;
    return d >= 0 && d < 31 ? d : 0;
  });

  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  // Sync form fields from current user data whenever the modal opens
  useEffect(() => {
    if (editProfileVisible && user) {
      setEditName(user.full_name || '');
      setEditUsername(user.username || '');
      setEditBio(user.bio || '');
      setEditCity(user.city || '');
      setEditGender(user.gender || 'male');
      setEditInterests(user.interests ?? []);
      setEditLookingFor(user.looking_for ?? []);
      const dob = (user.date_of_birth || '2000-01-01').split('-');
      const y = parseInt(dob[0] || '2000', 10);
      const m = parseInt(dob[1] || '1', 10) - 1;
      const d = parseInt(dob[2] || '1', 10) - 1;
      setDobYear(YEARS.indexOf(y) >= 0 ? YEARS.indexOf(y) : 30);
      setDobMonth(m >= 0 && m < 12 ? m : 0);
      setDobDay(d >= 0 && d < 31 ? d : 0);
    }
  }, [editProfileVisible]);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      await refreshProfile();
    } catch {
      setNotifications(notifications);
    }
  };

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
            setLoading(true);
            const { data: uploadData } = await uploadFile('/api/upload', file, 'file');
            if (!uploadData?.url) {
              setLoading(false);
              Alert.alert('Upload Failed', 'Could not upload your photo. Please try again.');
              return;
            }
            const { data } = await api<{ user: any }>('/api/auth/me', { method: 'PUT', body: { avatar_url: uploadData.url } });
            if (data?.user) {
              useAuthStore.setState({ user: data.user });
              useAuthStore.getState().applyProfileUpdate({ userId: data.user.id, avatar_url: uploadData.url });
            } else {
              await refreshProfile();
            }
            const finalPhoto = data?.user?.avatar_url || uploadData.url;
            setLoading(false);
            setUploadedPhotoUrl(finalPhoto);
            setPhotoSuccessModalVisible(true);
          }
        };
        input.click();
        return;
      }

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Photo library access is needed to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return;
      }

      photoUri = result.assets[0].uri;
      setLoading(true);

      const uploadResult = await uploadFile('/api/upload', photoUri, 'file');
      if (!uploadResult.data?.url) {
        setLoading(false);
        Alert.alert('Upload Failed', uploadResult.error || 'Could not upload your photo. Please try again.');
        return;
      }

      const { data } = await api<{ user: any }>('/api/auth/me', { method: 'PUT', body: { avatar_url: uploadResult.data.url } });
      if (data?.user) {
        useAuthStore.setState({ user: data.user });
        useAuthStore.getState().applyProfileUpdate({ userId: data.user.id, avatar_url: data.user.avatar_url || uploadResult.data.url });
      } else {
        await refreshProfile();
      }
      const finalPhoto = data?.user?.avatar_url || uploadResult.data.url;
      setLoading(false);
      setUploadedPhotoUrl(finalPhoto);
      setPhotoSuccessModalVisible(true);
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err?.message || 'Failed to update profile picture.');
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
      await refreshProfile();
    } catch {
      setPrivacy(privacy);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Full Name is required.');
      return;
    }

    const dateStr = `${YEARS[dobYear]}-${String(dobMonth + 1).padStart(2, '0')}-${String(dobDay + 1).padStart(2, '0')}`;

    // Optimistic update — apply locally before server confirms
    const prevUser = useAuthStore.getState().user;
    useAuthStore.setState({
      user: prevUser ? {
        ...prevUser,
        full_name: editName.trim(),
        username: editUsername.replace(/^@/, '').trim(),
        bio: editBio.trim(),
        city: editCity.trim(),
        gender: editGender as any,
        date_of_birth: dateStr,
        interests: editInterests,
        looking_for: editLookingFor as any,
      } : prevUser,
    });

    setLoading(true);
    try {
      const { error } = await userApi.updateProfile({
        name: editName.trim(),
        username: editUsername.replace(/^@/, '').trim(),
        bio: editBio.trim(),
        city: editCity.trim(),
        gender: editGender,
        date_of_birth: dateStr,
        interests: editInterests,
        looking_for: editLookingFor,
      });

      setLoading(false);
      if (error) {
        if (prevUser) useAuthStore.setState({ user: prevUser });
        Alert.alert('Error', error);
      } else {
        await refreshProfile();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        setEditProfileVisible(false);
      }
    } catch {
      if (prevUser) useAuthStore.setState({ user: prevUser });
      setLoading(false);
      Alert.alert('Error', 'Could not update profile details.');
    }
  };

  const handleChangePasswordSubmit = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Required', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await userApi.changePassword(currentPassword, newPassword);
      setLoading(false);
      if (error) {
        Alert.alert('Error', error);
      } else {
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('🎉 Password Changed!', 'Your password has been updated in PostgreSQL.');
      }
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Failed to update password.');
    }
  };

  const handleDownloadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await api<{ user: any }>('/api/auth/me');
      setLoading(false);
      if (error || !data?.user) {
        Alert.alert('Data Export', 'Could not fetch your account data.');
        return;
      }
      const exportData = JSON.stringify({ user: data.user, exportedAt: new Date().toISOString() }, null, 2);
      await Share.share({
        title: 'Bulblu Account Data Export',
        message: exportData,
      });
    } catch {
      setLoading(false);
      Alert.alert('Data Export', 'Could not export account data.');
    }
  };

  const handleDeleteAccountSubmit = async () => {
    setLoading(true);
    try {
      await userApi.deleteAccount();
      setLoading(false);
      setDeleteModalVisible(false);
      await signOut();
      router.replace('/(auth)/login');
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Could not delete account. Please try again.');
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
      {/* Animated success banner */}
      {saveSuccess && (
        <Animated.View entering={FadeInDown.springify()} exiting={FadeOut.duration(300)} style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          <Text style={styles.successBannerText}>Profile saved successfully!</Text>
        </Animated.View>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <GlassCard>
          <SettingRow
            icon={<User size={18} color={Colors.primary} />}
            label={`Edit Profile (${user?.full_name || 'Account'})`}
            onPress={() => setEditProfileVisible(true)}
          />
          <SettingRow
            icon={<KeyRound size={18} color={Colors.primary} />}
            label="Change Password"
            onPress={() => setPasswordModalVisible(true)}
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
        </GlassCard>

        <Text style={styles.sectionTitle}>Data & Security</Text>
        <GlassCard>
          <SettingRow
            icon={<Download size={18} color={Colors.accentBlue} />}
            label="Download Your Account Data"
            onPress={handleDownloadData}
          />
          <SettingRow
            icon={<Trash2 size={18} color={Colors.error} />}
            label="Delete Account"
            destructive
            onPress={() => setDeleteModalVisible(true)}
          />
        </GlassCard>

        <Text style={styles.sectionTitle}>About</Text>
        <GlassCard>
          <SettingRow label="App Version 1.0.0 (Expo SDK 57)" onPress={() => Alert.alert('Bulblu', 'Version 1.0.0 - Expo SDK 57 & PostgreSQL')} />
          <SettingRow label="Terms of Service" onPress={() => router.push('/(auth)/terms')} />
          <SettingRow label="Privacy Policy" onPress={() => router.push('/(auth)/privacy')} />
        </GlassCard>

        <View style={styles.logoutContainer}>
          <Button variant="ghost" onPress={handleSignOut}>
            Log Out
          </Button>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editProfileVisible} animationType="slide" transparent onRequestClose={() => setEditProfileVisible(false)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Account Profile</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Avatar Change Section */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.8} style={{ position: 'relative' }}>
                   <Avatar uri={user?.avatar_url ?? null} userId={user?.id} size="xl" />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: Colors.primary,
                      borderRadius: 16,
                      padding: 6,
                      borderWidth: 2,
                      borderColor: '#FFFFFF',
                    }}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChangePhoto} style={{ marginTop: 8 }}>
                  <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 13.5, color: Colors.primary }}>
                    📷 Change Profile Picture
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Username Handle</Text>
              <TextInput
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="@username"
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell others about yourself..."
                multiline
                style={[styles.modalInput, { height: 80 }]}
              />

              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                value={editCity}
                onChangeText={setEditCity}
                placeholder="Mumbai"
                style={styles.modalInput}
              />

              {/* Gender */}
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDERS.map((g) => {
                  const active = editGender === g.key;
                  return (
                    <TouchableOpacity
                      key={g.key}
                      style={[styles.genderChip, active && styles.genderChipActive]}
                      onPress={() => setEditGender(g.key as typeof editGender)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.genderChipText, active && styles.genderChipTextActive]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Date of Birth */}
              <Text style={styles.inputLabel}>Date of Birth</Text>
              <View style={styles.datePickerRow}>
                <View style={styles.dateColumn}>
                  <Text style={styles.dateLabel}>Month</Text>
                  <ScrollView ref={monthScrollRef} style={styles.dateScroll} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate="fast">
                    {MONTHS.map((m, i) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.dateItem, dobMonth === i && styles.dateItemActive]}
                        onPress={() => { setDobMonth(i); monthScrollRef.current?.scrollTo({ y: i * 40, animated: true }); }}
                      >
                        <Text style={[styles.dateItemText, dobMonth === i && styles.dateItemTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.dateColumn}>
                  <Text style={styles.dateLabel}>Day</Text>
                  <ScrollView ref={dayScrollRef} style={styles.dateScroll} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate="fast">
                    {DAYS.map((d, i) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dateItem, dobDay === i && styles.dateItemActive]}
                        onPress={() => { setDobDay(i); dayScrollRef.current?.scrollTo({ y: i * 40, animated: true }); }}
                      >
                        <Text style={[styles.dateItemText, dobDay === i && styles.dateItemTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.dateColumn}>
                  <Text style={styles.dateLabel}>Year</Text>
                  <ScrollView ref={yearScrollRef} style={styles.dateScroll} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate="fast">
                    {YEARS.map((y, i) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.dateItem, dobYear === i && styles.dateItemActive]}
                        onPress={() => { setDobYear(i); yearScrollRef.current?.scrollTo({ y: i * 40, animated: true }); }}
                      >
                        <Text style={[styles.dateItemText, dobYear === i && styles.dateItemTextActive]}>{y}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Looking For */}
              <Text style={styles.inputLabel}>Looking For</Text>
              <View style={styles.lfRow}>
                {LOOKING_FOR_OPTIONS.map((opt) => {
                  const active = editLookingFor.includes(opt.key);
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.lfChip, active && styles.lfChipActive]}
                      onPress={() => {
                        setEditLookingFor((prev) =>
                          active ? prev.filter((k) => k !== opt.key) : [...prev, opt.key]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={opt.icon} size={18} color={active ? Colors.textOnPrimary : Colors.primary} />
                      <Text style={[styles.lfChipText, active && styles.lfChipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Interests */}
              <Text style={styles.inputLabel}>Interests (min 3)</Text>
              <View style={styles.interestsGrid}>
                {INTERESTS.map((interest) => {
                  const active = editInterests.includes(interest);
                  return (
                    <TouchableOpacity
                      key={interest}
                      style={[styles.interestChip, active && styles.interestChipActive]}
                      onPress={() => {
                        setEditInterests((prev) =>
                          active ? prev.filter((i) => i !== interest) : [...prev, interest]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.interestText, active && styles.interestTextActive]}>
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity onPress={handleSaveProfile} disabled={loading} style={styles.modalSaveBtn}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSaveBtnText}>Save Profile Changes ✓</Text>}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Change Password</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="••••••••"
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="At least 6 characters"
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Repeat new password"
                style={styles.modalInput}
              />

              <TouchableOpacity onPress={handleChangePasswordSubmit} disabled={loading} style={styles.modalSaveBtn}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSaveBtnText}>Update Password ✓</Text>}
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* DELETE ACCOUNT MODAL */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { height: 'auto', borderRadius: 20, padding: 24, marginHorizontal: 20 }]}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { textAlign: 'center', color: '#EF4444' }]}>Delete Account Permanently?</Text>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 13.5, color: '#64748B', textAlign: 'center', marginVertical: 12 }}>
              Are you sure? This action will permanently remove your account, profile photos, bookings, and messages from PostgreSQL.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={[styles.modalSaveBtn, { flex: 1, backgroundColor: '#F1F5F9' }]}>
                <Text style={{ fontFamily: 'SpaceGrotesk-Bold', color: '#475569' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteAccountSubmit} disabled={loading} style={[styles.modalSaveBtn, { flex: 1, backgroundColor: '#EF4444' }]}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalSaveBtnText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LUXURY PROFILE SUCCESS MODAL */}
      <ProfileSuccessModal
        visible={photoSuccessModalVisible}
        avatarUrl={uploadedPhotoUrl || user?.avatar_url}
        onClose={() => setPhotoSuccessModalVisible(false)}
        onViewProfile={() => {
          setPhotoSuccessModalVisible(false);
          setEditProfileVisible(false);
          router.push('/(tabs)/profile');
        }}
      />
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  successBannerText: {
    ...Typography.bodyMedium,
    color: '#166534',
    fontFamily: 'SpaceGrotesk-Medium',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  inputLabel: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#0F172A',
  },
  modalSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  modalSaveBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  genderChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  genderChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  genderChipText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  genderChipTextActive: {
    color: Colors.textOnPrimary,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dateLabel: {
    ...Typography.label,
    fontSize: 11,
    marginBottom: Spacing.xs,
  },
  dateScroll: {
    height: 160,
  },
  dateItem: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
  },
  dateItemActive: {
    backgroundColor: Colors.primarySoft,
  },
  dateItemText: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dateItemTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  lfRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  lfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  lfChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  lfChipText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  lfChipTextActive: {
    color: Colors.textOnPrimary,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  interestChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  interestChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  interestText: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  interestTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
});
