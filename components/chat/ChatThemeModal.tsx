import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface ChatTheme {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  wallpaper: any;
  bubbleOwn: [string, string];
  bubblePartner: string;
  bubblePartnerText: string;
  bubblePartnerBorder: string;
  textColor: string;
  subtitle: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'nano_teal',
    name: 'Nano Teal Glow',
    emoji: '✨',
    bg: '#F0FDFA',
    wallpaper: require('../../assets/themes/nanobanana_teal.jpg'),
    bubbleOwn: ['#0F766E', '#14B8A6'],
    bubblePartner: 'rgba(255, 255, 255, 0.95)',
    bubblePartnerText: '#0F172A',
    bubblePartnerBorder: 'rgba(255, 255, 255, 0.7)',
    textColor: '#0F172A',
    subtitle: 'Signature luxury Light Teal with cute glowing mascot',
  },
  {
    id: 'banana_sun',
    name: 'Banana Sunshine',
    emoji: '🍌',
    bg: '#FEFCE8',
    wallpaper: require('../../assets/themes/nanobanana_sunshine.jpg'),
    bubbleOwn: ['#D97706', '#F59E0B'],
    bubblePartner: 'rgba(255, 255, 255, 0.95)',
    bubblePartnerText: '#78350F',
    bubblePartnerBorder: 'rgba(254, 240, 138, 0.7)',
    textColor: '#78350F',
    subtitle: 'Warm golden clouds with happy NanoBanana energy',
  },
  {
    id: 'aqua_glass',
    name: 'Aqua Glass Crystal',
    emoji: '💎',
    bg: '#F0F9FF',
    wallpaper: require('../../assets/themes/nanobanana_aqua.jpg'),
    bubbleOwn: ['#0284C7', '#38BDF8'],
    bubblePartner: 'rgba(255, 255, 255, 0.95)',
    bubblePartnerText: '#0C4A6E',
    bubblePartnerBorder: 'rgba(186, 230, 253, 0.7)',
    textColor: '#0C4A6E',
    subtitle: 'Frosted cyan crystal glass with neon water bubbles',
  },
  {
    id: 'rose_blossom',
    name: 'Rose Sakura Blossom',
    emoji: '🌸',
    bg: '#FFF1F2',
    wallpaper: require('../../assets/themes/nanobanana_blossom.jpg'),
    bubbleOwn: ['#E11D48', '#FB7185'],
    bubblePartner: 'rgba(255, 255, 255, 0.95)',
    bubblePartnerText: '#881337',
    bubblePartnerBorder: 'rgba(254, 205, 211, 0.7)',
    textColor: '#881337',
    subtitle: 'Sweet playful sakura blossoms & soft lanterns',
  },
];

interface ChatThemeModalProps {
  visible: boolean;
  selectedThemeId: string;
  onSelectTheme: (theme: ChatTheme) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ChatThemeModal({
  visible,
  selectedThemeId,
  onSelectTheme,
  onClose,
}: ChatThemeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.bananaEmoji}>🍌</Text>
              <Text style={styles.title}>NanoBanana Chat Themes</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.desc}>
            Personalize your chat background with unique AI-generated NanoBanana wallpapers.
          </Text>

          <ScrollView
            contentContainerStyle={styles.themeList}
            showsVerticalScrollIndicator={false}
          >
            {CHAT_THEMES.map((theme) => {
              const isSelected = theme.id === selectedThemeId;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    isSelected && styles.selectedCard,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    onSelectTheme(theme);
                    onClose();
                  }}
                >
                  <View style={styles.cardContentRow}>
                    {/* Wallpaper Thumbnail */}
                    <Image source={theme.wallpaper} style={styles.thumbImage} resizeMode="cover" />

                    <View style={styles.cardRightCol}>
                      <View style={styles.previewRow}>
                        {/* Simulated Partner Bubble */}
                        <View
                          style={[
                            styles.miniBubble,
                            {
                              backgroundColor: theme.bubblePartner,
                              borderColor: theme.bubblePartnerBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.miniText, { color: theme.bubblePartnerText }]}>
                            Hey! 🍌
                          </Text>
                        </View>

                        {/* Simulated Own Bubble */}
                        <LinearGradient
                          colors={theme.bubbleOwn}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.miniBubble, styles.miniBubbleOwn]}
                        >
                          <Text style={[styles.miniText, { color: '#FFFFFF' }]}>
                            Awesome! ✨
                          </Text>
                        </LinearGradient>
                      </View>

                      <View style={styles.infoRow}>
                        <View style={styles.infoTextContainer}>
                          <View style={styles.nameRow}>
                            <Text style={styles.themeName}>{theme.name}</Text>
                            <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                          </View>
                          <Text style={styles.themeSubtitle} numberOfLines={1}>
                            {theme.subtitle}
                          </Text>
                        </View>

                        {isSelected ? (
                          <View style={styles.checkedCircle}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          </View>
                        ) : (
                          <View style={styles.uncheckCircle} />
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
    maxHeight: '80%',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bananaEmoji: {
    fontSize: 22,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  desc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  themeList: {
    gap: 12,
    paddingBottom: 16,
  },
  themeCard: {
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  selectedCard: {
    borderColor: '#0F766E',
    borderWidth: 2,
    backgroundColor: '#F0FDFA',
    shadowColor: '#0F766E',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbImage: {
    width: 60,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  cardRightCol: {
    flex: 1,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  miniBubble: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  miniBubbleOwn: {
    borderWidth: 0,
  },
  miniText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeName: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    color: '#0F172A',
  },
  themeEmoji: {
    fontSize: 13,
  },
  themeSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  checkedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
});
