import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  NativeModules,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
let RTCViewComponent: any = null;
if (Platform.OS !== 'web' && NativeModules.WebRTCModule) {
  try {
    RTCViewComponent = require('@livekit/react-native-webrtc').RTCView;
  } catch (e) {
    RTCViewComponent = null;
  }
}
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Avatar } from '../ui/Avatar';
import { DisplayName } from '../ui/UserText';
import { NativeWebRTCManager } from '../../lib/webrtcManager';
import { onCallSignal } from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/callStore';
import {
  playOutgoingRing,
  playIncomingRing,
  stopRingtone,
  unlockWebAudio,
} from '../../lib/ringtone';

export type CallStatus = 'idle' | 'outgoing_ringing' | 'incoming_ringing' | 'connected' | 'ended';
export type CallType = 'voice' | 'video';

function getStreamUrl(stream: any): string {
  if (!stream) return '';
  if (typeof stream.toURL === 'function') {
    const url = stream.toURL();
    if (url) return url;
  }
  if (stream.id) return String(stream.id);
  if (stream._streamId) return String(stream._streamId);
  return String(stream);
}

interface CallModalProps {
  visible: boolean;
  callType: CallType;
  callStatus: CallStatus;
  partnerId?: string;
  partnerName?: string;
  partnerAvatar?: string;
  matchId?: string;
  onAccept: () => void;
  onDecline: () => void;
  onEndCall: (durationSeconds: number) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function PulsingRings() {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const opacity1 = useSharedValue(0.6);
  const opacity2 = useSharedValue(0.4);

  useEffect(() => {
    scale1.value = withRepeat(
      withTiming(1.5, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    opacity1.value = withRepeat(
      withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    const t = setTimeout(() => {
      scale2.value = withRepeat(
        withTiming(1.6, { duration: 1600, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      opacity2.value = withRepeat(
        withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, 600);

    return () => clearTimeout(t);
  }, [opacity1, opacity2, scale1, scale2]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  return (
    <>
      <Animated.View style={[styles.pulseRing, ring1Style]} />
      <Animated.View style={[styles.pulseRing, ring2Style]} />
    </>
  );
}

export function CallModal({
  visible,
  callType,
  callStatus,
  partnerId,
  partnerName = 'User',
  partnerAvatar,
  matchId,
  onAccept,
  onDecline,
  onEndCall,
}: CallModalProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const webrtcManagerRef = useRef<NativeWebRTCManager | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const storeIsInitiator = useCallStore((s) => s.isInitiator);

  // 1. Initialize WebRTC Media & Connection when Call Connects
  useEffect(() => {
    if (callStatus === 'connected' && partnerId && currentUserId) {
      const manager = new NativeWebRTCManager(
        matchId || '',
        partnerId,
        currentUserId,
        (stream) => {
          setRemoteStream(stream);
        }
      );
      webrtcManagerRef.current = manager;

      (async () => {
        const stream = await manager.startLocalMedia(callType === 'video');
        if (stream) {
          setLocalStream(stream);
        }
        manager.initPeerConnection(storeIsInitiator, callType === 'video');
      })();
    }

    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.destroy();
        webrtcManagerRef.current = null;
      }
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [callStatus, matchId, partnerId, currentUserId, callType, storeIsInitiator]);

  // 2. Listen for Incoming WebRTC Signals
  useEffect(() => {
    const unsubSignal = onCallSignal((data) => {
      // Ignore signals sent by current user to avoid WebRTC self-loop
      if (data.senderId && currentUserId && data.senderId === currentUserId) return;

      if (data.senderId === partnerId || (matchId && data.matchId === matchId)) {
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.handleIncomingSignal(data.signal);
        }
      }
    });

    return () => {
      unsubSignal();
    };
  }, [partnerId, matchId, currentUserId]);

  // 3. Call Duration Timer & Ringtone Management
  useEffect(() => {
    unlockWebAudio();
    if (callStatus === 'outgoing_ringing') {
      playOutgoingRing();
    } else if (callStatus === 'incoming_ringing') {
      playIncomingRing();
    } else {
      stopRingtone();
    }

    if (callStatus === 'connected') {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      stopRingtone();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleEnd = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.destroy();
    }
    onEndCall(duration);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.setAudioMute(nextMuted);
    }
  };

  const handleToggleVideo = () => {
    const nextEnabled = !isVideoEnabled;
    setIsVideoEnabled(nextEnabled);
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.setVideoEnabled(nextEnabled);
    }
  };

  const handleSwitchCamera = () => {
    setIsFrontCamera((prev) => !prev);
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.switchCamera();
    }
  };

  if (!visible || callStatus === 'idle') return null;

  const showVideo = callType === 'video' && callStatus === 'connected';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleEnd}>
      <View style={styles.container}>
        {/* Web HTML5 Remote Audio/Video Player */}
        {Platform.OS === 'web' && remoteStream && (
          <View style={StyleSheet.absoluteFill}>
            <audio
              ref={(el: any) => {
                if (el && remoteStream && el.srcObject !== remoteStream) {
                  el.srcObject = remoteStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              style={{ display: 'none' }}
            />
            {showVideo && (
              <video
                ref={(el: any) => {
                  if (el && remoteStream && el.srcObject !== remoteStream) {
                    el.srcObject = remoteStream;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
          </View>
        )}

        {/* Remote Live Video Feed (Native) */}
        {showVideo && remoteStream && RTCViewComponent ? (
          <RTCViewComponent
            streamURL={getStreamUrl(remoteStream)}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            zOrder={0}
          />
        ) : (
          <LinearGradient
            colors={
              callType === 'video'
                ? ['#0A0F1D', '#0F172A', '#020617']
                : ['#042F2E', '#0F766E', '#0D9488']
            }
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.callTypeBadge}>
            <Ionicons
              name={callType === 'video' ? 'videocam' : 'call'}
              size={15}
              color="#CCFBF1"
            />
            <Text style={styles.callTypeText}>
              {callType === 'video' ? 'Live Native Video' : 'Live Native Voice'}
            </Text>
          </View>
        </View>

        {/* Center Content: Avatar View (Shown for Voice Calls or Connecting Video) */}
        {(!showVideo || !remoteStream) && (
          <View style={styles.centerBox}>
            <View style={styles.avatarWrapper}>
              <PulsingRings />
              <Avatar uri={partnerAvatar || null} userId={partnerId} size="xl" />
            </View>

            <DisplayName
              userId={partnerId}
              fallback={partnerName}
              style={styles.nameText}
              numberOfLines={1}
            />

            <Text style={styles.statusText}>
              {callStatus === 'incoming_ringing'
                ? `Incoming ${callType} call...`
                : callStatus === 'outgoing_ringing'
                ? 'Ringing...'
                : callStatus === 'connected'
                ? formatTimer(duration)
                : 'Call Ended'}
            </Text>
          </View>
        )}

        {/* Video Mode: Local Camera Floating PiP Preview */}
        {showVideo && localStream && isVideoEnabled && (
          <View style={styles.pipCamera}>
            {Platform.OS !== 'web' && RTCViewComponent ? (
              <RTCViewComponent
                streamURL={getStreamUrl(localStream)}
                style={styles.pipRtcView}
                objectFit="cover"
                mirror={isFrontCamera}
                zOrder={2}
              />
            ) : (
              <video
                ref={(el: any) => {
                  if (el && localStream && el.srcObject !== localStream) {
                    el.srcObject = localStream;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isFrontCamera ? 'scaleX(-1)' : 'none' }}
              />
            )}
          </View>
        )}

        {/* Bottom Action Controls */}
        <View style={styles.bottomBar}>
          {callStatus === 'incoming_ringing' ? (
            <View style={styles.incomingActionRow}>
              {/* Decline Button */}
              <TouchableOpacity
                onPress={onDecline}
                style={[styles.callBtn, styles.declineBtn]}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>

              {/* Accept Button */}
              <TouchableOpacity
                onPress={() => {
                  stopRingtone();
                  unlockWebAudio();
                  onAccept();
                }}
                style={[styles.callBtn, styles.acceptBtn]}
                activeOpacity={0.8}
              >
                <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={28} color="#FFFFFF" />
                <Text style={styles.btnLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activeControlsRow}>
              {/* Mute Microphone */}
              <TouchableOpacity
                onPress={handleToggleMute}
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={24}
                  color={isMuted ? '#EF4444' : '#FFFFFF'}
                />
                <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              {/* Video Specific: Flip Camera / Video Toggle */}
              {callType === 'video' ? (
                <>
                  <TouchableOpacity
                    onPress={handleSwitchCamera}
                    style={styles.controlBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
                    <Text style={styles.controlLabel}>Flip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleToggleVideo}
                    style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                      size={24}
                      color={!isVideoEnabled ? '#EF4444' : '#FFFFFF'}
                    />
                    <Text style={styles.controlLabel}>{isVideoEnabled ? 'Video Off' : 'Video On'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Voice Controls: Speaker / Earpiece Toggle */
                <TouchableOpacity
                  onPress={() => setIsSpeakerOn((v) => !v)}
                  style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
                    size={24}
                    color={isSpeakerOn ? '#14B8A6' : '#FFFFFF'}
                  />
                  <Text style={styles.controlLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
                </TouchableOpacity>
              )}

              {/* End Call Button */}
              <TouchableOpacity
                onPress={handleEnd}
                style={[styles.callBtn, styles.declineBtn]}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                <Text style={styles.btnLabel}>End</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36,
    paddingHorizontal: 24,
  },
  topBar: {
    alignItems: 'center',
    zIndex: 20,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  callTypeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#CCFBF1',
    letterSpacing: 0.3,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#14B8A6',
  },
  nameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 26,
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  statusText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 16,
    color: '#CCFBF1',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pipCamera: {
    position: 'absolute',
    top: 90,
    right: 20,
    width: 96,
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#14B8A6',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 30,
    backgroundColor: '#0F172A',
  },
  pipRtcView: {
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    width: '100%',
    alignItems: 'center',
    zIndex: 20,
  },
  incomingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  activeControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 36,
  },
  callBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  declineBtn: {
    backgroundColor: '#EF4444',
  },
  btnLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  controlLabel: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 10.5,
    color: '#E2E8F0',
    marginTop: 4,
  },
});
