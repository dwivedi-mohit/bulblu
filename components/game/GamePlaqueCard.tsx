import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import Svg, { Path, ClipPath, Defs, G, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GamePlaqueCardProps {
  image: ImageSourcePropType;
  borderColor?: string;
  isFullWidth?: boolean;
  onPress: () => void;
}

export function GamePlaqueCard({
  image,
  borderColor = '#F59E0B',
  isFullWidth = false,
  onPress,
}: GamePlaqueCardProps) {
  // Master Grid Dimensions:
  // Screen horizontal padding = 16px
  // Grid column gap = 10px
  const width = isFullWidth
    ? SCREEN_WIDTH - 32
    : Math.floor((SCREEN_WIDTH - 32 - 10) / 2);

  const height = isFullWidth
    ? Math.floor((SCREEN_WIDTH - 32) / 2.5)
    : Math.floor(width / 2.1);

  const clipId = `smooth-plaque-${Math.random().toString(36).substring(2, 9)}`;

  // Generate Smooth Ornamental Game Plaque Vector Path (Softly rounded with stepped corner arcs)
  const generateSmoothPlaquePath = (w: number, h: number, offset = 0) => {
    const r = isFullWidth ? 16 : 14; // Base corner radius
    const s = isFullWidth ? 6 : 5;   // Stepped notch depth
    
    const x0 = offset;
    const y0 = offset;
    const x1 = w - offset;
    const y1 = h - offset;

    const startX = r + s + x0;
    const endX = x1 - r - s;

    return `
      M ${startX} ${y0}
      L ${endX} ${y0}
      C ${x1 - r} ${y0}, ${x1 - s} ${y0 + s}, ${x1 - s} ${y0 + r}
      C ${x1 - s} ${y0 + r + s}, ${x1} ${y0 + r + s}, ${x1} ${y0 + r + 2 * s}
      L ${x1} ${y1 - r - 2 * s}
      C ${x1} ${y1 - r - s}, ${x1 - s} ${y1 - r - s}, ${x1 - s} ${y1 - r}
      C ${x1 - s} ${y1}, ${x1 - r} ${y1}, ${endX} ${y1}
      L ${startX} ${y1}
      C ${x0 + r} ${y1}, ${x0 + s} ${y1}, ${x0 + s} ${y1 - r}
      C ${x0 + s} ${y1 - r - s}, ${x0} ${y1 - r - s}, ${x0} ${y1 - r - 2 * s}
      L ${x0} ${y0 + r + 2 * s}
      C ${x0} ${y0 + r + s}, ${x0 + s} ${y0 + r + s}, ${x0 + s} ${y0 + r}
      C ${x0 + s} ${y0}, ${x0 + r} ${y0}, ${startX} ${y0}
      Z
    `.replace(/\s+/g, ' ').trim();
  };

  const outerPath = generateSmoothPlaquePath(width, height, 1);
  const innerPath = generateSmoothPlaquePath(width, height, 4.5);

  return (
    <TouchableOpacity
      style={[styles.container, { width, height }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={outerPath} />
          </ClipPath>
        </Defs>

        {/* Clipped Image Graphic inside Smooth Plaque Silhouette */}
        <G clipPath={`url(#${clipId})`}>
          <Rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
          <Image
            source={image}
            style={{ width, height }}
            resizeMode="cover"
          />
        </G>

        {/* Outer Continuous Metallic Border Stroke Following Plaque Silhouette */}
        <Path
          d={outerPath}
          fill="none"
          stroke={borderColor}
          strokeWidth={2.4}
        />

        {/* Inset Hairline Decorative Frame Following Plaque Silhouette */}
        <Path
          d={innerPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.65)"
          strokeWidth={1.2}
        />

        {/* Corner Metallic Accent Lines */}
        <Path
          d={outerPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={0.8}
        />
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
