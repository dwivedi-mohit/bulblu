import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { MascotTabIcon } from './MascotTabIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Explicitly allow ONLY these 5 tabs in exact order
const ALLOWED_TAB_NAMES = ['rent', 'voice', 'explore', 'messages', 'video'];

interface TabItemDef {
  name: string;
  label: string;
  iconType: 'home' | 'rent' | 'voice' | 'chats' | 'video';
  isCenter?: boolean;
}

const TAB_CONFIGS: Record<string, TabItemDef> = {
  rent: { name: 'rent', label: 'Rent', iconType: 'rent' },
  voice: { name: 'voice', label: 'Voice Room', iconType: 'voice' },
  explore: { name: 'explore', label: 'Home', iconType: 'home', isCenter: true },
  messages: { name: 'messages', label: 'Chat', iconType: 'chats' },
  video: { name: 'video', label: 'Video Call', iconType: 'video' },
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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 14, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
  };

  if (item.isCenter) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.centerButtonWrapper}
      >
        <Animated.View style={[styles.centerButtonOuter, animatedStyle]}>
          <View style={[styles.centerCircle, isFocused && styles.centerCircleActive]}>
            <MascotTabIcon type="home" focused={isFocused} size={28} />
          </View>
        </Animated.View>
        {/* Active Dot Indicator under center Home */}
        <View style={styles.dotSpace}>
          {isFocused && <View style={styles.activeDot} />}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      style={styles.sideTabItem}
    >
      <Animated.View style={[styles.iconWrapper, animatedStyle]}>
        <MascotTabIcon type={item.iconType} focused={isFocused} size={26} />
      </Animated.View>
      {/* Active Dot Indicator under side icons */}
      <View style={styles.dotSpace}>
        {isFocused && <View style={styles.activeDot} />}
      </View>
    </TouchableOpacity>
  );
}

export function FluidGlassTabBar({ state, descriptors, navigation }: any) {
  // STRICTLY filter state.routes so ONLY the 5 allowed tabs are ever rendered
  const visibleRoutes = ALLOWED_TAB_NAMES.map((name) =>
    state.routes.find((r: any) => r.name === name)
  ).filter(Boolean);

  const barWidth = SCREEN_WIDTH - 32;
  const barHeight = 64;
  const cx = barWidth / 2;

  // SVG Notched Curved Path (matching reference image)
  const d = `
    M 28,0
    H ${cx - 36}
    C ${cx - 20},0 ${cx - 18},26 ${cx},26
    C ${cx + 18},26 ${cx + 20},0 ${cx + 36},0
    H ${barWidth - 28}
    A 28,28 0 0 1 ${barWidth},28
    V ${barHeight - 28}
    A 28,28 0 0 1 ${barWidth - 28},${barHeight}
    H 28
    A 28,28 0 0 1 0,${barHeight - 28}
    V 28
    A 28,28 0 0 1 28,0
    Z
  `;

  return (
    <View style={styles.container}>
      <View style={[styles.barWrapper, { width: barWidth, height: barHeight }]}>
        {/* Curved Cutout SVG Background */}
        <Svg width={barWidth} height={barHeight} style={StyleSheet.absoluteFill}>
          <Path
            d={d}
            fill="#FFFFFF"
            stroke="rgba(15, 118, 110, 0.12)"
            strokeWidth="1.5"
          />
        </Svg>

        {/* 5 Tab Items Grid */}
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
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barWrapper: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 12,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 8,
  },
  sideTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSpace: {
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F766E',
  },

  // Center Hero Button
  centerButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerButtonOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  centerCircle: {
    flex: 1,
    borderRadius: 23,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircleActive: {
    backgroundColor: '#0D9488',
  },
});
