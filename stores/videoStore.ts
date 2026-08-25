import { create } from 'zustand';
import { NativeWebRTCManager } from '../lib/webrtcManager';
import {
  joinVideoQueue,
  leaveVideoQueue,
  sendVideoSignal,
  endVideoChat,
  sendVideoText,
} from '../lib/socket';
import { useAuthStore } from './authStore';

export type VideoStatus = 'idle' | 'searching' | 'connecting' | 'connected' | 'ended';

export interface VideoMessage {
  senderId: string;
  senderName: string;
  content: string;
  created_at: string;
}

interface VideoState {
  status: VideoStatus;
  roomId: string | null;
  partner: { id: string; name: string; avatar: string } | null;
  localStream: any | null;
  remoteStream: any | null;
  isMuted: boolean;
  isVideoOff: boolean;
  textMessages: VideoMessage[];
  peerManager: NativeWebRTCManager | null;
  isInitiator: boolean;

  startSearching: () => Promise<void>;
  stopSearching: () => void;
  skip: () => void;
  end: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  sendText: (content: string) => void;
  handleMatched: (data: any) => void;
  handleSignal: (data: { signal: any; senderId: string }) => void;
  handlePartnerLeft: () => void;
}

/** Stop all tracks on a stream and null the ref. */
function stopStream(stream: any) {
  if (stream && typeof stream.getTracks === 'function') {
    stream.getTracks().forEach((t: any) => t.stop());
  }
}

export const useVideoStore = create<VideoState>((set, get) => ({
  status: 'idle',
  roomId: null,
  partner: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  textMessages: [],
  peerManager: null,
  isInitiator: false,

  startSearching: async () => {
    const { peerManager: oldManager, localStream: oldStream } = get();
    const user = useAuthStore.getState().user;
    if (!user?.id) return;

    // Clean up any previous state
    oldManager?.destroy();
    stopStream(oldStream);

    set({ status: 'searching', textMessages: [], remoteStream: null, localStream: null, peerManager: null });

    // Get camera/mic
    const manager = new NativeWebRTCManager('', '', user.id);
    const localStream = await manager.startLocalMedia(true);
    if (!localStream) {
      set({ status: 'idle' });
      return;
    }

    set({ localStream, peerManager: manager });
    joinVideoQueue({
      userId: user.id,
      name: user.full_name || 'User',
      avatar: user.avatar_url || '',
    });
  },

  stopSearching: () => {
    const { peerManager, localStream } = get();
    leaveVideoQueue();
    peerManager?.destroy();
    stopStream(localStream);
    set({
      status: 'idle',
      roomId: null,
      partner: null,
      localStream: null,
      remoteStream: null,
      peerManager: null,
      isMuted: false,
      isVideoOff: false,
      textMessages: [],
    });
  },

  skip: () => {
    const { roomId, peerManager, localStream } = get();
    const user = useAuthStore.getState().user;
    if (roomId && user?.id) {
      endVideoChat({ roomId, senderId: user.id });
    }
    peerManager?.destroy();
    // Stop old tracks — startSearching will get a fresh camera
    stopStream(localStream);
    set({
      status: 'searching',
      roomId: null,
      partner: null,
      localStream: null,
      remoteStream: null,
      peerManager: null,
      isMuted: false,
      isVideoOff: false,
      textMessages: [],
    });
    // Re-enter queue with fresh camera
    get().startSearching();
  },

  end: () => {
    const { roomId, peerManager, localStream } = get();
    const user = useAuthStore.getState().user;
    if (roomId && user?.id) {
      endVideoChat({ roomId, senderId: user.id });
    }
    peerManager?.destroy();
    stopStream(localStream);
    leaveVideoQueue();
    set({
      status: 'idle',
      roomId: null,
      partner: null,
      localStream: null,
      remoteStream: null,
      peerManager: null,
      isMuted: false,
      isVideoOff: false,
      textMessages: [],
    });
  },

  toggleMute: () => {
    const { isMuted, peerManager } = get();
    peerManager?.setAudioMute(!isMuted);
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { isVideoOff, peerManager } = get();
    peerManager?.setVideoEnabled(isVideoOff);
    set({ isVideoOff: !isVideoOff });
  },

  sendText: (content: string) => {
    const { roomId } = get();
    const user = useAuthStore.getState().user;
    if (!roomId || !user?.id || !content.trim()) return;

    sendVideoText({
      roomId,
      senderId: user.id,
      senderName: user.full_name || 'User',
      content: content.trim(),
    });

    // Add to local state
    set((s) => ({
      textMessages: [
        ...s.textMessages,
        {
          senderId: user.id,
          senderName: user.full_name || 'User',
          content: content.trim(),
          created_at: new Date().toISOString(),
        },
      ],
    }));
  },

  handleMatched: (data: any) => {
    const user = useAuthStore.getState().user;
    const { localStream, peerManager: oldManager } = get();

    // Destroy old manager (but don't stop localStream — we reuse it)
    oldManager?.destroy();

    const manager = new NativeWebRTCManager(
      data.roomId,
      data.partnerId,
      user?.id || '',
      (stream: any) => {
        set({ remoteStream: stream, status: 'connected' });
      },
      (signalData) => {
        sendVideoSignal({
          roomId: data.roomId,
          signal: signalData.signal,
          senderId: user?.id || '',
        });
      }
    );

    // Reuse existing localStream — no second getUserMedia call
    if (localStream) {
      manager.setLocalStream(localStream);
    }
    manager.initPeerConnection(data.youAreInitiator, true);

    set({
      status: 'connecting',
      roomId: data.roomId,
      partner: {
        id: data.partnerId,
        name: data.partnerName,
        avatar: data.partnerAvatar,
      },
      isInitiator: data.youAreInitiator,
      peerManager: manager,
      textMessages: [],
    });
  },

  handleSignal: (data: { signal: any; senderId: string }) => {
    const { peerManager } = get();
    if (peerManager) {
      peerManager.handleIncomingSignal(data.signal);
    }
  },

  handlePartnerLeft: () => {
    const { peerManager, localStream } = get();
    peerManager?.destroy();
    // Stop camera when partner leaves — go to ended state
    stopStream(localStream);
    set({
      status: 'ended',
      partner: null,
      localStream: null,
      remoteStream: null,
      peerManager: null,
      roomId: null,
    });
  },
}));
