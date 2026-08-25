import { api, uploadFile } from './api';

// Auth
export const authApi = {
  googleLogin: (idToken: string) =>
    api<{ token: string; user: any }>('/api/auth/google', {
      method: 'POST',
      body: { idToken },
    }),
};

// Matches
export const matchApi = {
  getMatches: () => api<any[]>('/api/matches'),
  startConversation: (targetUserId: string) =>
    api<{ success: boolean; matchId: string; partner?: any }>('/api/matches/start', {
      method: 'POST',
      body: { targetUserId },
    }),
  like: (userId: string) => api<{ matched: boolean }>('/api/matches/like', { method: 'POST', body: { userId } }),
  pass: (userId: string) => api<void>('/api/matches/pass', { method: 'POST', body: { userId } }),
  getDiscover: () => api<any[]>('/api/matches/discover'),
};

// Messages
export const messageApi = {
  getMessages: (matchId: string, page = 0) => api<any[]>(`/api/messages/${matchId}?page=${page}`),
  sendMessage: (matchId: string, content: string, mediaUrl = '', messageType = 'text') =>
    api<any>(`/api/messages/${matchId}`, { method: 'POST', body: { content, media_url: mediaUrl, message_type: messageType } }),
  markRead: (matchId: string) => api<void>(`/api/messages/${matchId}/read`, { method: 'PUT' }),
};

// Stories
export const storyApi = {
  create: (mediaUrl: string, mediaType: string, textOverlay = '') =>
    api<any>('/api/stories', { method: 'POST', body: { media_url: mediaUrl, media_type: mediaType, text_overlay: textOverlay } }),
  getStories: () => api<any[]>('/api/stories'),
  viewStory: (storyId: string) => api<void>(`/api/stories/${storyId}/view`, { method: 'POST' }),
  deleteStory: (storyId: string) => api<void>(`/api/stories/${storyId}`, { method: 'DELETE' }),
};

// Posts
export const postApi = {
  create: (content: string, isAnonymous = true, mediaUrl = '', mediaType = 'none') =>
    api<any>('/api/posts', { method: 'POST', body: { content, is_anonymous: isAnonymous, media_url: mediaUrl, media_type: mediaType } }),
  getFeed: (page = 0) => api<any[]>(`/api/posts?page=${page}`),
  react: (postId: string, emoji: string) => api<{ action: 'added' | 'removed'; emoji: string }>(`/api/posts/${postId}/react`, { method: 'POST', body: { emoji } }),
  comment: (postId: string, content: string, isAnonymous = true) =>
    api<any>(`/api/posts/${postId}/comment`, { method: 'POST', body: { content, is_anonymous: isAnonymous } }),
  getComments: (postId: string, page = 0) => api<any[]>(`/api/posts/${postId}/comments?page=${page}`),
  deleteComment: (postId: string, commentId: string) =>
    api<void>(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
  deletePost: (postId: string) => api<void>(`/api/posts/${postId}`, { method: 'DELETE' }),
  savePost: (postId: string) =>
    api<{ saved: boolean }>(`/api/posts/${postId}/save`, { method: 'POST' }),
  getSavedPosts: (page = 1) =>
    api<any[]>(`/api/posts/saved?page=${page}`),
  checkSaved: (postIds: string[]) =>
    api<{ saved: Record<string, boolean> }>('/api/posts/check-saved', { method: 'POST', body: { postIds } }),
};

// Companions
export const companionApi = {
  browse: (params?: { activity?: string; minPrice?: number; maxPrice?: number }) => {
    const query = new URLSearchParams();
    if (params?.activity) query.set('activity', params.activity);
    if (params?.minPrice) query.set('minPrice', String(params.minPrice));
    if (params?.maxPrice) query.set('maxPrice', String(params.maxPrice));
    const qs = query.toString();
    return api<any[]>(`/api/companions${qs ? `?${qs}` : ''}`);
  },
  getProfile: (id: string) => api<any>(`/api/companions/${id}`),
  createBooking: (data: { companion_id: string; activity: string; date: string; start_time: string; duration_hours: number; total_cents: number }) =>
    api<any>('/api/companions/bookings', { method: 'POST', body: data }),
  getBookings: (status?: string) => api<any[]>(`/api/companions/bookings${status ? `?status=${status}` : ''}`),
};

// Voice Rooms
async function unwrap<T>(p: Promise<{ data: T | null; error: string | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error);
  return data as T;
}

export const voiceRoomApi = {
  create: (topic: string, isPublic = true, maxParticipants = 50, category = 'Party') =>
    unwrap(api<any>('/api/voice-rooms', { method: 'POST', body: { topic, is_public: isPublic, max_participants: maxParticipants, category } })),
  getRooms: () => unwrap(api<any[]>('/api/voice-rooms')),
  getRoom: (roomId: string) => unwrap(api<any>(`/api/voice-rooms/${roomId}`)),
  join: (roomId: string) => unwrap(api<any>(`/api/voice-rooms/${roomId}/join`, { method: 'POST' })),
  leave: (roomId: string) => unwrap(api<void>(`/api/voice-rooms/${roomId}/leave`, { method: 'POST' })),
  endRoom: (roomId: string) => unwrap(api<void>(`/api/voice-rooms/${roomId}`, { method: 'DELETE' })),
  getLivekitToken: (roomId: string) => unwrap(api<{ token: string; wsUrl: string }>('/api/voice-rooms/livekit-token', { method: 'POST', body: { roomId } })),
  updateSettings: (roomId: string, settings: { announcement?: string; is_public?: boolean; max_participants?: number; category?: string; pin?: string }) =>
    unwrap(api<any>(`/api/voice-rooms/${roomId}/settings`, { method: 'PUT', body: settings })),
  verifyPin: (roomId: string, pin: string) => unwrap(api<{ valid: boolean }>(`/api/voice-rooms/${roomId}/verify-pin`, { method: 'POST', body: { pin } })),
  claimSeat: (roomId: string, seatIndex: number) => unwrap(api<any>(`/api/voice-rooms/${roomId}/seat`, { method: 'POST', body: { seat_index: seatIndex } })),
  releaseSeat: (roomId: string) => unwrap(api<void>(`/api/voice-rooms/${roomId}/seat`, { method: 'DELETE' })),
  changeRole: (roomId: string, userId: string, role: string) =>
    unwrap(api<void>(`/api/voice-rooms/${roomId}/role`, { method: 'PUT', body: { user_id: userId, role } })),
  kickParticipant: (roomId: string, userId: string) =>
    unwrap(api<void>(`/api/voice-rooms/${roomId}/participants/${userId}`, { method: 'DELETE' })),
  toggleMute: (roomId: string, isMuted: boolean, userId?: string) =>
    unwrap(api<void>(`/api/voice-rooms/${roomId}/mute`, { method: 'PUT', body: { is_muted: isMuted, user_id: userId } })),
  sendChat: (roomId: string, content: string) =>
    unwrap(api<any>(`/api/voice-rooms/${roomId}/chat`, { method: 'POST', body: { content } })),
  getChatHistory: (roomId: string, limit = 50, before?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.append('before', before);
    return unwrap(api<any[]>(`/api/voice-rooms/${roomId}/chat?${params.toString()}`));
  },
};

// Rent Companion Service
export const rentApi = {
  getServices: () => api<{ services: any[] }>('/api/rent/services'),
  getCompanions: (category?: string, lat?: number, lng?: number, maxDistanceKm?: number) => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (lat) params.append('lat', String(lat));
    if (lng) params.append('lng', String(lng));
    if (maxDistanceKm) params.append('maxDistanceKm', String(maxDistanceKm));
    const queryStr = params.toString();
    return api<{
      companions: any[];
      services: any[];
      activeNowCount: number;
    }>(`/api/rent/companions${queryStr ? `?${queryStr}` : ''}`);
  },
  book: (data: { companionId: string; vibe: string; style: string; perks: string[]; durationHours: number }) =>
    api<{ success: boolean; booking: any }>('/api/rent/book', { method: 'POST', body: data }),
  applyCompanion: (data: any) =>
    api<{ success: boolean; application: any; message: string }>('/api/rent/become-companion', {
      method: 'POST',
      body: data,
    }),
};

// Upload
export const uploadApi = {
  uploadImage: (uri: string) => uploadFile('/api/upload', uri, 'file'),
};

// User
export const userApi = {
  updateProfile: (data: any) => api<any>('/api/auth/me', { method: 'PUT', body: data }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
  deleteAccount: () => api<{ success: boolean; message: string }>('/api/auth/account', { method: 'DELETE' }),
};

// Admin
export const adminApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string } }>('/api/admin/login', {
      method: 'POST',
      body: { email, password },
    }),
  getStats: () =>
    api<{ applications: { pending: number; approved: number; rejected: number; total: number }; users: { total_users: number; total_companions: number } }>('/api/admin/stats'),
  getApplications: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api<{ applications: any[]; total: number; page: number; totalPages: number }>(
      `/api/admin/applications${qs ? `?${qs}` : ''}`
    );
  },
  getApplication: (id: string) => api<any>(`/api/admin/applications/${id}`),
  approveApplication: (id: string) =>
    api<{ success: boolean; message: string }>(`/api/admin/applications/${id}/approve`, { method: 'PATCH' }),
  rejectApplication: (id: string, reason?: string) =>
    api<{ success: boolean; message: string }>(`/api/admin/applications/${id}/reject`, {
      method: 'PATCH',
      body: { reason },
    }),
};

// Social
export const socialApi = {
  getProfile: (userId: string) =>
    api<{
      success: boolean;
      profile: {
        userId: string;
        ownerUserId?: string;
        name?: string;
        username: string;
        avatar?: string;
        bio?: string;
        city?: string;
        locationName?: string;
        hourlyRate?: number;
        speedCallRate?: number;
        tags?: string[];
        followersCount: number;
        followingCount: number;
        postsCount: number;
        isFollowing: boolean;
        mutualFollowersCount: number;
        posts: any[];
      };
    }>(`/api/social/profile/${userId}`),
  followUser: (followingId: string) =>
    api<{ success: boolean; isFollowing: boolean; followersCount: number; message: string }>('/api/social/follow', {
      method: 'POST',
      body: { followingId },
    }),
  createPost: (data: { imageUrl: string; caption?: string; locationName?: string }) =>
    api<{ success: boolean; post: any; message: string }>('/api/social/create-post', {
      method: 'POST',
      body: data,
    }),
  likePost: (postId: number | string) =>
    api<{ success: boolean; isLiked: boolean; likesCount: number }>('/api/social/like-post', {
      method: 'POST',
      body: { postId },
    }),
  commentPost: (postId: number | string, text: string) =>
    api<{ success: boolean; commentsCount: number }>('/api/social/comment-post', {
      method: 'POST',
      body: { postId, text },
    }),
  deletePost: (postId: number | string) =>
    api<{ success: boolean }>(`/api/social/post/${postId}`, { method: 'DELETE' }),
  getFollowers: (userId: string, page = 1) =>
    api<{ success: boolean; users: Array<{ id: string; full_name: string; username: string; avatar_url: string; isFollowing: boolean }> }>(
      `/api/social/profile/${userId}/followers?page=${page}`
    ),
  getFollowing: (userId: string, page = 1) =>
    api<{ success: boolean; users: Array<{ id: string; full_name: string; username: string; avatar_url: string; isFollowing: boolean }> }>(
      `/api/social/profile/${userId}/following?page=${page}`
    ),
};

// Notifications
export const notificationApi = {
  getNotifications: (page = 1) =>
    api<{ success: boolean; notifications: any[] }>(`/api/notifications?page=${page}`),
  getUnreadCount: () =>
    api<{ success: boolean; count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) =>
    api<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    api<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),
};
