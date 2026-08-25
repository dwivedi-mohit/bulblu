import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { GameState, Color, Player, Token } from '../../server/src/games/LudoGame';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const BOARD_SIZE = Math.min(SCREEN_WIDTH - 32, 380);
const CELL_SIZE = BOARD_SIZE / 15;

const COLOR_MAP: Record<Color, { main: string; light: string; border: string; bg: string }> = {
  red: { main: '#EF4444', light: '#FEE2E2', border: '#B91C1C', bg: '#FEF2F2' },
  green: { main: '#10B981', light: '#D1FAE5', border: '#047857', bg: '#ECFDF5' },
  yellow: { main: '#EAB308', light: '#FEF9C3', border: '#A16207', bg: '#FEFCE8' },
  blue: { main: '#3B82F6', light: '#DBEAFE', border: '#1D4ED8', bg: '#EFF6FF' },
};

interface LudoBoardProps {
  gameState: GameState;
  currentUserId: string;
  onTokenPress: (tokenId: number) => void;
}

// 52-tile track coordinates (column x: 0..14, row y: 0..14)
const TRACK_COORDS: Record<number, { x: number; y: number }> = {
  // Red start & top arm
  0: { x: 1, y: 6 }, 1: { x: 2, y: 6 }, 2: { x: 3, y: 6 }, 3: { x: 4, y: 6 }, 4: { x: 5, y: 6 },
  5: { x: 6, y: 5 }, 6: { x: 6, y: 4 }, 7: { x: 6, y: 3 }, 8: { x: 6, y: 2 }, 9: { x: 6, y: 1 }, 10: { x: 6, y: 0 },
  11: { x: 7, y: 0 },
  // Green start & right arm
  12: { x: 8, y: 0 }, 13: { x: 8, y: 1 }, 14: { x: 8, y: 2 }, 15: { x: 8, y: 3 }, 16: { x: 8, y: 4 }, 17: { x: 8, y: 5 },
  18: { x: 9, y: 6 }, 19: { x: 10, y: 6 }, 20: { x: 11, y: 6 }, 21: { x: 12, y: 6 }, 22: { x: 13, y: 6 }, 23: { x: 14, y: 6 },
  24: { x: 14, y: 7 },
  // Yellow start & bottom arm
  25: { x: 14, y: 8 }, 26: { x: 13, y: 8 }, 27: { x: 12, y: 8 }, 28: { x: 11, y: 8 }, 29: { x: 10, y: 8 }, 30: { x: 9, y: 8 },
  31: { x: 8, y: 9 }, 32: { x: 8, y: 10 }, 33: { x: 8, y: 11 }, 34: { x: 8, y: 12 }, 35: { x: 8, y: 13 }, 36: { x: 8, y: 14 },
  37: { x: 7, y: 14 },
  // Blue start & left arm
  38: { x: 6, y: 14 }, 39: { x: 6, y: 13 }, 40: { x: 6, y: 12 }, 41: { x: 6, y: 11 }, 42: { x: 6, y: 10 }, 43: { x: 6, y: 9 },
  44: { x: 5, y: 8 }, 45: { x: 4, y: 8 }, 46: { x: 3, y: 8 }, 47: { x: 2, y: 8 }, 48: { x: 1, y: 8 }, 49: { x: 0, y: 8 },
  50: { x: 0, y: 7 }, 51: { x: 0, y: 6 },
};

// Home stretches for each color (5 steps)
const HOME_PATHS: Record<Color, Array<{ x: number; y: number }>> = {
  red: [{ x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }],
  green: [{ x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }],
  yellow: [{ x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 }],
  blue: [{ x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 }],
};

// Base coordinates for 4 tokens per color
const BASE_TOKEN_POS: Record<Color, Array<{ x: number; y: number }>> = {
  red: [{ x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 }],
  green: [{ x: 10.5, y: 1.5 }, { x: 12.5, y: 1.5 }, { x: 10.5, y: 3.5 }, { x: 12.5, y: 3.5 }],
  yellow: [{ x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 }],
  blue: [{ x: 1.5, y: 10.5 }, { x: 3.5, y: 10.5 }, { x: 1.5, y: 12.5 }, { x: 3.5, y: 12.5 }],
};

export function LudoBoard({ gameState, currentUserId, onTokenPress }: LudoBoardProps) {
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;

  const getTokenCoordinates = (player: Player, token: Token): { x: number; y: number } => {
    if (token.stepCount === -1) {
      return BASE_TOKEN_POS[player.color][token.id];
    }
    if (token.stepCount === 56) {
      // Inside center victory home
      return { x: 7, y: 7 };
    }
    if (token.stepCount >= 51 && token.stepCount <= 55) {
      const idx = token.stepCount - 51;
      return HOME_PATHS[player.color][idx];
    }
    // Main track step 0..50
    const startIdx = { red: 0, green: 13, yellow: 26, blue: 39 }[player.color];
    const absIdx = (startIdx + token.stepCount) % 52;
    return TRACK_COORDS[absIdx];
  };

  return (
    <View style={styles.boardContainer}>
      {/* Base Boxes */}
      <View style={[styles.baseBox, styles.redBase]}>
        <View style={styles.innerBaseWhite}>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.red.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.red.light }]} />
          </View>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.red.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.red.light }]} />
          </View>
        </View>
      </View>

      <View style={[styles.baseBox, styles.greenBase]}>
        <View style={styles.innerBaseWhite}>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.green.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.green.light }]} />
          </View>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.green.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.green.light }]} />
          </View>
        </View>
      </View>

      <View style={[styles.baseBox, styles.yellowBase]}>
        <View style={styles.innerBaseWhite}>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.yellow.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.yellow.light }]} />
          </View>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.yellow.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.yellow.light }]} />
          </View>
        </View>
      </View>

      <View style={[styles.baseBox, styles.blueBase]}>
        <View style={styles.innerBaseWhite}>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.blue.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.blue.light }]} />
          </View>
          <View style={styles.baseCirclesRow}>
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.blue.light }]} />
            <View style={[styles.baseCircle, { backgroundColor: COLOR_MAP.blue.light }]} />
          </View>
        </View>
      </View>

      {/* Center Home Triangle */}
      <View style={styles.centerHome}>
        <View style={styles.centerGrid}>
          <Ionicons name="trophy" size={24} color="#F59E0B" />
        </View>
      </View>

      {/* Render Active Player Tokens */}
      {gameState.players.map((player) => {
        const isPlayerTurn = isMyTurn && player.id === currentUserId;

        return player.tokens.map((token) => {
          const coords = getTokenCoordinates(player, token);
          const isMovable = isPlayerTurn && gameState.movableTokenIds.includes(token.id);

          return (
            <TouchableOpacity
              key={`${player.color}-${token.id}`}
              style={[
                styles.tokenCircle,
                {
                  left: coords.x * CELL_SIZE + CELL_SIZE * 0.1,
                  top: coords.y * CELL_SIZE + CELL_SIZE * 0.1,
                  backgroundColor: COLOR_MAP[player.color].main,
                  borderColor: isMovable ? '#FFFFFF' : COLOR_MAP[player.color].border,
                  borderWidth: isMovable ? 3 : 2,
                },
                isMovable && styles.movableGlow,
              ]}
              disabled={!isMovable}
              onPress={() => onTokenPress(token.id)}
              activeOpacity={0.7}
            >
              <View style={styles.innerTokenDot} />
            </TouchableOpacity>
          );
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  boardContainer: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  baseBox: {
    position: 'absolute',
    width: CELL_SIZE * 6,
    height: CELL_SIZE * 6,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBase: { top: 0, left: 0, backgroundColor: '#EF4444' },
  greenBase: { top: 0, right: 0, backgroundColor: '#10B981' },
  yellowBase: { bottom: 0, right: 0, backgroundColor: '#EAB308' },
  blueBase: { bottom: 0, left: 0, backgroundColor: '#3B82F6' },
  innerBaseWhite: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    justifyContent: 'space-around',
  },
  baseCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  baseCircle: {
    width: CELL_SIZE * 1.5,
    height: CELL_SIZE * 1.5,
    borderRadius: CELL_SIZE * 0.75,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  centerHome: {
    position: 'absolute',
    left: CELL_SIZE * 6,
    top: CELL_SIZE * 6,
    width: CELL_SIZE * 3,
    height: CELL_SIZE * 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGrid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenCircle: {
    position: 'absolute',
    width: CELL_SIZE * 0.8,
    height: CELL_SIZE * 0.8,
    borderRadius: (CELL_SIZE * 0.8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  innerTokenDot: {
    width: CELL_SIZE * 0.3,
    height: CELL_SIZE * 0.3,
    borderRadius: (CELL_SIZE * 0.3) / 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  movableGlow: {
    transform: [{ scale: 1.25 }],
    elevation: 8,
    shadowColor: '#10B981',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
});
