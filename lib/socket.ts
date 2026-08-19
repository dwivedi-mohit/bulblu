import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3000', {
      auth: () => ({ token: getAuthToken() }),
      transports: ['websocket'],
    });
  }
  return socket;
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

export function sendMessage(matchId: string, content: string, senderId: string) {
  getSocket().emit('message:send', { matchId, content, senderId });
}

export function startTyping(matchId: string, userId: string) {
  getSocket().emit('typing:start', { matchId, userId });
}

export function stopTyping(matchId: string, userId: string) {
  getSocket().emit('typing:stop', { matchId, userId });
}

export function onNewMessage(callback: (data: any) => void) {
  getSocket().on('message:receive', callback);
  return () => getSocket().off('message:receive', callback);
}

export function onTypingStart(callback: (data: any) => void) {
  getSocket().on('typing:start', callback);
  return () => getSocket().off('typing:start', callback);
}

export function onTypingStop(callback: (data: any) => void) {
  getSocket().on('typing:stop', callback);
  return () => getSocket().off('typing:stop', callback);
}

export function onPresenceOnline(callback: (userId: string) => void) {
  getSocket().on('presence:online', callback);
  return () => getSocket().off('presence:online', callback);
}

export function onPresenceOffline(callback: (userId: string) => void) {
  getSocket().on('presence:offline', callback);
  return () => getSocket().off('presence:offline', callback);
}
