import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  Image as ImageIcon,
  Zap,
  ZapOff,
  RotateCcw,
  X,
  Send,
  Type,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

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

function getImagePickerModule() {
  if (Platform.OS !== 'web' && !hasExpoNativeModule('ImagePicker')) {
    return null;
  }
  try {
    return require('expo-image-picker');
  } catch (e) {
    return null;
  }
}

export default function StoryCreateScreen() {
  const router = useRouter();
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const handleCapture = async () => {
    const ImagePicker = getImagePickerModule();
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Camera module is not available on this build.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to take stories.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    const ImagePicker = getImagePickerModule();
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Photo library module is not available on this build.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Photo library access is needed to pick stories.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    setIsPosting(true);
    // TODO: Upload to Supabase storage + create story record
    setTimeout(() => {
      setIsPosting(false);
      router.back();
    }, 1000);
  };

  const handleDiscard = () => {
    setCapturedUri(null);
    setTextOverlay('');
    setShowTextInput(false);
  };

  if (capturedUri) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.previewContainer}>
          <View style={styles.previewImagePlaceholder}>
            <Camera size={48} color={Colors.textTertiary} />
            <Text style={styles.previewPlaceholderText}>Captured Photo</Text>
          </View>

          {showTextInput && (
            <View style={styles.textOverlayInputWrapper}>
              <TextInput
                style={styles.textOverlayInput}
                placeholder="Add text..."
                placeholderTextColor={Colors.textTertiary}
                value={textOverlay}
                onChangeText={setTextOverlay}
                autoFocus
                multiline
                textAlign="center"
              />
            </View>
          )}

          {textOverlay.length > 0 && !showTextInput && (
            <View style={styles.textOverlayBadge}>
              <Type size={14} color={Colors.textPrimary} />
              <Text style={styles.textOverlayPreview} numberOfLines={2}>
                {textOverlay}
              </Text>
            </View>
          )}

          <Pressable style={styles.closePreviewButton} onPress={handleDiscard}>
            <X size={24} color={Colors.textPrimary} />
          </Pressable>

          <View style={styles.previewTopBar}>
            <Pressable
              style={styles.textToggleButton}
              onPress={() => setShowTextInput((v) => !v)}
            >
              <Type size={20} color={showTextInput ? Colors.accentPink : Colors.textPrimary} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.previewBottomBar}
          >
            <View style={styles.previewActions}>
              <View style={styles.previewLeftActions}>
                <View style={styles.textChip}>
                  <Type size={14} color={Colors.textPrimary} />
                  <Text style={styles.textChipLabel}>Text</Text>
                </View>
              </View>

              <Pressable
                style={[styles.postButton, isPosting && styles.postButtonDisabled]}
                onPress={handlePost}
                disabled={isPosting}
              >
                <LinearGradient
                  colors={Colors.gradientPrimary}
                  style={styles.postButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Send size={18} color={Colors.textPrimary} />
                  <Text style={styles.postButtonText}>
                    {isPosting ? 'Posting...' : 'Post Story'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.viewfinder}>
        <View style={styles.viewfinderPlaceholder}>
          <Camera size={64} color={Colors.textTertiary} />
          <Text style={styles.viewfinderText}>Tap capture to take a photo</Text>
        </View>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <X size={24} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.flashToggle}>
          <Pressable
            style={[styles.flashButton, flashEnabled && styles.flashButtonActive]}
            onPress={() => setFlashEnabled((v) => !v)}
          >
            {flashEnabled ? (
              <Zap size={20} color={Colors.accentYellow} fill={Colors.accentYellow} />
            ) : (
              <ZapOff size={20} color={Colors.textPrimary} />
            )}
          </Pressable>
        </View>

        <View style={styles.bottomBar}>
          <Pressable style={styles.galleryButton} onPress={handlePickFromGallery}>
            <View style={styles.galleryIconContainer}>
              <ImageIcon size={24} color={Colors.textPrimary} />
            </View>
          </Pressable>

          <Pressable style={styles.captureButton} onPress={handleCapture}>
            <View style={styles.captureButtonOuter}>
              <LinearGradient
                colors={Colors.gradientPrimary}
                style={styles.captureButtonInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>
          </Pressable>

          <Pressable style={styles.flipButton}>
            <View style={styles.flipIconContainer}>
              <RotateCcw size={22} color={Colors.textPrimary} />
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  viewfinder: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  viewfinderPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  viewfinderText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  cancelButton: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashToggle: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.base,
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButtonActive: {
    backgroundColor: 'rgba(245,158,11,0.2)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  galleryButton: {
    padding: Spacing.sm,
  },
  galleryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  captureButton: {
    padding: Spacing.xs,
  },
  captureButtonOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  flipButton: {
    padding: Spacing.sm,
  },
  flipIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  previewImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgTertiary,
    gap: Spacing.md,
  },
  previewPlaceholderText: {
    ...Typography.body,
    color: Colors.textTertiary,
  },
  closePreviewButton: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.base,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTopBar: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.base,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  textToggleButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textOverlayInputWrapper: {
    position: 'absolute',
    top: '35%',
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  textOverlayInput: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    minHeight: 40,
  },
  textOverlayBadge: {
    position: 'absolute',
    top: '38%',
    left: Spacing.base,
    right: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  textOverlayPreview: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
  previewBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
  },
  previewLeftActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  textChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  textChipLabel: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  postButton: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  postButtonDisabled: {
    opacity: 0.6,
  },
  postButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  postButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },
});
