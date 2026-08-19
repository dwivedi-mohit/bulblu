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
  react: (postId: string, emoji: string) => api<{ reacted: boolean }>(`/api/posts/${postId}/react`, { method: 'POST', body: { emoji } }),
  comment: (postId: string, content: string, isAnonymous = true) =>
    api<any>(`/api/posts/${postId}/comment`, { method: 'POST', body: { content, is_anonymous: isAnonymous } }),
  getComments: (postId: string, page = 0) => api<any[]>(`/api/posts/${postId}/comments?page=${page}`),
  deletePost: (postId: string) => api<void>(`/api/posts/${postId}`, { method: 'DELETE' }),
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
export const voiceRoomApi = {
  create: (topic: string, isPublic = true, maxParticipants = 50) =>
    api<any>('/api/voice-rooms', { method: 'POST', body: { topic, is_public: isPublic, max_participants: maxParticipants } }),
  getRooms: () => api<any[]>('/api/voice-rooms'),
  join: (roomId: string) => api<void>(`/api/voice-rooms/${roomId}/join`, { method: 'POST' }),
  leave: (roomId: string) => api<void>(`/api/voice-rooms/${roomId}/leave`, { method: 'POST' }),
  endRoom: (roomId: string) => api<void>(`/api/voice-rooms/${roomId}`, { method: 'DELETE' }),
};

// Upload
export const uploadApi = {
  uploadImage: (uri: string) => uploadFile('/api/upload', uri, 'file'),
};

// User
export const userApi = {
  updateProfile: (data: any) => api<any>('/api/auth/me', { method: 'PUT', body: data }),
};
