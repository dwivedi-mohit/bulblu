import { io, Socket } from 'socket.io-client';
import { getAuthToken, API_URL } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getAuthToken();
    socket = io(API_URL, {
      auth: { token: token || undefined },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
      forceNew: false,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server successfully:', socket?.id);
    });

    socket.on('connect_error', () => {});
    socket.on('error', () => {});
    if (socket.io) {
      socket.io.on('error', () => {});
      socket.io.on('reconnect_error', () => {});
      socket.io.on('reconnect_failed', () => {});
    }
  }
  return socket;
}

export function onSocketConnect(callback: () => void) {
  getSocket().on('connect', callback);
  return () => {
    getSocket().off('connect', callback);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function identifyUser(userId: string) {
  getSocket().emit('auth:identify', userId);
}

export function joinMatch(matchId: string) {
  getSocket().emit('room:join', `match:${matchId}`);
}

export function leaveMatch(matchId: string) {
  getSocket().emit('room:leave', `match:${matchId}`);
}

export function sendMessage(matchId: string, content: string, senderId: string, mediaUrl?: string, messageType?: string) {
  getSocket().emit('message:send', { matchId, content, senderId, media_url: mediaUrl, message_type: messageType });
}

export function startTyping(matchId: string, userId: string) {
  getSocket().emit('typing:start', { matchId, userId });
}

export function stopTyping(matchId: string, userId: string) {
  getSocket().emit('typing:stop', { matchId, userId });
}

export function onNewMessage(callback: (data: any) => void) {
  getSocket().on('message:receive', callback);
  return () => { getSocket().off('message:receive', callback); };
}

export function onTypingStart(callback: (data: any) => void) {
  getSocket().on('typing:start', callback);
  return () => { getSocket().off('typing:start', callback); };
}

export function onTypingStop(callback: (data: any) => void) {
  getSocket().on('typing:stop', callback);
  return () => { getSocket().off('typing:stop', callback); };
}

export function onPresenceOnline(callback: (userId: string) => void) {
  getSocket().on('presence:online', callback);
  return () => {
    getSocket().off('presence:online', callback);
  };
}

export function onPresenceOffline(callback: (userId: string) => void) {
  getSocket().on('presence:offline', callback);
  return () => {
    getSocket().off('presence:offline', callback);
  };
}

// Ask the server for a user's current presence. The reply comes back as a
// normal presence:online / presence:offline event on this socket, so existing
// onPresenceOnline / onPresenceOffline listeners pick it up.
export function checkPresence(userId: string) {
  getSocket().emit('presence:check', userId);
}

export interface ProfileUpdatePayload {
  userId: string;
  avatar_url?: string;
  username?: string;
  full_name?: string;
  bio?: string;
  city?: string;
  interests?: string;
  looking_for?: string;
  gender?: string;
  date_of_birth?: string;
}

export function onProfileUpdate(callback: (data: ProfileUpdatePayload) => void) {
  getSocket().on('profile:update', callback);
  return () => {
    getSocket().off('profile:update', callback);
  };
}

export function joinPersonalRoom(userId: string) {
  getSocket().emit('room:join', `user:${userId}`);
}

export interface FollowUpdatePayload {
  followerId: string;
  followingId?: string;
  targetUserId?: string;
  followerName: string;
  isFollowing: boolean;
  followersCount: number;
}

export function onFollowUpdate(callback: (data: FollowUpdatePayload) => void) {
  getSocket().on('follow:update', callback);
  return () => {
    getSocket().off('follow:update', callback);
  };
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export function onNotificationNew(callback: (data: NotificationPayload) => void) {
  getSocket().on('notification:new', callback);
  return () => {
    getSocket().off('notification:new', callback);
  };
}

export interface CallPayload {
  matchId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  callType: 'voice' | 'video';
}

export function initiateCall(data: CallPayload) {
  getSocket().emit('call:initiate', data);
}

export function acceptCall(data: { matchId: string; callerId: string; receiverId: string; callType: 'voice' | 'video' }) {
  getSocket().emit('call:accept', data);
}

export function rejectCall(data: { matchId: string; callerId: string; receiverId: string; reason?: string }) {
  getSocket().emit('call:reject', data);
}

export function endCall(data: { matchId: string; targetUserId: string; duration?: number }) {
  getSocket().emit('call:end', data);
}

export function sendCallSignal(data: { matchId: string; targetUserId: string; signal: any; senderId: string }) {
  getSocket().emit('call:signal', data);
}

export function onIncomingCall(callback: (data: CallPayload) => void) {
  getSocket().on('call:incoming', callback);
  return () => {
    getSocket().off('call:incoming', callback);
  };
}

export function onCallAccepted(callback: (data: { matchId: string; callerId: string; receiverId: string; callType: 'voice' | 'video' }) => void) {
  getSocket().on('call:accepted', callback);
  return () => {
    getSocket().off('call:accepted', callback);
  };
}

export function onCallRejected(callback: (data: { matchId: string; callerId: string; receiverId: string; reason?: string }) => void) {
  getSocket().on('call:rejected', callback);
  return () => {
    getSocket().off('call:rejected', callback);
  };
}

export function onCallEnded(callback: (data: { matchId: string; targetUserId: string; duration?: number }) => void) {
  getSocket().on('call:ended', callback);
  return () => {
    getSocket().off('call:ended', callback);
  };
}

export function onCallSignal(callback: (data: { matchId: string; targetUserId: string; signal: any; senderId: string }) => void) {
  getSocket().on('call:signal', callback);
  return () => {
    getSocket().off('call:signal', callback);
  };
}

// ── Random Video Chat (Omegle-style) ───────────────────────────────────

export function joinVideoQueue(data: { userId: string; name: string; avatar: string }) {
  getSocket().emit('video:join-queue', data);
}

export function leaveVideoQueue() {
  getSocket().emit('video:leave-queue');
}

export function sendVideoSignal(data: { roomId: string; signal: any; senderId: string }) {
  getSocket().emit('video:signal', data);
}

export function endVideoChat(data: { roomId: string; senderId: string }) {
  getSocket().emit('video:end', data);
}

export function sendVideoText(data: { roomId: string; senderId: string; senderName: string; content: string }) {
  getSocket().emit('video:text-send', data);
}

export interface VideoMatchPayload {
  roomId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar: string;
  youAreInitiator: boolean;
}

export function onVideoMatched(callback: (data: VideoMatchPayload) => void) {
  getSocket().on('video:matched', callback);
  return () => { getSocket().off('video:matched', callback); };
}

export function onVideoSignal(callback: (data: { roomId: string; signal: any; senderId: string }) => void) {
  getSocket().on('video:signal', callback);
  return () => { getSocket().off('video:signal', callback); };
}

export function onVideoPartnerLeft(callback: (data: { roomId: string; partnerId: string }) => void) {
  getSocket().on('video:partner-left', callback);
  return () => { getSocket().off('video:partner-left', callback); };
}

export function onVideoWaiting(callback: () => void) {
  getSocket().on('video:waiting', callback);
  return () => { getSocket().off('video:waiting', callback); };
}

export function onVideoTextReceive(callback: (data: { roomId: string; senderId: string; senderName: string; content: string; created_at: string }) => void) {
  getSocket().on('video:text-receive', callback);
  return () => { getSocket().off('video:text-receive', callback); };
}

export function reportVideoUser(data: { roomId: string; reportedUserId: string; reason: string; reporterId: string }) {
  getSocket().emit('video:report', data);
}

// ── Voice Room Events ────────────────────────────────────────────────

export function joinVoiceRoom(roomId: string, userId: string) {
  getSocket().emit('voice-room:join', { roomId, userId });
}

export function leaveVoiceRoom(roomId: string, userId: string) {
  getSocket().emit('voice-room:leave', { roomId, userId });
}

export function sendVoiceRoomChat(roomId: string, userId: string, content: string) {
  getSocket().emit('voice-room:chat', { roomId, userId, content });
}

export function updateVoiceRoomSeat(roomId: string, userId: string, seatIndex: number, action: 'claim' | 'release') {
  getSocket().emit('voice-room:seat-update', { roomId, userId, seatIndex, action });
}

export function toggleVoiceRoomMute(roomId: string, userId: string, isMuted: boolean) {
  getSocket().emit('voice-room:mute', { roomId, userId, isMuted });
}

export function changeVoiceRoomRole(roomId: string, userId: string, role: string, requesterId: string) {
  getSocket().emit('voice-room:role-change', { roomId, userId, role, requesterId });
}

export function updateVoiceRoomSettings(roomId: string, settings: any, requesterId: string) {
  getSocket().emit('voice-room:settings-update', { roomId, settings, requesterId });
}

export function sendVoiceRoomGameEvent(roomId: string, gameType: string, payload: any) {
  getSocket().emit('voice-room:game-event', { roomId, gameType, payload });
}

export function sendVoiceRoomSoundboard(roomId: string, sfxId: string, userId: string) {
  getSocket().emit('voice-room:soundboard', { roomId, sfxId, userId });
}

export function onVoiceRoomChat(callback: (data: any) => void) {
  getSocket().on('voice-room:chat', callback);
  return () => { getSocket().off('voice-room:chat', callback); };
}

export function onVoiceRoomSeatUpdate(callback: (data: any[]) => void) {
  getSocket().on('voice-room:seat-update', callback);
  return () => { getSocket().off('voice-room:seat-update', callback); };
}

export function onVoiceRoomMute(callback: (data: { userId: string; isMuted: boolean }) => void) {
  getSocket().on('voice-room:mute', callback);
  return () => { getSocket().off('voice-room:mute', callback); };
}

export function onVoiceRoomRoleChange(callback: (data: { userId: string; role: string }) => void) {
  getSocket().on('voice-room:role-change', callback);
  return () => { getSocket().off('voice-room:role-change', callback); };
}

export function onVoiceRoomParticipantJoin(callback: (data: { userId: string; timestamp: number }) => void) {
  getSocket().on('voice-room:participant-join', callback);
  return () => { getSocket().off('voice-room:participant-join', callback); };
}

export function onVoiceRoomParticipantLeave(callback: (data: { userId: string; timestamp: number }) => void) {
  getSocket().on('voice-room:participant-leave', callback);
  return () => { getSocket().off('voice-room:participant-leave', callback); };
}

export function onVoiceRoomSettingsUpdate(callback: (data: any) => void) {
  getSocket().on('voice-room:settings-update', callback);
  return () => { getSocket().off('voice-room:settings-update', callback); };
}

export function onVoiceRoomGameEvent(callback: (data: { gameType: string; payload: any }) => void) {
  getSocket().on('voice-room:game-event', callback);
  return () => { getSocket().off('voice-room:game-event', callback); };
}

export function onVoiceRoomSoundboard(callback: (data: { sfxId: string; userId: string }) => void) {
  getSocket().on('voice-room:soundboard', callback);
  return () => { getSocket().off('voice-room:soundboard', callback); };
}

// ── Ludo Multiplayer Socket Helpers ─────────────────────────────────────

export function joinLudoGame(gameId: string, userId: string, name: string, avatar: string) {
  getSocket().emit('ludo:join', { gameId, userId, name, avatar });
}

export function rollLudoDice(gameId: string, userId: string) {
  getSocket().emit('ludo:roll-dice', { gameId, userId });
}

export function moveLudoToken(gameId: string, userId: string, tokenId: number) {
  getSocket().emit('ludo:move-token', { gameId, userId, tokenId });
}

export function leaveLudoGame(gameId: string, userId: string) {
  getSocket().emit('ludo:leave', { gameId, userId });
}

export function onLudoStateUpdate(callback: (state: any) => void) {
  getSocket().on('ludo:state-update', callback);
  return () => { getSocket().off('ludo:state-update', callback); };
}

export function onLudoError(callback: (err: { message: string }) => void) {
  getSocket().on('ludo:error', callback);
  return () => { getSocket().off('ludo:error', callback); };
}
