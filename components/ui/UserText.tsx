import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useAuthStore, CachedProfile } from '../../stores/authStore';

/**
 * Live profile identity readers.
 *
 * Every screen fetches user data with its own field names (`name` vs
 * `full_name`, `avatar` vs `pfp_url`), so instead of rewriting those fetches we
 * overlay whatever the 'profile:update' socket event has told us, keyed by the
 * stable users.id. The fetched value stays as the fallback.
 *
 * Use the components at map-loop render sites (calling a hook inside a loop in
 * a screen body is illegal); use useCachedProfile in single-instance bodies.
 */

export function useCachedProfile(userId?: string | null): CachedProfile | undefined {
  return useAuthStore((s) => (userId ? s.profileCache[userId] : undefined));
}

interface UserTextProps {
  userId?: string | null;
  fallback?: string | null;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function DisplayName({ userId, fallback, style, numberOfLines }: UserTextProps) {
  const profile = useCachedProfile(userId);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {profile?.full_name || fallback || 'Unknown'}
    </Text>
  );
}

interface UsernameProps extends UserTextProps {
  prefix?: string;
}

export function Username({ userId, fallback, style, numberOfLines, prefix = '@' }: UsernameProps) {
  const profile = useCachedProfile(userId);
  // The social profile endpoint already returns '@'-prefixed handles while the
  // users table does not, so normalize before re-applying the prefix.
  const raw = profile?.username || fallback || '';
  const bare = String(raw).replace(/^@+/, '');
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {bare ? `${prefix}${bare}` : ''}
    </Text>
  );
}

export function Bio({ userId, fallback, style, numberOfLines }: UserTextProps) {
  const profile = useCachedProfile(userId);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {profile?.bio || fallback || ''}
    </Text>
  );
}

export function City({ userId, fallback, style, numberOfLines }: UserTextProps) {
  const profile = useCachedProfile(userId);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {profile?.city || fallback || ''}
    </Text>
  );
}
