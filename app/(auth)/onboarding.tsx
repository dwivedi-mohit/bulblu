import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { api, uploadFile } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Ionicons } from '@expo/vector-icons';
import {
  requestLocationPermission,
  requestMediaLibraryPermission,
  requestCameraPermission,
  requestMicrophonePermission,
  openAppSettings,
  checkAllRequiredPermissions,
} from '../../lib/permissions';

function hasExpoNativeModule(moduleName: string): boolean {
  try {
    const { NativeModules } = require('react-native');
    if (NativeModules && (NativeModules[moduleName] || NativeModules[`Expo${moduleName}`] || NativeModules[`Exponent${moduleName}`])) {
      return true;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).ExpoModules?.hasModule) {
      return (globalThis as any).ExpoModules.hasModule(moduleName) || (globalThis as any).ExpoModules.hasModule(`Expo${moduleName}`);
    }
  } catch {}
  return false;
}

function getLocationModule() {
  try {
    return require('expo-location');
  } catch (e) {
    return null;
  }
}

function getImagePickerModule() {
  try {
    return require('expo-image-picker');
  } catch (e) {
    return null;
  }
}

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

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  // Permission states
  const [locationGranted, setLocationGranted] = useState(false);
  const [storageGranted, setStorageGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [permChecking, setPermChecking] = useState(true);

  // Profile states
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [month, setMonth] = useState(0);
  const [day, setDay] = useState(0);
  const [year, setYear] = useState(30);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'valid' | 'taken' | 'invalid'>('idle');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const { user, refreshProfile } = useAuthStore();
  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  const TOTAL_STEPS = 12;
  const progress = (step + 1) / TOTAL_STEPS;

  useEffect(() => {
    // Initial permissions status check
    checkAllRequiredPermissions().then(perms => {
      setLocationGranted(perms.location);
      setStorageGranted(perms.storage);
      setCameraGranted(perms.camera);
      setMicGranted(perms.microphone);
      setPermChecking(false);
    });
  }, []);

  const handleRequestLocation = async () => {
    const granted = await requestLocationPermission();
    setLocationGranted(granted);
    if (!granted) {
      Alert.alert(
        'Location Permission Required',
        'Bulblu requires location permission to connect you with nearby users and local events.',
        [{ text: 'Open Settings', onPress: openAppSettings }, { text: 'Cancel', style: 'cancel' }]
      );
    }
  };

  const handleRequestStorage = async () => {
    const granted = await requestMediaLibraryPermission();
    setStorageGranted(granted);
    if (!granted) {
      Alert.alert(
        'Storage Permission Required',
        'Bulblu requires access to your photos & media to upload profile pictures and share posts.',
        [{ text: 'Open Settings', onPress: openAppSettings }, { text: 'Cancel', style: 'cancel' }]
      );
    }
  };

  const handleRequestCamera = async () => {
    const granted = await requestCameraPermission();
    setCameraGranted(granted);
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'Bulblu requires camera permission to take real-time photos and record stories.',
        [{ text: 'Open Settings', onPress: openAppSettings }, { text: 'Cancel', style: 'cancel' }]
      );
    }
  };

  const handleRequestMic = async () => {
    const granted = await requestMicrophonePermission();
    setMicGranted(granted);
    if (!granted) {
      Alert.alert(
        'Microphone Permission Required',
        'Bulblu requires microphone permission for voice messages and video posts.',
        [{ text: 'Open Settings', onPress: openAppSettings }, { text: 'Cancel', style: 'cancel' }]
      );
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return locationGranted;
      case 1: return storageGranted;
      case 2: return cameraGranted;
      case 3: return micGranted;
      case 4: return photoUri !== null;
      case 5: return true;
      case 6: return usernameStatus === 'valid';
      case 7: return gender !== '';
      case 8: return city.trim().length > 0;
      case 9: return lookingFor.length > 0;
      case 10: return interests.length >= 3;
      case 11: return bio.trim().length > 0;
      default: return false;
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          setPhotoUri(URL.createObjectURL(file));
        }
      };
      input.click();
      return;
    }

    const ImagePicker = getImagePickerModule();
    if (!ImagePicker) {
      setPhotoUri('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Photo library permission is needed to pick a photo.');
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
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e: any) {
      console.warn('Gallery pick error:', e);
      setPhotoUri('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }

    const ImagePicker = getImagePickerModule();
    if (!ImagePicker) {
      pickImage();
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access needed', 'Please enable camera access to take a photo.');
        return;
      }
      const mediaTypes = ImagePicker.MediaTypeOptions?.Images || ['images'];
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e: any) {
      console.warn('Camera error:', e);
      pickImage();
    }
  };

  const toggleLookingFor = (key: string) => {
    setLookingFor(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const validateUsername = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);

    if (clean.length < 3) {
      setUsernameStatus(clean.length === 0 ? 'idle' : 'invalid');
      return;
    }

    setUsernameStatus('checking');
    setTimeout(async () => {
      const { data, error } = await api<{ available: boolean }>('/api/auth/check-username', {
        method: 'POST',
        body: { username: clean },
      });
      if (data && !error) {
        setUsernameStatus(data.available ? 'valid' : 'taken');
      } else {
        setUsernameStatus('valid');
      }
    }, 500);
  };

  const detectLocation = async () => {
    try {
      const Location = getLocationModule();
      if (!Location) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geocode.length > 0) {
        const g = geocode[0];
        setCity(g.city || g.subregion || g.region || '');
      }
    } catch {}
  };

  useEffect(() => {
    if (step === 8 && !city) detectLocation();
  }, [step]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarUrl = photoUri || user?.avatar_url || '';

      if (photoUri && photoUri !== user?.avatar_url && !photoUri.startsWith('http')) {
        try {
          const uploadResult = await uploadFile('/api/upload', photoUri, 'file');
          if (uploadResult.data?.url) {
            avatarUrl = uploadResult.data.url;
          } else {
            Alert.alert('Upload Failed', 'Could not upload your photo. Please try again.');
            return;
          }
        } catch (e) {
          Alert.alert('Upload Failed', 'Could not upload your photo. Please try again.');
          return;
        }
      }

      const dateStr = `${YEARS[year]}-${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;

      await api('/api/auth/me', {
        method: 'PUT',
        body: {
          avatar_url: avatarUrl,
          username,
          date_of_birth: dateStr,
          gender,
          city: city.trim(),
          latitude,
          longitude,
          looking_for: lookingFor,
          interests,
          bio: bio.trim(),
        },
      });

      await refreshProfile();
      setStep(TOTAL_STEPS);
    } catch (err) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step === 11) {
      handleSave();
    } else {
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const renderPermissionStep = (
    iconName: keyof typeof Ionicons.glyphMap,
    title: string,
    description: string,
    isGranted: boolean,
    onRequest: () => void,
    permName: string
  ) => (
    <View style={styles.permissionCard}>
      <View style={[styles.permissionIconCircle, isGranted && styles.permissionIconCircleSuccess]}>
        <Ionicons
          name={isGranted ? 'checkmark-circle' : iconName}
          size={56}
          color={isGranted ? Colors.success : Colors.primary}
        />
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{description}</Text>

      {isGranted ? (
        <View style={styles.grantedBadge}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          <Text style={styles.grantedBadgeText}>{permName} Granted</Text>
        </View>
      ) : (
        <View style={styles.permActionContainer}>
          <TouchableOpacity style={styles.grantButton} onPress={onRequest} activeOpacity={0.8}>
            <Ionicons name={iconName} size={20} color="#fff" />
            <Text style={styles.grantButtonText}>Grant {permName} Access</Text>
          </TouchableOpacity>

          <View style={styles.deniedBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.deniedBannerText}>
              This permission is required to enter Bulblu.
            </Text>
          </View>

          <TouchableOpacity style={styles.settingsLink} onPress={openAppSettings}>
            <Text style={styles.settingsLinkText}>Open App Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep = () => {
    if (step === TOTAL_STEPS) return renderComplete();

    return (
      <Animated.View
        key={step}
        entering={SlideInRight.duration(300)}
        exiting={SlideOutLeft.duration(200)}
        style={styles.stepContainer}
      >
        {step === 0 && renderPermissionStep(
          'location',
          'Location Access Required',
          'Bulblu uses your location to discover people, local hangouts, and events near you.',
          locationGranted,
          handleRequestLocation,
          'Location'
        )}
        {step === 1 && renderPermissionStep(
          'folder-open',
          'Storage & Media Access',
          'Bulblu needs access to your photos and media to let you upload profile pictures and share posts.',
          storageGranted,
          handleRequestStorage,
          'Storage'
        )}
        {step === 2 && renderPermissionStep(
          'camera',
          'Camera Access Required',
          'Bulblu needs access to your camera to take real-time photos and record stories.',
          cameraGranted,
          handleRequestCamera,
          'Camera'
        )}
        {step === 3 && renderPermissionStep(
          'mic',
          'Microphone Access Required',
          'Bulblu needs access to your microphone for voice notes, video posts, and audio rooms.',
          micGranted,
          handleRequestMic,
          'Microphone'
        )}

        {step === 4 && renderPhotoStep()}
        {step === 5 && renderBirthdayStep()}
        {step === 6 && renderUsernameStep()}
        {step === 7 && renderGenderStep()}
        {step === 8 && renderCityStep()}
        {step === 9 && renderLookingForStep()}
        {step === 10 && renderInterestsStep()}
        {step === 11 && renderBioStep()}
      </Animated.View>
    );
  };

  const renderPhotoStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add your profile photo</Text>
      <Text style={styles.stepSubtitle}>Help others recognize you on Bulblu</Text>

      <TouchableOpacity style={styles.photoCircle} onPress={pickImage} activeOpacity={0.8}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.photoButtons}>
        <TouchableOpacity style={styles.photoOption} onPress={pickImage}>
          <Ionicons name="images-outline" size={22} color={Colors.primary} />
          <Text style={styles.photoOptionText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoOption} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={22} color={Colors.primary} />
          <Text style={styles.photoOptionText}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBirthdayStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>When's your birthday?</Text>
      <Text style={styles.stepSubtitle}>Used for age calculation and Zodiac badge</Text>

      <View style={styles.datePickerRow}>
        <View style={styles.dateColumn}>
          <Text style={styles.dateLabel}>Month</Text>
          <ScrollView
            ref={monthScrollRef}
            style={styles.dateScroll}
            showsVerticalScrollIndicator={false}
            snapToInterval={44}
            decelerationRate="fast"
          >
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                style={[styles.dateItem, month === i && styles.dateItemActive]}
                onPress={() => {
                  setMonth(i);
                  monthScrollRef.current?.scrollTo({ y: i * 44, animated: true });
                }}
              >
                <Text style={[styles.dateItemText, month === i && styles.dateItemTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.dateColumn}>
          <Text style={styles.dateLabel}>Day</Text>
          <ScrollView
            ref={dayScrollRef}
            style={styles.dateScroll}
            showsVerticalScrollIndicator={false}
            snapToInterval={44}
            decelerationRate="fast"
          >
            {DAYS.map((d, i) => (
              <TouchableOpacity
                key={d}
                style={[styles.dateItem, day === i && styles.dateItemActive]}
                onPress={() => {
                  setDay(i);
                  dayScrollRef.current?.scrollTo({ y: i * 44, animated: true });
                }}
              >
                <Text style={[styles.dateItemText, day === i && styles.dateItemTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.dateColumn}>
          <Text style={styles.dateLabel}>Year</Text>
          <ScrollView
            ref={yearScrollRef}
            style={styles.dateScroll}
            showsVerticalScrollIndicator={false}
            snapToInterval={44}
            decelerationRate="fast"
          >
            {YEARS.map((y, i) => (
              <TouchableOpacity
                key={y}
                style={[styles.dateItem, year === i && styles.dateItemActive]}
                onPress={() => {
                  setYear(i);
                  yearScrollRef.current?.scrollTo({ y: i * 44, animated: true });
                }}
              >
                <Text style={[styles.dateItemText, year === i && styles.dateItemTextActive]}>
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  const renderUsernameStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pick a unique username</Text>
      <Text style={styles.stepSubtitle}>This is how friends & discovery find you</Text>

      <View style={styles.inputWrapper}>
        <Ionicons name="at-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="username"
          placeholderTextColor={Colors.textTertiary}
          value={username}
          onChangeText={validateUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {usernameStatus === 'checking' && <ActivityIndicator size="small" color={Colors.primary} />}
        {usernameStatus === 'valid' && <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
        {usernameStatus === 'taken' && <Ionicons name="close-circle" size={22} color={Colors.error} />}
        {usernameStatus === 'invalid' && <Ionicons name="alert-circle" size={22} color={Colors.warning} />}
      </View>

      {usernameStatus === 'taken' && <Text style={styles.errorText}>Username is already taken</Text>}
      {usernameStatus === 'invalid' && <Text style={styles.errorText}>3-20 characters, letters, numbers, and underscores</Text>}
      {usernameStatus === 'valid' && <Text style={styles.successText}>Username is available!</Text>}
    </View>
  );

  const renderGenderStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your gender?</Text>
      <Text style={styles.stepSubtitle}>Displayed on your profile</Text>

      <View style={styles.optionsGrid}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[styles.optionCard, gender === g.key && styles.optionCardActive]}
            onPress={() => setGender(g.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, gender === g.key && styles.optionTextActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderCityStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Where are you based?</Text>
      <Text style={styles.stepSubtitle}>Helps connect you with local users & events</Text>

      <View style={styles.inputWrapper}>
        <Ionicons name="location-outline" size={20} color={Colors.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Enter your city"
          placeholderTextColor={Colors.textTertiary}
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
          autoFocus
        />
      </View>
    </View>
  );

  const renderLookingForStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What are you looking for?</Text>
      <Text style={styles.stepSubtitle}>Select all that apply</Text>

      <View style={styles.chipsGrid}>
        {LOOKING_FOR_OPTIONS.map((opt) => {
          const active = lookingFor.includes(opt.key);
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleLookingFor(opt.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={opt.icon} size={20} color={active ? Colors.textOnPrimary : Colors.primary} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderInterestsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pick your interests</Text>
      <Text style={styles.stepSubtitle}>Choose at least 3 passions</Text>

      <ScrollView style={styles.interestsScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.interestsGrid}>
          {INTERESTS.map((interest) => {
            const active = interests.includes(interest);
            return (
              <TouchableOpacity
                key={interest}
                style={[styles.interestChip, active && styles.interestChipActive]}
                onPress={() => toggleInterest(interest)}
                activeOpacity={0.7}
              >
                <Text style={[styles.interestText, active && styles.interestTextActive]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Text style={styles.counterText}>{interests.length} selected (min 3)</Text>
    </View>
  );

  const renderBioStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Write a short bio</Text>
      <Text style={styles.stepSubtitle}>Tell others about your vibe</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.textInput, styles.bioInput]}
          placeholder="I love exploring new places, listening to indie music..."
          placeholderTextColor={Colors.textTertiary}
          value={bio}
          onChangeText={(t) => t.length <= 150 && setBio(t)}
          multiline
          maxLength={150}
          textAlignVertical="top"
          autoFocus
        />
      </View>
      <Text style={styles.charCount}>{bio.length}/150</Text>
    </View>
  );

  const renderComplete = () => (
    <Animated.View entering={FadeIn.duration(500)} style={styles.completeContainer}>
      <View style={styles.completeIcon}>
        <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
      </View>
      <Text style={styles.completeTitle}>You're all set!</Text>
      <Text style={styles.completeSubtitle}>Welcome to bulblu, {user?.full_name?.split(' ')[0]}</Text>

      <View style={styles.startButton}>
        <Text style={styles.startButtonText}>Redirecting...</Text>
      </View>
    </Animated.View>
  );

  const stepTitles = [
    'Location Perm', 'Storage Perm', 'Camera Perm', 'Mic Perm',
    'Photo', 'Birthday', 'Username', 'Gender', 'City', 'Looking for', 'Interests', 'Bio',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          {step < TOTAL_STEPS && (
            <>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.stepIndicator}>
                {step > 0 && (
                  <TouchableOpacity onPress={goBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <Text style={styles.stepCount}>Step {step + 1} of {TOTAL_STEPS}</Text>
                <Text style={styles.stepLabel}>{stepTitles[step]}</Text>
              </View>
            </>
          )}
        </View>

        {/* Step content */}
        <View style={styles.contentArea}>
          {renderStep()}
        </View>

        {/* Bottom button */}
        {step < TOTAL_STEPS && (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.nextButton, !canNext() && styles.nextButtonDisabled]}
              onPress={goNext}
              disabled={!canNext() || saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <Text style={styles.nextButtonText}>Saving...</Text>
              ) : (
                <Text style={styles.nextButtonText}>
                  {step === 11 ? 'Finish Profile' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + Spacing.xs : Spacing.base,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
  },
  stepCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginRight: Spacing.sm,
  },
  stepLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingTop: Spacing.xl,
  },
  stepTitle: {
    ...Typography.heading,
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  // Permission Step Styles
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  permissionIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  permissionIconCircleSuccess: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  grantedBadgeText: {
    ...Typography.bodyBold,
    color: Colors.success,
  },
  permActionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  grantButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  deniedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: Spacing.md,
    borderRadius: Radius.md,
    width: '100%',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  deniedBannerText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
  },
  settingsLink: {
    padding: Spacing.xs,
  },
  settingsLinkText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  // Photo step
  photoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.bgTertiary,
    borderWidth: 3,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholderText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  photoOption: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoOptionText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },

  // Birthday step
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    height: 220,
  },
  dateColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dateLabel: {
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  dateScroll: {
    height: 220,
  },
  dateItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.base,
  },
  dateItemActive: {
    backgroundColor: Colors.primarySoft,
  },
  dateItemText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  dateItemTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },

  // Gender step
  optionsGrid: {
    gap: Spacing.md,
  },
  optionCard: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  optionText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  optionTextActive: {
    color: Colors.primary,
  },

  // City step
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 52,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  bioInput: {
    height: 120,
    paddingTop: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  successText: {
    ...Typography.caption,
    color: Colors.success,
    marginTop: Spacing.xs,
  },

  // Looking for step
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.textOnPrimary,
  },

  // Interests step
  interestsScroll: {
    maxHeight: 320,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
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
    color: Colors.textSecondary,
  },
  interestTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  counterText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // Complete Screen
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  completeIcon: {
    marginBottom: Spacing.xl,
  },
  completeTitle: {
    ...Typography.heading,
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  completeSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing['3xl'],
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
  },
  startButtonText: {
    ...Typography.bodyBold,
    color: '#fff',
    fontSize: 16,
  },

  // Bottom Navigation
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.45,
  },
  nextButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
});
