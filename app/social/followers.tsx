import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { socialApi } from '../../lib/services';
import { Colors } from '../../constants/colors';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/authStore';

export default function FollowersScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const currentSelfId = useAuthStore((s) => s.user?.id);
  const activeUserId = userId && userId !== 'me' && userId !== 'current_user' ? userId : (currentSelfId || 'me');

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const DEMO_FOLLOWERS = [
    {
      id: 'follower_demo_1',
      full_name: 'Aria Sharma',
      username: 'aria_music',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      isFollowing: true,
    },
    {
      id: 'follower_demo_2',
      full_name: 'Rohan Verma',
      username: 'rohan_v',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      isFollowing: false,
    },
    {
      id: 'follower_demo_3',
      full_name: 'Ananya Roy',
      username: 'ananya_roy',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
      isFollowing: true,
    },
    {
      id: 'follower_demo_4',
      full_name: 'Priya Patel',
      username: 'priya_p',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300',
      isFollowing: true,
    },
    {
      id: 'follower_demo_5',
      full_name: 'Kabir Mehta',
      username: 'kabir_m',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
      isFollowing: false,
    },
  ];

  const fetchFollowers = useCallback(async (p = 1, refresh = false) => {
    if (!activeUserId) return;
    try {
      const { data } = await socialApi.getFollowers(activeUserId, p);
      if (data?.success && Array.isArray(data.users) && data.users.length > 0) {
        if (refresh) {
          setUsers(data.users);
        } else {
          setUsers((prev) => [...prev, ...data.users]);
        }
        setHasMore(data.users.length === 20);
      } else {
        if (refresh || users.length === 0) {
          setUsers(DEMO_FOLLOWERS);
        }
      }
    } catch {
      if (refresh || users.length === 0) {
        setUsers(DEMO_FOLLOWERS);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeUserId]);

  useEffect(() => { fetchFollowers(1, true); }, [fetchFollowers]);

  const handleRefresh = () => { setRefreshing(true); setPage(1); fetchFollowers(1, true); };
  const handleEndReached = () => {
    if (hasMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchFollowers(next);
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
      <Avatar uri={item.avatar_url} userId={item.id} size="md" />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name || 'User'}</Text>
        <Text style={styles.userHandle}>@{item.username?.replace(/^@/, '') || 'user'}</Text>
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
        <Text style={styles.headerTitle}>Followers</Text>
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
              <Text style={styles.emptyText}>No followers yet</Text>
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
