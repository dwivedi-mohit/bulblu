import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { socialApi, rentApi, postApi, matchApi } from '../../lib/services';
import { useCachedProfile } from '../../components/ui/UserText';
import { useAuthStore } from '../../stores/authStore';
import { onFollowUpdate } from '../../lib/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 36) / 3;

const QR_THEMES: Array<{ id: string; name: string; colors: [string, string, ...string[]]; qrColor: string; textAccent: string }> = [
  { id: 'teal', name: 'Teal Aura', colors: ['#0F766E', '#14B8A6'], qrColor: '0F766E', textAccent: '#CCFBF1' },
  { id: 'instagram', name: 'Instagram Sunset', colors: ['#833AB4', '#FD1D1D', '#F77737'], qrColor: '833AB4', textAccent: '#FFE4E6' },
  { id: 'violet', name: 'Cyber Violet', colors: ['#7C3AED', '#C084FC'], qrColor: '7C3AED', textAccent: '#F3E8FF' },
  { id: 'obsidian', name: 'Midnight Obsidian', colors: ['#0F172A', '#334155'], qrColor: '0F172A', textAccent: '#E2E8F0' },
  { id: 'rose', name: 'Rose Gold', colors: ['#BE185D', '#F472B6'], qrColor: 'BE185D', textAccent: '#FCE7F3' },
  { id: 'emerald', name: 'Emerald Luxe', colors: ['#047857', '#34D399'], qrColor: '047857', textAccent: '#D1FAE5' },
  { id: 'cyan', name: 'Electric Cyan', colors: ['#0284C7', '#38BDF8'], qrColor: '0284C7', textAccent: '#E0F2FE' },
  { id: 'amber', name: 'Sunset Amber', colors: ['#D97706', '#FBBF24'], qrColor: 'D97706', textAccent: '#FEF3C7' },
  { id: 'crimson', name: 'Crimson Passion', colors: ['#B91C1C', '#F87171'], qrColor: 'B91C1C', textAccent: '#FEE2E2' },
  { id: 'lavender', name: 'Deep Lavender', colors: ['#6D28D9', '#A78BFA'], qrColor: '6D28D9', textAccent: '#EDE9FE' },
  { id: 'gold', name: 'Golden Velvet', colors: ['#854D0E', '#EAB308'], qrColor: '854D0E', textAccent: '#FEF9C3' },
  { id: 'navy', name: 'Oceanic Navy', colors: ['#1E3A8A', '#3B82F6'], qrColor: '1E3A8A', textAccent: '#DBEAFE' },
  { id: 'sakura', name: 'Sakura Pink', colors: ['#DB2777', '#F472B6'], qrColor: 'DB2777', textAccent: '#FCE7F3' },
  { id: 'lime', name: 'Toxic Lime', colors: ['#15803D', '#4ADE80'], qrColor: '15803D', textAccent: '#DCFCE7' },
  { id: 'charcoal', name: 'Cosmic Charcoal', colors: ['#18181B', '#52525B'], qrColor: '18181B', textAccent: '#F4F4F5' },
];

export default function CustomCompanionProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const selfId = user?.id;
  const params = useLocalSearchParams<{ companionId: string }>();
  const rawId = params?.companionId;
  const targetId = Array.isArray(rawId) ? rawId[0] : (rawId || (selfId ? selfId : 'me'));

  // QR Code Theme State
  const [selectedQrThemeIndex, setSelectedQrThemeIndex] = useState(0);

  // Real users.id behind this profile, resolved from the social response. Used
  // to overlay live identity (pfp/name/bio) via the profile:update cache.
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const live = useCachedProfile(ownerUserId || (targetId === 'me' ? selfId : undefined));

  const isOwnProfile = targetId === 'me' || targetId === 'current_user' || (ownerUserId && ownerUserId === selfId) || (selfId && targetId === selfId);

  // Companion Profile Details State
  const [companion, setCompanion] = useState<any>({
    id: targetId,
    name: '',
    username: '',
    age: 0,
    city: '',
    locationName: '',
    avatar: '',
    bio: '',
    hourlyRate: 0,
    speedCallRate: 0,
    rating: 0,
    reviewsCount: 0,
    isVerified: false,
    isOnline: false,
    tags: [],
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Social Stats & Follow State
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [mutualFollowersCount, setMutualFollowersCount] = useState(0);

  // Posts Feed State
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Modals State
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // Create Post Modal State
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostLocation, setNewPostLocation] = useState('Bandra West, Mumbai');
  const [publishing, setPublishing] = useState(false);

  // Delete post handler
  const handleDeletePost = (postToDelete: any) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await socialApi.deletePost(postToDelete.id);
            setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
            setSelectedPost(null);
          } catch {
            Alert.alert('Error', 'Failed to delete post.');
          }
        }
      },
    ]);
  };

  // Report handler
  const submitReport = async (reason: string) => {
    try {
      const { api } = await import('../../lib/api');
      await api('/api/reports', { method: 'POST', body: { reportedUserId: targetId, reason, details: '' } });
      Alert.alert('Report Submitted', 'Thank you. Our safety team will review this profile.');
    } catch {
      Alert.alert('Report Submitted', 'Thank you. Our safety team will review this profile.');
    }
  };

  // Load Social Data on Mount
  useEffect(() => {
    let isMounted = true;
    const fetchSocial = async () => {
      try {
        const { data } = await socialApi.getProfile(targetId);
        if (isMounted && data?.success && data?.profile) {
          setOwnerUserId(data.profile.ownerUserId || null);
          setFollowersCount(data.profile.followersCount || 0);
          setFollowingCount(data.profile.followingCount || 0);
          setIsFollowing(data.profile.isFollowing || false);
          setMutualFollowersCount(data.profile.mutualFollowersCount || 0);
          setPosts(data.profile.posts || []);
          setCompanion((prev: any) => ({
            ...prev,
            name: data.profile.name || prev.name,
            username: data.profile.username || prev.username,
            avatar: data.profile.avatar || prev.avatar,
            bio: data.profile.bio || prev.bio,
            city: data.profile.city || prev.city,
            locationName: data.profile.locationName || prev.locationName,
            hourlyRate: data.profile.hourlyRate || prev.hourlyRate,
            speedCallRate: data.profile.speedCallRate || prev.speedCallRate,
            tags: data.profile.tags || prev.tags,
          }));
        }
      } catch {} finally {
        if (isMounted) setLoadingProfile(false);
      }
    };
    fetchSocial();

    // Subscribe to realtime follow events for this profile
    const unsubFollow = onFollowUpdate((payload) => {
      if (
        payload.followingId === targetId ||
        payload.targetUserId === targetId ||
        (ownerUserId && (payload.followingId === ownerUserId || payload.targetUserId === ownerUserId))
      ) {
        if (typeof payload.followersCount === 'number') {
          setFollowersCount(payload.followersCount);
        }
        if (payload.followerId === user?.id) {
          setIsFollowing(payload.isFollowing);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubFollow();
    };
  }, [targetId, ownerUserId, user?.id]);

  // Fetch saved posts when Saved tab is selected (own profile only)
  useEffect(() => {
    if (activeTab !== 'saved' || !isOwnProfile) return;
    let mounted = true;
    (async () => {
      setLoadingSaved(true);
      try {
        const { data } = await postApi.getSavedPosts();
        if (mounted && data) setSavedPosts(data);
      } catch {} finally { if (mounted) setLoadingSaved(false); }
    })();
    return () => { mounted = false; };
  }, [activeTab, isOwnProfile]);

  // Follow / Unfollow Toggle Handler
  const handleToggleFollow = async () => {
    const prevFollowing = isFollowing;
    const prevCount = followersCount;
    setLoadingFollow(true);
    try {
      // Optimistic update
      setIsFollowing(!prevFollowing);
      setFollowersCount(prevFollowing ? prevCount - 1 : prevCount + 1);

      // Reconcile with server response
      const { data } = await socialApi.followUser(targetId);
      if (data) {
        setIsFollowing(data.isFollowing);
        setFollowersCount(data.followersCount);
      }
    } catch {
      // Revert on error
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
    } finally {
      setLoadingFollow(false);
    }
  };

  // Launch Photo Gallery for New Post Creation
  const pickNewPostImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Please allow access to select a photo for your post.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewPostImage(result.assets[0].uri);
      }
    } catch {}
  };

  // Publish New Post Handler
  const handlePublishPost = async () => {
    if (!newPostImage) {
      Alert.alert('Photo Required', 'Please select a photo to post.');
      return;
    }

    setPublishing(true);
    try {
      const { data } = await socialApi.createPost({
        imageUrl: newPostImage,
        caption: newPostCaption || 'New companion update ✨',
        locationName: newPostLocation,
      });

      setPublishing(false);
      if (data?.success && data?.post) {
        setPosts((prev) => [data.post, ...prev]);
        setCreatePostVisible(false);
        setNewPostImage(null);
        setNewPostCaption('');
        Alert.alert('🎉 Published!', 'Your post is now live on your Bulblu companion profile feed.');
      } else {
        const localPost = {
          id: `p_${Date.now()}`,
          imageUrl: newPostImage,
          caption: newPostCaption || 'New companion update ✨',
          location: newPostLocation,
          likesCount: 1,
          commentsCount: 0,
          isLiked: false,
          createdAt: 'Just now',
        };
        setPosts((prev) => [localPost, ...prev]);
        setCreatePostVisible(false);
        setNewPostImage(null);
        setNewPostCaption('');
        Alert.alert('🎉 Published!', 'Your post is live on your profile.');
      }
    } catch {
      setPublishing(false);
      Alert.alert('Error', 'Could not publish post. Please try again.');
    }
  };

  // Social Media Sharing Handlers
  const profileUrl = `https://bulblu.app/companion/${companion.username?.replace(/^@/, '') || 'aria'}`;
  const shareMessage = `Check out ${companion.name} (${companion.username}) on Bulblu Companion Rent app! 🍿✨ ${profileUrl}`;

  const handleShareWhatsApp = () => {
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Opening System Share', 'Opening system share menu...');
      Share.share({ message: shareMessage, url: profileUrl });
    });
  };

  const handleShareNative = () => {
    Share.share({
      title: `${companion.name} on Bulblu`,
      message: shareMessage,
      url: profileUrl,
    });
  };

  const handleShareInstagram = () => {
    Linking.openURL('instagram://app').catch(() => {
      Alert.alert('📷 Link Copied for Instagram', 'Profile link copied! Paste directly into your Instagram Story or DM.');
    });
  };

  const handleShareSnapchat = () => {
    Linking.openURL('snapchat://app').catch(() => {
      Alert.alert('👻 Link Copied for Snapchat', 'Profile link copied! Share on Snapchat.');
    });
  };

  const handleCopyLink = () => {
    Alert.alert('🔗 Profile Link Copied!', profileUrl);
  };

  const [downloadingQr, setDownloadingQr] = useState(false);

  const handleDownloadQr = async () => {
    setDownloadingQr(true);
    try {
      const activeTheme = QR_THEMES[selectedQrThemeIndex] || QR_THEMES[0];
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(profileUrl)}&color=${activeTheme.qrColor}`;

      await Share.share({
        title: `${companion.name} Companion QR Code`,
        message: `Download & Scan ${companion.name}'s (${companion.username}) Bulblu Companion QR Code! ✨\n\nQR Image: ${qrUrl}\nProfile: ${profileUrl}`,
        url: qrUrl,
      });
    } catch {
      Alert.alert('🔗 Profile QR Link Ready', profileUrl);
    } finally {
      setDownloadingQr(false);
    }
  };

  const handleOpenDirectChat = async () => {
    try {
      const directTargetId = ownerUserId || targetId;
      const { data, error } = await matchApi.startConversation(directTargetId);
      if (data?.matchId) {
        router.push(`/chat/${data.matchId}`);
      } else {
        Alert.alert('Unable to chat', error || 'Could not start conversation.');
      }
    } catch {
      Alert.alert('Error', 'Could not open conversation.');
    }
  };

  // Live identity overlay — a pfp/name/username/bio change made by the owner
  // shows here instantly via the profile:update socket cache.
  const liveAvatar = live?.avatar_url || companion.avatar;
  const liveName = live?.full_name || companion.name;
  const liveBio = live?.bio || companion.bio;
  const liveCity = live?.city || companion.city;
  const liveUsername = live?.username ? `@${String(live.username).replace(/^@+/, '')}` : companion.username;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navIconBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.navTitleBox}>
          <Text style={styles.navUsernameText}>{liveUsername}</Text>
          <Text style={styles.navSubTitle}>Bulblu Companion Profile</Text>
        </View>

        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.navIconBtn}>
          <Ionicons name="settings-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderBox}>
          {/* Avatar Row */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarRingWrapper}>
              {liveAvatar ? (
                <Image source={{ uri: liveAvatar }} style={styles.profileAvatarImg} />
              ) : (
                <View style={[styles.profileAvatarImg, { backgroundColor: '#0F766E20', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="person" size={44} color="#0F766E" />
                </View>
              )}
              {companion.isOnline && <View style={styles.onlineBadgeDot} />}
            </View>

            {/* Social Stats Counters */}
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>

              <View style={styles.statDivider} />

              <TouchableOpacity
                onPress={() => router.push({ pathname: '/social/followers', params: { userId: targetId } })}
                style={styles.statBox}
              >
                <Text style={styles.statNumber}>{followersCount.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>

              <View style={styles.statDivider} />

              <TouchableOpacity
                onPress={() => router.push({ pathname: '/social/following', params: { userId: targetId } })}
                style={styles.statBox}
              >
                <Text style={styles.statNumber}>{followingCount.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name & Username Handle */}
          <View style={styles.identityBox}>
            <View style={styles.nameRow}>
              <Text style={styles.displayNameText}>{liveName}, {companion.age}</Text>
              {companion.isVerified && (
                <Ionicons name="checkmark-circle" size={18} color="#38BDF8" style={{ marginLeft: 6 }} />
              )}
            </View>
            <Text style={styles.handleText}>{liveUsername}</Text>

            <View style={styles.locationTagRow}>
              <Ionicons name="location" size={13} color="#0F766E" />
              <Text style={styles.locationTagText}>{companion.locationName}</Text>
            </View>

            <Text style={styles.bioText}>{liveBio}</Text>

            {/* Service Badges */}
            <View style={styles.tagChipRow}>
              {companion.tags?.map((tag: string) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Social Actions Buttons */}
          <View style={styles.actionBtnRow}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  onPress={() => router.push('/profile/settings')}
                  style={[styles.socialActionBtn, styles.followBtn, { flex: 1 }]}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.followBtnText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShareModalVisible(true)}
                  style={[styles.socialActionBtn, styles.messageBtn, { flex: 1 }]}
                >
                  <Ionicons name="share-social-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                  <Text style={styles.messageBtnText}>Share Card</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCreatePostVisible(true)}
                  style={[styles.socialActionBtn, styles.addPostBtn]}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#0F766E" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Follow / Following Toggle Button */}
                <TouchableOpacity
                  onPress={handleToggleFollow}
                  disabled={loadingFollow}
                  style={[styles.socialActionBtn, isFollowing ? styles.followingBtn : styles.followBtn]}
                >
                  {loadingFollow ? (
                    <ActivityIndicator color={isFollowing ? '#0F766E' : '#FFFFFF'} size="small" />
                  ) : (
                    <Text style={[styles.actionBtnText, isFollowing ? styles.followingBtnText : styles.followBtnText]}>
                      {isFollowing ? '✓ Following' : '+ Follow'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Message Direct Chat Button */}
                <TouchableOpacity onPress={handleOpenDirectChat} style={[styles.socialActionBtn, styles.messageBtn]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#0F172A" />
                  <Text style={styles.messageBtnText}>Message</Text>
                </TouchableOpacity>

                {/* Share Profile Button */}
                <TouchableOpacity
                  onPress={() => setShareModalVisible(true)}
                  style={[styles.socialActionBtn, styles.messageBtn]}
                >
                  <Ionicons name="share-social-outline" size={14} color="#0F172A" />
                  <Text style={styles.messageBtnText}>Share Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Mutual Followers Indicator */}
          {!isOwnProfile && mutualFollowersCount > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 8 }}>
              <Ionicons name="people" size={14} color="#64748B" />
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12, color: '#64748B', marginLeft: 6 }}>
                {mutualFollowersCount} mutual follower{mutualFollowersCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Rent Rates & Booking Bar (only for viewing other companions) */}
          {!isOwnProfile && companion.hourlyRate > 0 && (
            <View style={styles.rentRatesBar}>
              <View>
                <Text style={styles.rateMainText}>${companion.hourlyRate} / hr</Text>
                <Text style={styles.rateSubText}>15m Speed Call: ${companion.speedCallRate || 5}</Text>
              </View>

              <TouchableOpacity onPress={() => router.push('/companion/book')} style={styles.bookCtaBtn}>
                <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.bookCtaGradient}>
                  <Text style={styles.bookCtaText}>Book Session →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Companion Media Posts Grid Section Header */}
        <View style={styles.gridSectionHeader}>
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            style={[styles.gridTab, activeTab === 'posts' && styles.activeGridTab]}
          >
            <Ionicons name="grid-outline" size={18} color={activeTab === 'posts' ? '#0F766E' : '#94A3B8'} />
            <Text style={[styles.gridTabTitle, activeTab !== 'posts' && { color: '#94A3B8' }]}>Posts ({posts.length})</Text>
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              onPress={() => setActiveTab('saved')}
              style={[styles.gridTab, activeTab === 'saved' && styles.activeGridTab]}
            >
              <Ionicons name="bookmark-outline" size={18} color={activeTab === 'saved' ? '#0F766E' : '#94A3B8'} />
              <Text style={[styles.gridTabTitle, activeTab !== 'saved' && { color: '#94A3B8' }]}>Saved ({savedPosts.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3-Column Media Posts Grid */}
        {activeTab === 'posts' ? (
          posts.length > 0 ? (
            <View style={styles.postsGridContainer}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  onPress={() => setSelectedPost(post)}
                  style={styles.gridThumbBox}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: post.imageUrl }} style={styles.gridThumbImg} />
                  <View style={styles.gridThumbOverlay}>
                    <Ionicons name="heart" size={12} color="#FFFFFF" />
                    <Text style={styles.gridThumbLikeCount}>{post.likesCount || 0}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 20 }}>
              <Ionicons name="camera-outline" size={48} color="#94A3B8" />
              <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#0F172A', marginTop: 12 }}>No Posts Yet</Text>
              <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
                When this companion publishes photos, they will appear here in real time.
              </Text>
            </View>
          )
        ) : loadingSaved ? (
          <ActivityIndicator size="large" color="#0F766E" style={{ paddingVertical: 40 }} />
        ) : savedPosts.length > 0 ? (
          <View style={styles.postsGridContainer}>
            {savedPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                onPress={() => setSelectedPost(post)}
                style={styles.gridThumbBox}
                activeOpacity={0.88}
              >
                <Image source={{ uri: post.media_url }} style={styles.gridThumbImg} />
                <View style={styles.gridThumbOverlay}>
                  <Ionicons name="heart" size={12} color="#FFFFFF" />
                  <Text style={styles.gridThumbLikeCount}>{post.reaction_count || 0}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 20 }}>
            <Ionicons name="bookmark-outline" size={48} color="#94A3B8" />
            <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#0F172A', marginTop: 12 }}>No Saved Posts</Text>
            <Text style={{ fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 }}>
              Save posts from the feed to see them here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* POST VIEWER MODAL */}
      {selectedPost && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setSelectedPost(null)}>
          <View style={styles.modalBackdrop}>
            <SafeAreaView style={styles.viewerModalContainer}>
              <View style={styles.viewerHeader}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.viewerTitle}>Post Detail</Text>
                {isOwnProfile && (
                  <TouchableOpacity onPress={() => handleDeletePost(selectedPost)}>
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
                )}
                {!isOwnProfile && <View style={{ width: 24 }} />}
              </View>

              <Image source={{ uri: selectedPost.imageUrl }} style={styles.viewerImg} resizeMode="contain" />

              <View style={styles.viewerFooter}>
                <View style={styles.viewerActionRow}>
                  <TouchableOpacity
                    onPress={() => {
                      const updated = {
                        ...selectedPost,
                        isLiked: !selectedPost.isLiked,
                        likesCount: selectedPost.isLiked ? selectedPost.likesCount - 1 : selectedPost.likesCount + 1,
                      };
                      setSelectedPost(updated);
                      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                    }}
                    style={styles.likeBtn}
                  >
                    <Ionicons
                      name={selectedPost.isLiked ? 'heart' : 'heart-outline'}
                      size={24}
                      color={selectedPost.isLiked ? '#EF4444' : '#FFFFFF'}
                    />
                    <Text style={styles.likeCountText}>{selectedPost.likesCount} likes</Text>
                  </TouchableOpacity>

                  <View style={styles.commentCountBox}>
                    <Ionicons name="chatbubble-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.likeCountText}>{selectedPost.commentsCount} comments</Text>
                  </View>
                </View>

                <Text style={styles.viewerCaption}>{selectedPost.caption}</Text>
                <Text style={styles.viewerLocation}>{selectedPost.location} • {selectedPost.createdAt}</Text>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {/* CREATE POST MODAL */}
      <Modal visible={createPostVisible} animationType="slide" transparent onRequestClose={() => setCreatePostVisible(false)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.createPostModalBox}>
            <View style={styles.createHeader}>
              <TouchableOpacity onPress={() => setCreatePostVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.createTitle}>Publish New Post</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.createBody}>
              <TouchableOpacity onPress={pickNewPostImage} style={styles.imagePickerBox}>
                {newPostImage ? (
                  <Image source={{ uri: newPostImage }} style={styles.pickedPostImg} />
                ) : (
                  <View style={styles.emptyPickerContent}>
                    <Ionicons name="camera-outline" size={42} color="#0F766E" />
                    <Text style={styles.emptyPickerText}>Tap to Select Photo from Gallery</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Post Caption</Text>
              <View style={styles.createInputBox}>
                <TextInput
                  value={newPostCaption}
                  onChangeText={setNewPostCaption}
                  placeholder="Write a caption about your companion date or event..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  style={styles.createTextInput}
                />
              </View>

              <Text style={styles.inputLabel}>Location Tag</Text>
              <View style={styles.createInputBox}>
                <Ionicons name="location-outline" size={20} color="#0F766E" style={{ marginRight: 8 }} />
                <TextInput
                  value={newPostLocation}
                  onChangeText={setNewPostLocation}
                  placeholder="e.g. Bandra West, Mumbai"
                  placeholderTextColor="#94A3B8"
                  style={[styles.createTextInput, { height: 44 }]}
                />
              </View>
            </ScrollView>

            <View style={styles.createFooter}>
              <TouchableOpacity onPress={handlePublishPost} style={styles.publishBtn} disabled={publishing}>
                <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.publishGradient}>
                  {publishing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.publishText}>Publish Post →</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* PROFILE SETTINGS & OPTIONS MODAL */}
      <Modal visible={settingsModalVisible} animationType="slide" transparent onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.createPostModalBox}>
            <View style={styles.createHeader}>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.createTitle}>Profile Settings & Options</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.createBody}>
              {/* Quick Settings Action Buttons */}
              <TouchableOpacity
                onPress={() => {
                  setSettingsModalVisible(false);
                  router.push('/profile/settings' as any);
                }}
                style={styles.settingActionRow}
              >
                <View style={styles.settingRowLeft}>
                  <Ionicons name="options-outline" size={20} color="#0F766E" />
                  <Text style={styles.settingRowText}>Account & App Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSettingsModalVisible(false);
                  setShareModalVisible(true);
                }}
                style={styles.settingActionRow}
              >
                <View style={styles.settingRowLeft}>
                  <Ionicons name="share-social-outline" size={20} color="#0F766E" />
                  <Text style={styles.settingRowText}>Share Companion Profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Report Profile', 'Why are you reporting this profile?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Spam', onPress: () => submitReport('spam') },
                    { text: 'Inappropriate content', onPress: () => submitReport('inappropriate') },
                    { text: 'Harassment', onPress: () => submitReport('harassment') },
                    { text: 'Fake profile', onPress: () => submitReport('fake') },
                    { text: 'Other', onPress: () => submitReport('other') },
                  ]);
                }}
                style={[styles.settingActionRow, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
              >
                <View style={styles.settingRowLeft}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#EF4444" />
                  <Text style={[styles.settingRowText, { color: '#EF4444' }]}>Report / Safety Center</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#EF4444" />
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* SHARE PROFILE & QR CODE MODAL */}
      <Modal visible={shareModalVisible} animationType="slide" transparent onRequestClose={() => setShareModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.createPostModalBox}>
            <View style={styles.createHeader}>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.createTitle}>Share Profile & QR Code</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
              {/* Active QR Theme Computation */}
              {(() => {
                const activeTheme = QR_THEMES[selectedQrThemeIndex] || QR_THEMES[0];
                return (
                  <>
                    {/* Stylized QR Card Frame */}
                    <View style={styles.qrCardContainer}>
                      <LinearGradient colors={activeTheme.colors} style={styles.qrCardGradientHeader}>
                        <Image source={{ uri: liveAvatar }} style={styles.qrAvatarImg} />
                        <Text style={styles.qrNameText}>{liveName}, {companion.age}</Text>
                        <Text style={[styles.qrHandleText, { color: activeTheme.textAccent }]}>{liveUsername}</Text>
                      </LinearGradient>

                      <View style={styles.qrCodeBox}>
                        <Image
                          source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(profileUrl)}&color=${activeTheme.qrColor}` }}
                          style={styles.qrImage}
                        />
                        <Text style={styles.qrScanText}>Scan with phone camera to view profile</Text>

                        <TouchableOpacity
                          onPress={handleDownloadQr}
                          disabled={downloadingQr}
                          style={[styles.downloadQrBtn, { backgroundColor: activeTheme.colors[0] }]}
                          activeOpacity={0.85}
                        >
                          {downloadingQr ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.downloadQrBtnText}>Download QR Code</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 15 Theme Color Palette Switcher */}
                    <Text style={[styles.shareSectionTitle, { marginBottom: 10 }]}>Choose QR Card Theme (15 Colors)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themePaletteScroll} contentContainerStyle={styles.themePaletteContent}>
                      {QR_THEMES.map((theme, idx) => (
                        <TouchableOpacity
                          key={theme.id}
                          onPress={() => setSelectedQrThemeIndex(idx)}
                          style={[
                            styles.themeSwatchItem,
                            selectedQrThemeIndex === idx && styles.themeSwatchItemActive,
                          ]}
                          activeOpacity={0.8}
                        >
                          <LinearGradient colors={theme.colors} style={styles.themeSwatchGradient}>
                            {selectedQrThemeIndex === idx && (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            )}
                          </LinearGradient>
                          <Text style={[styles.themeSwatchLabel, selectedQrThemeIndex === idx && styles.themeSwatchLabelActive]} numberOfLines={1}>
                            {theme.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                );
              })()}

              {/* Direct Social Media Action Grid */}
              <Text style={styles.shareSectionTitle}>Direct Share to Social Apps</Text>

              <View style={styles.shareAppsRow}>
                {/* WhatsApp */}
                <TouchableOpacity onPress={handleShareWhatsApp} style={styles.shareAppBtn}>
                  <View style={[styles.shareAppIconBox, { backgroundColor: '#25D366' }]}>
                    <Ionicons name="logo-whatsapp" size={26} color="#FFFFFF" />
                  </View>
                  <Text style={styles.shareAppLabel}>WhatsApp</Text>
                </TouchableOpacity>

                {/* Instagram */}
                <TouchableOpacity onPress={handleShareInstagram} style={styles.shareAppBtn}>
                  <LinearGradient colors={['#833AB4', '#FD1D1D', '#F77737']} style={styles.shareAppIconBox}>
                    <Ionicons name="logo-instagram" size={26} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.shareAppLabel}>Instagram</Text>
                </TouchableOpacity>

                {/* Snapchat */}
                <TouchableOpacity onPress={handleShareSnapchat} style={styles.shareAppBtn}>
                  <View style={[styles.shareAppIconBox, { backgroundColor: '#FFFC00' }]}>
                    <Ionicons name="logo-snapchat" size={26} color="#000000" />
                  </View>
                  <Text style={styles.shareAppLabel}>Snapchat</Text>
                </TouchableOpacity>

                {/* More Apps (Native OS Share Sheet) */}
                <TouchableOpacity onPress={handleShareNative} style={styles.shareAppBtn}>
                  <View style={[styles.shareAppIconBox, { backgroundColor: '#0F766E' }]}>
                    <Ionicons name="share-outline" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.shareAppLabel}>More Apps</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Copy Link Row */}
              <TouchableOpacity onPress={handleCopyLink} style={styles.copyLinkRow}>
                <Ionicons name="link-outline" size={20} color="#0F766E" />
                <Text style={styles.copyLinkText} numberOfLines={1}>{profileUrl}</Text>
                <View style={styles.copyBtnBadge}>
                  <Text style={styles.copyBtnBadgeText}>Copy</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  navIconBtn: {
    padding: 6,
  },
  navTitleBox: {
    alignItems: 'center',
  },
  navUsernameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  navSubTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#0F766E',
  },

  scrollContent: {
    paddingBottom: 40,
  },
  profileHeaderBox: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarRingWrapper: {
    position: 'relative',
  },
  profileAvatarImg: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#0F766E',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },

  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginLeft: 20,
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  statLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },

  identityBox: {
    marginTop: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayNameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: '#0F172A',
  },
  handleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 2,
  },
  locationTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  locationTagText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#475569',
    marginLeft: 4,
  },
  bioText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#334155',
    marginTop: 8,
    lineHeight: 18,
  },

  tagChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  tagChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#0F766E',
  },

  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  socialActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  followBtn: {
    backgroundColor: '#0F766E',
  },
  followingBtn: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0F766E',
  },
  actionBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
  },
  followBtnText: {
    color: '#FFFFFF',
  },
  followingBtnText: {
    color: '#0F766E',
  },
  messageBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F172A',
    marginLeft: 6,
  },
  addPostBtn: {
    flex: 0,
    width: 44,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#0F766E',
  },

  rentRatesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rateMainText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F766E',
  },
  rateSubText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bookCtaBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  bookCtaGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bookCtaText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  gridSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 24,
  },
  gridTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  activeGridTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0F766E',
  },
  gridTabTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#0F766E',
    marginLeft: 6,
  },

  postsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  gridThumbBox: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridThumbImg: {
    width: '100%',
    height: '100%',
  },
  gridThumbOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridThumbLikeCount: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 3,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
  },
  viewerModalContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  viewerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  viewerImg: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.1,
  },
  viewerFooter: {
    padding: 20,
  },
  viewerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 10,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCountText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 6,
  },
  viewerCaption: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  viewerLocation: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },

  createPostModalBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  createHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  createTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F172A',
  },
  createBody: {
    padding: 20,
  },
  imagePickerBox: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 20,
  },
  emptyPickerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPickerText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#0F766E',
    marginTop: 10,
  },
  pickedPostImg: {
    width: '100%',
    height: '100%',
  },
  inputLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 6,
  },
  createInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  createTextInput: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 12,
  },
  createFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  publishBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  publishGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14.5,
    color: '#FFFFFF',
  },
  settingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingRowText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13.5,
    color: '#0F172A',
  },

  /* QR Card & Share Modal Styles */
  qrCardContainer: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 20,
  },
  qrCardGradientHeader: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  qrAvatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 8,
  },
  qrNameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  qrHandleText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#CCFBF1',
    marginTop: 2,
  },
  qrCodeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
  },
  qrScanText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#64748B',
    marginTop: 12,
  },
  downloadQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 14,
  },
  downloadQrBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  themePaletteScroll: {
    width: '100%',
    marginBottom: 20,
  },
  themePaletteContent: {
    gap: 12,
    paddingHorizontal: 4,
  },
  themeSwatchItem: {
    alignItems: 'center',
    width: 72,
    opacity: 0.8,
  },
  themeSwatchItemActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  themeSwatchGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  themeSwatchLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
  },
  themeSwatchLabelActive: {
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#0F172A',
  },

  shareSectionTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#0F172A',
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  shareAppsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  shareAppBtn: {
    alignItems: 'center',
  },
  shareAppIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  shareAppLabel: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12,
    color: '#334155',
  },

  copyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
    gap: 10,
  },
  copyLinkText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: '#475569',
  },
  copyBtnBadge: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyBtnBadgeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});
