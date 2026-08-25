import { create } from 'zustand';
import {
  initiateCall as socketInitiateCall,
  acceptCall as socketAcceptCall,
  rejectCall as socketRejectCall,
  endCall as socketEndCall,
} from '../lib/socket';
import { useAuthStore } from './authStore';

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'incoming_ringing' | 'outgoing_ringing' | 'connected' | 'ended';

export interface CallPartner {
  id: string;
  name: string;
  avatar?: string;
  matchId?: string;
}

interface CallState {
  callModalVisible: boolean;
  callType: CallType;
  callStatus: CallStatus;
  partner: CallPartner | null;
  duration: number;
  isInitiator: boolean;

  // Actions
  startCall: (partner: CallPartner, type: CallType) => void;
  receiveIncomingCall: (data: { matchId: string; callerId: string; callerName: string; callerAvatar?: string; callType: CallType }) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: (durationSec?: number) => void;
  setCallStatus: (status: CallStatus) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  callModalVisible: false,
  callType: 'voice',
  callStatus: 'idle',
  partner: null,
  duration: 0,
  isInitiator: false,

  startCall: (partner, type) => {
    const user = useAuthStore.getState().user;
    if (!user?.id || !partner.id) return;

    set({
      callModalVisible: true,
      callType: type,
      callStatus: 'outgoing_ringing',
      partner,
      duration: 0,
      isInitiator: true,
    });

    socketInitiateCall({
      matchId: partner.matchId || '',
      callerId: user.id,
      callerName: user.full_name || 'User',
      callerAvatar: user.avatar_url || undefined,
      receiverId: partner.id,
      callType: type,
    });
  },

  receiveIncomingCall: (data) => {
    const user = useAuthStore.getState().user;
    if (user?.id && data.callerId === user.id) return;

    set({
      callModalVisible: true,
      callType: data.callType,
      callStatus: 'incoming_ringing',
      partner: {
        id: data.callerId,
        name: data.callerName,
        avatar: data.callerAvatar,
        matchId: data.matchId,
      },
      duration: 0,
      isInitiator: false,
    });
  },

  acceptCall: () => {
    const { partner, callType } = get();
    const user = useAuthStore.getState().user;
    if (!partner || !user?.id) return;

    set({ callStatus: 'connected', callModalVisible: true });

    socketAcceptCall({
      matchId: partner.matchId || '',
      callerId: partner.id,
      receiverId: user.id,
      callType,
    });
  },

  declineCall: () => {
    const { partner } = get();
    const user = useAuthStore.getState().user;
    if (partner && user?.id) {
      socketRejectCall({
        matchId: partner.matchId || '',
        callerId: partner.id,
        receiverId: user.id,
      });
    }

    set({ callStatus: 'ended' });
    setTimeout(() => {
      get().resetCall();
    }, 1000);
  },

  endCall: (durationSec = 0) => {
    const { partner } = get();
    if (partner) {
      socketEndCall({
        matchId: partner.matchId || '',
        targetUserId: partner.id,
        duration: durationSec,
      });
    }

    set({ callStatus: 'ended' });
    setTimeout(() => {
      get().resetCall();
    }, 1000);
  },

  setCallStatus: (status) => set({ callStatus: status }),

  resetCall: () =>
    set({
      callModalVisible: false,
      callStatus: 'idle',
      partner: null,
      duration: 0,
    }),
}));
