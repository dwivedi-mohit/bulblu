import { Platform, NativeModules } from 'react-native';
import { sendCallSignal } from './socket';

function getWebRTCModule(): any {
  if (Platform.OS !== 'web' && NativeModules.WebRTCModule) {
    try {
      return require('@livekit/react-native-webrtc');
    } catch (e) {
      console.warn('[WebRTC] Could not load @livekit/react-native-webrtc:', e);
    }
  }
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
    return {
      RTCPeerConnection: window.RTCPeerConnection || (window as any).webkitRTCPeerConnection,
      RTCIceCandidate: window.RTCIceCandidate,
      RTCSessionDescription: window.RTCSessionDescription,
      mediaDevices: navigator.mediaDevices,
      MediaStream: (window as any).MediaStream,
    };
  }
  return {};
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // Free TURN relay servers (Open Relay Project) — fallback for restrictive networks
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

export class NativeWebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private matchId: string = '';
  private targetUserId: string = '';
  private currentUserId: string = '';
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private signalSender: ((data: { matchId: string; targetUserId: string; signal: any; senderId: string }) => void) | null = null;

  // Stored listener refs so we can remove them in destroy()
  private iceCandidateHandler: ((event: any) => void) | null = null;
  private trackHandler: ((event: any) => void) | null = null;

  constructor(
    matchId: string,
    targetUserId: string,
    currentUserId: string,
    onRemoteStream?: (stream: MediaStream) => void,
    signalSender?: (data: { matchId: string; targetUserId: string; signal: any; senderId: string }) => void
  ) {
    this.matchId = matchId;
    this.targetUserId = targetUserId;
    this.currentUserId = currentUserId;
    if (onRemoteStream) {
      this.onRemoteStreamCallback = onRemoteStream;
    }
    this.signalSender = signalSender || null;
  }

  /** Inject an existing local stream instead of calling getUserMedia. */
  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  async startLocalMedia(isVideo: boolean): Promise<any | null> {
    try {
      if (Platform.OS === 'android') {
        try {
          const { PermissionsAndroid } = require('react-native');
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            PermissionsAndroid.PERMISSIONS.CAMERA,
          ]);
        } catch (e) {
          console.warn('[WebRTC] Permission request error:', e);
        }
      }

      const webrtc = getWebRTCModule();
      if (!webrtc?.mediaDevices || typeof webrtc.mediaDevices.getUserMedia !== 'function') return null;
      const videoConstraint = isVideo
        ? Platform.OS === 'web'
          ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          : true
        : false;

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          latency: { ideal: 0.01 },
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
        },
        video: videoConstraint,
      };

      const stream = await webrtc.mediaDevices.getUserMedia(constraints);
      if (stream) {
        stream.getAudioTracks().forEach((track: any) => {
          track.enabled = true;
        });
      }
      this.localStream = stream;
      return stream;
    } catch (err) {
      console.warn('[WebRTC] getUserMedia failed:', err);
      return null;
    }
  }

  initPeerConnection(isInitiator: boolean, isVideo: boolean) {
    try {
      const webrtc = getWebRTCModule();
      if (!webrtc.RTCPeerConnection) return;
      this.peerConnection = new webrtc.RTCPeerConnection(ICE_SERVERS);

      if (this.localStream) {
        this.localStream.getTracks().forEach((track: any) => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
      }

      if (this.peerConnection) {
        this.iceCandidateHandler = (event: any) => {
          if (event.candidate) {
            (this.signalSender || sendCallSignal)({
              matchId: this.matchId,
              targetUserId: this.targetUserId,
              senderId: this.currentUserId,
              signal: { candidate: event.candidate },
            });
          }
        };
        this.peerConnection.addEventListener('icecandidate', this.iceCandidateHandler);

        // ICE restart on connection failure — prevents audio stalls
        this.peerConnection.addEventListener('connectionstatechange', () => {
          const state = this.peerConnection?.connectionState;
          if (state === 'failed' || state === 'disconnected') {
            try {
              this.peerConnection?.restartIce();
              this.createOffer(true);
            } catch {}
          }
        });

        this.trackHandler = (event: any) => {
          let stream = event.streams && event.streams[0];
          if (!stream) {
            if (!this.remoteStream) {
              const MediaStreamConstructor = webrtc.MediaStream || (window as any).MediaStream;
              if (MediaStreamConstructor) {
                this.remoteStream = new MediaStreamConstructor();
              }
            }
            if (this.remoteStream && event.track) {
              this.remoteStream.addTrack(event.track);
            }
            stream = this.remoteStream;
          } else {
            this.remoteStream = stream;
          }

          if (stream) {
            if (typeof (stream as any).getAudioTracks === 'function') {
              (stream as any).getAudioTracks().forEach((t: any) => { t.enabled = true; });
            }

            if (Platform.OS === 'web') {
              try {
                let audioEl = document.getElementById('webrtc-remote-audio-player') as HTMLAudioElement;
                if (!audioEl) {
                  audioEl = document.createElement('audio');
                  audioEl.id = 'webrtc-remote-audio-player';
                  audioEl.autoplay = true;
                  audioEl.setAttribute('playsinline', 'true');
                  document.body.appendChild(audioEl);
                }
                audioEl.srcObject = stream;
                audioEl.play().catch((e) => console.warn('[WebRTC] Web audio play error:', e));
              } catch (webAudioErr) {
                console.warn('[WebRTC] Web audio element error:', webAudioErr);
              }
            }

            if (this.onRemoteStreamCallback) {
              this.onRemoteStreamCallback(stream);
            }
          }
        };
        this.peerConnection.addEventListener('track', this.trackHandler);
      }

      if (isInitiator) {
        this.createOffer(isVideo);
      }
    } catch (err) {
      console.warn('[WebRTC] PeerConnection init failed:', err);
    }
  }

  private optimizeSdp(sdp: string): string {
    return sdp
      .replace(/a=fmtp:(\d+) .*/g, (match, pt) => {
        // Prefer Opus with low-latency settings
        if (match.includes('opus')) {
          return `a=fmtp:${pt} minptime=10; useinbandfec=1; maxaveragebitrate=48000; maxplaybackrate=48000; stereo=0; cbr=1`;
        }
        return match;
      })
      .replace(/a=ptime:\d+\r\n/g, '')
      .replace(/a=maxptime:\d+\r\n/g, '')
      + 'a=ptime:10\r\n';
  }

  private async createOffer(isVideo: boolean) {
    if (!this.peerConnection) return;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      const optimizedSdp = this.optimizeSdp(offer.sdp || '');
      offer.sdp = optimizedSdp;
      await this.peerConnection.setLocalDescription(offer);

      (this.signalSender || sendCallSignal)({
        matchId: this.matchId,
        targetUserId: this.targetUserId,
        senderId: this.currentUserId,
        signal: offer,
      });
    } catch (err) {
      console.warn('[WebRTC] Create offer failed:', err);
    }
  }

  private pendingCandidates: any[] = [];

  private async processPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    const webrtc = getWebRTCModule();
    while (this.pendingCandidates.length > 0) {
      const cand = this.pendingCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(new webrtc.RTCIceCandidate(cand));
      } catch (e) {
        console.warn('[WebRTC] Add pending candidate error:', e);
      }
    }
  }

  async handleIncomingSignal(signal: any) {
    if (!this.peerConnection || !signal) return;
    const webrtc = getWebRTCModule();

    try {
      if (signal.type === 'offer') {
        if (this.peerConnection.signalingState === 'stable' || this.peerConnection.signalingState === 'have-local-offer') {
          await this.peerConnection.setRemoteDescription(new webrtc.RTCSessionDescription(signal));
          const answer = await this.peerConnection.createAnswer();
          answer.sdp = this.optimizeSdp(answer.sdp || '');
          await this.peerConnection.setLocalDescription(answer);

          (this.signalSender || sendCallSignal)({
            matchId: this.matchId,
            targetUserId: this.targetUserId,
            senderId: this.currentUserId,
            signal: answer,
          });

          await this.processPendingCandidates();
        }
      } else if (signal.type === 'answer') {
        if (this.peerConnection.signalingState === 'have-local-offer') {
          await this.peerConnection.setRemoteDescription(new webrtc.RTCSessionDescription(signal));
          await this.processPendingCandidates();
        }
      } else if (signal.candidate) {
        if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
          await this.peerConnection.addIceCandidate(new webrtc.RTCIceCandidate(signal.candidate));
        } else {
          this.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn('[WebRTC] Handle signal warning:', err);
    }
  }

  setAudioMute(isMuted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  setVideoEnabled(isEnabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = isEnabled;
      });
    }
  }

  switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any)._switchCamera === 'function') {
        (videoTrack as any)._switchCamera();
      }
    }
  }

  /** Tear down peer connection and event listeners. Does NOT stop localStream tracks — caller manages stream lifecycle. */
  destroy() {
    if (this.peerConnection) {
      // Remove listeners before closing
      if (this.iceCandidateHandler) {
        this.peerConnection.removeEventListener('icecandidate', this.iceCandidateHandler);
      }
      if (this.trackHandler) {
        this.peerConnection.removeEventListener('track', this.trackHandler);
      }
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.iceCandidateHandler = null;
    this.trackHandler = null;
    this.remoteStream = null;
    this.localStream = null;
  }
}
