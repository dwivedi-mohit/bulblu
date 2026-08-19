import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ImagePlus, X } from 'lucide-react-native';
import { Platform } from 'react-native';
import { postApi, uploadApi } from '../../lib/services';
import { Colors } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

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

const MAX_CHARS = 1000;

export default function CreatePostScreen() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canPost = content.trim().length > 0 && !isOverLimit;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleImagePick = useCallback(async () => {
    const ImagePicker = getImagePickerModule();
    if (!ImagePicker) {
      Alert.alert('Not Available', 'Image picker module is not available on this build.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageUri(null);
  }, []);

  const handlePost = useCallback(async () => {
    if (!canPost) return;

    setIsPosting(true);
    try {
      let mediaUrl = '';
      let mediaType = 'none';

      if (imageUri) {
        const { data: uploadResult } = await uploadApi.uploadImage(imageUri);
        mediaUrl = uploadResult?.url ?? '';
        mediaType = 'image';
      }

      await postApi.create(content, isAnonymous, mediaUrl, mediaType);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  }, [canPost, content, isAnonymous, imageUri, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard style={styles.textCard}>
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind?"
            placeholderTextColor={Colors.textTertiary}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={MAX_CHARS + 50}
            textAlignVertical="top"
          />
        </GlassCard>

        <View style={styles.charCounter}>
          <Text
            style={[
              styles.charCount,
              isOverLimit && styles.charCountOver,
            ]}
          >
            {charCount}/{MAX_CHARS}
          </Text>
        </View>

        {imageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <Pressable onPress={handleRemoveImage} style={styles.removeImageButton}>
              <X size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        )}

        <GlassCard style={styles.optionsCard}>
          <Pressable onPress={handleImagePick} style={styles.optionRow}>
            <ImagePlus size={20} color={Colors.textSecondary} />
            <Text style={styles.optionText}>Add Image</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => setIsAnonymous(!isAnonymous)}
            style={styles.optionRow}
          >
            <View style={styles.toggleContainer}>
              <View
                style={[
                  styles.toggle,
                  isAnonymous && styles.toggleActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    isAnonymous && styles.toggleKnobActive,
                  ]}
                />
              </View>
            </View>
            <Text style={styles.optionText}>Post as Anonymous</Text>
          </Pressable>
        </GlassCard>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          onPress={handlePost}
          disabled={!canPost}
          loading={isPosting}
        >
          Post
        </Button>
      </View>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.bodyBold,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  textCard: {
    marginBottom: Spacing.xs,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCounter: {
    alignItems: 'flex-end',
    marginBottom: Spacing.base,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  charCountOver: {
    color: Colors.error,
  },
  imagePreviewContainer: {
    marginBottom: Spacing.base,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsCard: {
    marginBottom: Spacing.base,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  optionText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: Spacing.xs,
  },
  toggleContainer: {
    width: 44,
    height: 24,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlassLight,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
});
