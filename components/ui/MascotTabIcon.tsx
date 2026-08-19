import React from 'react';
import Svg, {
  Defs, RadialGradient, LinearGradient, Stop,
  Ellipse, Circle, Rect, Path, Line, G,
} from 'react-native-svg';

const DARK_BODY = ['#115E59', '#0F766E', '#0D9488', '#065F5B'];
const NEON_TEAL = '#2DD4BF';
const BULB_YELLOW = '#FFD93D';
const BULB_ORANGE = '#FF8E53';

interface MascotTabIconProps {
  type: 'home' | 'rent' | 'voice' | 'chats' | 'video';
  focused: boolean;
  size?: number;
}

function MiniMascotBody() {
  return (
    <>
      <Defs>
        <LinearGradient id="miniBodyGrad" x1="8" y1="8" x2="28" y2="36" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={DARK_BODY[0]} />
          <Stop offset="30%" stopColor={DARK_BODY[1]} />
          <Stop offset="65%" stopColor={DARK_BODY[2]} />
          <Stop offset="100%" stopColor={DARK_BODY[3]} />
        </LinearGradient>
        <RadialGradient id="miniEyeWhite" cx="45%" cy="40%" r="55%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#F0FDFA" />
        </RadialGradient>
        <RadialGradient id="miniPupil" cx="40%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#022C22" />
          <Stop offset="100%" stopColor="#000000" />
        </RadialGradient>
      </Defs>
      {/* Body */}
      <Ellipse cx="18" cy="25" rx="12" ry="13" fill="url(#miniBodyGrad)" />
      <Ellipse cx="18" cy="25" rx="12" ry="13" fill="none" stroke={NEON_TEAL} strokeWidth="0.5" opacity="0.4" />
      {/* Legs */}
      <Ellipse cx="13" cy="37" rx="3" ry="2.5" fill="#065F5B" />
      <Ellipse cx="23" cy="37" rx="3" ry="2.5" fill="#042F2E" />
      {/* Eyes */}
      <Ellipse cx="14" cy="23" rx="4.5" ry="5" fill="url(#miniEyeWhite)" />
      <Ellipse cx="14.5" cy="23.5" rx="2.5" ry="2.8" fill="url(#miniPupil)" />
      <Circle cx="15.5" cy="22" r="1" fill="#fff" opacity="0.9" />
      <Ellipse cx="22" cy="23" rx="4.5" ry="5" fill="url(#miniEyeWhite)" />
      <Ellipse cx="22.5" cy="23.5" rx="2.5" ry="2.8" fill="url(#miniPupil)" />
      <Circle cx="23.5" cy="22" r="1" fill="#fff" opacity="0.9" />
      {/* Mouth */}
      <Path d="M16 29 Q17 31 18 29.5 Q19 31 20 29" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.85" />
    </>
  );
}

function HomeIcon({ focused }: { focused: boolean }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 36 42" fill="none">
      <Defs>
        <LinearGradient id="homeGrad" x1="8" y1="0" x2="28" y2="8" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={BULB_YELLOW} />
          <Stop offset="100%" stopColor={BULB_ORANGE} />
        </LinearGradient>
      </Defs>
      <MiniMascotBody />
      {/* Compass needle on forehead */}
      <G opacity={focused ? 1 : 0.6}>
        <Circle cx="18" cy="14" r="4" fill="none" stroke={focused ? BULB_YELLOW : NEON_TEAL} strokeWidth="0.8" />
        <Line x1="18" y1="10" x2="18" y2="14" stroke={focused ? BULB_YELLOW : NEON_TEAL} strokeWidth="1" />
        <Line x1="18" y1="14" x2="20" y2="16" stroke={focused ? BULB_ORANGE : NEON_TEAL} strokeWidth="0.8" />
      </G>
      {/* Glow when focused */}
      {focused && <Circle cx="18" cy="14" r="6" fill={BULB_YELLOW} opacity="0.15" />}
    </Svg>
  );
}

function RentIcon({ focused }: { focused: boolean }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 36 42" fill="none">
      <MiniMascotBody />
      {/* Heart */}
      <G opacity={focused ? 1 : 0.6}>
        <Path
          d="M18 12 C16 9, 12 9, 12 12 C12 15, 18 18, 18 18 C18 18, 24 15, 24 12 C24 9, 20 9, 18 12Z"
          fill={focused ? '#FF6B9D' : NEON_TEAL}
          opacity={focused ? 0.9 : 0.5}
        />
      </G>
      {focused && <Circle cx="18" cy="14" r="6" fill="#FF6B9D" opacity="0.15" />}
    </Svg>
  );
}

function VoiceIcon({ focused }: { focused: boolean }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 36 42" fill="none">
      <MiniMascotBody />
      {/* Mic */}
      <G opacity={focused ? 1 : 0.6}>
        <Rect x="16" y="8" width="4" height="6" rx="2" fill={focused ? NEON_TEAL : '#94A3B8'} />
        <Path d="M14 14 Q14 18 18 18 Q22 18 22 14" fill="none" stroke={focused ? NEON_TEAL : '#94A3B8'} strokeWidth="0.8" />
        <Line x1="18" y1="18" x2="18" y2="20" stroke={focused ? NEON_TEAL : '#94A3B8'} strokeWidth="0.8" />
      </G>
      {focused && <Circle cx="18" cy="13" r="5" fill={NEON_TEAL} opacity="0.15" />}
    </Svg>
  );
}

function ChatsIcon({ focused }: { focused: boolean }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 36 42" fill="none">
      <MiniMascotBody />
      {/* Speech bubble */}
      <G opacity={focused ? 1 : 0.6}>
        <Path
          d="M10 10 H26 Q28 10 28 12 V16 Q28 18 26 18 H20 L16 22 L16 18 H10 Q8 18 8 16 V12 Q8 10 10 10Z"
          fill={focused ? BULB_YELLOW : '#94A3B8'}
          opacity={focused ? 0.85 : 0.4}
        />
        <Circle cx="13" cy="14" r="1" fill={focused ? '#0F172A' : '#64748B'} />
        <Circle cx="18" cy="14" r="1" fill={focused ? '#0F172A' : '#64748B'} />
        <Circle cx="23" cy="14" r="1" fill={focused ? '#0F172A' : '#64748B'} />
      </G>
      {focused && <Circle cx="18" cy="14" r="6" fill={BULB_YELLOW} opacity="0.12" />}
    </Svg>
  );
}

function VideoIcon({ focused }: { focused: boolean }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 36 42" fill="none">
      <MiniMascotBody />
      {/* Play button */}
      <G opacity={focused ? 1 : 0.6}>
        <Circle cx="18" cy="13" r="5" fill={focused ? NEON_TEAL : '#94A3B8'} opacity={focused ? 0.85 : 0.4} />
        <Path d="M16.5 11 L21 13 L16.5 15Z" fill="#fff" />
      </G>
      {focused && <Circle cx="18" cy="13" r="7" fill={NEON_TEAL} opacity="0.12" />}
    </Svg>
  );
}

export function MascotTabIcon({ type, focused, size = 28 }: MascotTabIconProps) {
  const iconMap = {
    home: HomeIcon,
    rent: RentIcon,
    voice: VoiceIcon,
    chats: ChatsIcon,
    video: VideoIcon,
  };

  const Icon = iconMap[type];

  return (
    <Svg width={size} height={size} viewBox="0 0 36 42" fill="none">
      <Icon focused={focused} />
    </Svg>
  );
}

// Also export a simple mascot face for empty states and loaders
export function MascotFace({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 42" fill="none">
      <Defs>
        <LinearGradient id="faceGrad" x1="8" y1="8" x2="28" y2="36" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={DARK_BODY[0]} />
          <Stop offset="30%" stopColor={DARK_BODY[1]} />
          <Stop offset="65%" stopColor={DARK_BODY[2]} />
          <Stop offset="100%" stopColor={DARK_BODY[3]} />
        </LinearGradient>
      </Defs>
      {/* Body */}
      <Ellipse cx="18" cy="25" rx="12" ry="13" fill="url(#faceGrad)" />
      <Ellipse cx="18" cy="25" rx="12" ry="13" fill="none" stroke={NEON_TEAL} strokeWidth="0.5" opacity="0.4" />
      {/* Bulb */}
      <Circle cx="18" cy="8" r="4" fill={BULB_YELLOW} />
      <Circle cx="18" cy="8" r="5.5" fill={BULB_YELLOW} opacity="0.2" />
      <Rect x="17" y="12" width="2" height="4" rx="1" fill="#0D9488" />
      {/* Eyes */}
      <Ellipse cx="14" cy="23" rx="4.5" ry="5" fill="#FFFFFF" />
      <Ellipse cx="14.5" cy="23.5" rx="2.5" ry="2.8" fill="#022C22" />
      <Circle cx="15.5" cy="22" r="1" fill="#fff" opacity="0.9" />
      <Ellipse cx="22" cy="23" rx="4.5" ry="5" fill="#FFFFFF" />
      <Ellipse cx="22.5" cy="23.5" rx="2.5" ry="2.8" fill="#022C22" />
      <Circle cx="23.5" cy="22" r="1" fill="#fff" opacity="0.9" />
      {/* Mouth */}
      <Path d="M16 29 Q17 31 18 29.5 Q19 31 20 29" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.85" />
    </Svg>
  );
}
