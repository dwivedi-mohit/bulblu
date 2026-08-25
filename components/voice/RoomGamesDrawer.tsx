import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TRUTH_QUESTIONS = [
  'What is the biggest secret you have never told anyone here?',
  'Who in this voice room would you want to meet in real life?',
  'What is the most embarrassing thing that happened on a date?',
  'Have you ever pretended to be someone else online?',
  'What is your guilty pleasure song that you sing in the shower?',
  'What was your first impression of the room host?',
  'What is one lie you told this week?',
  'If you had to swap lives with one person on the stage, who would it be?',
];

const DARE_PROMPTS = [
  'Sing the chorus of your favorite song with your mic unmuted right now!',
  'Talk in a funny accent (British / Pirate / Robot) for the next 2 minutes.',
  'Send your most funny photo to the room chat right now!',
  'Do your best impression of a celebrity and let the room guess who it is.',
  'Confess your silliest fear to everyone in the room.',
  'Send 1 rose gift to the person sitting on Seat #1!',
  'Give a 30-second dramatic speech praising the person in Seat #2.',
  'Say 3 genuine compliments to the last person who spoke.',
];

interface RoomGamesDrawerProps {
  visible: boolean;
  onClose: () => void;
  seatedParticipants: Array<{ name: string; seatIndex: number; avatarUrl?: string | null }>;
  onBroadcastGameEvent?: (game: string, result: string) => void;
}

type GameTab = 'truthOrDare' | 'coinFlip' | 'diceRoll';

export function RoomGamesDrawer({
  visible,
  onClose,
  seatedParticipants,
  onBroadcastGameEvent,
}: RoomGamesDrawerProps) {
  const [activeTab, setActiveTab] = useState<GameTab>('truthOrDare');

  // Truth & Dare State
  const [todMode, setTodMode] = useState<'picker' | 'truth' | 'dare'>('picker');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [todCardContent, setTodCardContent] = useState<string>('');
  const bottleRotation = useSharedValue(0);

  // Coin Flip State
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const coinRotation = useSharedValue(0);

  // Dice Roll State
  const [diceNumber, setDiceNumber] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const diceRotation = useSharedValue(0);

  // Spin Bottle for Truth & Dare
  const handleSpinBottle = () => {
    if (seatedParticipants.length === 0) return;
    const randomRot = 1440 + Math.floor(Math.random() * 360);
    bottleRotation.value = withTiming(
      bottleRotation.value + randomRot,
      { duration: 2500, easing: Easing.out(Easing.cubic) },
      () => {
        const randomIndex = Math.floor(Math.random() * seatedParticipants.length);
        const player = seatedParticipants[randomIndex]?.name || 'Player';
        setSelectedPlayer(player);
      }
    );
  };

  const handlePickTruth = () => {
    const q = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
    setTodCardContent(q);
    setTodMode('truth');
    onBroadcastGameEvent?.('Truth', `${selectedPlayer || 'Player'}: ${q}`);
  };

  const handlePickDare = () => {
    const d = DARE_PROMPTS[Math.floor(Math.random() * DARE_PROMPTS.length)];
    setTodCardContent(d);
    setTodMode('dare');
    onBroadcastGameEvent?.('Dare', `${selectedPlayer || 'Player'}: ${d}`);
  };

  // Flip Coin
  const handleFlipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setCoinResult(null);

    coinRotation.value = withSequence(
      withTiming(coinRotation.value + 1800, { duration: 1500, easing: Easing.out(Easing.quad) })
    );

    setTimeout(() => {
      const res = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
      setCoinResult(res);
      setIsFlipping(false);
      onBroadcastGameEvent?.('Coin Flip', `Coin landed on ${res}!`);
    }, 1500);
  };

  // Roll Dice
  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    setDiceNumber(null);

    diceRotation.value = withSequence(
      withTiming(diceRotation.value + 720, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );

    setTimeout(() => {
      const num = Math.floor(Math.random() * 6) + 1;
      setDiceNumber(num);
      setIsRolling(false);
      onBroadcastGameEvent?.('Dice Roll', `Rolled a ${num}! 🎲`);
    }, 1200);
  };

  const animatedBottleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bottleRotation.value}deg` }],
  }));

  const animatedCoinStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${coinRotation.value}deg` }],
  }));

  const animatedDiceStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diceRotation.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.drawerCard}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="game-controller" size={22} color="#0F766E" style={{ marginRight: 8 }} />
              <Text style={styles.drawerTitle}>Party Games Lounge</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Navigation Game Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('truthOrDare')}
              style={[styles.tabButton, activeTab === 'truthOrDare' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, activeTab === 'truthOrDare' && styles.tabButtonTextActive]}>
                Truth & Dare
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('coinFlip')}
              style={[styles.tabButton, activeTab === 'coinFlip' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, activeTab === 'coinFlip' && styles.tabButtonTextActive]}>
                Flip a Coin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('diceRoll')}
              style={[styles.tabButton, activeTab === 'diceRoll' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, activeTab === 'diceRoll' && styles.tabButtonTextActive]}>
                Dice Roll
              </Text>
            </TouchableOpacity>
          </View>

          {/* Game Views */}
          <ScrollView contentContainerStyle={styles.gameContentArea}>
            {/* 1. TRUTH OR DARE */}
            {activeTab === 'truthOrDare' && (
              <View style={styles.gameCenterBox}>
                {todMode === 'picker' ? (
                  <>
                    <Text style={styles.gameInstruction}>
                      Tap below to spin the bottle and pick who takes the challenge!
                    </Text>

                    {/* Animated Bottle */}
                    <View style={styles.bottleContainer}>
                      <Animated.View style={[styles.bottleGraphic, animatedBottleStyle]}>
                        <Ionicons name="wine" size={68} color="#0F766E" />
                      </Animated.View>
                    </View>

                    {selectedPlayer && (
                      <Animated.View entering={ZoomIn} style={styles.selectedPlayerBadge}>
                        <Text style={styles.selectedPlayerText}>🎯 Chosen: {selectedPlayer}</Text>
                      </Animated.View>
                    )}

                    <TouchableOpacity onPress={handleSpinBottle} style={styles.primaryGameBtn}>
                      <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.gameBtnGradient}>
                        <Ionicons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.gameBtnText}>Spin The Bottle 🍾</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {selectedPlayer && (
                      <View style={styles.todChoiceRow}>
                        <TouchableOpacity
                          onPress={handlePickTruth}
                          style={[styles.choiceBtn, { backgroundColor: '#0284C7' }]}
                        >
                          <Text style={styles.choiceBtnText}>Pick Truth 💙</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handlePickDare}
                          style={[styles.choiceBtn, { backgroundColor: '#E11D48' }]}
                        >
                          <Text style={styles.choiceBtnText}>Pick Dare 🔥</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <Animated.View entering={FadeInDown} style={styles.cardResultBox}>
                    <View
                      style={[
                        styles.cardHeaderTag,
                        { backgroundColor: todMode === 'truth' ? '#0284C7' : '#E11D48' },
                      ]}
                    >
                      <Text style={styles.cardHeaderTagText}>
                        {todMode === 'truth' ? 'TRUTH QUESTION' : 'DARE CHALLENGE'}
                      </Text>
                    </View>
                    <Text style={styles.targetPlayerText}>For: {selectedPlayer || 'Player'}</Text>
                    <Text style={styles.cardPromptText}>"{todCardContent}"</Text>

                    <TouchableOpacity
                      onPress={() => setTodMode('picker')}
                      style={[styles.primaryGameBtn, { marginTop: 24 }]}
                    >
                      <LinearGradient colors={['#0F766E', '#14B8A6']} style={styles.gameBtnGradient}>
                        <Text style={styles.gameBtnText}>Next Turn →</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            )}

            {/* 2. FLIP A COIN */}
            {activeTab === 'coinFlip' && (
              <View style={styles.gameCenterBox}>
                <Text style={styles.gameInstruction}>Flip the coin to settle bets, games, and turns!</Text>

                <Animated.View style={[styles.coinGraphic, animatedCoinStyle]}>
                  <LinearGradient colors={['#F59E0B', '#D97706', '#B45309']} style={styles.coinGradient}>
                    <Text style={styles.coinIconText}>🪙</Text>
                  </LinearGradient>
                </Animated.View>

                {coinResult && (
                  <Animated.View entering={ZoomIn} style={styles.resultAnnouncement}>
                    <Text style={styles.resultAnnouncementText}>🎉 Result: {coinResult}</Text>
                  </Animated.View>
                )}

                <TouchableOpacity
                  onPress={handleFlipCoin}
                  disabled={isFlipping}
                  style={[styles.primaryGameBtn, isFlipping && { opacity: 0.6 }]}
                >
                  <LinearGradient colors={['#D97706', '#F59E0B']} style={styles.gameBtnGradient}>
                    <Text style={styles.gameBtnText}>{isFlipping ? 'Flipping...' : 'Flip Coin 🪙'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* 3. DICE ROLL */}
            {activeTab === 'diceRoll' && (
              <View style={styles.gameCenterBox}>
                <Text style={styles.gameInstruction}>Roll the dice (1 to 6) for board turns & points!</Text>

                <Animated.View style={[styles.diceGraphic, animatedDiceStyle]}>
                  <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.diceGradient}>
                    <Text style={styles.diceLargeText}>{diceNumber ?? '🎲'}</Text>
                  </LinearGradient>
                </Animated.View>

                {diceNumber && (
                  <Animated.View entering={ZoomIn} style={styles.resultAnnouncement}>
                    <Text style={styles.resultAnnouncementText}>🎯 You rolled a {diceNumber}!</Text>
                  </Animated.View>
                )}

                <TouchableOpacity
                  onPress={handleRollDice}
                  disabled={isRolling}
                  style={[styles.primaryGameBtn, isRolling && { opacity: 0.6 }]}
                >
                  <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.gameBtnGradient}>
                    <Text style={styles.gameBtnText}>{isRolling ? 'Rolling...' : 'Roll Dice 🎲'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  drawerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#CCFBF1',
    maxHeight: '80%',
    paddingBottom: 28,
    shadowColor: '#0F766E',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  tabButtonText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 12.5,
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F766E',
    fontFamily: 'SpaceGrotesk-Bold',
  },
  gameContentArea: {
    padding: 20,
    alignItems: 'center',
  },
  gameCenterBox: {
    alignItems: 'center',
    width: '100%',
  },
  gameInstruction: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  bottleContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F0FDFA',
    borderWidth: 2,
    borderColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  bottleGraphic: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPlayerBadge: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  selectedPlayerText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  todChoiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    width: '100%',
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  choiceBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  primaryGameBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  gameBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  gameBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  cardResultBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardHeaderTagText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  targetPlayerText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F766E',
    marginBottom: 12,
  },
  cardPromptText: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 17,
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 24,
  },
  coinGraphic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  coinGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FDE68A',
  },
  coinIconText: {
    fontSize: 48,
  },
  diceGraphic: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  diceGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A5B4FC',
  },
  diceLargeText: {
    fontSize: 44,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
  },
  resultAnnouncement: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  resultAnnouncementText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    color: '#0F766E',
  },
});
