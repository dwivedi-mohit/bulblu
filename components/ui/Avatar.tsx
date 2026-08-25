import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Radius, Layout } from '../../constants/spacing';
import { useAuthStore } from '../../stores/authStore';
import { getApiUrl } from '../../lib/api';

interface AvatarProps {
  uri: string | null;
  userId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  isOnline?: boolean;
  showStory?: boolean;
  isVerified?: boolean;
  companionId?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const sizeMap = {
  sm: Layout.avatarSm,
  md: Layout.avatarMd,
  lg: Layout.avatarLg,
  xl: Layout.avatarXl,
};

export function Avatar({
  uri,
  userId,
  size = 'md',
  showOnline = false,
  isOnline,
  showStory = false,
  isVerified = false,
  companionId,
  onPress,
  style,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const selfId = useAuthStore((s) => s.user?.id);
  const isSelf = userId && userId === selfId;
  const cachedAvatar = useAuthStore((s) => (userId ? s.profileCache[userId]?.avatar_url : undefined));
  const selfAvatar = useAuthStore((s) => (isSelf ? s.user?.avatar_url : undefined));
  // For the current user, always prefer the live store value over the cache
  // (the cache may be stale after a PFP upload). For other users, prefer cache.
  const rawUri = isSelf ? (selfAvatar || cachedAvatar || uri) : (cachedAvatar || uri);

  let resolvedUri = rawUri;
  if (resolvedUri && typeof resolvedUri === 'string' && resolvedUri.startsWith('/uploads/')) {
    resolvedUri = `${getApiUrl()}${resolvedUri}`;
  }

  // A new avatar (e.g. arriving live over the socket) deserves a fresh attempt,
  // otherwise one earlier load failure would pin us to the fallback icon.
  useEffect(() => {
    setImgError(false);
  }, [resolvedUri]);

  const isValidUri = resolvedUri && typeof resolvedUri === 'string' && resolvedUri.trim().length > 0 && !imgError;

  const dimension = sizeMap[size];
  const ringWidth = showStory ? 3 : 0;
  const totalSize = dimension + ringWidth * 2;
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 22 : size === 'lg' ? 30 : 38;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (companionId) {
      router.push(`/companion/${companionId}`);
    }
  };

  const avatarContent = (
    <View style={[{ width: totalSize, height: totalSize, position: 'relative' }, style]}>
      {showStory && (
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: Radius.full },
          ]}
        />
      )}
      {isValidUri ? (
        <Image
          source={{ uri: resolvedUri! }}
          onError={() => setImgError(true)}
          style={{
            width: dimension,
            height: dimension,
            borderRadius: Radius.full,
            marginTop: ringWidth,
            marginLeft: ringWidth,
          }}
        />
      ) : (
        <View
          style={{
            width: dimension,
            height: dimension,
            borderRadius: Radius.full,
            backgroundColor: '#0F766E20',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: ringWidth,
            marginLeft: ringWidth,
            borderWidth: 1,
            borderColor: '#0F766E40',
          }}
        >
          <Ionicons name="person" size={iconSize} color="#0F766E" />
        </View>
      )}

      {/* Online / Offline status indicator */}
      {(showOnline || isOnline !== undefined) && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(10, dimension * 0.28),
            height: Math.max(10, dimension * 0.28),
            borderRadius: Radius.full,
            backgroundColor: isOnline === false ? '#EF4444' : '#10B981',
            borderWidth: 2,
            borderColor: Colors.bgPrimary,
          }}
        />
      )}

      {/* Verified badge */}
      {isVerified && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            backgroundColor: Colors.primary,
            borderRadius: Radius.full,
            padding: 2,
          }}
        >
          <Ionicons name="checkmark-circle" size={Math.max(12, dimension * 0.28)} color="#FFFFFF" />
        </View>
      )}
    </View>
  );

  if (onPress || companionId) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        {avatarContent}
      </TouchableOpacity>
    );
  }

  return avatarContent;
}
