import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MascotTabIcon } from './MascotTabIcon';
import { useAuthStore } from '../../stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALLOWED_TAB_NAMES = ['rent', 'voice', 'explore', 'messages', 'video'];

interface TabItemDef {
  name: string;
  label: string;
  iconType: 'home' | 'rent' | 'voice' | 'chats' | 'video';
}

const TAB_CONFIGS: Record<string, TabItemDef> = {
  rent: { name: 'rent', label: 'Rent', iconType: 'rent' },
  voice: { name: 'voice', label: 'Voice', iconType: 'voice' },
  explore: { name: 'explore', label: 'Home', iconType: 'home' },
  messages: { name: 'messages', label: 'Chat', iconType: 'chats' },
  video: { name: 'video', label: 'Video', iconType: 'video' },
};

function TabIconButton({
  item,
  isFocused,
  onPress,
}: {
  item: TabItemDef;
  isFocused: boolean;
  onPress: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const translateY = useSharedValue(isFocused ? -12 : 0);
  const scale = useSharedValue(isFocused ? 1.15 : 0.96);
  const cardOpacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    translateY.value = withSpring(isFocused ? -12 : 0, {
      damping: 15,
      stiffness: 220,
    });
    scale.value = withSpring(isFocused ? 1.15 : 0.96, {
      damping: 14,
      stiffness: 200,
    });
    cardOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 180 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.tabTouchItem}
    >
      {/* Soft Rounded Active Pill Card Backdrop (Matching Reference Image) */}
      <Animated.View style={[styles.activePillCard, cardStyle]} />

      {/* Mascot Graphic Icon */}
      <Animated.View style={[styles.tabButtonOuter, animatedStyle]}>
        <MascotTabIcon type={item.iconType} focused={isFocused} size={isFocused ? 54 : 46} />
      </Animated.View>

      {/* Text Label */}
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

export function FluidGlassTabBar({ state, descriptors, navigation }: any) {
  // STRICTLY filter state.routes so ONLY the 5 allowed tabs are ever rendered
  const visibleRoutes = ALLOWED_TAB_NAMES.map((name) =>
    state.routes.find((r: any) => r.name === name)
  ).filter(Boolean);

  const barWidth = SCREEN_WIDTH - 20;

  return (
    <View style={styles.container}>
      <View style={[styles.barWrapper, { width: barWidth }]}>
        <View style={styles.itemsRow}>
          {visibleRoutes.map((route: any) => {
            const actualIndex = state.routes.findIndex((r: any) => r.key === route.key);
            const isFocused = state.index === actualIndex;
            const itemConfig = TAB_CONFIGS[route.name] || {
              name: route.name,
              label: route.name,
              iconType: 'chats' as const,
            };

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabIconButton
                key={route.key}
                item={itemConfig}
                isFocused={isFocused}
                onPress={onPress}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    height: 78,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.22)',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    justifyContent: 'center',
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 4,
  },
  tabTouchItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },

  activePillCard: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.22)',
  },

  tabButtonOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tabLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
    color: '#64748B',
    position: 'absolute',
    bottom: 7,
  },
  tabLabelActive: {
    color: '#0F766E',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
  },
  profileAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  profileAvatarFocused: {
    borderColor: '#0F766E',
  },
  profileAvatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  profileAvatarFallback: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    color: '#0F766E',
  },
});
