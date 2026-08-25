import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

const MASCOT_IMAGES: Record<string, ImageSourcePropType> = {
  rent: require('../../assets/images/mascot_rent.png'),
  voice: require('../../assets/images/mascot_voice.png'),
  home: require('../../assets/images/mascot_home.png'),
  chats: require('../../assets/images/mascot_chat.png'),
  video: require('../../assets/images/mascot_video.png'),
};

interface MascotTabIconProps {
  type: 'home' | 'rent' | 'voice' | 'chats' | 'video';
  focused: boolean;
  size?: number;
}

export function MascotTabIcon({ type, focused, size = 48 }: MascotTabIconProps) {
  const imgSrc = MASCOT_IMAGES[type] || MASCOT_IMAGES.home;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={imgSrc}
        style={{
          width: size,
          height: size,
          resizeMode: 'contain',
          opacity: focused ? 1 : 0.85,
        }}
      />
    </View>
  );
}

export function MascotFace({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={MASCOT_IMAGES.home}
      style={{
        width: size,
        height: size,
        resizeMode: 'contain',
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
