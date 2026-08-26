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
  // Exact Master Grid Dimensions:
  // Horizontal screen padding = 16px
  // Grid column gap = 10px
  const width = isFullWidth
    ? SCREEN_WIDTH - 32
    : Math.floor((SCREEN_WIDTH - 32 - 10) / 2);

  // Balanced height matching master grid
  const height = isFullWidth
    ? Math.floor((SCREEN_WIDTH - 32) / 2.5)
    : Math.floor(width / 2.1);

  const notch = 14; // Corner notch inset size
  const clipId = `plaque-clip-${Math.random().toString(36).substring(2, 9)}`;

  // Generate SVG Path for Ornamental Scalloped Plaque Shape
  // M (top-left notch end) -> L (top-right notch start) -> Corner Notch -> L (bottom-right) ...
  const generatePlaquePath = (w: number, h: number, offset = 0) => {
    const n = Math.max(8, notch - offset);
    const x0 = offset;
    const y0 = offset;
    const x1 = w - offset;
    const y1 = h - offset;

    return `
      M ${x0 + n} ${y0}
      L ${x1 - n} ${y0}
      Q ${x1 - n / 2} ${y0 + n / 2} ${x1} ${y0 + n}
      L ${x1} ${y1 - n}
      Q ${x1 - n / 2} ${y1 - n / 2} ${x1 - n} ${y1}
      L ${x0 + n} ${y1}
      Q ${x0 + n / 2} ${y1 - n / 2} ${x0} ${y1 - n}
      L ${x0} ${y0 + n}
      Q ${x0 + n / 2} ${y0 + n / 2} ${x0 + n} ${y0}
      Z
    `.replace(/\s+/g, ' ').trim();
  };

  const outerPath = generatePlaquePath(width, height, 1);
  const innerPath = generatePlaquePath(width, height, 4);

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

        {/* Clipped Image Graphic inside Plaque Silhouette */}
        <G clipPath={`url(#${clipId})`}>
          <Rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
          <Image
            source={image}
            style={{ width, height }}
            resizeMode="cover"
          />
        </G>

        {/* Outer Metallic Border Stroke Following Exact Plaque Silhouette */}
        <Path
          d={outerPath}
          fill="none"
          stroke={borderColor}
          strokeWidth={2.2}
        />

        {/* Inner Hairline Decorative Border Stroke Following Exact Silhouette */}
        <Path
          d={innerPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth={1}
        />

        {/* Ornamental Corner Accent Marks */}
        <Path
          d={`
            M ${notch} 4 L ${notch + 4} 4
            M 4 ${notch} L 4 ${notch + 4}
            M ${width - notch} 4 L ${width - notch - 4} 4
            M ${width - 4} ${notch} L ${width - 4} ${notch + 4}
            M ${notch} ${height - 4} L ${notch + 4} ${height - 4}
            M 4 ${height - notch} L 4 ${height - notch - 4}
            M ${width - notch} ${height - 4} L ${width - notch - 4} ${height - 4}
            M ${width - 4} ${height - notch} L ${width - 4} ${height - notch - 4}
          `}
          fill="none"
          stroke={borderColor}
          strokeWidth={1.2}
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
