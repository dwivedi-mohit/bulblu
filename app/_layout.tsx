import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../stores/authStore';
import { useCallStore } from '../stores/callStore';
import { Colors } from '../constants/colors';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { NotificationToast } from '../components/ui/NotificationToast';
import { CallModal } from '../components/call/CallModal';
import {
  onProfileUpdate,
  onSocketConnect,
  identifyUser,
  joinPersonalRoom,
  onFollowUpdate,
  onNotificationNew,
  onIncomingCall,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
} from '../lib/socket';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [splashDone, setSplashDone] = useState(false);

  // Global Call State
  const callModalVisible = useCallStore((s) => s.callModalVisible);
  const callType = useCallStore((s) => s.callType);
  const callStatus = useCallStore((s) => s.callStatus);
  const callPartner = useCallStore((s) => s.partner);
  const receiveIncomingCall = useCallStore((s) => s.receiveIncomingCall);
  const acceptCall = useCallStore((s) => s.acceptCall);
  const declineCall = useCallStore((s) => s.declineCall);
  const endCall = useCallStore((s) => s.endCall);
  const setCallStatus = useCallStore((s) => s.setCallStatus);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
      const timer = setTimeout(() => {
        setSplashDone(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  useEffect(() => {
    const identify = () => {
      const id = useAuthStore.getState().user?.id;
      if (id) identifyUser(id);
    };

    identify();

    const unsubStore = useAuthStore.subscribe((state, prev) => {
      if (state.user?.id && state.user.id !== prev.user?.id) identify();
    });

    const unsubConnect = onSocketConnect(() => {
      identify();
      const id = useAuthStore.getState().user?.id;
      if (id) joinPersonalRoom(id);
      useAuthStore.getState().clearOtherProfiles();
      useAuthStore.getState().refreshProfile();
    });

    const unsubProfile = onProfileUpdate((patch) => {
      useAuthStore.getState().applyProfileUpdate(patch);
    });

    const unsubFollow = onFollowUpdate((data) => {
      useAuthStore.getState().applyProfileUpdate({
        userId: data.followerId,
        followersCount: data.followersCount,
      } as any);
    });

    const unsubNotification = onNotificationNew(() => {
      useAuthStore.getState().incrementNotificationCount();
    });

    // Global Call Listeners
    const unsubIncoming = onIncomingCall((data) => {
      const currentUserId = useAuthStore.getState().user?.id;
      if (data.receiverId === currentUserId || !data.receiverId) {
        receiveIncomingCall(data);
      }
    });

    const unsubAccepted = onCallAccepted(() => {
      setCallStatus('connected');
    });

    const unsubRejected = onCallRejected(() => {
      setCallStatus('ended');
      setTimeout(() => useCallStore.getState().resetCall(), 1200);
    });

    const unsubEnded = onCallEnded(() => {
      setCallStatus('ended');
      setTimeout(() => useCallStore.getState().resetCall(), 1200);
    });

    return () => {
      unsubStore();
      unsubConnect();
      unsubProfile();
      unsubFollow();
      unsubNotification();
      unsubIncoming();
      unsubAccepted();
      unsubRejected();
      unsubEnded();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgPrimary }}>
      <StatusBar style="dark" />
      <NotificationToast />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bgPrimary },
        }}
      />
      {!splashDone && (
        <AnimatedSplash onFinish={() => setSplashDone(true)} />
      )}

      {/* Global Voice & Video Call Modal */}
      <CallModal
        visible={callModalVisible}
        callType={callType}
        callStatus={callStatus}
        partnerId={callPartner?.id}
        partnerName={callPartner?.name}
        partnerAvatar={callPartner?.avatar}
        matchId={callPartner?.matchId}
        onAccept={acceptCall}
        onDecline={declineCall}
        onEndCall={endCall}
      />
    </View>
  );
}
