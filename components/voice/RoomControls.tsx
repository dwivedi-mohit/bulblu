import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Mic, MicOff, Hand, PhoneOff, MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';

interface RoomControlsProps {
  isMuted: boolean;
  isHandRaised: boolean;
  onToggleMute: () => void;
  onToggleHand: () => void;
  onLeaveRoom: () => void;
  onToggleChat: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function ControlButton({
  icon,
  activeIcon,
  isActive,
  isDanger,
  onPress,
}: {
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  isActive?: boolean;
  isDanger?: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      style={[
        styles.controlButton,
        isDanger && styles.dangerButton,
        isActive && !isDanger && styles.activeButton,
        animatedStyle,
      ]}
      activeOpacity={0.8}
    >
      {isActive && activeIcon ? activeIcon : icon}
    </AnimatedTouchable>
  );
}

export function RoomControls({
  isMuted,
  isHandRaised,
  onToggleMute,
  onToggleHand,
  onLeaveRoom,
  onToggleChat,
}: RoomControlsProps) {
  return (
    <View style={styles.container}>
      <ControlButton
        icon={<Mic size={22} color="#FFFFFF" />}
        activeIcon={<MicOff size={22} color="#FFFFFF" />}
        isActive={isMuted}
        onPress={onToggleMute}
      />

      <ControlButton
        icon={<Hand size={22} color="#FFFFFF" />}
        isActive={isHandRaised}
        onPress={onToggleHand}
      />

      <ControlButton
        icon={<MessageCircle size={22} color="#FFFFFF" />}
        onPress={onToggleChat}
      />

      <ControlButton
        icon={<PhoneOff size={22} color="#FFFFFF" />}
        isDanger
        onPress={onLeaveRoom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing['2xl'],
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgGlassLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  dangerButton: {
    backgroundColor: Colors.error,
    borderColor: '#DC2626',
  },
});
