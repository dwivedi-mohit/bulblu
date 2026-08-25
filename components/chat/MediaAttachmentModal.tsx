import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

export interface AttachmentResult {
  uri: string;
  type: 'image' | 'video' | 'file';
  name?: string;
  size?: number;
  mimeType?: string;
}

interface MediaAttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAttachment: (attachment: AttachmentResult) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MediaAttachmentModal({
  visible,
  onClose,
  onSelectAttachment,
}: MediaAttachmentModalProps) {
  const handlePickGallery = async () => {
    try {
      onClose();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow gallery access to select media.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov');
        onSelectAttachment({
          uri: asset.uri,
          type: isVideo ? 'video' : 'image',
          name: asset.fileName || (isVideo ? 'video.mp4' : 'image.jpg'),
          size: asset.fileSize,
          mimeType: asset.mimeType,
        });
      }
    } catch (err: any) {
      console.warn('Gallery pick error:', err);
    }
  };

  const handleCamera = async () => {
    try {
      onClose();
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow camera access to capture photos or videos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video' || asset.uri.endsWith('.mp4') || asset.uri.endsWith('.mov');
        onSelectAttachment({
          uri: asset.uri,
          type: isVideo ? 'video' : 'image',
          name: asset.fileName || (isVideo ? 'camera_video.mp4' : 'camera_photo.jpg'),
          size: asset.fileSize,
          mimeType: asset.mimeType,
        });
      }
    } catch (err: any) {
      console.warn('Camera capture error:', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Share Media</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {/* Gallery */}
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.75}
              onPress={handlePickGallery}
            >
              <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.iconCircle}>
                <Ionicons name="images" size={26} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.itemLabel}>Photo & Video Gallery</Text>
            </TouchableOpacity>

            {/* Camera */}
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.75}
              onPress={handleCamera}
            >
              <LinearGradient colors={['#0284C7', '#38BDF8']} style={styles.iconCircle}>
                <Ionicons name="camera" size={26} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.itemLabel}>Take Photo / Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingHorizontal: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  itemLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#1E293B',
    textAlign: 'center',
  },
});
