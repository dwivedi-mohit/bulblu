import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { socialApi } from '../../lib/services';
import { Colors } from '../../constants/colors';

export default function FollowingScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFollowing = useCallback(async (p = 1, refresh = false) => {
    if (!userId) return;
    try {
      const { data } = await socialApi.getFollowing(userId, p);
      if (data?.success) {
        if (refresh) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setHasMore(data.users.length === 20);
      }
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { fetchFollowing(1, true); }, [fetchFollowing]);

  const handleRefresh = () => { setRefreshing(true); setPage(1); fetchFollowing(1, true); };
  const handleEndReached = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchFollowing(next);
    }
  };

  const handleToggleFollow = async (targetId: string, index: number) => {
    setUsers((prev) => prev.map((u, i) => i === index ? { ...u, isFollowing: !u.isFollowing } : u));
    try { await socialApi.followUser(targetId); } catch {
      setUsers((prev) => prev.map((u, i) => i === index ? { ...u, isFollowing: !u.isFollowing } : u));
    }
  };

  const renderUser = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity style={styles.userRow} onPress={() => router.push(`/companion/${item.id}`)}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={styles.avatarFallback}>{(item.full_name || 'U')[0]}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name || 'User'}</Text>
        <Text style={styles.userHandle}>@{item.username || 'user'}</Text>
      </View>
      <TouchableOpacity
        onPress={() => handleToggleFollow(item.id, index)}
        style={[styles.followBtn, item.isFollowing && styles.followingBtn]}
      >
        <Text style={[styles.followBtnText, item.isFollowing && styles.followingBtnText]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>Not following anyone yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: Colors.textPrimary },
  list: { paddingVertical: 8 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: Colors.primary },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: Colors.textPrimary },
  userHandle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textTertiary, marginTop: 1 },
  followBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.borderMedium },
  followBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textInverse },
  followingBtnText: { color: Colors.textPrimary },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textTertiary, marginTop: 12 },
});
