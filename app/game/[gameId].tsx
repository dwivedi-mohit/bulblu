import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { LudoBoard } from '../../components/game/LudoBoard';
import {
  joinLudoGame,
  rollLudoDice,
  moveLudoToken,
  leaveLudoGame,
  onLudoStateUpdate,
  onLudoError,
} from '../../lib/socket';
import type { GameState, Player } from '../../server/src/games/LudoGame';

const COLOR_BADGE: Record<string, { bg: string; text: string }> = {
  red: { bg: '#EF4444', text: '#FFFFFF' },
  green: { bg: '#10B981', text: '#FFFFFF' },
  yellow: { bg: '#EAB308', text: '#0F172A' },
  blue: { bg: '#3B82F6', text: '#FFFFFF' },
};

export default function GameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const activeGameId = gameId || 'ludo_party_room_1';

  useEffect(() => {
    if (!user?.id) return;

    // Join game over socket
    joinLudoGame(
      activeGameId,
      user.id,
      user.full_name || user.username || 'Player',
      user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
    );

    const unsubState = onLudoStateUpdate((state: GameState) => {
      setGameState(state);
      setIsRolling(false);
    });

    const unsubErr = onLudoError((err) => {
      setErrorMessage(err.message);
      setIsRolling(false);
      setTimeout(() => setErrorMessage(null), 3000);
    });

    return () => {
      unsubState();
      unsubErr();
      leaveLudoGame(activeGameId, user.id);
    };
  }, [activeGameId, user?.id]);

  const handleRollDice = () => {
    if (!user?.id || isRolling) return;
    setIsRolling(true);
    rollLudoDice(activeGameId, user.id);
  };

  const handleTokenPress = (tokenId: number) => {
    if (!user?.id) return;
    moveLudoToken(activeGameId, user.id, tokenId);
  };

  if (!gameState) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Connecting to Ludo Party Room...</Text>
      </SafeAreaView>
    );
  }

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === user?.id;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Navigation */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.gameTitleText}>Ludo Party</Text>
          <Text style={styles.gameRoomSub}>Room #{activeGameId.slice(0, 10)}</Text>
        </View>

        <TouchableOpacity style={styles.voiceBtn} onPress={() => router.push('/(tabs)/voice')}>
          <Ionicons name="mic" size={18} color="#0F766E" />
        </TouchableOpacity>
      </View>

      {/* Error Toast */}
      {errorMessage && (
        <View style={styles.errorToast}>
          <Text style={styles.errorToastText}>{errorMessage}</Text>
        </View>
      )}

      {/* Players Header Card */}
      <View style={styles.playersRow}>
        {gameState.players.map((player) => {
          const isTurn = currentPlayer?.id === player.id;
          const badge = COLOR_BADGE[player.color];

          return (
            <View
              key={player.id}
              style={[
                styles.playerCard,
                isTurn && { borderColor: badge.bg, borderWidth: 2.5 },
              ]}
            >
              <View style={styles.playerAvatarWrap}>
                <Avatar uri={player.avatar} size="sm" />
                <View style={[styles.colorBadgeDot, { backgroundColor: badge.bg }]} />
              </View>

              <Text style={styles.playerNameText} numberOfLines={1}>
                {player.name}
              </Text>

              {isTurn && (
                <View style={[styles.turnPill, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.turnPillText, { color: badge.text }]}>TURN</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Log Banner */}
      <View style={styles.logBanner}>
        <Ionicons name="sparkles" size={15} color="#0F766E" />
        <Text style={styles.logText} numberOfLines={1}>
          {gameState.log}
        </Text>
      </View>

      {/* Interactive Ludo Board Canvas */}
      <View style={styles.boardWrapper}>
        <LudoBoard
          gameState={gameState}
          currentUserId={user?.id || ''}
          onTokenPress={handleTokenPress}
        />
      </View>

      {/* Bottom Controls Bar & Roll Dice */}
      <View style={styles.controlsBar}>
        {isMyTurn ? (
          <TouchableOpacity
            style={styles.rollDiceTouch}
            onPress={handleRollDice}
            disabled={gameState.hasRolled || isRolling}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={gameState.hasRolled ? ['#94A3B8', '#64748B'] : ['#0F766E', '#0D9488']}
              style={styles.rollDiceGradient}
            >
              <Ionicons name="dice" size={28} color="#FFFFFF" />
              <Text style={styles.rollDiceText}>
                {isRolling
                  ? 'Rolling...'
                  : gameState.diceValue !== null
                  ? `Rolled ${gameState.diceValue}!`
                  : 'ROLL DICE'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingTurnBox}>
            <ActivityIndicator size="small" color="#0F766E" style={{ marginRight: 8 }} />
            <Text style={styles.waitingTurnText}>
              Waiting for {currentPlayer?.name || 'opponent'}'s move...
            </Text>
          </View>
        )}
      </View>

      {/* Victory Celebration Overlay Modal */}
      <Modal visible={gameState.status === 'finished'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.victoryCard}>
            <Ionicons name="trophy" size={54} color="#F59E0B" />
            <Text style={styles.victoryTitle}>Victory Celebration!</Text>
            <Text style={styles.victorySub}>
              Winner: {gameState.winner?.name || 'Player 1'}
            </Text>

            <TouchableOpacity
              style={styles.playAgainBtn}
              onPress={() => router.replace('/(tabs)/explore')}
            >
              <LinearGradient colors={['#0F766E', '#0D9488']} style={styles.playAgainGradient}>
                <Text style={styles.playAgainText}>Back to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  gameTitleText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 17,
    color: '#0F172A',
  },
  gameRoomSub: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
    color: '#64748B',
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorToast: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  errorToastText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12,
    color: '#B91C1C',
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playerCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 14,
    width: 76,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  playerAvatarWrap: {
    position: 'relative',
  },
  colorBadgeDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  playerNameText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },
  turnPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 4,
  },
  turnPillText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
  },
  logBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  logText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12,
    color: '#0369A1',
  },
  boardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  controlsBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rollDiceTouch: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  rollDiceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  rollDiceText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  waitingTurnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  waitingTurnText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 13,
    color: '#64748B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  victoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  victoryTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    color: '#0F172A',
    marginTop: 12,
  },
  victorySub: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },
  playAgainBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  playAgainGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  playAgainText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
