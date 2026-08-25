import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PasswordUnlockModal } from '../../components/voice/PasswordUnlockModal';
import { useAuthStore } from '../../stores/authStore';
import { voiceRoomApi } from '../../lib/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = ['All', 'Party', 'Friends', 'Game', 'Music', 'Dating', 'VIP'];

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  Game: { color: '#D97706', bg: '#FEF3C7' },
  Friends: { color: '#E11D48', bg: '#FFE4E6' },
  Music: { color: '#0284C7', bg: '#E0F2FE' },
  VIP: { color: '#7C3AED', bg: '#EDE9FE' },
  Party: { color: '#0F766E', bg: '#CCFBF1' },
  Dating: { color: '#EC4899', bg: '#FCE7F3' },
};

interface VoiceRoomItem {
  id: string;
  topic: string;
  hostName: string;
  hostAvatar: string;
  category: string;
  participantCount: number;
  isPublic: boolean;
  pinHash: string;
}

export default function VoiceScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLockedRoom, setSelectedLockedRoom] = useState<VoiceRoomItem | null>(null);
  const [rooms, setRooms] = useState<VoiceRoomItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await voiceRoomApi.getRooms();
      setRooms(data.map((r: any) => ({
        id: r.id,
        topic: r.topic || 'Untitled Room',
        hostName: r.host_username || 'Host',
        hostAvatar: r.host_avatar || '',
        category: r.category || 'Party',
        participantCount: parseInt(r.participant_count) || 0,
        isPublic: r.is_public,
        pinHash: r.pin_hash || '',
      })));
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  }, [fetchRooms]);

  const filteredRooms = rooms.filter((r) => {
    const matchCat = selectedCategory === 'All' || r.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch = !searchQuery || r.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleRoomClick = (room: VoiceRoomItem) => {
    if (room.pinHash) {
      setSelectedLockedRoom(room);
    } else {
      router.push({
        pathname: `/voice/${room.id}` as any,
        params: { roomTitle: room.topic, hostName: room.hostName, hostAvatar: room.hostAvatar },
      });
    }
  };

  const handlePinUnlock = async (pin: string) => {
    if (!selectedLockedRoom) return;
    try {
      const { valid } = await voiceRoomApi.verifyPin(selectedLockedRoom.id, pin);
      if (valid) {
        const r = selectedLockedRoom;
        setSelectedLockedRoom(null);
        router.push({
          pathname: `/voice/${r.id}` as any,
          params: { roomTitle: r.topic, hostName: r.hostName, hostAvatar: r.hostAvatar },
        });
      }
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>Voice Party Lounge</Text>
        <TouchableOpacity
          onPress={() => router.push('/voice/create')}
          style={styles.createBtn}
        >
          <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.createBtnGradient}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search voice rooms..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              >
                <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F766E" />}
        >
          {filteredRooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No rooms found</Text>
              <Text style={styles.emptySubtext}>Create one to get started!</Text>
            </View>
          ) : (
            filteredRooms.map((room) => {
              const catColors = CATEGORY_COLORS[room.category] || CATEGORY_COLORS.Party;
              return (
                <TouchableOpacity
                  key={room.id}
                  onPress={() => handleRoomClick(room)}
                  activeOpacity={0.7}
                  style={styles.roomRowItem}
                >
                  <View style={styles.coverWrapper}>
                    {room.hostAvatar ? (
                      <Image source={{ uri: room.hostAvatar }} style={styles.coverImage} />
                    ) : (
                      <View style={[styles.coverImage, styles.coverPlaceholder]}>
                        <Ionicons name="mic" size={24} color="#94A3B8" />
                      </View>
                    )}
                    {!room.isPublic && (
                      <View style={styles.lockOverlayBadge}>
                        <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.middleInfo}>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {room.topic}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.categoryTag, { backgroundColor: catColors.bg }]}>
                        <Text style={[styles.categoryTagText, { color: catColors.color }]}>{room.category}</Text>
                      </View>
                      <View style={styles.listenerRow}>
                        <Ionicons name="person" size={12} color="#94A3B8" style={{ marginRight: 3 }} />
                        <Text style={styles.listenerCountText}>{room.participantCount}</Text>
                      </View>
                      <Text style={styles.hostText}>by {room.hostName}</Text>
                    </View>
                  </View>

                  <View style={styles.rightColumn}>
                    <LinearGradient
                      colors={['#EC4899', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.statusPill}
                    >
                      <Ionicons name="star" size={11} color="#FEF08A" style={{ marginRight: 4 }} />
                      <Text style={styles.statusPillText}>Live</Text>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <PasswordUnlockModal
        visible={!!selectedLockedRoom}
        onClose={() => setSelectedLockedRoom(null)}
        roomTitle={selectedLockedRoom?.topic || 'Private Room'}
        expectedPin=""
        onUnlockSuccess={() => {}}
        onVerifyPin={async (pin) => {
          if (!selectedLockedRoom) return false;
          try {
            const { valid } = await voiceRoomApi.verifyPin(selectedLockedRoom.id, pin);
            if (valid) {
              const r = selectedLockedRoom;
              setSelectedLockedRoom(null);
              router.push({
                pathname: `/voice/${r.id}` as any,
                params: { roomTitle: r.topic, hostName: r.hostName, hostAvatar: r.hostAvatar },
              });
            }
            return valid;
          } catch { return false; }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
  },
  headerTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color: '#0F172A' },
  createBtn: { borderRadius: 18, overflow: 'hidden' },
  createBtnGradient: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, gap: 4,
  },
  createBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 13, color: '#FFFFFF' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 14, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: '#0F172A' },
  categoriesWrapper: { height: 40, marginBottom: 4 },
  categoriesContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  categoryPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  categoryPillActive: { backgroundColor: '#CCFBF1', borderColor: '#0F766E' },
  categoryPillText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 12.5, color: '#64748B' },
  categoryPillTextActive: { fontFamily: 'SpaceGrotesk-Bold', color: '#0F766E' },
  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 90 },
  roomRowItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  coverWrapper: {
    position: 'relative', width: 58, height: 58, borderRadius: 18,
    overflow: 'hidden', backgroundColor: '#F1F5F9',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  lockOverlayBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', borderRadius: 8, padding: 3,
  },
  middleInfo: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  roomTitle: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: '#0F172A', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  categoryTagText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 10.5 },
  listenerRow: { flexDirection: 'row', alignItems: 'center' },
  listenerCountText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 11.5, color: '#64748B' },
  hostText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: '#94A3B8' },
  rightColumn: { alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, shadowColor: '#EC4899', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  statusPillText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 11, color: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: '#64748B' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, gap: 8 },
  emptyText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#64748B' },
  emptySubtext: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: '#94A3B8' },
});
